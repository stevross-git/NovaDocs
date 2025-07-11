"""Favorites API routes."""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db_session
from src.core.models import Page, Favorite
from src.core.services.favorite import FavoriteService
from .pages import get_current_user

router = APIRouter(prefix="/api/v1/favorites", tags=["favorites"])


class FavoriteResponse(BaseModel):
    page_id: str
    created_at: str

    @classmethod
    def from_model(cls, fav: Favorite) -> "FavoriteResponse":
        return cls(page_id=str(fav.page_id), created_at=fav.created_at.isoformat())


@router.get("/", response_model=List[FavoriteResponse])
async def list_favorites(db: AsyncSession = Depends(get_db_session)):
    """List current user's favorite pages."""
    user = await get_current_user(db)
    service = FavoriteService(db)
    favorites = await service.list_favorites(user.id)
    return [FavoriteResponse.from_model(f) for f in favorites]


@router.post("/{page_id}", status_code=201)
async def add_favorite(page_id: str, db: AsyncSession = Depends(get_db_session)):
    """Mark a page as favorite."""
    user = await get_current_user(db)
    service = FavoriteService(db)
    try:
        await service.add_favorite(uuid.UUID(page_id), user.id)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "favorited"}


@router.delete("/{page_id}")
async def remove_favorite(page_id: str, db: AsyncSession = Depends(get_db_session)):
    """Remove a page from favorites."""
    user = await get_current_user(db)
    service = FavoriteService(db)
    try:
        await service.remove_favorite(uuid.UUID(page_id), user.id)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "unfavorited"}

