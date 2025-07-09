# backend/src/migrations/001_initial_schema.py
"""Initial database schema migration."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial database schema."""
    
    # Create extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('avatar_url', sa.Text()),
        sa.Column('preferences', postgresql.JSONB(), default={}),
        sa.Column('external_id', sa.String(255)),
        sa.Column('provider', sa.String(50)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Workspaces table
    op.create_table(
        'workspaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('settings', postgresql.JSONB(), default={}),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Workspace members table
    op.create_table(
        'workspace_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_user'),
    )
    
    # Pages table
    op.create_table(
        'pages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('slug', sa.String(200), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pages.id', ondelete='CASCADE')),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('metadata', postgresql.JSONB(), default={}),
        sa.Column('content_yjs', sa.Text()),
        sa.Column('content_text', sa.Text()),
        sa.Column('content_vector', postgresql.ARRAY(sa.Float)),  # Will be converted to vector type
        sa.Column('position', sa.Integer, default=0, nullable=False),
        sa.Column('is_template', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('workspace_id', 'slug', name='uq_workspace_slug'),
    )
    
    # Blocks table
    op.create_table(
        'blocks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('page_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('data', postgresql.JSONB(), default={}, nullable=False),
        sa.Column('properties', postgresql.JSONB(), default={}),
        sa.Column('position', sa.Integer, default=0, nullable=False),
        sa.Column('parent_block_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('blocks.id', ondelete='CASCADE')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Databases table
    op.create_table(
        'databases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('page_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('schema', postgresql.JSONB(), default={}, nullable=False),
        sa.Column('views', postgresql.JSONB(), default=[], nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Database rows table
    op.create_table(
        'database_rows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('database_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('databases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data', postgresql.JSONB(), default={}, nullable=False),
        sa.Column('position', sa.Integer, default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Assets table
    op.create_table(
        'assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('size', sa.Integer, nullable=False),
        sa.Column('storage_key', sa.String(500), nullable=False),
        sa.Column('uploaded_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Permissions table
    op.create_table(
        'permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('resource_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission_type', sa.String(50), nullable=False),
        sa.Column('conditions', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Comments table
    op.create_table(
        'comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('page_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pages.id', ondelete='CASCADE')),
        sa.Column('block_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('blocks.id', ondelete='CASCADE')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('metadata', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Share links table
    op.create_table(
        'share_links',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('token', sa.String(100), unique=True, nullable=False),
        sa.Column('resource_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('permissions', postgresql.JSONB(), default={}, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Create indexes
    op.create_index('idx_pages_workspace_id', 'pages', ['workspace_id'])
    op.create_index('idx_pages_parent_id', 'pages', ['parent_id'])
    op.create_index('idx_pages_content_text_gin', 'pages', ['content_text'], postgresql_using='gin')
    op.create_index('idx_blocks_page_id', 'blocks', ['page_id'])
    op.create_index('idx_blocks_parent_block_id', 'blocks', ['parent_block_id'])
    op.create_index('idx_database_rows_database_id', 'database_rows', ['database_id'])
    op.create_index('idx_permissions_resource', 'permissions', ['resource_id', 'resource_type'])
    op.create_index('idx_permissions_user', 'permissions', ['user_id'])
    op.create_index('idx_workspace_members_workspace_id', 'workspace_members', ['workspace_id'])
    op.create_index('idx_workspace_members_user_id', 'workspace_members', ['user_id'])
    
    # Create role check constraints
    op.create_check_constraint(
        'ck_workspace_members_role',
        'workspace_members',
        "role IN ('owner', 'admin', 'editor', 'viewer')"
    )
    
    # Create updated_at trigger function
    op.execute('''
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    ''')
    
    # Create triggers for updated_at
    tables_with_updated_at = [
        'users', 'workspaces', 'pages', 'blocks', 'databases', 'database_rows', 'comments'
    ]
    
    for table in tables_with_updated_at:
        op.execute(f'''
            CREATE TRIGGER update_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ''')
    
    # Convert content_vector to vector type (requires pgvector)
    op.execute('ALTER TABLE pages ALTER COLUMN content_vector TYPE vector(1536)')
    op.create_index('idx_pages_content_vector', 'pages', ['content_vector'], postgresql_using='ivfflat')


def downgrade() -> None:
    """Drop all tables and extensions."""
    
    # Drop triggers first
    tables_with_updated_at = [
        'users', 'workspaces', 'pages', 'blocks', 'databases', 'database_rows', 'comments'
    ]
    
    for table in tables_with_updated_at:
        op.execute(f'DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table}')
    
    op.execute('DROP FUNCTION IF EXISTS update_updated_at_column()')
    
    # Drop tables in reverse order
    op.drop_table('share_links')
    op.drop_table('comments')
    op.drop_table('permissions')
    op.drop_table('assets')
    op.drop_table('database_rows')
    op.drop_table('databases')
    op.drop_table('blocks')
    op.drop_table('pages')
    op.drop_table('workspace_members')
    op.drop_table('workspaces')
    op.drop_table('users')
    
    # Drop extensions
    op.execute('DROP EXTENSION IF EXISTS "vector"')
    op.execute('DROP EXTENSION IF EXISTS "pg_trgm"')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')

# backend/src/core/database.py
"""Database configuration and utilities."""

import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from contextlib import asynccontextmanager

from src.core.config import settings
from src.core.models import Base

# Create async engine
engine = create_async_engine(
    str(settings.DATABASE_URL),
    echo=settings.DATABASE_ECHO,
    poolclass=NullPool if settings.DEBUG else None,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=3600,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db(engine) -> None:
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for FastAPI to get database session."""
    async with get_db() as session:
        yield session