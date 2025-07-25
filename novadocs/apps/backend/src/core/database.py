# apps/backend/src/core/database.py
"""Database configuration and utilities."""

import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from contextlib import asynccontextmanager
from sqlalchemy import text

from src.core.config import settings
from src.core.models import Base

# Create async engine with proper pool configuration
engine_kwargs = {
    "echo": getattr(settings, 'DATABASE_ECHO', False),
    "pool_pre_ping": True,
}

# Only add pool settings if not using NullPool
if getattr(settings, 'DEBUG', False):
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs.update({
        "pool_size": getattr(settings, 'DATABASE_POOL_SIZE', 5),
        "max_overflow": getattr(settings, 'DATABASE_MAX_OVERFLOW', 10),
        "pool_recycle": 3600,
    })

engine = create_async_engine(
    str(settings.DATABASE_URL),
    **engine_kwargs
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db(engine=engine) -> None:
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for FastAPI to get database session."""
    async with get_db() as session:
        yield session


async def test_connection() -> bool:
    """Test database connection."""
    try:
        async with get_db() as db:
            await db.execute(text("SELECT 1"))
        return True
    except Exception:
        return False