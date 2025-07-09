# apps/backend/src/core/services/comment.py
"""Comment service."""

import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.core.models import Comment
from src.core.exceptions import NotFoundError, PermissionError
from src.core.services.page import PageService


class CommentService:
    """Service for comment operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.page_service = PageService(db)
    
    async def create(
        self,
        content: str,
        user_id: uuid.UUID,
        page_id: Optional[uuid.UUID] = None,
        block_id: Optional[uuid.UUID] = None,
        metadata: Optional[dict] = None
    ) -> Comment:
        """Create a new comment."""
        if page_id:
            # Check page access
            page = await self.page_service.get_by_id(page_id, user_id)
            if not page:
                raise NotFoundError("Page not found")
        
        comment = Comment(
            page_id=page_id,
            block_id=block_id,
            user_id=user_id,
            content=content,
            metadata=metadata or {}
        )
        
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        
        return comment
    
    async def update(
        self,
        comment_id: uuid.UUID,
        user_id: uuid.UUID,
        **updates
    ) -> Comment:
        """Update comment."""
        result = await self.db.execute(
            select(Comment).where(Comment.id == comment_id)
        )
        comment = result.scalar_one_or_none()
        
        if not comment:
            raise NotFoundError("Comment not found")
        
        # Check if user owns the comment
        if comment.user_id != user_id:
            raise PermissionError("You can only update your own comments")
        
        for key, value in updates.items():
            if value is not None and hasattr(comment, key):
                setattr(comment, key, value)
        
        await self.db.commit()
        await self.db.refresh(comment)
        return comment
    
    async def delete(self, comment_id: uuid.UUID, user_id: uuid.UUID):
        """Delete comment."""
        result = await self.db.execute(
            select(Comment).where(Comment.id == comment_id)
        )
        comment = result.scalar_one_or_none()
        
        if not comment:
            raise NotFoundError("Comment not found")
        
        # Check if user owns the comment
        if comment.user_id != user_id:
            raise PermissionError("You can only delete your own comments")
        
        await self.db.delete(comment)
        await self.db.commit()