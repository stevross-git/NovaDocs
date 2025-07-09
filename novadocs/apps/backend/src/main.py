"""Minimal FastAPI application."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json

# Create FastAPI app
app = FastAPI(
    title="NovaDocs API",
    description="Modern collaborative document platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "message": "NovaDocs backend is running!"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to NovaDocs API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Mock pages data
MOCK_PAGES = {
    "getting-started": {
        "id": "getting-started",
        "title": "Getting Started",
        "content": "<h1>Welcome to NovaDocs!</h1><p>This is your getting started guide.</p>",
        "author": {"id": "1", "name": "John Doe", "avatar": "/avatars/john.jpg"},
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "isPublic": True
    },
    "api-docs": {
        "id": "api-docs",
        "title": "API Documentation",
        "content": "<h1>API Documentation</h1><p>Complete API reference for developers.</p>",
        "author": {"id": "2", "name": "Jane Smith", "avatar": "/avatars/jane.jpg"},
        "created_at": "2024-01-02T00:00:00Z",
        "updated_at": "2024-01-02T00:00:00Z",
        "isPublic": False
    },
    "team-guidelines": {
        "id": "team-guidelines",
        "title": "Team Guidelines",
        "content": "<h1>Team Guidelines</h1><p>Our team collaboration guidelines.</p>",
        "author": {"id": "3", "name": "Mike Johnson", "avatar": "/avatars/mike.jpg"},
        "created_at": "2024-01-03T00:00:00Z",
        "updated_at": "2024-01-03T00:00:00Z",
        "isPublic": True
    }
}

# Pages API
@app.get("/api/v1/pages")
async def get_pages():
    """Get all pages."""
    return list(MOCK_PAGES.values())

@app.get("/api/v1/pages/{page_id}")
async def get_page(page_id: str):
    """Get a specific page."""
    if page_id in MOCK_PAGES:
        return MOCK_PAGES[page_id]
    return JSONResponse(
        status_code=404,
        content={"error": "Page not found"}
    )

@app.post("/api/v1/pages")
async def create_or_update_page(request: Request):
    """Create or update a page."""
    try:
        data = await request.json()
        page_id = data.get("id", f"page-{len(MOCK_PAGES) + 1}")
        
        page = {
            "id": page_id,
            "title": data.get("title", "Untitled"),
            "content": data.get("content", ""),
            "author": {"id": "1", "name": "Current User", "avatar": "/avatars/default.jpg"},
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "isPublic": True
        }
        
        MOCK_PAGES[page_id] = page
        return page
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to save page: {str(e)}"}
        )

# Simple WebSocket for testing
@app.websocket("/ws/collaboration/{doc_id}")
async def websocket_collaboration(websocket, doc_id: str):
    """Simple WebSocket for collaboration testing."""
    await websocket.accept()
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "doc_id": doc_id,
            "message": "Connected to collaboration server"
        }))
        
        while True:
            data = await websocket.receive_text()
            # Echo back the message
            await websocket.send_text(json.dumps({
                "type": "echo",
                "data": data,
                "doc_id": doc_id
            }))
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
