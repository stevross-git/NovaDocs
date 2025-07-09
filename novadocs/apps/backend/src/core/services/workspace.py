# apps/backend/src/core/services/workspace.py
"""Workspace service."""

import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.core.models import Workspace, WorkspaceMember
from src.core.exceptions import NotFoundError, PermissionError


class WorkspaceService:
    """Service for workspace operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create(
        self,
        name: str,
        slug: str,
        description: Optional[str] = None,
        settings: Optional[dict] = None,
        owner_id: uuid.UUID = None
    ) -> Workspace:
        """Create a new workspace."""
        workspace = Workspace(
            name=name,
            slug=slug,
            description=description,
            settings=settings or {},
            owner_id=owner_id
        )
        
        self.db.add(workspace)
        await self.db.commit()
        await self.db.refresh(workspace)
        
        # Add owner as member
        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=owner_id,
            role="owner"
        )
        self.db.add(member)
        await self.db.commit()
        
        return workspace
    
    async def get_by_id(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Workspace]:
        """Get workspace by ID."""
        result = await self.db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        workspace = result.scalar_one_or_none()
        
        if not workspace:
            return None
        
        # Check if user has access
        if not await self._has_access(workspace.id, user_id):
            raise PermissionError("Access denied to workspace")
        
        return workspace
    
    async def get_by_slug(self, slug: str, user_id: uuid.UUID) -> Optional[Workspace]:
        """Get workspace by slug."""
        result = await self.db.execute(
            select(Workspace).where(Workspace.slug == slug)
        )
        workspace = result.scalar_one_or_none()
        
        if not workspace:
            return None
        
        # Check if user has access
        if not await self._has_access(workspace.id, user_id):
            raise PermissionError("Access denied to workspace")
        
        return workspace
    
    async def update(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        **updates
    ) -> Workspace:
        """Update workspace."""
        workspace = await self.get_by_id(workspace_id, user_id)
        if not workspace:
            raise NotFoundError("Workspace not found")
        
        # Check if user is owner or admin
        if not await self._is_admin(workspace_id, user_id):
            raise PermissionError("Only workspace admins can update workspace")
        
        for key, value in updates.items():
            if value is not None and hasattr(workspace, key):
                setattr(workspace, key, value)
        
        await self.db.commit()
        await self.db.refresh(workspace)
        return workspace
    
    async def delete(self, workspace_id: uuid.UUID, user_id: uuid.UUID):
        """Delete workspace."""
        workspace = await self.get_by_id(workspace_id, user_id)
        if not workspace:
            raise NotFoundError("Workspace not found")
        
        # Check if user is owner
        if workspace.owner_id != user_id:
            raise PermissionError("Only workspace owner can delete workspace")
        
        await self.db.delete(workspace)
        await self.db.commit()
    
    async def _has_access(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Check if user has access to workspace."""
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id
            )
        )
        return result.scalar_one_or_none() is not None
    
    async def _is_admin(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Check if user is admin of workspace."""
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
                WorkspaceMember.role.in_(["owner", "admin"])
            )
        )
        return result.scalar_one_or_none() is not None
