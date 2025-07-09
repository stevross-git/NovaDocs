"""Simplified FastAPI application without database."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json

from src.core.config import settings
from src.core.redis import init_redis, cleanup_redis, redis_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("🚀 Starting NovaDocs application...")
    
    # Initialize Redis (non-blocking)
    await init_redis()
    
    logger.info("✅ NovaDocs application started successfully")
    yield
    
    logger.info("Shutting down NovaDocs application...")
    await cleanup_redis()
    logger.info("✅ NovaDocs application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="NovaDocs API",
    description="Modern collaborative document platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    # Test Redis
    redis_status = "healthy"
    try:
        await redis_manager.set_cache("health_check", "ok", 60)
        test_value = await redis_manager.get_cache("health_check")
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"
        logger.error(f"Redis health check failed: {e}")
    
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "services": {
            "database": "skipped",
            "redis": redis_status,
            "collaboration": "ready",
        }
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to NovaDocs API",
        "version": "1.0.0",
        "docs": "/docs",
        "features": {
            "real_time_collaboration": settings.FEATURE_REAL_TIME_COLLABORATION,
            "offline_support": settings.FEATURE_OFFLINE_SUPPORT,
        }
    }


# Mock pages data with Redis caching
MOCK_PAGES = {
    "getting-started": {
        "id": "getting-started",
        "title": "Getting Started",
        "content": "<h1>Welcome to NovaDocs!</h1><p>Start typing or use / for commands...</p>",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "collaboration_enabled": True,
        "version": 1
    },
    "api-docs": {
        "id": "api-docs",
        "title": "API Documentation",
        "content": "<h1>API Documentation</h1><p>Complete API reference.</p>",
        "created_at": "2024-01-02T00:00:00Z",
        "updated_at": "2024-01-02T00:00:00Z",
        "collaboration_enabled": True,
        "version": 1
    },
    "team-guidelines": {
        "id": "team-guidelines",
        "title": "Team Guidelines",
        "content": "<h1>Team Guidelines</h1><p>Our collaboration best practices.</p>",
        "created_at": "2024-01-03T00:00:00Z",
        "updated_at": "2024-01-03T00:00:00Z",
        "collaboration_enabled": True,
        "version": 1
    }
}


@app.get("/api/v1/pages")
async def get_pages():
    """Get all pages with Redis caching."""
    try:
        # Try cache first
        cached_pages = await redis_manager.get_cache("all_pages")
        if cached_pages:
            return cached_pages
        
        pages_data = list(MOCK_PAGES.values())
        
        # Cache for 5 minutes
        await redis_manager.set_cache("all_pages", pages_data, 300)
        return pages_data
        
    except Exception as e:
        logger.error(f"Error getting pages: {e}")
        return list(MOCK_PAGES.values())


@app.get("/api/v1/pages/{page_id}")
async def get_page(page_id: str):
    """Get a specific page with Redis caching."""
    try:
        # Try cache first
        cached_page = await redis_manager.get_cache(f"page:{page_id}")
        if cached_page:
            return cached_page
        
        if page_id in MOCK_PAGES:
            page_data = MOCK_PAGES[page_id]
            # Cache for 10 minutes
            await redis_manager.set_cache(f"page:{page_id}", page_data, 600)
            return page_data
        
        return JSONResponse(
            status_code=404,
            content={"error": "Page not found"}
        )
        
    except Exception as e:
        logger.error(f"Error getting page {page_id}: {e}")
        if page_id in MOCK_PAGES:
            return MOCK_PAGES[page_id]
        return JSONResponse(status_code=404, content={"error": "Page not found"})


@app.post("/api/v1/pages")
async def create_or_update_page(request: Request):
    """Create or update a page with Redis caching."""
    try:
        data = await request.json()
        page_id = data.get("id", f"page-{len(MOCK_PAGES) + 1}")
        
        page_data = {
            "id": page_id,
            "title": data.get("title", "Untitled"),
            "content": data.get("content", ""),
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "collaboration_enabled": True,
            "version": MOCK_PAGES.get(page_id, {}).get("version", 0) + 1
        }
        
        # Update mock data
        MOCK_PAGES[page_id] = page_data
        
        # Invalidate cache
        await redis_manager.delete_cache(f"page:{page_id}")
        await redis_manager.delete_cache("all_pages")
        
        return {
            **page_data,
            "message": "Page saved successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating/updating page: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to save page: {str(e)}"}
        )


# Enhanced WebSocket for collaboration
@app.websocket("/ws/collaboration/{doc_id}")
async def websocket_collaboration(websocket, doc_id: str):
    """WebSocket for real-time collaboration."""
    await websocket.accept()
    
    try:
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connected",
            "doc_id": doc_id,
            "message": "Connected to collaboration server",
            "server_time": "2024-01-01T00:00:00Z",
            "features": {
                "yjs_support": True,
                "cursor_tracking": True,
                "presence_awareness": True
            }
        }))
        
        # Message handling loop
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            if message_type == "yjs_update":
                # Handle Yjs document updates
                await redis_manager.set_cache(
                    f"yjs_update:{doc_id}:{message.get('version', 0)}", 
                    message, 
                    3600
                )
                
                await websocket.send_text(json.dumps({
                    "type": "yjs_update_ack",
                    "doc_id": doc_id,
                    "version": message.get("version"),
                    "timestamp": "2024-01-01T00:00:00Z"
                }))
            
            elif message_type == "cursor_update":
                # Handle cursor position updates
                cursor_data = {
                    "user_id": message.get("user_id", "anonymous"),
                    "position": message.get("position"),
                    "selection": message.get("selection"),
                    "timestamp": "2024-01-01T00:00:00Z"
                }
                
                await redis_manager.set_cache(
                    f"cursor:{doc_id}:{message.get('user_id')}", 
                    cursor_data, 
                    60
                )
                
                await websocket.send_text(json.dumps({
                    "type": "cursor_update_ack",
                    "doc_id": doc_id,
                    "cursor_data": cursor_data
                }))
            
            elif message_type == "presence_update":
                # Handle user presence
                presence_data = {
                    "user_id": message.get("user_id", "anonymous"),
                    "user_name": message.get("user_name", "Anonymous"),
                    "user_color": message.get("user_color", "#3B82F6"),
                    "is_active": True,
                    "timestamp": "2024-01-01T00:00:00Z"
                }
                
                await redis_manager.set_cache(
                    f"presence:{doc_id}:{message.get('user_id')}", 
                    presence_data, 
                    120
                )
                
                await websocket.send_text(json.dumps({
                    "type": "presence_update_ack",
                    "doc_id": doc_id,
                    "presence_data": presence_data
                }))
            
            elif message_type == "ping":
                # Handle heartbeat
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": "2024-01-01T00:00:00Z"
                }))
            
            else:
                # Echo back unknown messages
                await websocket.send_text(json.dumps({
                    "type": "echo",
                    "original_message": message,
                    "doc_id": doc_id
                }))
                
    except Exception as e:
        logger.error(f"WebSocket error for document {doc_id}: {e}")
    finally:
        # Cleanup presence on disconnect
        try:
            await redis_manager.delete_cache(f"presence:{doc_id}:*")
        except:
            pass
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
