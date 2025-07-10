# apps/backend/alembic/versions/002_add_storage_key.py
"""Add storage_key column to pages table

Revision ID: 002
Revises: 001
Create Date: 2025-01-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Add storage_key column to pages table."""
    # Add storage_key column to pages table
    op.add_column('pages', sa.Column('storage_key', sa.String(500), nullable=True))
    
    # Add index for storage_key
    op.create_index('idx_pages_storage_key', 'pages', ['storage_key'])

def downgrade() -> None:
    """Remove storage_key column from pages table."""
    op.drop_index('idx_pages_storage_key', 'pages')
    op.drop_column('pages', 'storage_key')