#!/usr/bin/env python3
"""Setup script for MinIO document storage integration."""

import asyncio
import logging
import sys
import os

# Add the backend source to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sqlalchemy import text
from src.core.config import settings
from src.core.database import engine, init_db, get_db
from src.core.models import Base, User, Workspace, Page
from src.core.services.storage import storage_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_minio_connection():
    """Test MinIO connection and setup."""
    logger.info("🗄️ Testing MinIO connection...")
    
    try:
        # Test basic MinIO connection
        buckets = storage_service.client.list_buckets()
        logger.info(f"✅ MinIO connection successful! Found {len(buckets['Buckets'])} buckets")
        
        # Check if our bucket exists
        bucket_exists = False
        for bucket in buckets['Buckets']:
            if bucket['Name'] == settings.S3_BUCKET:
                bucket_exists = True
                logger.info(f"✅ Bucket '{settings.S3_BUCKET}' already exists")
                break
        
        if not bucket_exists:
            logger.info(f"📦 Creating bucket '{settings.S3_BUCKET}'...")
            storage_service.client.create_bucket(Bucket=settings.S3_BUCKET)
            logger.info(f"✅ Created bucket '{settings.S3_BUCKET}'")
        
        # Test document storage
        logger.info("📝 Testing document storage...")
        test_storage_key = await storage_service.store_document(
            page_id=uuid.uuid4(),
            content="# Test Document\n\nThis is a test document for MinIO integration.",
            title="Test Document",
            version=1,
            metadata={"test": True}
        )
        logger.info(f"✅ Test document stored: {test_storage_key}")
        
        # Test document retrieval
        test_document = await storage_service.retrieve_document(test_storage_key)
        logger.info(f"✅ Test document retrieved: {test_document['title']}")
        
        # Clean up test document
        await storage_service.delete_document(test_storage_key)
        logger.info("✅ Test document cleaned up")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ MinIO connection failed: {e}")
        return False


async def setup_database_with_storage():
    """Initialize database and migrate documents to MinIO."""
    logger.info("🔧 Setting up database with MinIO storage...")
    
    try:
        # Initialize database tables
        logger.info("📊 Creating/updating database tables...")
        await init_db(engine)
        logger.info("✅ Database tables ready")
        
        # Create sample data with MinIO storage
        logger.info("📝 Creating sample data with MinIO storage...")
        await create_sample_data_with_storage()
        logger.info("✅ Sample data created with MinIO storage")
        
        logger.info("🎉 Database and MinIO setup completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Setup failed: {e}")
        raise
    finally:
        await engine.dispose()


async def create_sample_data_with_storage():
    """Create sample data with documents stored in MinIO."""
    async with get_db() as db:
        # Check if data already exists
        from sqlalchemy import select
        result = await db.execute(select(User))
        existing_users = result.scalars().all()
        
        if existing_users:
            logger.info("🔄 Sample data already exists, updating with MinIO storage...")
            await migrate_existing_content_to_minio(db)
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
        await db.flush()
        
        # Create default workspace
        default_workspace = Workspace(
            name="Default Workspace",
            slug="default",
            description="Default workspace with MinIO document storage",
            is_public=True,
            settings={
                "theme": "light",
                "collaboration_enabled": True,
                "public_sharing": True,
                "storage_backend": "minio"
            }
        )
        db.add(default_workspace)
        await db.flush()
        
        # Create sample pages with MinIO storage
        sample_pages = [
            {
                "title": "Welcome to NovaDocs with MinIO! 🎉",
                "slug": "welcome-to-novadocs-minio",
                "content": """
# Welcome to NovaDocs with MinIO Storage! 🎉

Congratulations! Your NovaDocs instance is now configured with **MinIO object storage**.

## What's New with MinIO Integration

- 📄 **Document Storage**: All page content is stored in MinIO (S3-compatible)
- 🔄 **Version Control**: Multiple document versions with automatic backups
- 📁 **Asset Management**: File uploads are stored in MinIO buckets
- 🚀 **Scalability**: Object storage scales to petabytes
- 🔒 **Reliability**: Built-in redundancy and data protection

## How It Works

### Document Storage Architecture

```
Frontend → FastAPI → PostgreSQL (metadata) + MinIO (content)
```

1. **Page Metadata**: Stored in PostgreSQL (title, slug, permissions, etc.)
2. **Page Content**: Stored as JSON documents in MinIO
3. **Assets**: Files uploaded directly to MinIO buckets
4. **Versions**: Each edit creates a new version in MinIO

### Benefits

- **Performance**: Fast content retrieval from object storage
- **Scalability**: No database size limits for content
- **Backup**: Automatic document versioning
- **Assets**: Direct file upload to cloud storage
- **Cost**: Object storage is cost-effective for large content

## Getting Started

1. ✅ **Create pages** - Content automatically stored in MinIO
2. ✅ **Upload files** - Assets stored in MinIO buckets  
3. ✅ **Version control** - Every edit creates a backup
4. ✅ **Collaborate** - Real-time editing with persistent storage

## Storage Info

- **MinIO Endpoint**: `{}`
- **Bucket**: `{}`
- **Storage Type**: S3-Compatible Object Storage

---

**Your documents are now stored in the cloud!** ☁️
                """.format(settings.S3_ENDPOINT, settings.S3_BUCKET).strip()
            },
            {
                "title": "MinIO Storage Guide",
                "slug": "minio-storage-guide",
                "content": """
# MinIO Storage Guide

This guide explains how document storage works with MinIO in NovaDocs.

## Architecture Overview

NovaDocs uses a hybrid storage approach:

### PostgreSQL (Metadata)
- Page titles, slugs, permissions
- User accounts and workspaces
- Search indexes and relationships
- Asset metadata

### MinIO (Content & Files)
- Full page content as JSON documents
- Uploaded files and images
- Document versions and backups
- Large binary assets

## Document Storage

When you create or edit a page:

1. **Metadata** saved to PostgreSQL
2. **Content** stored as JSON in MinIO
3. **Search text** indexed in PostgreSQL
4. **Backup** created automatically

### Storage Structure

```
novadocs/
├── documents/
│   └── {page-id}/
│       ├── v1.json
│       ├── v2.json
│       └── v3.json
├── page-assets/
│   └── {page-id}/
│       ├── image1.jpg
│       └── document.pdf
├── backups/
│   └── {page-id}/
│       └── 20250110_120000.json
└── assets/
    └── {workspace-id}/
        └── files...
```

## Benefits

### Performance
- Fast metadata queries from PostgreSQL
- Efficient content delivery from MinIO
- Separate scaling for different data types

### Reliability
- Automatic backups on every edit
- Version history preserved
- Data redundancy in object storage

### Scalability
- No database size limits for content
- Horizontal scaling of object storage
- Cost-effective for large datasets

## File Uploads

All file uploads go directly to MinIO:

1. **Upload** → MinIO bucket
2. **Metadata** → PostgreSQL
3. **Public URL** → Generated for access

### Supported Formats

- **Images**: JPG, PNG, GIF, SVG
- **Documents**: PDF, DOC, DOCX, TXT, MD
- **Data**: CSV, XLS, XLSX
- **Presentations**: PPT, PPTX

## Backup & Versioning

Every document edit creates:

- **New version** in MinIO
- **Backup** of previous version
- **Metadata update** in PostgreSQL

You can access any previous version through the API.

## Best Practices

1. **Large Files**: Upload directly as assets
2. **Images**: Use asset uploads for images in documents
3. **Backups**: Regular MinIO bucket backups
4. **Monitoring**: Check MinIO health regularly

---

**Happy documenting with object storage!** 📦
                """.strip()
            },
            {
                "title": "API Documentation for MinIO",
                "slug": "api-documentation-minio",
                "content": """
# NovaDocs API with MinIO Storage

Complete API documentation for MinIO-integrated NovaDocs.

## Storage-Enhanced Endpoints

### Pages API

All page operations now include MinIO storage:

#### Create Page
```http
POST /api/v1/pages
Content-Type: application/json

{
  "title": "My Document",
  "content": "# Content stored in MinIO",
  "workspace_id": "workspace-uuid"
}
```

**Response includes storage info:**
```json
{
  "id": "page-uuid",
  "title": "My Document", 
  "content": "# Content stored in MinIO",
  "storage_key": "documents/page-uuid/v1.json",
  "document_url": "http://minio:9000/novadocs/documents/...",
  "version": 1
}
```

#### Upload Assets
```http
POST /api/v1/pages/{page_id}/assets
Content-Type: multipart/form-data

file: [binary data]
```

**Response:**
```json
{
  "id": "asset-uuid",
  "filename": "document.pdf",
  "public_url": "http://minio:9000/novadocs/page-assets/...",
  "size": 1024000,
  "mime_type": "application/pdf"
}
```

#### Get Page Versions
```http
GET /api/v1/pages/{page_id}/versions
```

**Response:**
```json
{
  "page_id": "page-uuid",
  "versions": [
    {
      "storage_key": "documents/page-uuid/v1.json",
      "size": 1024,
      "last_modified": "2025-01-10T12:00:00Z",
      "metadata": {"version": "1"}
    }
  ]
}
```

## MinIO Direct Access

### Bucket Structure
- **Bucket**: `novadocs`
- **Documents**: `documents/{page-id}/v{version}.json`
- **Assets**: `page-assets/{page-id}/{filename}`
- **Backups**: `backups/{page-id}/{timestamp}.json`

### Document Format
```json
{
  "page_id": "uuid",
  "title": "Document Title",
  "content": "# Markdown content",
  "version": 1,
  "metadata": {},
  "created_at": "2025-01-10T12:00:00Z",
  "content_type": "text/markdown"
}
```

## Storage Configuration

### Environment Variables
```env
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=novadocs
S3_REGION=us-east-1
```

### Health Check
```http
GET /health
```

**Includes storage status:**
```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy", 
    "storage": "healthy",
    "minio": "healthy"
  }
}
```

## Error Handling

### Storage Fallback
If MinIO is unavailable:
- Content stored in PostgreSQL as fallback
- API continues to work normally
- Warning logged for storage issues

### Error Responses
```json
{
  "error": "Storage service unavailable",
  "fallback": "Using database storage", 
  "status": 503
}
```

## Best Practices

1. **Always check storage_key** in responses
2. **Use document_url** for direct access
3. **Monitor MinIO health** in production
4. **Backup MinIO buckets** regularly
5. **Use presigned URLs** for temporary access

---

**API-powered document storage!** 🚀
                """.strip()
            }
        ]
        
        for i, page_data in enumerate(sample_pages):
            # Create page with storage in MinIO
            page = Page(
                title=page_data["title"],
                slug=page_data["slug"],
                content="",  # Content will be in MinIO
                workspace_id=default_workspace.id,
                created_by_id=demo_user.id,
                is_published=True,
                collaboration_enabled=True,
                version=1,
                content_text=page_data["content"][:500]  # First 500 chars for search
            )
            
            db.add(page)
            await db.flush()  # Get page ID
            
            # Store content in MinIO
            try:
                storage_key = await storage_service.store_document(
                    page_id=page.id,
                    content=page_data["content"],
                    title=page_data["title"],
                    version=1,
                    metadata={"sample_data": True, "created_by": str(demo_user.id)}
                )
                page.storage_key = storage_key
                logger.info(f"✅ Stored document in MinIO: {page_data['title']}")
                
            except Exception as e:
                logger.warning(f"⚠️ MinIO storage failed for {page_data['title']}, using database fallback: {e}")
                page.content = page_data["content"]
        
        await db.commit()
        logger.info("✅ Sample data created with MinIO storage")


async def migrate_existing_content_to_minio(db):
    """Migrate existing page content from database to MinIO."""
    logger.info("🔄 Migrating existing content to MinIO...")
    
    # Find pages with content but no storage_key
    from sqlalchemy import select, and_
    result = await db.execute(
        select(Page).where(
            and_(
                Page.content != "",
                Page.content.isnot(None),
                Page.storage_key.is_(None)
            )
        )
    )
    pages_to_migrate = result.scalars().all()
    
    migrated_count = 0
    for page in pages_to_migrate:
        try:
            # Store existing content in MinIO
            storage_key = await storage_service.store_document(
                page_id=page.id,
                content=page.content,
                title=page.title,
                version=page.version,
                metadata={"migrated": True}
            )
            
            # Update page with storage key
            page.storage_key = storage_key
            migrated_count += 1
            logger.info(f"✅ Migrated: {page.title}")
            
        except Exception as e:
            logger.warning(f"⚠️ Migration failed for {page.title}: {e}")
    
    if migrated_count > 0:
        await db.commit()
        logger.info(f"✅ Migrated {migrated_count} pages to MinIO")
    else:
        logger.info("📝 No pages needed migration")


async def main():
    """Run the complete setup."""
    print("🚀 NovaDocs MinIO Storage Setup")
    print(f"🗄️ MinIO Endpoint: {settings.S3_ENDPOINT}")
    print(f"📦 Bucket: {settings.S3_BUCKET}")
    print(f"📊 Database: {settings.DATABASE_URL}")
    print("─" * 60)
    
    # Test MinIO connection first
    if not await test_minio_connection():
        print("\n❌ Cannot connect to MinIO. Please check:")
        print(f"  1. MinIO is running: docker ps | grep minio")
        print(f"  2. Endpoint is correct: {settings.S3_ENDPOINT}")
        print(f"  3. Credentials are correct: {settings.S3_ACCESS_KEY}")
        sys.exit(1)
    
    # Test database connection
    try:
        from src.core.database import get_db
        async with get_db() as db:
            await db.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
    except Exception as e:
        print(f"\n❌ Cannot connect to database: {e}")
        sys.exit(1)
    
    # Run setup
    try:
        await setup_database_with_storage()
        print("\n🎉 Setup completed successfully!")
        print("\nWhat's been set up:")
        print(f"  ✅ MinIO bucket: {settings.S3_BUCKET}")
        print("  ✅ Database tables with storage_key column")
        print("  ✅ Sample pages stored in MinIO")
        print("  ✅ Document versioning enabled")
        print("\nNext steps:")
        print("  1. Start FastAPI: uvicorn src.main:app --reload")
        print("  2. Visit MinIO console: http://localhost:9001")
        print("  3. Check API docs: http://localhost:8000/docs")
        print("  4. Test document storage in the frontend")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    import uuid
    asyncio.run(main())