"""Page service."""

import re
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.core.models import Page
from src.core.exceptions import NotFoundError, PermissionError
from src.core.services.workspace import WorkspaceService


class PageService:
    """Service for page operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.workspace_service = WorkspaceService(db)
    
    async def create(
        self,
        title: str,
        workspace_id: uuid.UUID,
        created_by_id: uuid.UUID,
        parent_id: Optional[uuid.UUID] = None,
        position: int = 0,
        is_template: bool = False
    ) -> Page:
        """Create a new page."""
        # Check workspace access
        workspace = await self.workspace_service.get_by_id(workspace_id, created_by_id)
        if not workspace:
            raise NotFoundError("Workspace not found")
        
        # Generate slug from title
        slug = re.sub(r'[^a-z0-9-]', '', title.lower().replace(" ", "-"))
        
        page = Page(
            title=title,
            slug=slug,
            workspace_id=workspace_id,
            parent_id=parent_id,
            created_by_id=created_by_id,
            position=position,
            is_template=is_template
        )
        
        self.db.add(page)
        await self.db.commit()
        await self.db.refresh(page)
        
        return page
    
    async def get_by_id(self, page_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Page]:
        """Get page by ID."""
        result = await self.db.execute(
            select(Page).where(Page.id == page_id)
        )
        page = result.scalar_one_or_none()
        
        if not page:
            return None
        
        # Check workspace access
        workspace = await self.workspace_service.get_by_id(page.workspace_id, user_id)
        if not workspace:
            raise PermissionError("Access denied to page")
        
        return page
    
    async def update(
        self,
        page_id: uuid.UUID,
        user_id: uuid.UUID,
        **updates
    ) -> Page:
        """Update page."""
        page = await self.get_by_id(page_id, user_id)
        if not page:
            raise NotFoundError("Page not found")
        
        for key, value in updates.items():
            if value is not None and hasattr(page, key):
                setattr(page, key, value)
        
        await self.db.commit()
        await self.db.refresh(page)
        return page
    
    async def delete(self, page_id: uuid.UUID, user_id: uuid.UUID):
        """Delete page."""
        page = await self.get_by_id(page_id, user_id)
        if not page:
            raise NotFoundError("Page not found")
        
        await self.db.delete(page)
        await self.db.commit()
    
    async def move(
        self,
        page_id: uuid.UUID,
        parent_id: Optional[uuid.UUID],
        position: int,
        user_id: uuid.UUID
    ) -> Page:
        """Move page to new parent and position."""
        page = await self.get_by_id(page_id, user_id)
        if not page:
            raise NotFoundError("Page not found")
        
        page.parent_id = parent_id
        page.position = position
        
        await self.db.commit()
        await self.db.refresh(page)
        return page
