#!/usr/bin/env python3
"""Seed database with sample data for development."""

import asyncio
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import engine, AsyncSessionLocal
from src.core.models import User, Workspace, WorkspaceMember, Page, Block


async def seed_data():
    """Seed database with sample data."""
    async with AsyncSessionLocal() as session:
        # Create sample users
        users = [
            User(
                id=uuid.uuid4(),
                email="admin@novadocs.com",
                name="Admin User",
                preferences={"theme": "light", "notifications": True}
            ),
            User(
                id=uuid.uuid4(),
                email="editor@novadocs.com",
                name="Editor User",
                preferences={"theme": "dark", "notifications": False}
            ),
            User(
                id=uuid.uuid4(),
                email="viewer@novadocs.com",
                name="Viewer User",
                preferences={"theme": "light", "notifications": True}
            )
        ]
        
        for user in users:
            session.add(user)
        
        await session.commit()
        
        # Create sample workspace
        workspace = Workspace(
            id=uuid.uuid4(),
            name="Demo Workspace",
            slug="demo-workspace",
            description="A demo workspace for testing NovaDocs",
            settings={"public": True, "allow_comments": True},
            owner_id=users[0].id
        )
        session.add(workspace)
        
        # Add workspace members
        members = [
            WorkspaceMember(
                id=uuid.uuid4(),
                workspace_id=workspace.id,
                user_id=users[0].id,
                role="owner"
            ),
            WorkspaceMember(
                id=uuid.uuid4(),
                workspace_id=workspace.id,
                user_id=users[1].id,
                role="editor"
            ),
            WorkspaceMember(
                id=uuid.uuid4(),
                workspace_id=workspace.id,
                user_id=users[2].id,
                role="viewer"
            )
        ]
        
        for member in members:
            session.add(member)
        
        await session.commit()
        
        # Create sample pages
        home_page = Page(
            id=uuid.uuid4(),
            title="Welcome to NovaDocs",
            slug="welcome",
            workspace_id=workspace.id,
            created_by_id=users[0].id,
            metadata={"icon": "🏠", "cover": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62"},
            content_text="Welcome to NovaDocs - A modern collaborative wiki platform",
            position=0,
            is_template=False
        )
        session.add(home_page)
        
        await session.commit()
        
        print("✅ Database seeded successfully!")
        print(f"   - Created {len(users)} users")
        print(f"   - Created 1 workspace")
        print(f"   - Created {len(members)} workspace members")
        print(f"   - Created 1 page")


if __name__ == "__main__":
    asyncio.run(seed_data())
