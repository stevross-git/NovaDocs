# apps/backend/src/core/middleware.py
"""Custom middleware for the application."""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import structlog

logger = structlog.get_logger(__name__)


class RequestLoggingMiddleware:
    """Middleware for logging requests."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Generate correlation ID
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        
        start_time = time.time()
        
        # Log request
        logger.info(
            "request_started",
            method=request.method,
            url=str(request.url),
            correlation_id=correlation_id,
            user_agent=request.headers.get("user-agent", ""),
            remote_addr=request.client.host if request.client else ""
        )
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Add correlation ID to response headers
                headers = dict(message.get("headers", []))
                headers[b"x-correlation-id"] = correlation_id.encode()
                message["headers"] = list(headers.items())
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
        
        # Log response
        duration = time.time() - start_time
        logger.info(
            "request_completed",
            method=request.method,
            url=str(request.url),
            correlation_id=correlation_id,
            duration=round(duration, 3)
        )


class SecurityHeadersMiddleware:
    """Middleware for adding security headers."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = dict(message.get("headers", []))
                
                # Add security headers
                security_headers = {
                    b"x-content-type-options": b"nosniff",
                    b"x-frame-options": b"DENY",
                    b"x-xss-protection": b"1; mode=block",
                    b"referrer-policy": b"strict-origin-when-cross-origin",
                    b"content-security-policy": b"default-src 'self'",
                }
                
                headers.update(security_headers)
                message["headers"] = list(headers.items())
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)


class RateLimitMiddleware:
    """Basic rate limiting middleware."""
    
    def __init__(self, app):
        self.app = app
        self.requests = {}  # In production, use Redis
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        client_ip = request.client.host if request.client else "unknown"
        
        # Simple rate limiting (60 requests per minute)
        current_time = time.time()
        minute_key = f"{client_ip}:{int(current_time // 60)}"
        
        if minute_key not in self.requests:
            self.requests[minute_key] = 0
        
        self.requests[minute_key] += 1
        
        if self.requests[minute_key] > 60:
            response = JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "message": "Too many requests"}
            )
            await response(scope, receive, send)
            return
        
        await self.app(scope, receive, send)