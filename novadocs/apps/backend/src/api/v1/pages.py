# apps/backend/src/api/v1/pages.py
"""Pages API routes with MinIO document storage."""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from src.core.database import get_db_session
from src.core.models import Page, User, Workspace, Block, Asset, ShareLink
from src.core.services.storage import storage_service
from src.core.services.notion import NotionService
from src.core.exceptions import NotFoundError, PermissionError, StorageError

router = APIRouter(prefix="/api/v1/pages", tags=["pages"])


class CreatePageRequest(BaseModel):
    title: str
    content: Optional[str] = ""
    workspace_id: Optional[str] = None
    parent_id: Optional[str] = None
    is_template: bool = False
    sync_to_notion: bool = False


class UpdatePageRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    content_text: Optional[str] = None
    is_published: Optional[bool] = None
    is_archived: Optional[bool] = None
    sync_to_notion: bool = False


class PageResponse(BaseModel):
    id: str
    title: str
    slug: str
    content: str
    storage_key: Optional[str]
    workspace_id: str
    parent_id: Optional[str]
    created_by_id: str
    is_published: bool
    is_archived: bool
    collaboration_enabled: bool
    version: int
    created_at: str
    updated_at: str
    document_url: Optional[str] = None
    
    @classmethod
    def from_model(cls, page: Page, content: str = "", document_url: str = None) -> "PageResponse":
        return cls(
            id=str(page.id),
            title=page.title,
            slug=page.slug,
            content=content,
            storage_key=getattr(page, 'storage_key', None),
            workspace_id=str(page.workspace_id),
            parent_id=str(page.parent_id) if page.parent_id else None,
            created_by_id=str(page.created_by_id),
            is_published=page.is_published,
            is_archived=page.is_archived,
            collaboration_enabled=page.collaboration_enabled,
            version=page.version,
            created_at=page.created_at.isoformat(),
            updated_at=page.updated_at.isoformat(),
            document_url=document_url
        )


class AssetResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    mime_type: str
    size: int
    public_url: str
    created_at: str


class ShareLinkResponse(BaseModel):
    token: str
    page_id: str
    permission: str
    expires_at: Optional[str] = None
    url: str


class CreateShareLinkRequest(BaseModel):
    permission: str = "read"
    expires_in_days: Optional[int] = None


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
    """List all pages with their content from MinIO."""
    try:
        query = select(Page).order_by(Page.updated_at.desc())
        
        if workspace_id:
            query = query.where(Page.workspace_id == uuid.UUID(workspace_id))
        
        result = await db.execute(query)
        pages = result.scalars().all()
        
        page_responses = []
        for page in pages:
            content = ""
            document_url = None
            
            # Try to get content from MinIO if storage_key exists
            if hasattr(page, 'storage_key') and page.storage_key:
                try:
                    document = await storage_service.retrieve_document(page.storage_key)
                    content = document.get('content', '')
                    document_url = await storage_service.get_asset_url(page.storage_key)
                except Exception as e:
                    print(f"Warning: Could not retrieve document for page {page.id}: {e}")
                    content = getattr(page, 'content', '')
            else:
                content = getattr(page, 'content', '')
            
            page_responses.append(PageResponse.from_model(page, content, document_url))
        
        return page_responses
    
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
    """Get a specific page with content from MinIO."""
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
        
        content = ""
        document_url = None
        
        # Try to get content from MinIO if storage_key exists
        if hasattr(page, 'storage_key') and page.storage_key:
            try:
                document = await storage_service.retrieve_document(page.storage_key)
                content = document.get('content', '')
                document_url = await storage_service.get_asset_url(page.storage_key)
            except Exception as e:
                print(f"Warning: Could not retrieve document for page {page_id}: {e}")
                content = getattr(page, 'content', '')
        else:
            content = getattr(page, 'content', '')
        
        return PageResponse.from_model(page, content, document_url)
    
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
    """Create a new page and store content in MinIO."""
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
        
        # Create page in database (without content)
        page = Page(
            title=page_data.title,
            slug=slug,
            content="",  # Content will be stored in MinIO
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
        await db.flush()  # Get the page ID
        
        # Store document content in MinIO
        storage_key = None
        if page_data.content:
            try:
                storage_key = await storage_service.store_document(
                    page_id=page.id,
                    content=page_data.content,
                    title=page_data.title,
                    version=1,
                    metadata={"created_by": str(user.id)}
                )
                
                # Update page with storage key
                page.storage_key = storage_key
                
            except StorageError as e:
                # If MinIO storage fails, store in database as fallback
                print(f"Warning: MinIO storage failed, using database fallback: {e}")
                page.content = page_data.content
        
        await db.commit()
        await db.refresh(page)

        # Optionally create a copy in Notion
        if page_data.sync_to_notion:
            notion_service = NotionService()
            try:
                notion_page_id = await notion_service.create_page(page.title, page_data.content or "")
                if notion_page_id:
                    page.notion_page_id = notion_page_id
                    await db.commit()
            except Exception as e:  # noqa: BLE001
                print(f"Warning: failed to sync page to Notion: {e}")

        return PageResponse.from_model(page, page_data.content or "")
    
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
    """Update an existing page and its content in MinIO."""
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
        
        # Get current user
        user = await get_current_user(db)
        
        # Create backup of current version if content is being updated
        if page_data.content and hasattr(page, 'storage_key') and page.storage_key:
            try:
                await storage_service.backup_document(
                    page_id=page.id,
                    content=page_data.content,
                    title=page.title
                )
            except Exception as e:
                print(f"Warning: Backup creation failed: {e}")
        
        # Update database fields
        update_data = page_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if hasattr(page, field) and field != 'content':
                setattr(page, field, value)
        
        # Update slug if title changed
        if page_data.title:
            page.slug = generate_slug(page_data.title)
        
        # Update content_text for search if content changed
        if page_data.content:
            page.content_text = page_data.content
        
        # Increment version
        page.version += 1
        
        # Store updated content in MinIO
        if page_data.content:
            try:
                storage_key = await storage_service.store_document(
                    page_id=page.id,
                    content=page_data.content,
                    title=page.title,
                    version=page.version,
                    metadata={"updated_by": str(user.id)}
                )
                page.storage_key = storage_key
                
            except StorageError as e:
                # If MinIO storage fails, store in database as fallback
                print(f"Warning: MinIO storage failed, using database fallback: {e}")
                page.content = page_data.content
        
        await db.commit()
        await db.refresh(page)

        # Optionally sync to Notion
        if page_data.sync_to_notion and page.notion_page_id:
            notion_service = NotionService()
            try:
                await notion_service.update_page(
                    page.notion_page_id,
                    title=page_data.title,
                    content=page_data.content,
                )
            except Exception as e:  # noqa: BLE001
                print(f"Warning: failed to update Notion page: {e}")

        return PageResponse.from_model(page, page_data.content or "")
    
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
    """Delete a page and its content from MinIO."""
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
        
        # Delete document from MinIO if it exists
        if hasattr(page, 'storage_key') and page.storage_key:
            try:
                await storage_service.delete_document(page.storage_key)
            except Exception as e:
                print(f"Warning: Could not delete document from MinIO: {e}")
        
        # Delete page from database
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


@router.post("/{page_id}/assets", response_model=AssetResponse)
async def upload_asset(
    page_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session)
):
    """Upload an asset/file to MinIO for a specific page."""
    try:
        # Get the page to verify it exists
        result = await db.execute(
            select(Page).where(Page.id == uuid.UUID(page_id))
        )
        page = result.scalar_one_or_none()
        
        if not page:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Page not found"
            )
        
        # Get current user
        user = await get_current_user(db)
        
        # Store asset in MinIO
        asset_info = await storage_service.store_asset(
            file=file,
            workspace_id=page.workspace_id,
            uploaded_by_id=user.id,
            folder=f"page-assets/{page_id}"
        )
        
        # Create asset record in database
        asset = Asset(
            filename=asset_info["filename"],
            original_filename=asset_info["original_filename"],
            mime_type=asset_info["mime_type"],
            size=asset_info["size"],
            uploaded_by_id=asset_info["uploaded_by_id"],
            workspace_id=asset_info["workspace_id"],
            storage_path=asset_info["storage_key"],
            public_url=asset_info["public_url"]
        )
        
        db.add(asset)
        await db.commit()
        await db.refresh(asset)
        
        return AssetResponse(
            id=str(asset.id),
            filename=asset.filename,
            original_filename=asset.original_filename,
            mime_type=asset.mime_type,
            size=asset.size,
            public_url=asset.public_url,
            created_at=asset.created_at.isoformat()
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload asset: {str(e)}"
        )


@router.get("/{page_id}/versions")
async def get_page_versions(
    page_id: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Get all versions/backups of a page from MinIO."""
    try:
        # Verify page exists
        result = await db.execute(
            select(Page).where(Page.id == uuid.UUID(page_id))
        )
        page = result.scalar_one_or_none()
        
        if not page:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Page not found"
            )
        
        # Get document versions from MinIO
        documents = await storage_service.list_documents(page.id)
        
        return {
            "page_id": page_id,
            "versions": documents
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get page versions: {str(e)}"
        )


@router.post("/{page_id}/share", response_model=ShareLinkResponse)
async def create_share_link(
    page_id: str,
    link_data: CreateShareLinkRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a shareable link for a page."""
    try:
        result = await db.execute(
            select(Page).where(Page.id == uuid.UUID(page_id))
        )
        page = result.scalar_one_or_none()

        if not page:
            raise HTTPException(status_code=404, detail="Page not found")

        user = await get_current_user(db)

        expires_at = None
        if link_data.expires_in_days:
            from datetime import datetime, timedelta

            expires_at = datetime.utcnow() + timedelta(days=link_data.expires_in_days)

        share_link = ShareLink(
            token=uuid.uuid4().hex,
            page_id=page.id,
            created_by_id=user.id,
            permission=link_data.permission,
            expires_at=expires_at,
        )
        db.add(share_link)
        await db.commit()
        await db.refresh(share_link)

        url = f"/share/{share_link.token}"

        return ShareLinkResponse(
            token=share_link.token,
            page_id=str(page.id),
            permission=share_link.permission,
            expires_at=share_link.expires_at.isoformat() if share_link.expires_at else None,
            url=url,
        )

    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create share link: {e}",
        )


@router.get("/shared/{token}", response_model=PageResponse)
async def get_shared_page(token: str, db: AsyncSession = Depends(get_db_session)):
    """Retrieve a page via a share link token."""
    try:
        result = await db.execute(
            select(ShareLink).where(ShareLink.token == token, ShareLink.is_active == True)
        )
        share_link = result.scalar_one_or_none()

        if not share_link:
            raise HTTPException(status_code=404, detail="Share link not found")

        if share_link.expires_at and share_link.expires_at < datetime.utcnow():
            raise HTTPException(status_code=404, detail="Share link expired")

        result = await db.execute(select(Page).where(Page.id == share_link.page_id))
        page = result.scalar_one_or_none()

        if not page:
            raise HTTPException(status_code=404, detail="Page not found")

        content = ""
        document_url = None
        if hasattr(page, "storage_key") and page.storage_key:
            try:
                document = await storage_service.retrieve_document(page.storage_key)
                content = document.get("content", "")
                document_url = await storage_service.get_asset_url(page.storage_key)
            except Exception:
                content = getattr(page, "content", "")
        else:
            content = getattr(page, "content", "")

        return PageResponse.from_model(page, content, document_url)

    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve shared page: {e}",
        )