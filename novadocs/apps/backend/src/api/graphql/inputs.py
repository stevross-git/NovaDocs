# apps/backend/src/api/graphql/inputs.py
"""GraphQL input types."""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
import strawberry


@strawberry.input
class CreateWorkspaceInput:
    name: str
    slug: str
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


@strawberry.input
class UpdateWorkspaceInput:
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


@strawberry.input
class CreatePageInput:
    title: str
    workspace_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    position: Optional[int] = None
    is_template: Optional[bool] = None


@strawberry.input
class UpdatePageInput:
    title: Optional[str] = None
    slug: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    content_yjs: Optional[str] = None
    position: Optional[int] = None
    is_template: Optional[bool] = None


@strawberry.input
class CreateBlockInput:
    page_id: uuid.UUID
    type: str
    data: Dict[str, Any]
    properties: Optional[Dict[str, Any]] = None
    position: int
    parent_block_id: Optional[uuid.UUID] = None


@strawberry.input
class UpdateBlockInput:
    type: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    properties: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


@strawberry.input
class CreateDatabaseInput:
    page_id: uuid.UUID
    name: str
    schema: Dict[str, Any]
    views: Optional[List[Dict[str, Any]]] = None


@strawberry.input
class UpdateDatabaseInput:
    name: Optional[str] = None
    schema: Optional[Dict[str, Any]] = None
    views: Optional[List[Dict[str, Any]]] = None


@strawberry.input
class CreateDatabaseRowInput:
    database_id: uuid.UUID
    data: Dict[str, Any]
    position: Optional[int] = None


@strawberry.input
class UpdateDatabaseRowInput:
    data: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


@strawberry.input
class CreateCommentInput:
    page_id: Optional[uuid.UUID] = None
    block_id: Optional[uuid.UUID] = None
    content: str
    metadata: Optional[Dict[str, Any]] = None


@strawberry.input
class UpdateCommentInput:
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@strawberry.input
class GrantPermissionInput:
    resource_id: uuid.UUID
    resource_type: str
    user_id: Optional[uuid.UUID] = None
    workspace_id: uuid.UUID
    permission_type: str
    conditions: Optional[Dict[str, Any]] = None


@strawberry.input
class CreateShareLinkInput:
    resource_id: uuid.UUID
    resource_type: str
    permissions: Dict[str, Any]
    expires_at: Optional[datetime] = None