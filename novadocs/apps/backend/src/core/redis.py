# apps/backend/src/core/redis.py
"""Redis connection and utilities."""

import asyncio
import json
import logging
from typing import Any, Optional, Dict, List
from contextlib import asynccontextmanager
import redis.asyncio as redis
from redis.asyncio.client import Redis

from src.core.config import settings

logger = logging.getLogger(__name__)


class RedisManager:
    """Redis connection manager with pub/sub support."""
    
    def __init__(self):
        self.redis: Optional[Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        self._subscriptions: Dict[str, List[callable]] = {}
        self._is_connected = False
        
    async def connect(self) -> None:
        """Connect to Redis."""
        try:
            self.redis = redis.from_url(
                str(settings.REDIS_URL),
                encoding="utf-8",
                decode_responses=True,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            await self.redis.ping()
            self._is_connected = True
            logger.info("Connected to Redis")
            
            # Initialize pub/sub
            self.pubsub = self.redis.pubsub()
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.pubsub:
            await self.pubsub.close()
        if self.redis:
            await self.redis.close()
        self._is_connected = False
        logger.info("Disconnected from Redis")
    
    @asynccontextmanager
    async def get_connection(self):
        """Get Redis connection context manager."""
        if not self._is_connected:
            await self.connect()
        
        try:
            yield self.redis
        except Exception as e:
            logger.error(f"Redis operation failed: {e}")
            raise
    
    # Session Management
    async def set_session(self, session_id: str, data: Dict[str, Any], expire: int = None) -> bool:
        """Set session data."""
        async with self.get_connection() as conn:
            expire_time = expire or settings.REDIS_EXPIRE_SECONDS
            return await conn.setex(
                f"session:{session_id}", 
                expire_time, 
                json.dumps(data)
            )
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        async with self.get_connection() as conn:
            data = await conn.get(f"session:{session_id}")
            return json.loads(data) if data else None
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session."""
        async with self.get_connection() as conn:
            return await conn.delete(f"session:{session_id}")
    
    # Document Caching
    async def cache_document(self, doc_id: str, content: Dict[str, Any], expire: int = 300) -> bool:
        """Cache document content."""
        async with self.get_connection() as conn:
            return await conn.setex(
                f"doc:{doc_id}",
                expire,
                json.dumps(content)
            )
    
    async def get_cached_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get cached document."""
        async with self.get_connection() as conn:
            data = await conn.get(f"doc:{doc_id}")
            return json.loads(data) if data else None
    
    async def invalidate_document_cache(self, doc_id: str) -> bool:
        """Invalidate document cache."""
        async with self.get_connection() as conn:
            return await conn.delete(f"doc:{doc_id}")
    
    # Real-time Collaboration
    async def publish_document_update(self, doc_id: str, update_data: Dict[str, Any]) -> int:
        """Publish document update to subscribers."""
        async with self.get_connection() as conn:
            return await conn.publish(
                f"doc_updates:{doc_id}",
                json.dumps(update_data)
            )
    
    async def publish_cursor_update(self, doc_id: str, cursor_data: Dict[str, Any]) -> int:
        """Publish cursor update to subscribers."""
        async with self.get_connection() as conn:
            return await conn.publish(
                f"cursors:{doc_id}",
                json.dumps(cursor_data)
            )
    
    async def subscribe_to_document(self, doc_id: str, callback: callable) -> None:
        """Subscribe to document updates."""
        channel = f"doc_updates:{doc_id}"
        
        if channel not in self._subscriptions:
            self._subscriptions[channel] = []
            await self.pubsub.subscribe(channel)
        
        self._subscriptions[channel].append(callback)
    
    async def subscribe_to_cursors(self, doc_id: str, callback: callable) -> None:
        """Subscribe to cursor updates."""
        channel = f"cursors:{doc_id}"
        
        if channel not in self._subscriptions:
            self._subscriptions[channel] = []
            await self.pubsub.subscribe(channel)
        
        self._subscriptions[channel].append(callback)
    
    async def unsubscribe_from_document(self, doc_id: str, callback: callable) -> None:
        """Unsubscribe from document updates."""
        channel = f"doc_updates:{doc_id}"
        
        if channel in self._subscriptions:
            self._subscriptions[channel].remove(callback)
            if not self._subscriptions[channel]:
                await self.pubsub.unsubscribe(channel)
                del self._subscriptions[channel]
    
    async def start_message_listener(self) -> None:
        """Start listening for Redis pub/sub messages."""
        if not self.pubsub:
            return
        
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    channel = message["channel"]
                    data = json.loads(message["data"])
                    
                    # Call all callbacks for this channel
                    if channel in self._subscriptions:
                        for callback in self._subscriptions[channel]:
                            try:
                                await callback(data)
                            except Exception as e:
                                logger.error(f"Callback error for channel {channel}: {e}")
        
        except Exception as e:
            logger.error(f"Redis message listener error: {e}")
    
    # User Presence
    async def set_user_presence(self, user_id: str, doc_id: str, presence_data: Dict[str, Any]) -> bool:
        """Set user presence in document."""
        async with self.get_connection() as conn:
            return await conn.setex(
                f"presence:{doc_id}:{user_id}",
                60,  # 1 minute expiry
                json.dumps(presence_data)
            )
    
    async def get_document_presence(self, doc_id: str) -> Dict[str, Dict[str, Any]]:
        """Get all users present in document."""
        async with self.get_connection() as conn:
            keys = await conn.keys(f"presence:{doc_id}:*")
            presence = {}
            
            for key in keys:
                user_id = key.split(":")[-1]
                data = await conn.get(key)
                if data:
                    presence[user_id] = json.loads(data)
            
            return presence
    
    async def remove_user_presence(self, user_id: str, doc_id: str) -> bool:
        """Remove user presence from document."""
        async with self.get_connection() as conn:
            return await conn.delete(f"presence:{doc_id}:{user_id}")
    
    # Permission Caching
    async def cache_user_permissions(self, user_id: str, resource_id: str, permissions: List[str]) -> bool:
        """Cache user permissions for a resource."""
        async with self.get_connection() as conn:
            return await conn.setex(
                f"perms:{user_id}:{resource_id}",
                300,  # 5 minutes
                json.dumps(permissions)
            )
    
    async def get_cached_permissions(self, user_id: str, resource_id: str) -> Optional[List[str]]:
        """Get cached user permissions."""
        async with self.get_connection() as conn:
            data = await conn.get(f"perms:{user_id}:{resource_id}")
            return json.loads(data) if data else None
    
    async def invalidate_user_permissions(self, user_id: str, resource_id: str = None) -> int:
        """Invalidate cached permissions."""
        async with self.get_connection() as conn:
            if resource_id:
                return await conn.delete(f"perms:{user_id}:{resource_id}")
            else:
                keys = await conn.keys(f"perms:{user_id}:*")
                return await conn.delete(*keys) if keys else 0
    
    # Rate Limiting
    async def check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """Check if rate limit is exceeded."""
        async with self.get_connection() as conn:
            current = await conn.get(f"rate_limit:{key}")
            
            if current is None:
                await conn.setex(f"rate_limit:{key}", window, 1)
                return True
            
            if int(current) >= limit:
                return False
            
            await conn.incr(f"rate_limit:{key}")
            return True


# Global Redis manager instance
redis_manager = RedisManager()


async def get_redis() -> RedisManager:
    """Get Redis manager instance."""
    return redis_manager


# Initialize Redis on startup
async def init_redis():
    """Initialize Redis connection."""
    await redis_manager.connect()


# Cleanup Redis on shutdown
async def cleanup_redis():
    """Cleanup Redis connection."""
    await redis_manager.disconnect()


# Middleware for Redis rate limiting
async def rate_limit_middleware(key: str, limit: int = 60, window: int = 60) -> bool:
    """Rate limiting middleware."""
    if not settings.RATE_LIMIT_ENABLED:
        return True
    
    return await redis_manager.check_rate_limit(key, limit, window)