# apps/backend/src/core/services/block.py
"""Block service."""

import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.core.models import Block
from src.core.exceptions import NotFoundError, PermissionError
from src.core.services.page import PageService


class BlockService:
    """Service for block operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.page_service = PageService(db)
    
    async def create(
        self,
        page_id: uuid.UUID,
        type: str,
        data: dict,
        properties: Optional[dict] = None,
        position: int = 0,
        parent_block_id: Optional[uuid.UUID] = None,
        user_id: uuid.UUID = None
    ) -> Block:
        """Create a new block."""
        # Check page access
        page = await self.page_service.get_by_id(page_id, user_id)
        if not page:
            raise NotFoundError("Page not found")
        
        block = Block(
            page_id=page_id,
            type=type,
            data=data,
            properties=properties or {},
            position=position,
            parent_block_id=parent_block_id
        )
        
        self.db.add(block)
        await self.db.commit()
        await self.db.refresh(block)
        
        return block
    
    async def update(
        self,
        block_id: uuid.UUID,
        user_id: uuid.UUID,
        **updates
    ) -> Block:
        """Update block."""
        result = await self.db.execute(
            select(Block).where(Block.id == block_id)
        )
        block = result.scalar_one_or_none()
        
        if not block:
            raise NotFoundError("Block not found")
        
        # Check page access
        page = await self.page_service.get_by_id(block.page_id, user_id)
        if not page:
            raise PermissionError("Access denied to block")
        
        for key, value in updates.items():
            if value is not None and hasattr(block, key):
                setattr(block, key, value)
        
        await self.db.commit()
        await self.db.refresh(block)
        return block
    
    async def delete(self, block_id: uuid.UUID, user_id: uuid.UUID):
        """Delete block."""
        result = await self.db.execute(
            select(Block).where(Block.id == block_id)
        )
        block = result.scalar_one_or_none()
        
        if not block:
            raise NotFoundError("Block not found")
        
        # Check page access
        page = await self.page_service.get_by_id(block.page_id, user_id)
        if not page:
            raise PermissionError("Access denied to block")
        
        await self.db.delete(block)
        await self.db.commit()