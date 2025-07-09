# apps/backend/src/main.py
"""Main FastAPI application with all services integrated."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
import strawberry
from strawberry.fastapi import GraphQLRouter
from prometheus_fastapi_instrumentator import Instrumentator

from src.core.config import settings
from src.core.database import engine, init_db
from src.core.redis import init_redis, cleanup_redis
from src.core.auth.oauth import auth_service
from src.services.collaboration import collaboration_service
from src.core.exceptions import (
    AppException,
    ValidationError,
    NotFoundError,
    PermissionError,
    AuthenticationError,
    validation_exception_handler,
    not_found_exception_handler,
    permission_exception_handler,
)

# Import routers
from src.api.rest.routes import router as rest_router
from src.api.websocket.collaboration import router as websocket_router
from src.api.graphql.schema import schema

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using Redis."""
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/metrics"]:
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host
        
        # Check rate limit
        from src.core.redis import rate_limit_middleware
        allowed = await rate_limit_middleware(
            key=f"rate_limit:{client_ip}",
            limit=settings.RATE_LIMIT_REQUESTS_PER_MINUTE,
            window=60
        )
        
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded"}
            )
        
        return await call_next(request)


class TenantContextMiddleware(BaseHTTPMiddleware):
    """Middleware to set tenant context for row-level security."""
    
    async def dispatch(self, request: Request, call_next):
        # Extract user from token if present
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
            # Get user from token (simplified)
            from src.core.auth.oauth import auth_service
            payload = auth_service.token_service.verify_token(token)
            
            if payload and payload.get("type") == "access":
                user_id = payload.get("sub")
                if user_id:
                    # Set tenant context in request state
                    request.state.current_user_id = user_id
        
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    logger.info("Starting NovaDocs backend...")
    
    # Initialize database
    await init_db(engine)
    logger.info("Database initialized")
    
    # Initialize Redis
    await init_redis()
    logger.info("Redis initialized")
    
    # Start collaboration service
    await collaboration_service.start()
    logger.info("Collaboration service started")
    
    # Setup Prometheus metrics
    if settings.PROMETHEUS_ENABLED:
        instrumentator = Instrumentator(
            should_group_status_codes=False,
            should_ignore_untemplated=True,
            should_respect_env_var=True,
            should_instrument_requests_inprogress=True,
            excluded_handlers=["/health", "/metrics"],
            inprogress_name="http_requests_inprogress",
            inprogress_labels=True,
        )
        instrumentator.instrument(app).expose(app)
        logger.info("Prometheus metrics enabled")
    
    yield
    
    # Shutdown
    logger.info("Shutting down NovaDocs backend...")
    
    # Stop collaboration service
    await collaboration_service.stop()
    logger.info("Collaboration service stopped")
    
    # Cleanup Redis
    await cleanup_redis()
    logger.info("Redis cleanup completed")
    
    # Close auth service
    await auth_service.close()
    logger.info("Auth service closed")
    
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="NovaDocs API",
    description="Modern collaborative wiki platform API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TenantContextMiddleware)

# Exception handlers
app.add_exception_handler(ValidationError, validation_exception_handler)
app.add_exception_handler(NotFoundError, not_found_exception_handler)
app.add_exception_handler(PermissionError, permission_exception_handler)

# Auth routes
@app.get("/auth/providers")
async def get_auth_providers():
    """Get available OAuth providers."""
    return {
        "providers": list(auth_service.oauth_service.providers.keys())
    }

@app.get("/auth/{provider}")
async def oauth_login(provider: str):
    """Initiate OAuth login."""
    try:
        auth_url = await auth_service.oauth_service.get_authorization_url(provider)
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/auth/callback/{provider}")
async def oauth_callback(provider: str, code: str, state: str):
    """Handle OAuth callback."""
    try:
        from src.core.database import get_db
        async with get_db() as db:
            result = await auth_service.authenticate_user(provider, code, state, db)
            return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token."""
    new_token = await auth_service.token_service.refresh_access_token(refresh_token)
    if not new_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    return {"access_token": new_token, "token_type": "bearer"}

@app.post("/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout user."""
    payload = auth_service.token_service.verify_token(credentials.credentials)
    if payload:
        user_id = payload.get("sub")
        if user_id:
            await auth_service.logout_user(user_id)
    
    return {"message": "Logged out successfully"}

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": "2025-01-01T00:00:00Z",
        "services": {
            "database": "healthy",
            "redis": "healthy",
            "collaboration": "healthy"
        }
    }

# Include routers
app.include_router(rest_router, prefix="/api/v1")
app.include_router(websocket_router, prefix="/ws")

# GraphQL endpoint
graphql_app = GraphQLRouter(schema, path="/graphql")
app.include_router(graphql_app, prefix="/graphql")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "NovaDocs API",
        "version": "1.0.0",
        "docs": "/docs",
        "graphql": "/graphql"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )