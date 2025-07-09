# apps/backend/src/core/services/search.py
"""Search service."""

import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from src.core.models import Page, Block


class SearchService:
    """Service for search operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def search_pages(
        self,
        query: str,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        limit: int = 20
    ) -> List[Page]:
        """Search pages by query."""
        # Full-text search
        result = await self.db.execute(
            text("""
                SELECT * FROM pages 
                WHERE workspace_id = :workspace_id
                AND to_tsvector('english', title || ' ' || COALESCE(content_text, '')) 
                    @@ plainto_tsquery('english', :query)
                ORDER BY ts_rank(
                    to_tsvector('english', title || ' ' || COALESCE(content_text, '')),
                    plainto_tsquery('english', :query)
                ) DESC
                LIMIT :limit
            """),
            {
                "workspace_id": workspace_id,
                "query": query,
                "limit": limit
            }
        )
        
        pages = []
        for row in result:
            pages.append(Page(**row))
        
        return pages
    
    async def search_blocks(
        self,
        query: str,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        limit: int = 20
    ) -> List[Block]:
        """Search blocks by query."""
        # Search in block data
        result = await self.db.execute(
            text("""
                SELECT b.* FROM blocks b
                JOIN pages p ON b.page_id = p.id
                WHERE p.workspace_id = :workspace_id
                AND b.data::text ILIKE :query
                ORDER BY b.created_at DESC
                LIMIT :limit
            """),
            {
                "workspace_id": workspace_id,
                "query": f"%{query}%",
                "limit": limit
            }
        )
        
        blocks = []
        for row in result:
            blocks.append(Block(**row))
        
        return blocks
    