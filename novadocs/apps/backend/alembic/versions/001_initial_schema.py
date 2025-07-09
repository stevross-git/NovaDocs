"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Enable UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('provider', sa.String(50)),
        sa.Column('provider_id', sa.String(255)),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Workspaces table
    op.create_table('workspaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text()),
        sa.Column('is_public', sa.Boolean(), default=False),
        sa.Column('settings', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Pages table
    op.create_table('pages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('slug', sa.String(200), nullable=False),
        sa.Column('content', sa.Text(), default=''),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pages.id', ondelete='CASCADE')),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('is_published', sa.Boolean(), default=False),
        sa.Column('is_archived', sa.Boolean(), default=False),
        sa.Column('collaboration_enabled', sa.Boolean(), default=True),
        sa.Column('version', sa.Integer(), default=1),
        sa.Column('content_text', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Blocks table
    op.create_table('blocks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('page_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('data', postgresql.JSONB(), default={}),
        sa.Column('properties', postgresql.JSONB(), default={}),
        sa.Column('position', sa.Integer(), default=0),
        sa.Column('parent_block_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('blocks.id', ondelete='CASCADE')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Databases table
    op.create_table('databases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('page_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('schema', postgresql.JSONB(), default={}),
        sa.Column('views', postgresql.JSONB(), default=[]),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Database rows table
    op.create_table('database_rows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('database_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('databases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data', postgresql.JSONB(), default={}),
        sa.Column('position', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create indexes
    op.create_index('idx_pages_workspace_id', 'pages', ['workspace_id'])
    op.create_index('idx_pages_parent_id', 'pages', ['parent_id'])
    op.create_index('idx_pages_created_by_id', 'pages', ['created_by_id'])
    op.create_index('idx_pages_slug', 'pages', ['slug'])
    op.create_index('idx_blocks_page_id', 'blocks', ['page_id'])
    op.create_index('idx_blocks_parent_block_id', 'blocks', ['parent_block_id'])
    op.create_index('idx_blocks_type', 'blocks', ['type'])
    op.create_index('idx_database_rows_database_id', 'database_rows', ['database_id'])

def downgrade() -> None:
    op.drop_table('database_rows')
    op.drop_table('databases')
    op.drop_table('blocks')
    op.drop_table('pages')
    op.drop_table('workspaces')
    op.drop_table('users')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
