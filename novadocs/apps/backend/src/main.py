# apps/backend/src/main.py
"""Minimal FastAPI application with MinIO integration."""

import logging
import json
import uuid
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import MinIO storage after app creation to avoid circular imports
storage_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    global storage_service
    logger.info("🚀 Starting NovaDocs application...")
    
    # Initialize MinIO storage
    try:
        from src.core.services.storage import MinIOStorageService
        storage_service = MinIOStorageService()
        logger.info("✅ MinIO storage service initialized")
    except Exception as e:
        logger.warning(f"⚠️ MinIO storage service failed to initialize: {e}")
        storage_service = None
    
    logger.info("✅ NovaDocs application started successfully")
    yield
    
    logger.info("Shutting down NovaDocs application...")
    logger.info("✅ NovaDocs application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="NovaDocs API",
    description="Modern collaborative document platform with MinIO storage",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CreatePageRequest(BaseModel):
    title: str
    content: str = ""
    workspace_id: str = "default"

class PageResponse(BaseModel):
    id: str
    title: str
    content: str
    storage_key: str = None
    document_url: str = None
    created_at: str
    updated_at: str
    version: int = 1

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: str = "https://i.pravatar.cc/100?u=default"

# Mock data storage
MOCK_PAGES = {}
MOCK_USERS = [
    {"id": 1, "name": "Alice Doe", "email": "alice@example.com", "avatar_url": "https://i.pravatar.cc/100?u=alice"},
    {"id": 2, "name": "Bob Smith", "email": "bob@example.com", "avatar_url": "https://i.pravatar.cc/100?u=bob"},
    {"id": 3, "name": "Charlie Brown", "email": "charlie@example.com", "avatar_url": "https://i.pravatar.cc/100?u=charlie"}
]

# Health check endpoint
@app.get("/health")
async def health_check():
    """Enhanced health check with MinIO status."""
    # Check MinIO status
    minio_status = "healthy"
    if storage_service:
        try:
            # Test MinIO connection
            buckets = storage_service.client.list_buckets()
            minio_status = f"healthy ({len(buckets['Buckets'])} buckets)"
        except Exception as e:
            minio_status = f"unhealthy: {str(e)}"
    else:
        minio_status = "not initialized"
    
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "fastapi": "healthy",
            "minio": minio_status,
            "storage": "available" if storage_service else "unavailable"
        }
    }

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "NovaDocs API with MinIO Storage",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "features": {
            "minio_storage": storage_service is not None,
            "document_versioning": True,
            "file_uploads": True
        }
    }

# Pages API
@app.get("/api/v1/pages")
async def list_pages():
    """List all pages."""
    pages = []
    for page_data in MOCK_PAGES.values():
        # Try to get content from MinIO if storage_service is available
        content = page_data.get("content", "")
        document_url = None
        
        if storage_service and page_data.get("storage_key"):
            try:
                document = await storage_service.retrieve_document(page_data["storage_key"])
                content = document.get("content", content)
                document_url = await storage_service.get_asset_url(page_data["storage_key"])
            except Exception as e:
                logger.warning(f"Could not retrieve document from MinIO: {e}")
        
        pages.append(PageResponse(
            id=page_data["id"],
            title=page_data["title"],
            content=content,
            storage_key=page_data.get("storage_key"),
            document_url=document_url,
            created_at=page_data["created_at"],
            updated_at=page_data["updated_at"],
            version=page_data.get("version", 1)
        ))
    
    return {"pages": pages}

@app.get("/api/v1/pages/{page_id}")
async def get_page(page_id: str):
    """Get a specific page."""
    if page_id not in MOCK_PAGES:
        raise HTTPException(status_code=404, detail="Page not found")
    
    page_data = MOCK_PAGES[page_id]
    content = page_data.get("content", "")
    document_url = None
    
    # Try to get content from MinIO
    if storage_service and page_data.get("storage_key"):
        try:
            document = await storage_service.retrieve_document(page_data["storage_key"])
            content = document.get("content", content)
            document_url = await storage_service.get_asset_url(page_data["storage_key"])
        except Exception as e:
            logger.warning(f"Could not retrieve document from MinIO: {e}")
    
    return {
        "page": PageResponse(
            id=page_data["id"],
            title=page_data["title"],
            content=content,
            storage_key=page_data.get("storage_key"),
            document_url=document_url,
            created_at=page_data["created_at"],
            updated_at=page_data["updated_at"],
            version=page_data.get("version", 1)
        )
    }

@app.post("/api/v1/pages")
async def create_page(page_data: CreatePageRequest):
    """Create a new page with MinIO storage."""
    page_id = str(uuid.uuid4())
    current_time = datetime.utcnow().isoformat()
    
    # Create page metadata
    page_meta = {
        "id": page_id,
        "title": page_data.title,
        "content": page_data.content,  # Fallback storage
        "workspace_id": page_data.workspace_id,
        "created_at": current_time,
        "updated_at": current_time,
        "version": 1,
        "storage_key": None
    }
    
    # Try to store content in MinIO
    if storage_service and page_data.content:
        try:
            storage_key = await storage_service.store_document(
                page_id=uuid.UUID(page_id),
                content=page_data.content,
                title=page_data.title,
                version=1,
                metadata={"workspace_id": page_data.workspace_id}
            )
            page_meta["storage_key"] = storage_key
            logger.info(f"✅ Stored page in MinIO: {page_data.title}")
        except Exception as e:
            logger.warning(f"⚠️ MinIO storage failed, using fallback: {e}")
    
    # Store in mock data
    MOCK_PAGES[page_id] = page_meta
    
    return {
        "page": PageResponse(
            id=page_id,
            title=page_data.title,
            content=page_data.content,
            storage_key=page_meta.get("storage_key"),
            created_at=current_time,
            updated_at=current_time,
            version=1
        ),
        "message": "Page created successfully",
        "storage": "minio" if page_meta.get("storage_key") else "fallback"
    }

@app.put("/api/v1/pages/{page_id}")
async def update_page(page_id: str, page_data: CreatePageRequest):
    """Update an existing page."""
    if page_id not in MOCK_PAGES:
        raise HTTPException(status_code=404, detail="Page not found")
    
    current_time = datetime.utcnow().isoformat()
    page_meta = MOCK_PAGES[page_id]
    
    # Update metadata
    page_meta["title"] = page_data.title
    page_meta["content"] = page_data.content
    page_meta["updated_at"] = current_time
    page_meta["version"] += 1
    
    # Try to store updated content in MinIO
    if storage_service and page_data.content:
        try:
            # Create backup of current version
            if page_meta.get("storage_key"):
                await storage_service.backup_document(
                    page_id=uuid.UUID(page_id),
                    content=page_data.content,
                    title=page_data.title
                )
            
            # Store new version
            storage_key = await storage_service.store_document(
                page_id=uuid.UUID(page_id),
                content=page_data.content,
                title=page_data.title,
                version=page_meta["version"],
                metadata={"workspace_id": page_meta.get("workspace_id", "default")}
            )
            page_meta["storage_key"] = storage_key
            logger.info(f"✅ Updated page in MinIO: {page_data.title}")
        except Exception as e:
            logger.warning(f"⚠️ MinIO update failed, using fallback: {e}")
    
    return {
        "page": PageResponse(
            id=page_id,
            title=page_data.title,
            content=page_data.content,
            storage_key=page_meta.get("storage_key"),
            created_at=page_meta["created_at"],
            updated_at=current_time,
            version=page_meta["version"]
        ),
        "message": "Page updated successfully"
    }

@app.delete("/api/v1/pages/{page_id}")
async def delete_page(page_id: str):
    """Delete a page."""
    if page_id not in MOCK_PAGES:
        raise HTTPException(status_code=404, detail="Page not found")
    
    page_meta = MOCK_PAGES[page_id]
    
    # Delete from MinIO if it exists
    if storage_service and page_meta.get("storage_key"):
        try:
            await storage_service.delete_document(page_meta["storage_key"])
            logger.info(f"✅ Deleted page from MinIO: {page_meta['title']}")
        except Exception as e:
            logger.warning(f"⚠️ MinIO deletion failed: {e}")
    
    # Delete from mock data
    del MOCK_PAGES[page_id]
    
    return {"message": "Page deleted successfully"}

# Users API
@app.get("/api/v1/users")
async def list_users():
    """List all users."""
    return {"users": [UserResponse(**user) for user in MOCK_USERS]}

@app.post("/api/v1/users")
async def create_user(user_data: dict):
    """Create a new user."""
    user_id = len(MOCK_USERS) + 1
    user = {
        "id": user_id,
        "name": user_data.get("name", "Unknown"),
        "email": user_data.get("email", f"user{user_id}@example.com"),
        "avatar_url": f"https://i.pravatar.cc/100?u={user_data.get('email', 'default')}"
    }
    MOCK_USERS.append(user)
    return {"user": UserResponse(**user), "message": "User created successfully"}

# Asset upload and import
@app.post("/api/v1/upload")
async def upload_file(file: UploadFile = File(...), workspace_id: str = Form("default")):
    """Upload a file to MinIO."""
    if not storage_service:
        raise HTTPException(status_code=503, detail="Storage service not available")
    
    try:
        asset_info = await storage_service.store_asset(
            file=file,
            workspace_id=uuid.UUID(workspace_id) if workspace_id != "default" else uuid.uuid4(),
            uploaded_by_id=uuid.uuid4(),  # Mock user ID
            folder="uploads"
        )
        
        return {
            "id": str(uuid.uuid4()),
            "filename": asset_info["filename"],
            "original_filename": asset_info["original_filename"],
            "url": asset_info["public_url"],
            "size": asset_info["size"],
            "mime_type": asset_info["mime_type"],
            "message": "File uploaded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/api/v1/import")
async def import_document(file: UploadFile = File(...)):
    """Import a document and convert it to a page."""
    try:
        # Read file content
        content_bytes = await file.read()
        content = content_bytes.decode('utf-8')
        
        # Get filename without extension for title
        filename = file.filename or "Imported Document"
        title = filename.rsplit('.', 1)[0] if '.' in filename else filename
        
        # Process content based on file type
        if filename.endswith(('.md', '.markdown')):
            # Markdown - use as is
            processed_content = content
        elif filename.endswith('.txt'):
            # Text file - add title and basic formatting
            processed_content = f"# {title}\n\n{content}"
        elif filename.endswith(('.html', '.htm')):
            # Basic HTML to Markdown conversion
            import re
            processed_content = content
            processed_content = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1\n\n', processed_content, flags=re.IGNORECASE)
            processed_content = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1\n\n', processed_content, flags=re.IGNORECASE)
            processed_content = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1\n\n', processed_content, flags=re.IGNORECASE)
            processed_content = re.sub(r'<p[^>]*>(.*?)</p>', r'\1\n\n', processed_content, flags=re.IGNORECASE)
            processed_content = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', processed_content, flags=re.IGNORECASE)
            processed_content = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', processed_content, flags=re.IGNORECASE)
            processed_content = re.sub(r'<br\s*/?>', '\n', processed_content, flags=re.IGNORECASE)
            processed_content = re.sub(r'<[^>]+>', '', processed_content)  # Remove remaining HTML tags
            processed_content = re.sub(r'\n\s*\n\s*\n', '\n\n', processed_content)  # Clean up newlines
        else:
            # Other files - wrap in code block
            processed_content = f"# {title}\n\n```\n{content}\n```"
        
        return {
            "title": title,
            "content": processed_content,
            "original_filename": filename,
            "file_size": len(content_bytes),
            "message": "Document imported successfully"
        }
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding not supported. Please use UTF-8 encoded files.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

# Stats API
@app.get("/api/v1/stats")
async def get_stats():
    """Get platform statistics."""
    minio_info = {}
    if storage_service:
        try:
            buckets = storage_service.client.list_buckets()
            minio_info = {
                "buckets": len(buckets['Buckets']),
                "storage_backend": "MinIO"
            }
        except Exception:
            minio_info = {"storage_backend": "Unavailable"}
    
    return {
        "pages": len(MOCK_PAGES),
        "users": len(MOCK_USERS),
        "workspaces": 1,
        "storage_used": "12.5 MB",
        **minio_info
    }

# GraphQL mock endpoint
@app.post("/graphql")
async def graphql_endpoint():
    """GraphQL endpoint mock."""
    return {
        "data": {
            "me": {
                "id": "1",
                "name": "Demo User",
                "email": "demo@novadocs.com"
            }
        }
    }

@app.options("/graphql")
async def graphql_options():
    """Handle CORS preflight for GraphQL."""
    return {}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)