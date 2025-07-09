# apps/backend/src/api/v1/pages.py
"""Pages API routes."""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from src.core.database import get_db_session
from src.core.models import Page, User, Workspace, Block
from src.core.exceptions import NotFoundError, PermissionError

router = APIRouter(prefix="/api/v1/pages", tags=["pages"])


class CreatePageRequest(BaseModel):
    title: str
    content: Optional[str] = ""
    workspace_id: Optional[str] = None
    parent_id: Optional[str] = None
    is_template: bool = False


class UpdatePageRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    content_text: Optional[str] = None
    is_published: Optional[bool] = None
    is_archived: Optional[bool] = None


class PageResponse(BaseModel):
    id: str
    title: str
    slug: str
    content: str
    workspace_id: str
    parent_id: Optional[str]
    created_by_id: str
    is_published: bool
    is_archived: bool
    collaboration_enabled: bool
    version: int
    created_at: str
    updated_at: str
    
    @classmethod
    def from_model(cls, page: Page) -> "PageResponse":
        return cls(
            id=str(page.id),
            title=page.title,
            slug=page.slug,
            content=page.content or "",
            workspace_id=str(page.workspace_id),
            parent_id=str(page.parent_id) if page.parent_id else None,
            created_by_id=str(page.created_by_id),
            is_published=page.is_published,
            is_archived=page.is_archived,
            collaboration_enabled=page.collaboration_enabled,
            version=page.version,
            created_at=page.created_at.isoformat(),
            updated_at=page.updated_at.isoformat()
        )


async def get_current_user(db: AsyncSession) -> User:
    """Get current user - simplified for now."""
    # For now, return a default user. In production, implement proper auth
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    
    if not user:
        # Create default user if none exists
        user = User(
            email="demo@novadocs.com",
            name="Demo User",
            is_active=True,
            is_verified=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    return user


async def get_default_workspace(db: AsyncSession, user: User) -> Workspace:
    """Get or create default workspace."""
    result = await db.execute(
        select(Workspace).where(Workspace.slug == "default")
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        workspace = Workspace(
            name="Default Workspace",
            slug="default",
            description="Default workspace for NovaDocs",
            is_public=True,
            settings={}
        )
        db.add(workspace)
        await db.commit()
        await db.refresh(workspace)
    
    return workspace


def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title."""
    import re
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')


@router.get("/", response_model=List[PageResponse])
async def list_pages(
    workspace_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session)
):
    """List all pages."""
    try:
        query = select(Page).order_by(Page.updated_at.desc())
        
        if workspace_id:
            query = query.where(Page.workspace_id == uuid.UUID(workspace_id))
        
        result = await db.execute(query)
        pages = result.scalars().all()
        
        return [PageResponse.from_model(page) for page in pages]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pages: {str(e)}"
        )


@router.get("/{page_id}", response_model=PageResponse)
async def get_page(
    page_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Get a specific page."""
    try:
        result = await db.execute(
            select(Page).where(Page.id == uuid.UUID(page_id))
        )
        page = result.scalar_one_or_none()
        
        if not page:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Page not found"
            )
        
        return PageResponse.from_model(page)
    
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid page ID format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch page: {str(e)}"
        )


@router.post("/", response_model=PageResponse)
async def create_page(
    page_data: CreatePageRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Create a new page."""
    try:
        # Get current user and workspace
        user = await get_current_user(db)
        
        if page_data.workspace_id:
            workspace_id = uuid.UUID(page_data.workspace_id)
        else:
            workspace = await get_default_workspace(db, user)
            workspace_id = workspace.id
        
        # Generate slug
        slug = generate_slug(page_data.title)
        
        # Create page
        page = Page(
            title=page_data.title,
            slug=slug,
            content=page_data.content or "",
            workspace_id=workspace_id,
            parent_id=uuid.UUID(page_data.parent_id) if page_data.parent_id else None,
            created_by_id=user.id,
            is_published=False,
            is_archived=False,
            collaboration_enabled=True,
            version=1,
            content_text=page_data.content or ""  # For search indexing
        )
        
        db.add(page)
        await db.commit()
        await db.refresh(page)
        
        return PageResponse.from_model(page)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create page: {str(e)}"
        )


@router.put("/{page_id}", response_model=PageResponse)
async def update_page(
    page_id: str,
    page_data: UpdatePageRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Update an existing page."""
    try:
        # Get the page
        result = await db.execute(
            select(Page).where(Page.id == uuid.UUID(page_id))
        )
        page = result.scalar_one_or_none()
        
        if not page:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Page not found"
            )
        
        # Update fields
        update_data = page_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if hasattr(page, field):
                setattr(page, field, value)
        
        # Update slug if title changed
        if page_data.title:
            page.slug = generate_slug(page_data.title)
        
        # Update content_text for search if content changed
        if page_data.content:
            page.content_text = page_data.content
        
        # Increment version
        page.version += 1
        
        await db.commit()
        await db.refresh(page)
        
        return PageResponse.from_model(page)
    
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid page ID format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update page: {str(e)}"
        )


@router.delete("/{page_id}")
async def delete_page(
    page_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Delete a page."""
    try:
        result = await db.execute(
            select(Page).where(Page.id == uuid.UUID(page_id))
        )
        page = result.scalar_one_or_none()
        
        if not page:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Page not found"
            )
        
        await db.delete(page)
        await db.commit()
        
        return {"message": "Page deleted successfully"}
    
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid page ID format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete page: {str(e)}"
        )


@router.post("/{page_id}/publish")
async def publish_page(
    page_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Publish a page."""
    try:
        result = await db.execute(
            select(Page).where(Page.id == uuid.UUID(page_id))
        )
        page = result.scalar_one_or_none()
        
        if not page:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Page not found"
            )
        
        page.is_published = True
        page.version += 1
        
        await db.commit()
        await db.refresh(page)
        
        return PageResponse.from_model(page)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish page: {str(e)}"
        )


@router.post("/{page_id}/archive")
async def archive_page(
    page_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Archive a page."""
    try:
        result = await db.execute(
            select(Page).where(Page.id == uuid.UUID(page_id))
        )
        page = result.scalar_one_or_none()
        
        if not page:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Page not found"
            )
        
        page.is_archived = True
        page.version += 1
        
        await db.commit()
        await db.refresh(page)
        
        return PageResponse.from_model(page)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive page: {str(e)}"
        )