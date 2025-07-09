# apps/backend/src/core/services/database.py
"""Database service."""

import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.core.models import Database, DatabaseRow
from src.core.exceptions import NotFoundError, PermissionError
from src.core.services.page import PageService


class DatabaseService:
    """Service for database operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.page_service = PageService(db)
    
    async def create(
        self,
        page_id: uuid.UUID,
        name: str,
        schema: dict,
        views: List[dict],
        user_id: uuid.UUID
    ) -> Database:
        """Create a new database."""
        # Check page access
        page = await self.page_service.get_by_id(page_id, user_id)
        if not page:
            raise NotFoundError("Page not found")
        
        database = Database(
            page_id=page_id,
            name=name,
            schema=schema,
            views=views or []
        )
        
        self.db.add(database)
        await self.db.commit()
        await self.db.refresh(database)
        
        return database
    
    async def update(
        self,
        database_id: uuid.UUID,
        user_id: uuid.UUID,
        **updates
    ) -> Database:
        """Update database."""
        result = await self.db.execute(
            select(Database).where(Database.id == database_id)
        )
        database = result.scalar_one_or_none()
        
        if not database:
            raise NotFoundError("Database not found")
        
        # Check page access
        page = await self.page_service.get_by_id(database.page_id, user_id)
        if not page:
            raise PermissionError("Access denied to database")
        
        for key, value in updates.items():
            if value is not None and hasattr(database, key):
                setattr(database, key, value)
        
        await self.db.commit()
        await self.db.refresh(database)
        return database
    
    async def create_row(
        self,
        database_id: uuid.UUID,
        data: dict,
        position: int = 0,
        user_id: uuid.UUID = None
    ) -> DatabaseRow:
        """Create a new database row."""
        # Check database access
        result = await self.db.execute(
            select(Database).where(Database.id == database_id)
        )
        database = result.scalar_one_or_none()
        
        if not database:
            raise NotFoundError("Database not found")
        
        # Check page access
        page = await self.page_service.get_by_id(database.page_id, user_id)
        if not page:
            raise PermissionError("Access denied to database")
        
        row = DatabaseRow(
            database_id=database_id,
            data=data,
            position=position
        )
        
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        
        return row
    
    async def update_row(
        self,
        row_id: uuid.UUID,
        user_id: uuid.UUID,
        **updates
    ) -> DatabaseRow:
        """Update database row."""
        result = await self.db.execute(
            select(DatabaseRow).where(DatabaseRow.id == row_id)
        )
        row = result.scalar_one_or_none()
        
        if not row:
            raise NotFoundError("Database row not found")
        
        # Check database access through page
        database_result = await self.db.execute(
            select(Database).where(Database.id == row.database_id)
        )
        database = database_result.scalar_one_or_none()
        
        if not database:
            raise NotFoundError("Database not found")
        
        # Check page access
        page = await self.page_service.get_by_id(database.page_id, user_id)
        if not page:
            raise PermissionError("Access denied to database row")
        
        for key, value in updates.items():
            if value is not None and hasattr(row, key):
                setattr(row, key, value)
        
        await self.db.commit()
        await self.db.refresh(row)
        return row
    
    async def delete_row(self, row_id: uuid.UUID, user_id: uuid.UUID):
        """Delete database row."""
        result = await self.db.execute(
            select(DatabaseRow).where(DatabaseRow.id == row_id)
        )
        row = result.scalar_one_or_none()
        
        if not row:
            raise NotFoundError("Database row not found")
        
        # Check database access through page
        database_result = await self.db.execute(
            select(Database).where(Database.id == row.database_id)
        )
        database = database_result.scalar_one_or_none()
        
        if not database:
            raise NotFoundError("Database not found")
        
        # Check page access
        page = await self.page_service.get_by_id(database.page_id, user_id)
        if not page:
            raise PermissionError("Access denied to database row")
        
        await self.db.delete(row)
        await self.db.commit()