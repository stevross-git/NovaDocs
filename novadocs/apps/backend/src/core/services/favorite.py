from __future__ import annotations

"""Service for managing user favorites."""

import uuid
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.models import Favorite, Page
from src.core.exceptions import NotFoundError


class FavoriteService:
    """Operations for page favorites."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_favorite(self, page_id: uuid.UUID, user_id: uuid.UUID) -> Favorite:
        """Mark page as favorite for user."""
        result = await self.db.execute(
            select(Page).where(Page.id == page_id)
        )
        if not result.scalar_one_or_none():
            raise NotFoundError("Page not found")

        result = await self.db.execute(
            select(Favorite).where(Favorite.page_id == page_id, Favorite.user_id == user_id)
        )
        favorite = result.scalar_one_or_none()
        if favorite:
            return favorite

        favorite = Favorite(page_id=page_id, user_id=user_id)
        self.db.add(favorite)
        await self.db.commit()
        await self.db.refresh(favorite)
        return favorite

    async def remove_favorite(self, page_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Remove favorite from page for user."""
        result = await self.db.execute(
            select(Favorite).where(Favorite.page_id == page_id, Favorite.user_id == user_id)
        )
        favorite = result.scalar_one_or_none()
        if not favorite:
            raise NotFoundError("Favorite not found")
        await self.db.delete(favorite)
        await self.db.commit()

    async def list_favorites(self, user_id: uuid.UUID) -> List[Favorite]:
        """List all favorites for a user."""
        result = await self.db.execute(
            select(Favorite).where(Favorite.user_id == user_id).order_by(Favorite.created_at.desc())
        )
        return result.scalars().all()
