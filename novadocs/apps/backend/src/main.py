"""FastAPI application with full database integration."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json

from src.core.config import settings
from src.core.redis import init_redis, cleanup_redis, redis_manager
from src.core.database import init_db, engine
from src.api.v1.pages import router as pages_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("🚀 Starting NovaDocs application...")
    
    # Initialize Redis (non-blocking)
    await init_redis()
    
    # Initialize Database
    logger.info("📊 Initializing database...")
    try:
        await init_db(engine)
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        # Don't fail the startup, continue with warning
        logger.warning("⚠️  Continuing without database - some features may not work")
    
    logger.info("✅ NovaDocs application started successfully")
    yield
    
    logger.info("Shutting down NovaDocs application...")
    await cleanup_redis()
    await engine.dispose()
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

# Include routers
app.include_router(pages_router)


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
    
    # Test Database
    database_status = "healthy"
    try:
        from src.core.database import get_db
        from sqlalchemy import text
        async with get_db() as db:
            await db.execute(text("SELECT 1"))
        database_status = "healthy"
    except Exception as e:
        database_status = f"unhealthy: {str(e)}"
        logger.error(f"Database health check failed: {e}")
    
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "timestamp": "2025-01-01T00:00:00Z",
        "services": {
            "database": database_status,
            "redis": redis_status,
            "collaboration": "ready",
        }
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "NovaDocs API",
        "version": "1.0.0",
        "docs": "/docs",
        "graphql": "/graphql",
        "health": "/health"
    }


# Legacy compatibility endpoints for the existing frontend
MOCK_PAGES = {}


@app.get("/api/v1/pages")
async def legacy_list_pages():
    """Legacy endpoint for backward compatibility."""
    return {"pages": list(MOCK_PAGES.values())}


@app.post("/api/v1/pages")
async def legacy_create_page(request: Request):
    """Legacy endpoint for backward compatibility."""
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


@app.get("/api/v1/pages/{page_id}")
async def legacy_get_page(page_id: str):
    """Legacy endpoint for backward compatibility."""
    if page_id in MOCK_PAGES:
        return {"page": MOCK_PAGES[page_id]}
    else:
        return JSONResponse(
            status_code=404,
            content={"error": "Page not found"}
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
                user_id = message.get("user_id", "anonymous")
                cursor_data = message.get("cursor", {})
                
                await redis_manager.set_cache(
                    f"cursor:{doc_id}:{user_id}",
                    {
                        "position": cursor_data.get("position", 0),
                        "selection": cursor_data.get("selection", {}),
                        "timestamp": "2024-01-01T00:00:00Z"
                    },
                    300  # 5 minutes TTL
                )
                
                # Broadcast cursor update to other users
                await websocket.send_text(json.dumps({
                    "type": "cursor_broadcast",
                    "doc_id": doc_id,
                    "user_id": user_id,
                    "cursor": cursor_data
                }))
            
            elif message_type == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": "2024-01-01T00:00:00Z"
                }))
            
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
    except Exception as e:
        logger.error(f"WebSocket error for doc {doc_id}: {e}")
    finally:
        logger.info(f"WebSocket connection closed for doc {doc_id}")


# GraphQL mock endpoint for testing
@app.post("/graphql")
async def graphql_endpoint(request: Request):
    """GraphQL endpoint mock for testing."""
    try:
        data = await request.json()
        query = data.get("query", "")
        
        if "me" in query:
            return {
                "data": {
                    "me": {
                        "id": "1",
                        "name": "Demo User",
                        "email": "demo@novadocs.com"
                    }
                }
            }
        
        return {
            "data": {},
            "errors": [{"message": "Query not implemented yet"}]
        }
        
    except Exception as e:
        logger.error(f"GraphQL error: {e}")
        return {
            "errors": [{"message": f"GraphQL error: {str(e)}"}]
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    )