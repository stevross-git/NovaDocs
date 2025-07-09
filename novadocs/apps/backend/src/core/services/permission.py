"""Permission service."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.core.models import Permission, ShareLink
from src.core.exceptions import NotFoundError, PermissionError


class PermissionService:
    """Service for permission operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def grant(
        self,
        resource_id: uuid.UUID,
        resource_type: str,
        workspace_id: uuid.UUID,
        permission_type: str,
        granted_by_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
        conditions: Optional[dict] = None
    ) -> Permission:
        """Grant permission to user."""
        permission = Permission(
            resource_id=resource_id,
            resource_type=resource_type,
            user_id=user_id,
            workspace_id=workspace_id,
            permission_type=permission_type,
            conditions=conditions or {}
        )
        
        self.db.add(permission)
        await self.db.commit()
        await self.db.refresh(permission)
        
        return permission
    
    async def revoke(self, permission_id: uuid.UUID, user_id: uuid.UUID):
        """Revoke permission."""
        result = await self.db.execute(
            select(Permission).where(Permission.id == permission_id)
        )
        permission = result.scalar_one_or_none()
        
        if not permission:
            raise NotFoundError("Permission not found")
        
        await self.db.delete(permission)
        await self.db.commit()
    
    async def create_share_link(
        self,
        resource_id: uuid.UUID,
        resource_type: str,
        permissions: dict,
        created_by_id: uuid.UUID,
        expires_at: Optional[datetime] = None
    ) -> ShareLink:
        """Create share link."""
        import secrets
        
        share_link = ShareLink(
            token=secrets.token_urlsafe(32),
            resource_id=resource_id,
            resource_type=resource_type,
            permissions=permissions,
            expires_at=expires_at
        )
        
        self.db.add(share_link)
        await self.db.commit()
        await self.db.refresh(share_link)
        
        return share_link
