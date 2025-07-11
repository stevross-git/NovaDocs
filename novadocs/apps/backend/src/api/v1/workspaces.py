# apps/backend/src/api/v1/workspaces.py
"""Workspaces API routes with optional Notion sync."""

import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db_session
from src.core.models import Workspace, User
from src.core.services.notion import NotionService
from src.core.exceptions import NotFoundError
from .pages import get_current_user, generate_slug  # reuse helpers

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


class CreateWorkspaceRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    is_public: bool = False
    settings: Optional[dict] = None
    sync_to_notion: bool = False


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    is_public: bool
    settings: dict
    notion_page_id: Optional[str] = None
    created_at: str
    updated_at: str

    @classmethod
    def from_model(cls, workspace: Workspace) -> "WorkspaceResponse":
        return cls(
            id=str(workspace.id),
            name=workspace.name,
            slug=workspace.slug,
            description=workspace.description,
            is_public=workspace.is_public,
            settings=workspace.settings,
            notion_page_id=workspace.notion_page_id,
            created_at=workspace.created_at.isoformat(),
            updated_at=workspace.updated_at.isoformat(),
        )


@router.get("/", response_model=List[WorkspaceResponse])
async def list_workspaces(db: AsyncSession = Depends(get_db_session)):
    """List all workspaces."""
    result = await db.execute(select(Workspace).order_by(Workspace.created_at.desc()))
    workspaces = result.scalars().all()
    return [WorkspaceResponse.from_model(ws) for ws in workspaces]


@router.post("/", response_model=WorkspaceResponse)
async def create_workspace(
    workspace_data: CreateWorkspaceRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new workspace and optionally sync to Notion."""
    user = await get_current_user(db)

    slug = workspace_data.slug or generate_slug(workspace_data.name)

    workspace = Workspace(
        name=workspace_data.name,
        slug=slug,
        description=workspace_data.description,
        is_public=workspace_data.is_public,
        settings=workspace_data.settings or {},
    )

    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)

    if workspace_data.sync_to_notion:
        notion_service = NotionService()
        try:
            notion_page_id = await notion_service.create_page(workspace.name, workspace.description or "")
            if notion_page_id:
                workspace.notion_page_id = notion_page_id
                await db.commit()
        except Exception as e:  # noqa: BLE001
            print(f"Warning: failed to sync workspace to Notion: {e}")

    return WorkspaceResponse.from_model(workspace)
