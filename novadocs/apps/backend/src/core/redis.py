"""Redis connection and utilities."""

import json
import logging
from typing import Any, Optional, Dict
from contextlib import asynccontextmanager
import redis.asyncio as redis
from redis.asyncio.client import Redis

from src.core.config import settings

logger = logging.getLogger(__name__)


class RedisManager:
    """Redis connection manager."""
    
    def __init__(self):
        self.redis: Optional[Redis] = None
        self._is_connected = False
        
    async def connect(self) -> None:
        """Connect to Redis."""
        try:
            self.redis = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                retry_on_timeout=True,
            )
            
            # Test connection
            await self.redis.ping()
            self._is_connected = True
            logger.info("✅ Connected to Redis")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            # Don't raise - allow app to work without Redis
            self._is_connected = False
    
    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()
        self._is_connected = False
        logger.info("Disconnected from Redis")
    
    @asynccontextmanager
    async def get_connection(self):
        """Get Redis connection context manager."""
        if not self._is_connected:
            await self.connect()
        
        if not self._is_connected:
            # Redis not available, return None
            yield None
            return
        
        try:
            yield self.redis
        except Exception as e:
            logger.error(f"Redis operation failed: {e}")
            yield None
    
    async def set_cache(self, key: str, value: Any, expire: int = None) -> bool:
        """Set cache value."""
        async with self.get_connection() as conn:
            if not conn:
                return False
            
            try:
                expire_time = expire or settings.REDIS_EXPIRE_SECONDS
                return await conn.setex(key, expire_time, json.dumps(value))
            except Exception as e:
                logger.error(f"Cache set failed: {e}")
                return False
    
    async def get_cache(self, key: str) -> Optional[Any]:
        """Get cache value."""
        async with self.get_connection() as conn:
            if not conn:
                return None
            
            try:
                data = await conn.get(key)
                return json.loads(data) if data else None
            except Exception as e:
                logger.error(f"Cache get failed: {e}")
                return None
    
    async def delete_cache(self, key: str) -> bool:
        """Delete cache value."""
        async with self.get_connection() as conn:
            if not conn:
                return False
            
            try:
                return await conn.delete(key)
            except Exception as e:
                logger.error(f"Cache delete failed: {e}")
                return False


# Global Redis manager instance
redis_manager = RedisManager()


async def init_redis():
    """Initialize Redis connection."""
    await redis_manager.connect()


async def cleanup_redis():
    """Cleanup Redis connection."""
    await redis_manager.disconnect()
