"""
NovaDocs Backend - Main FastAPI Application
"""
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import strawberry
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from strawberry.fastapi import GraphQLRouter
import structlog

from src.core.config import settings
from src.core.database import engine, init_db
from src.core.auth.dependencies import get_current_user_optional
from src.core.middleware import (
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
)
from src.api.graphql.schema import schema
from src.api.rest.routes import router as rest_router
from src.api.websocket.collaboration import router as ws_router
from src.core.exceptions import (
    ValidationError,
    NotFoundError,
    PermissionError,
    validation_exception_handler,
    not_found_exception_handler,
    permission_exception_handler,
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    logger.info("Starting NovaDocs application")
    
    # Initialize database
    await init_db(engine)
    
    # Create upload directories
    os.makedirs(settings.UPLOAD_PATH, exist_ok=True)
    
    logger.info("Application startup complete")
    yield
    
    logger.info("Shutting down NovaDocs application")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    app = FastAPI(
        title="NovaDocs API",
        description="Modern collaborative wiki platform API",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )
    
    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware)
    
    # GraphQL endpoint
    graphql_app = GraphQLRouter(
        schema,
        context_getter=get_current_user_optional,
        debug=settings.DEBUG,
    )
    app.include_router(graphql_app, prefix="/graphql")
    
    # REST API routes
    app.include_router(rest_router, prefix="/api/v1")
    
    # WebSocket routes
    app.include_router(ws_router, prefix="/ws")
    
    # Static files
    if os.path.exists(settings.UPLOAD_PATH):
        app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_PATH), name="uploads")
    
    # Exception handlers
    app.add_exception_handler(ValidationError, validation_exception_handler)
    app.add_exception_handler(NotFoundError, not_found_exception_handler)
    app.add_exception_handler(PermissionError, permission_exception_handler)
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "version": "1.0.0",
            "timestamp": "2025-01-01T00:00:00Z",
            "services": {
                "database": "healthy",
                "redis": "healthy",
                "storage": "healthy",
            }
        }
    
    # Root endpoint
    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "message": "NovaDocs API",
            "version": "1.0.0",
            "docs": "/docs",
            "graphql": "/graphql",
        }
    
    return app


# Create the application instance
app = create_app()

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_config=None,  # Use structlog instead
        access_log=False,  # Handled by middleware
    )
