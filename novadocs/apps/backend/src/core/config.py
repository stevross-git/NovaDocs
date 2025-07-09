"""Simple application configuration."""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "NovaDocs"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-here-minimum-32-chars-change-in-production"
    JWT_SECRET_KEY: str = "your-jwt-secret-key-here-minimum-32-chars-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = "postgresql://novadocs:password@localhost:5432/novadocs"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS - Simple string, we'll parse it manually
    ALLOWED_ORIGINS_STR: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3001"
    
    # Monitoring
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Parse CORS origins from string."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(",")]


# Global settings instance
settings = Settings()
