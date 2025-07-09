"""
SQLAlchemy database models for NovaDocs.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime, ForeignKey, 
    UniqueConstraint, Index, JSON, LargeBinary
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

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
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    preferences: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    # External auth
    external_id: Mapped[Optional[str]] = mapped_column(String(255))
    provider: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Relationships
    owned_workspaces: Mapped[List["Workspace"]] = relationship(
        "Workspace", back_populates="owner"
    )
    workspace_memberships: Mapped[List["WorkspaceMember"]] = relationship(
        "WorkspaceMember", back_populates="user"
    )
    created_pages: Mapped[List["Page"]] = relationship(
        "Page", back_populates="created_by"
    )
    uploaded_assets: Mapped[List["Asset"]] = relationship(
        "Asset", back_populates="uploaded_by"
    )
    permissions: Mapped[List["Permission"]] = relationship(
        "Permission", back_populates="user"
    )
    comments: Mapped[List["Comment"]] = relationship(
        "Comment", back_populates="user"
    )
    
    def __repr__(self):
        return f"<User {self.email}>"


class Workspace(Base, TimestampMixin):
    """Workspace model."""
    
    __tablename__ = "workspaces"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    # Owner
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_workspaces")
    members: Mapped[List["WorkspaceMember"]] = relationship(
        "WorkspaceMember", back_populates="workspace"
    )
    pages: Mapped[List["Page"]] = relationship(
        "Page", back_populates="workspace"
    )
    assets: Mapped[List["Asset"]] = relationship(
        "Asset", back_populates="workspace"
    )
    permissions: Mapped[List["Permission"]] = relationship(
        "Permission", back_populates="workspace"
    )
    
    def __repr__(self):
        return f"<Workspace {self.name}>"


class WorkspaceMember(Base):
    """Workspace member model."""
    
    __tablename__ = "workspace_members"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    
    # Relationships
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="members"
    )
    user: Mapped["User"] = relationship(
        "User", back_populates="workspace_memberships"
    )
    
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),
    )
    
    def __repr__(self):
        return f"<WorkspaceMember {self.user.email} in {self.workspace.name}>"


class Page(Base, TimestampMixin):
    """Page model."""
    
    __tablename__ = "pages"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    
    # Workspace and hierarchy
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("pages.id", ondelete="CASCADE")
    )
    
    # Author
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Content
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    content_yjs: Mapped[Optional[str]] = mapped_column(Text)  # Yjs document state
    content_text: Mapped[Optional[str]] = mapped_column(Text)  # Plain text for search
    content_vector: Mapped[Optional[List[float]]] = mapped_column(
        Vector(1536)  # OpenAI embedding dimension
    )
    
    # Organization
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Relationships
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="pages"
    )
    created_by: Mapped["User"] = relationship(
        "User", back_populates="created_pages"
    )
    parent: Mapped[Optional["Page"]] = relationship(
        "Page", remote_side=[id], back_populates="children"
    )
    children: Mapped[List["Page"]] = relationship(
        "Page", back_populates="parent"
    )
    blocks: Mapped[List["Block"]] = relationship(
        "Block", back_populates="page", cascade="all, delete-orphan"
    )
    databases: Mapped[List["Database"]] = relationship(
        "Database", back_populates="page", cascade="all, delete-orphan"
    )
    permissions: Mapped[List["Permission"]] = relationship(
        "Permission", 
        primaryjoin="and_(Permission.resource_id == Page.id, Permission.resource_type == 'page')",
        viewonly=True
    )
    comments: Mapped[List["Comment"]] = relationship(
        "Comment", back_populates="page"
    )
    
    __table_args__ = (
        UniqueConstraint("workspace_id", "slug", name="uq_workspace_slug"),
        Index("idx_pages_workspace_id", "workspace_id"),
        Index("idx_pages_parent_id", "parent_id"),
        Index("idx_pages_content_text_gin", "content_text", postgresql_using="gin"),
        Index("idx_pages_content_vector", "content_vector", postgresql_using="ivfflat"),
    )
    
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
    data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    properties: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parent_block_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("blocks.id", ondelete="CASCADE")
    )
    
    # Relationships
    page: Mapped["Page"] = relationship("Page", back_populates="blocks")
    parent_block: Mapped[Optional["Block"]] = relationship(
        "Block", remote_side=[id], back_populates="child_blocks"
    )
    child_blocks: Mapped[List["Block"]] = relationship(
        "Block", back_populates="parent_block"
    )
    comments: Mapped[List["Comment"]] = relationship(
        "Comment", back_populates="block"
    )
    
    __table_args__ = (
        Index("idx_blocks_page_id", "page_id"),
        Index("idx_blocks_parent_block_id", "parent_block_id"),
    )
    
    def __repr__(self):
        return f"<Block {self.type} in {self.page.title}>"


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
    schema: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    views: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    
    # Relationships
    page: Mapped["Page"] = relationship("Page", back_populates="databases")
    rows: Mapped[List["DatabaseRow"]] = relationship(
        "DatabaseRow", back_populates="database", cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Database {self.name}>"


class DatabaseRow(Base, TimestampMixin):
    """Database row model."""
    
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
    data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Relationships
    database: Mapped["Database"] = relationship("Database", back_populates="rows")
    
    __table_args__ = (
        Index("idx_database_rows_database_id", "database_id"),
    )
    
    def __repr__(self):
        return f"<DatabaseRow in {self.database.name}>"


class Asset(Base, TimestampMixin):
    """Asset model for file uploads."""
    
    __tablename__ = "assets"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Relationships
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False
    )
    
    uploaded_by: Mapped["User"] = relationship("User", back_populates="uploaded_assets")
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="assets")
    
    def __repr__(self):
        return f"<Asset {self.filename}>"


class Permission(Base, TimestampMixin):
    """Permission model for access control."""
    
    __tablename__ = "permissions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    resource_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE")
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False
    )
    
    permission_type: Mapped[str] = mapped_column(String(50), nullable=False)
    conditions: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="permissions")
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="permissions")
    
    __table_args__ = (
        Index("idx_permissions_resource", "resource_id", "resource_type"),
        Index("idx_permissions_user", "user_id"),
    )
    
    def __repr__(self):
        return f"<Permission {self.permission_type} for {self.resource_type}>"


class Comment(Base, TimestampMixin):
    """Comment model."""
    
    __tablename__ = "comments"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    page_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("pages.id", ondelete="CASCADE")
    )
    block_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("blocks.id", ondelete="CASCADE")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    # Relationships
    page: Mapped[Optional["Page"]] = relationship("Page", back_populates="comments")
    block: Mapped[Optional["Block"]] = relationship("Block", back_populates="comments")
    user: Mapped["User"] = relationship("User", back_populates="comments")
    
    def __repr__(self):
        return f"<Comment by {self.user.email}>"


class ShareLink(Base, TimestampMixin):
    """Share link model for public access."""
    
    __tablename__ = "share_links"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    token: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    permissions: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<ShareLink {self.token}>"