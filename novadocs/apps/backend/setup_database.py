#!/usr/bin/env python3
"""Database setup script for NovaDocs."""

import asyncio
import logging
import sys
import os

# Add the backend source to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sqlalchemy import text
from src.core.config import settings
from src.core.database import engine, init_db
from src.core.models import Base, User, Workspace, Page

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def setup_database():
    """Initialize database and create sample data."""
    logger.info("🔧 Setting up NovaDocs database...")
    
    try:
        # Initialize database tables
        logger.info("📊 Creating database tables...")
        await init_db(engine)
        logger.info("✅ Database tables created successfully")
        
        # Create sample data
        logger.info("📝 Creating sample data...")
        await create_sample_data()
        logger.info("✅ Sample data created successfully")
        
        logger.info("🎉 Database setup completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}")
        raise
    finally:
        await engine.dispose()


async def create_sample_data():
    """Create sample users, workspaces, and pages."""
    from src.core.database import get_db
    
    async with get_db() as db:
        # Check if data already exists
        from sqlalchemy import select
        result = await db.execute(select(User))
        existing_users = result.scalars().all()
        
        if existing_users:
            logger.info("🔄 Sample data already exists, skipping creation")
            return
        
        # Create demo user
        demo_user = User(
            email="demo@novadocs.com",
            name="Demo User",
            provider="local",
            is_active=True,
            is_verified=True
        )
        db.add(demo_user)
        await db.flush()  # Get the ID
        
        # Create default workspace
        default_workspace = Workspace(
            name="Default Workspace",
            slug="default",
            description="Default workspace for getting started with NovaDocs",
            is_public=True,
            settings={
                "theme": "light",
                "collaboration_enabled": True,
                "public_sharing": True
            }
        )
        db.add(default_workspace)
        await db.flush()  # Get the ID
        
        # Create sample pages
        welcome_page = Page(
            title="Welcome to NovaDocs",
            slug="welcome-to-novadocs",
            content="""
# Welcome to NovaDocs! 🎉

Congratulations on setting up your NovaDocs instance! This is your collaborative wiki platform.

## What can you do here?

- 📝 **Create and edit pages** with real-time collaboration
- 🗂️ **Organize content** in hierarchical structures
- 📊 **Build databases** with table, kanban, and calendar views
- 🔍 **Search** across all your content
- 👥 **Collaborate** with your team in real-time

## Getting Started

1. **Create your first page** by clicking the "New Page" button
2. **Explore the editor** with rich text formatting and blocks
3. **Invite team members** to collaborate
4. **Organize your content** in folders and hierarchies

## Features

### Real-time Collaboration
Work together with your team in real-time. See cursors, edits, and comments as they happen.

### Rich Content Blocks
Create different types of content:
- Text paragraphs
- Headings and lists  
- Code blocks
- Images and files
- Database views
- And much more!

### Powerful Search
Find anything quickly with full-text search across all your pages and databases.

---

**Happy documenting!** 🚀
            """.strip(),
            workspace_id=default_workspace.id,
            created_by_id=demo_user.id,
            is_published=True,
            collaboration_enabled=True,
            version=1,
            content_text="Welcome to NovaDocs! Congratulations on setting up your NovaDocs instance! This is your collaborative wiki platform."
        )
        db.add(welcome_page)
        
        getting_started_page = Page(
            title="Getting Started Guide",
            slug="getting-started",
            content="""
# Getting Started with NovaDocs

This guide will help you get up and running with NovaDocs quickly.

## Basic Concepts

### Pages
Pages are the fundamental unit of content in NovaDocs. Each page can contain:
- Rich text content
- Images and files
- Database views
- Code blocks
- And more!

### Workspaces
Workspaces help you organize content by team, project, or topic. You can have multiple workspaces and control access to each one.

### Collaboration
NovaDocs supports real-time collaborative editing. Multiple people can edit the same page simultaneously and see each other's changes instantly.

## Your First Page

1. Click "New Page" in the sidebar
2. Give your page a title
3. Start typing in the editor
4. Use "/" commands to add different types of content blocks
5. Save and share with your team

## Tips and Tricks

- Use **Ctrl/Cmd + K** to quickly search for pages
- Type **/** to see available content blocks
- Use **@** to mention team members
- Create templates for consistent page structures

## Need Help?

- Check out the documentation
- Join our community forum
- Contact support

Happy collaborating! 🎉
            """.strip(),
            workspace_id=default_workspace.id,
            created_by_id=demo_user.id,
            parent_id=welcome_page.id,
            is_published=True,
            collaboration_enabled=True,
            version=1,
            content_text="Getting Started with NovaDocs. This guide will help you get up and running with NovaDocs quickly."
        )
        db.add(getting_started_page)
        
        # Create an API documentation page
        api_docs_page = Page(
            title="API Documentation",
            slug="api-documentation",
            content="""
# NovaDocs API Documentation

Welcome to the NovaDocs API documentation. This page contains information about using the NovaDocs REST API and GraphQL endpoints.

## Authentication

NovaDocs uses OAuth 2.0 for authentication. Include your access token in the Authorization header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## REST API Endpoints

### Pages

#### List Pages
```http
GET /api/v1/pages
```

#### Create Page
```http
POST /api/v1/pages
Content-Type: application/json

{
  "title": "My New Page",
  "content": "Page content here",
  "workspace_id": "workspace-uuid"
}
```

#### Get Page
```http
GET /api/v1/pages/{page_id}
```

#### Update Page
```http
PUT /api/v1/pages/{page_id}
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content"
}
```

#### Delete Page
```http
DELETE /api/v1/pages/{page_id}
```

## GraphQL API

The GraphQL endpoint is available at `/graphql` and supports queries for users, pages, workspaces, and more.

### Example Query
```graphql
query {
  me {
    id
    name
    email
  }
  pages {
    id
    title
    updatedAt
  }
}
```

## WebSocket API

Real-time collaboration is handled through WebSocket connections at `/ws/collaboration/{doc_id}`.

### Message Types

- `yjs_update`: Document content updates
- `cursor_update`: User cursor position updates  
- `presence_update`: User presence information

## Rate Limits

API requests are rate limited to:
- 1000 requests per hour per user
- 100 requests per minute per user

## Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
            """.strip(),
            workspace_id=default_workspace.id,
            created_by_id=demo_user.id,
            is_published=True,
            collaboration_enabled=True,
            version=1,
            content_text="NovaDocs API Documentation. Welcome to the NovaDocs API documentation. REST API GraphQL WebSocket"
        )
        db.add(api_docs_page)
        
        await db.commit()
        logger.info("✅ Sample data created: Demo user, default workspace, and sample pages")


async def check_database_connection():
    """Check if database is accessible."""
    try:
        from src.core.database import get_db
        async with get_db() as db:
            # Fix: Use text() for raw SQL
            await db.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


if __name__ == "__main__":
    print("🚀 NovaDocs Database Setup")
    print(f"📊 Database URL: {settings.DATABASE_URL}")
    print("─" * 50)
    
    # Check database connection first
    if not asyncio.run(check_database_connection()):
        print("\n❌ Cannot connect to database. Please check your DATABASE_URL configuration.")
        print(f"Current DATABASE_URL: {settings.DATABASE_URL}")
        print("\nMake sure PostgreSQL is running and accessible.")
        print("\nTo check if PostgreSQL is running:")
        print("  docker ps | grep postgres")
        print("\nTo check database connectivity:")
        print(f"  psql {settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')}")
        sys.exit(1)
    
    # Run setup
    try:
        asyncio.run(setup_database())
        print("\n🎉 Setup completed successfully!")
        print("\nYou can now:")
        print("1. Start the FastAPI server: uvicorn src.main:app --reload")
        print("2. Visit http://localhost:8000/docs for API documentation")
        print("3. Visit http://localhost:3000 for the frontend")
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)