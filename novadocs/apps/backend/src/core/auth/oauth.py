# apps/backend/src/core/auth/oauth.py
"""OAuth 3.0 authentication implementation with PKCE support."""

import base64
import hashlib
import secrets
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from urllib.parse import urlencode, parse_qs, urlparse

import httpx
from fastapi import HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.models import User
from src.core.redis import redis_manager

logger = logging.getLogger(__name__)


class OAuthProvider:
    """Base OAuth provider class."""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
    
    def generate_pkce_challenge(self) -> tuple[str, str]:
        """Generate PKCE code verifier and challenge."""
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        return code_verifier, code_challenge
    
    async def get_authorization_url(self, state: str, scopes: List[str]) -> tuple[str, str]:
        """Get OAuth authorization URL with PKCE."""
        raise NotImplementedError
    
    async def exchange_code_for_token(self, code: str, code_verifier: str) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        raise NotImplementedError
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from access token."""
        raise NotImplementedError


class GoogleOAuthProvider(OAuthProvider):
    """Google OAuth provider with OAuth 3.0 support."""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        super().__init__(client_id, client_secret, redirect_uri)
        self.auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    async def get_authorization_url(self, state: str, scopes: List[str]) -> tuple[str, str]:
        """Get Google OAuth authorization URL."""
        code_verifier, code_challenge = self.generate_pkce_challenge()
        
        # Store code verifier in Redis for later use
        await redis_manager.set_session(f"pkce:{state}", {
            "code_verifier": code_verifier,
            "provider": "google"
        }, expire=600)  # 10 minutes
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "access_type": "offline",
            "prompt": "consent"
        }
        
        auth_url = f"{self.auth_url}?{urlencode(params)}"
        return auth_url, code_verifier
    
    async def exchange_code_for_token(self, code: str, code_verifier: str) -> Dict[str, Any]:
        """Exchange authorization code for Google access token."""
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "code_verifier": code_verifier,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        
        response = await self.client.post(self.token_url, data=data)
        response.raise_for_status()
        
        return response.json()
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from Google."""
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await self.client.get(self.user_info_url, headers=headers)
        response.raise_for_status()
        
        return response.json()


class GitHubOAuthProvider(OAuthProvider):
    """GitHub OAuth provider with OAuth 3.0 support."""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        super().__init__(client_id, client_secret, redirect_uri)
        self.auth_url = "https://github.com/login/oauth/authorize"
        self.token_url = "https://github.com/login/oauth/access_token"
        self.user_info_url = "https://api.github.com/user"
    
    async def get_authorization_url(self, state: str, scopes: List[str]) -> tuple[str, str]:
        """Get GitHub OAuth authorization URL."""
        code_verifier, code_challenge = self.generate_pkce_challenge()
        
        # Store code verifier in Redis
        await redis_manager.set_session(f"pkce:{state}", {
            "code_verifier": code_verifier,
            "provider": "github"
        }, expire=600)
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256"
        }
        
        auth_url = f"{self.auth_url}?{urlencode(params)}"
        return auth_url, code_verifier
    
    async def exchange_code_for_token(self, code: str, code_verifier: str) -> Dict[str, Any]:
        """Exchange authorization code for GitHub access token."""
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "code_verifier": code_verifier,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        
        headers = {"Accept": "application/json"}
        response = await self.client.post(self.token_url, data=data, headers=headers)
        response.raise_for_status()
        
        return response.json()
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from GitHub."""
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await self.client.get(self.user_info_url, headers=headers)
        response.raise_for_status()
        
        return response.json()


class OAuthService:
    """OAuth service managing multiple providers."""
    
    def __init__(self):
        self.providers: Dict[str, OAuthProvider] = {}
        self._setup_providers()
    
    def _setup_providers(self):
        """Set up OAuth providers."""
        # Google OAuth
        if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
            self.providers["google"] = GoogleOAuthProvider(
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                redirect_uri=f"{settings.BASE_URL}/auth/callback/google"
            )
        
        # GitHub OAuth
        if settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET:
            self.providers["github"] = GitHubOAuthProvider(
                client_id=settings.GITHUB_CLIENT_ID,
                client_secret=settings.GITHUB_CLIENT_SECRET,
                redirect_uri=f"{settings.BASE_URL}/auth/callback/github"
            )
    
    async def get_authorization_url(self, provider: str, scopes: List[str] = None) -> str:
        """Get OAuth authorization URL."""
        if provider not in self.providers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth provider '{provider}' not supported"
            )
        
        # Generate state for CSRF protection
        state = secrets.token_urlsafe(32)
        
        # Store state in Redis for verification
        await redis_manager.set_session(f"oauth_state:{state}", {
            "provider": provider,
            "created_at": datetime.now().isoformat()
        }, expire=600)
        
        # Default scopes
        if not scopes:
            scopes = {
                "google": ["openid", "email", "profile"],
                "github": ["user:email", "read:user"]
            }.get(provider, [])
        
        auth_url, _ = await self.providers[provider].get_authorization_url(state, scopes)
        return auth_url
    
    async def handle_callback(self, provider: str, code: str, state: str) -> Dict[str, Any]:
        """Handle OAuth callback."""
        if provider not in self.providers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth provider '{provider}' not supported"
            )
        
        # Verify state
        state_data = await redis_manager.get_session(f"oauth_state:{state}")
        if not state_data or state_data.get("provider") != provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid state parameter"
            )
        
        # Get code verifier
        pkce_data = await redis_manager.get_session(f"pkce:{state}")
        if not pkce_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PKCE verification data not found"
            )
        
        code_verifier = pkce_data["code_verifier"]
        
        # Exchange code for token
        token_data = await self.providers[provider].exchange_code_for_token(code, code_verifier)
        
        # Get user info
        user_info = await self.providers[provider].get_user_info(token_data["access_token"])
        
        # Clean up Redis
        await redis_manager.delete_session(f"oauth_state:{state}")
        await redis_manager.delete_session(f"pkce:{state}")
        
        return {
            "user_info": user_info,
            "token_data": token_data,
            "provider": provider
        }
    
    async def close(self):
        """Close all provider connections."""
        for provider in self.providers.values():
            await provider.close()


class TokenService:
    """JWT token management service."""
    
    @staticmethod
    def create_access_token(user_id: str, expires_delta: timedelta = None) -> str:
        """Create JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "sub": user_id,
            "exp": expire,
            "type": "access"
        }
        
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    @staticmethod
    def create_refresh_token(user_id: str) -> str:
        """Create JWT refresh token."""
        expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode = {
            "sub": user_id,
            "exp": expire,
            "type": "refresh"
        }
        
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token."""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    async def refresh_access_token(refresh_token: str) -> Optional[str]:
        """Refresh access token using refresh token."""
        payload = TokenService.verify_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        # Create new access token
        return TokenService.create_access_token(user_id)


class AuthenticationService:
    """Main authentication service."""
    
    def __init__(self):
        self.oauth_service = OAuthService()
        self.token_service = TokenService()
    
    async def authenticate_user(self, provider: str, code: str, state: str, db: AsyncSession) -> Dict[str, Any]:
        """Authenticate user with OAuth provider."""
        # Handle OAuth callback
        oauth_result = await self.oauth_service.handle_callback(provider, code, state)
        
        user_info = oauth_result["user_info"]
        provider_name = oauth_result["provider"]
        
        # Extract user data based on provider
        if provider_name == "google":
            email = user_info.get("email")
            name = user_info.get("name")
            avatar_url = user_info.get("picture")
            provider_id = user_info.get("id")
        elif provider_name == "github":
            email = user_info.get("email")
            name = user_info.get("name") or user_info.get("login")
            avatar_url = user_info.get("avatar_url")
            provider_id = str(user_info.get("id"))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported OAuth provider"
            )
        
        # Find or create user
        result = await db.execute(
            "SELECT * FROM users WHERE email = :email",
            {"email": email}
        )
        user = result.fetchone()
        
        if not user:
            # Create new user
            result = await db.execute(
                """
                INSERT INTO users (email, name, avatar_url, provider, provider_id)
                VALUES (:email, :name, :avatar_url, :provider, :provider_id)
                RETURNING *
                """,
                {
                    "email": email,
                    "name": name,
                    "avatar_url": avatar_url,
                    "provider": provider_name,
                    "provider_id": provider_id
                }
            )
            user = result.fetchone()
            await db.commit()
        
        # Generate tokens
        access_token = self.token_service.create_access_token(str(user.id))
        refresh_token = self.token_service.create_refresh_token(str(user.id))
        
        # Store session in Redis
        session_data = {
            "user_id": str(user.id),
            "email": user.email,
            "name": user.name,
            "provider": provider_name,
            "created_at": datetime.now().isoformat()
        }
        
        await redis_manager.set_session(f"user_session:{user.id}", session_data)
        
        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "avatar_url": user.avatar_url
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    async def logout_user(self, user_id: str) -> None:
        """Logout user and invalidate session."""
        await redis_manager.delete_session(f"user_session:{user_id}")
    
    async def get_current_user(self, token: str, db: AsyncSession) -> Optional[User]:
        """Get current user from token."""
        payload = self.token_service.verify_token(token)
        
        if not payload or payload.get("type") != "access":
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        # Get user from database
        result = await db.execute(
            "SELECT * FROM users WHERE id = :user_id",
            {"user_id": user_id}
        )
        user = result.fetchone()
        
        return User(**user) if user else None
    
    async def close(self):
        """Close authentication service."""
        await self.oauth_service.close()


# Global authentication service instance
auth_service = AuthenticationService()