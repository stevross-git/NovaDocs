"""Database models for NovaDocs."""

import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy import String, Text, Integer, Boolean, DateTime, JSON, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )


class User(Base, TimestampMixin):
    """User model."""
    
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    # OAuth fields
    provider: Mapped[Optional[str]] = mapped_column(String(50))
    provider_id: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    def __repr__(self):
        return f"<User {self.email}>"


class Workspace(Base, TimestampMixin):
    """Workspace model for team organization."""
    
    __tablename__ = "workspaces"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Settings
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    notion_page_id: Mapped[Optional[str]] = mapped_column(String(100))
    
    def __repr__(self):
        return f"<Workspace {self.name}>"


class Page(Base, TimestampMixin):
    """Page model for documents."""
    
    __tablename__ = "pages"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, default="")  # Fallback content storage
    
    # MinIO Storage
    storage_key: Mapped[Optional[str]] = mapped_column(String(500))  # MinIO object key
    
    # Relationships
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("pages.id", ondelete="CASCADE")
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"),
        nullable=False
    )
    
    # Status
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    collaboration_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Versioning
    version: Mapped[int] = mapped_column(Integer, default=1)
    notion_page_id: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Search
    content_text: Mapped[Optional[str]] = mapped_column(Text)  # Plain text for search
    
    def __repr__(self):
        return f"<Page {self.title}>"


class Block(Base, TimestampMixin):
    """Block model for page content."""
    
    __tablename__ = "blocks"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    properties: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    # Hierarchy
    position: Mapped[int] = mapped_column(Integer, default=0)
    parent_block_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("blocks.id", ondelete="CASCADE")
    )
    
    def __repr__(self):
        return f"<Block {self.type}>"


class Database(Base, TimestampMixin):
    """Database model for structured data."""
    
    __tablename__ = "databases"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    schema: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    views: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    
    def __repr__(self):
        return f"<Database {self.name}>"


class DatabaseRow(Base, TimestampMixin):
    """Database row model for structured data entries."""
    
    __tablename__ = "database_rows"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    database_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("databases.id", ondelete="CASCADE"),
        nullable=False
    )
    data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    position: Mapped[int] = mapped_column(Integer, default=0)
    
    def __repr__(self):
        return f"<DatabaseRow {self.id}>"


class Comment(Base, TimestampMixin):
    """Comment model for collaboration."""
    
    __tablename__ = "comments"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Relationships
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"),
        nullable=False
    )
    page_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("pages.id", ondelete="CASCADE")
    )
    block_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("blocks.id", ondelete="CASCADE")
    )
    
    # Threading
    parent_comment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("comments.id", ondelete="CASCADE")
    )
    
    # Status
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    
    def __repr__(self):
        return f"<Comment {self.id}>"


class Permission(Base, TimestampMixin):
    """Permission model for access control."""
    
    __tablename__ = "permissions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    resource_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'workspace', 'page', etc.
    permission: Mapped[str] = mapped_column(String(50), nullable=False)  # 'read', 'write', 'admin'
    
    def __repr__(self):
        return f"<Permission {self.user_id} {self.permission} {self.resource_type}>"


class Asset(Base, TimestampMixin):
    """Asset model for file uploads."""
    
    __tablename__ = "assets"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Relationships
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"),
        nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Storage
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    public_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    def __repr__(self):
        return f"<Asset {self.filename}>"


class ShareLink(Base, TimestampMixin):
    """Share link model for public access."""
    
    __tablename__ = "share_links"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    
    # Relationships
    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"),
        nullable=False
    )
    
    # Settings
    permission: Mapped[str] = mapped_column(String(50), default="read")  # 'read', 'comment', 'edit'
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<ShareLink {self.token}>"


class Favorite(Base, TimestampMixin):
    """User favorite pages."""

    __tablename__ = "favorites"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "page_id", name="uq_favorite_user_page"),
    )

    def __repr__(self):
        return f"<Favorite {self.user_id} {self.page_id}>"


# Indexes for performance
Index('idx_pages_workspace_id', Page.workspace_id)
Index('idx_pages_parent_id', Page.parent_id)
Index('idx_pages_slug', Page.slug)
Index('idx_blocks_page_id', Block.page_id)
Index('idx_blocks_parent_block_id', Block.parent_block_id)
Index('idx_blocks_type', Block.type)
Index('idx_database_rows_database_id', DatabaseRow.database_id)
Index('idx_permissions_resource', Permission.resource_id, Permission.resource_type)
Index('idx_permissions_user', Permission.user_id)
Index('idx_comments_page_id', Comment.page_id)
Index('idx_comments_block_id', Comment.block_id)
Index('idx_assets_workspace_id', Asset.workspace_id)
Index('idx_favorites_user_id', Favorite.user_id)
