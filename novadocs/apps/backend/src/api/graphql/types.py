# apps/backend/src/api/graphql/types.py
"""GraphQL types."""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
import strawberry

from src.core.models import (
    User as UserModel,
    Workspace as WorkspaceModel,
    Page as PageModel,
    Block as BlockModel,
    Database as DatabaseModel,
    DatabaseRow as DatabaseRowModel,
    Permission as PermissionModel,
    Comment as CommentModel,
    ShareLink as ShareLinkModel,
)


@strawberry.type
class User:
    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    preferences: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_model(cls, model: UserModel) -> "User":
        return cls(
            id=model.id,
            email=model.email,
            name=model.name,
            avatar_url=model.avatar_url,
            preferences=model.preferences,
            created_at=model.created_at,
            updated_at=model.updated_at
        )


@strawberry.type
class WorkspaceMember:
    id: uuid.UUID
    user: User
    role: str
    joined_at: datetime


@strawberry.type
class Workspace:
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    settings: Dict[str, Any]
    owner: User
    members: List[WorkspaceMember] = strawberry.field(default_factory=list)
    pages: List["Page"] = strawberry.field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_model(cls, model: WorkspaceModel) -> "Workspace":
        return cls(
            id=model.id,
            name=model.name,
            slug=model.slug,
            description=model.description,
            settings=model.settings,
            owner=User.from_model(model.owner),
            created_at=model.created_at,
            updated_at=model.updated_at
        )


@strawberry.type
class Page:
    id: uuid.UUID
    title: str
    slug: str
    workspace: Workspace
    parent: Optional["Page"] = None
    children: List["Page"] = strawberry.field(default_factory=list)
    created_by: User
    metadata: Dict[str, Any]
    content_yjs: Optional[str] = None
    position: int
    is_template: bool
    blocks: List["Block"] = strawberry.field(default_factory=list)
    permissions: List["Permission"] = strawberry.field(default_factory=list)
    comments: List["Comment"] = strawberry.field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_model(cls, model: PageModel) -> "Page":
        return cls(
            id=model.id,
            title=model.title,
            slug=model.slug,
            workspace=Workspace.from_model(model.workspace),
            created_by=User.from_model(model.created_by),
            metadata=model.metadata,
            content_yjs=model.content_yjs,
            position=model.position,
            is_template=model.is_template,
            created_at=model.created_at,
            updated_at=model.updated_at
        )


@strawberry.type
class Block:
    id: uuid.UUID
    page: Page
    type: str
    data: Dict[str, Any]
    properties: Optional[Dict[str, Any]] = None
    position: int
    parent_block: Optional["Block"] = None
    child_blocks: List["Block"] = strawberry.field(default_factory=list)
    comments: List["Comment"] = strawberry.field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_model(cls, model: BlockModel) -> "Block":
        return cls(
            id=model.id,
            page=Page.from_model(model.page),
            type=model.type,
            data=model.data,
            properties=model.properties,
            position=model.position,
            created_at=model.created_at,
            updated_at=model.updated_at
        )


@strawberry.type
class Database:
    id: uuid.UUID
    page: Page
    name: str
    schema: Dict[str, Any]
    views: List[Dict[str, Any]]
    rows: List["DatabaseRow"] = strawberry.field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_model(cls, model: DatabaseModel) -> "Database":
        return cls(
            id=model.id,
            page=Page.from_model(model.page),
            name=model.name,
            schema=model.schema,
            views=model.views,
            created_at=model.created_at,
            updated_at=model.updated_at
        )


@strawberry.type
class DatabaseRow:
    id: uuid.UUID
    database: Database
    data: Dict[str, Any]
    position: int
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_model(cls, model: DatabaseRowModel) -> "DatabaseRow":
        return cls(
            id=model.id,
            database=Database.from_model(model.database),
            data=model.data,
            position=model.position,
            created_at=model.created_at,
            updated_at=model.updated_at
        )


@strawberry.type
class Permission:
    id: uuid.UUID
    resource_id: uuid.UUID
    resource_type: str
    user: Optional[User] = None
    workspace: Workspace
    permission_type: str
    conditions: Dict[str, Any]
    created_at: datetime
    
    @classmethod
    def from_model(cls, model: PermissionModel) -> "Permission":
        return cls(
            id=model.id,
            resource_id=model.resource_id,
            resource_type=model.resource_type,
            user=User.from_model(model.user) if model.user else None,
            workspace=Workspace.from_model(model.workspace),
            permission_type=model.permission_type,
            conditions=model.conditions,
            created_at=model.created_at
        )


@strawberry.type
class Comment:
    id: uuid.UUID
    page: Optional[Page] = None
    block: Optional[Block] = None
    user: User
    content: str
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_model(cls, model: CommentModel) -> "Comment":
        return cls(
            id=model.id,
            page=Page.from_model(model.page) if model.page else None,
            block=Block.from_model(model.block) if model.block else None,
            user=User.from_model(model.user),
            content=model.content,
            metadata=model.metadata,
            created_at=model.created_at,
            updated_at=model.updated_at
        )


@strawberry.type
class ShareLink:
    id: uuid.UUID
    token: str
    resource_id: uuid.UUID
    resource_type: str
    permissions: Dict[str, Any]
    expires_at: Optional[datetime] = None
    created_at: datetime
    
    @classmethod
    def from_model(cls, model: ShareLinkModel) -> "ShareLink":
        return cls(
            id=model.id,
            token=model.token,
            resource_id=model.resource_id,
            resource_type=model.resource_type,
            permissions=model.permissions,
            expires_at=model.expires_at,
            created_at=model.created_at
        )