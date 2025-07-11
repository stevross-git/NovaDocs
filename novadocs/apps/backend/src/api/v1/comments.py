# apps/backend/src/api/v1/comments.py
"""Comments API routes."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db_session
from src.core.models import Comment
from src.core.services.comment import CommentService
from .pages import get_current_user

router = APIRouter(prefix="/api/v1/comments", tags=["comments"])


class CommentResponse(BaseModel):
    id: str
    content: str
    author_id: str
    page_id: Optional[str] = None
    block_id: Optional[str] = None
    is_resolved: bool
    created_at: str
    updated_at: str

    @classmethod
    def from_model(cls, comment: Comment) -> "CommentResponse":
        return cls(
            id=str(comment.id),
            content=comment.content,
            author_id=str(comment.author_id),
            page_id=str(comment.page_id) if comment.page_id else None,
            block_id=str(comment.block_id) if comment.block_id else None,
            is_resolved=comment.is_resolved,
            created_at=comment.created_at.isoformat(),
            updated_at=comment.updated_at.isoformat(),
        )


class CreateCommentRequest(BaseModel):
    content: str
    page_id: Optional[str] = None
    block_id: Optional[str] = None


class UpdateCommentRequest(BaseModel):
    content: Optional[str] = None
    is_resolved: Optional[bool] = None


@router.get("/page/{page_id}", response_model=List[CommentResponse])
async def list_comments(page_id: str, db: AsyncSession = Depends(get_db_session)):
    """List comments for a page."""
    result = await db.execute(
        select(Comment).where(Comment.page_id == uuid.UUID(page_id)).order_by(Comment.created_at)
    )
    comments = result.scalars().all()
    return [CommentResponse.from_model(c) for c in comments]


@router.post("/", response_model=CommentResponse)
async def create_comment(
    comment_data: CreateCommentRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new comment."""
    user = await get_current_user(db)
    comment_service = CommentService(db)
    comment = await comment_service.create(
        content=comment_data.content,
        user_id=user.id,
        page_id=uuid.UUID(comment_data.page_id) if comment_data.page_id else None,
        block_id=uuid.UUID(comment_data.block_id) if comment_data.block_id else None,
    )
    return CommentResponse.from_model(comment)


@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: str,
    comment_data: UpdateCommentRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Update an existing comment."""
    user = await get_current_user(db)
    comment_service = CommentService(db)
    comment = await comment_service.update(
        uuid.UUID(comment_id),
        user.id,
        **comment_data.dict(exclude_unset=True),
    )
    return CommentResponse.from_model(comment)


@router.delete("/{comment_id}")
async def delete_comment(comment_id: str, db: AsyncSession = Depends(get_db_session)):
    """Delete a comment."""
    user = await get_current_user(db)
    comment_service = CommentService(db)
    await comment_service.delete(uuid.UUID(comment_id), user.id)
    return {"status": "deleted"}
