"""Application configuration with proper validation."""

import os
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with validation."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )
    
    # Application
    APP_NAME: str = "NovaDocs"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    
    # Security
    SECRET_KEY: str = "novadocs-secret-key-change-in-production-32-chars-minimum"
    JWT_SECRET_KEY: str = "novadocs-jwt-secret-change-in-production-32-chars-minimum"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://novadocs:password@localhost:5432/novadocs"
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 0
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_EXPIRE_SECONDS: int = 3600
    
    # CORS Origins (as string, parsed into list)
    ALLOWED_ORIGINS_STR: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3001"
    
    # OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    
    # Features
    FEATURE_REAL_TIME_COLLABORATION: bool = True
    FEATURE_OFFLINE_SUPPORT: bool = True
    RATE_LIMIT_ENABLED: bool = False  # Disabled for development
    
    # Monitoring
    LOG_LEVEL: str = "INFO"
    PROMETHEUS_ENABLED: bool = True
    
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Parse CORS origins from string."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(",")]
    
    @field_validator("SECRET_KEY", "JWT_SECRET_KEY")
    @classmethod
    def validate_secret_keys(cls, v):
        """Ensure secret keys are long enough."""
        if len(v) < 32:
            print(f"Warning: Secret key should be at least 32 characters")
        return v


# Global settings instance
settings = Settings()
