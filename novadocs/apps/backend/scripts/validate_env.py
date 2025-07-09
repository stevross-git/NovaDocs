# apps/backend/scripts/validate_env.py
#!/usr/bin/env python3
"""Validate environment variables."""

import os
import sys
from src.core.config import settings

def validate_env():
    """Validate required environment variables."""
    errors = []
    
    # Required variables
    required_vars = [
        'SECRET_KEY',
        'JWT_SECRET_KEY',
        'DATABASE_URL',
        'REDIS_URL'
    ]
    
    for var in required_vars:
        if not getattr(settings, var, None):
            errors.append(f"Missing required environment variable: {var}")
    
    # Validate database URL
    if settings.DATABASE_URL and not str(settings.DATABASE_URL).startswith('postgresql'):
        errors.append("DATABASE_URL must be a PostgreSQL connection string")
    
    # Validate Redis URL
    if settings.REDIS_URL and not str(settings.REDIS_URL).startswith('redis'):
        errors.append("REDIS_URL must be a Redis connection string")
    
    if errors:
        print("Environment validation failed:")
        for error in errors:
            print(f"  ❌ {error}")
        sys.exit(1)
    else:
        print("✅ Environment validation passed!")

if __name__ == "__main__":
    validate_env()