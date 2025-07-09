# apps/backend/src/core/config.py
"""
Updated application configuration for Pydantic v2 with pydantic-settings.
"""
from typing import List, Optional
from pydantic import field_validator, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )
    
    # Application
    APP_NAME: str = "NovaDocs"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    BASE_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-here-minimum-32-chars-change-in-production"
    JWT_SECRET_KEY: str = "your-jwt-secret-key-here-minimum-32-chars-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database
    DATABASE_URL: str = "postgresql://novadocs:password@localhost:5432/novadocs"
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 0
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_EXPIRE_SECONDS: int = 3600
    
    # OAuth Providers
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    # File uploads
    UPLOAD_PATH: str = "/tmp/uploads"
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: List[str] = [
        ".jpg", ".jpeg", ".png", ".gif", ".svg",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx",
        ".ppt", ".pptx", ".txt", ".md", ".csv"
    ]
    
    # Object storage (MinIO/S3)
    S3_ENDPOINT: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_BUCKET: str = "novadocs"
    S3_REGION: str = "us-east-1"
    S3_PUBLIC_URL: Optional[str] = None
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
    RATE_LIMIT_REQUESTS_PER_HOUR: int = 1000
    
    # Monitoring
    PROMETHEUS_ENABLED: bool = True
    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = "INFO"
    
    # AI/ML
    OPENAI_API_KEY: Optional[str] = None
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    
    # Collaboration
    YJS_PERSISTENCE_ENABLED: bool = True
    YJS_SNAPSHOT_INTERVAL: int = 300  # 5 minutes
    MAX_DOCUMENT_SIZE: int = 50 * 1024 * 1024  # 50MB
    MAX_CONCURRENT_USERS_PER_DOC: int = 100
    
    # WebSocket
    WS_MAX_CONNECTIONS: int = 1000
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    WS_CONNECTION_TIMEOUT: int = 60  # seconds
    
    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_USE_TLS: bool = True
    
    # Feature flags
    FEATURE_AI_ENABLED: bool = False
    FEATURE_ANALYTICS_ENABLED: bool = False
    FEATURE_WEBHOOKS_ENABLED: bool = True
    FEATURE_REAL_TIME_COLLABORATION: bool = True
    FEATURE_OFFLINE_SUPPORT: bool = True
    
    # Search
    SEARCH_ENABLED: bool = True
    SEARCH_INDEX_UPDATE_INTERVAL: int = 60  # seconds
    FULL_TEXT_SEARCH_ENABLED: bool = True
    SEMANTIC_SEARCH_ENABLED: bool = True
    
    # Performance
    CACHE_TTL_SECONDS: int = 300  # 5 minutes
    DOCUMENT_CACHE_TTL_SECONDS: int = 600  # 10 minutes
    USER_SESSION_TTL_SECONDS: int = 86400  # 24 hours
    
    # Security
    CORS_ALLOW_CREDENTIALS: bool = True
    SECURE_COOKIES: bool = True
    CSRF_PROTECTION_ENABLED: bool = True
    
    # Development
    RELOAD_ON_CHANGE: bool = False
    PROFILING_ENABLED: bool = False
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v):
        """Validate database URL."""
        if not str(v).startswith('postgresql'):
            raise ValueError("DATABASE_URL must be a PostgreSQL connection string")
        return v
    
    @field_validator("REDIS_URL")
    @classmethod
    def validate_redis_url(cls, v):
        """Validate Redis URL."""
        if not str(v).startswith('redis'):
            raise ValueError("REDIS_URL must be a Redis connection string")
        return v
    
    @field_validator("SECRET_KEY", "JWT_SECRET_KEY")
    @classmethod
    def validate_secret_keys(cls, v):
        """Validate secret keys are long enough."""
        if len(v) < 32:
            raise ValueError("Secret keys must be at least 32 characters long")
        return v
    
    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v):
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"LOG_LEVEL must be one of {valid_levels}")
        return v.upper()
    
    @field_validator("BASE_URL")
    @classmethod
    def validate_base_url(cls, v):
        """Validate base URL."""
        if not v.startswith(('http://', 'https://')):
            raise ValueError("BASE_URL must start with http:// or https://")
        return v.rstrip('/')


@lru_cache()
def get_settings():
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()


# Environment-specific configurations
class DevelopmentSettings(Settings):
    """Development environment settings."""
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    RELOAD_ON_CHANGE: bool = True
    DATABASE_ECHO: bool = True
    SECURE_COOKIES: bool = False
    RATE_LIMIT_ENABLED: bool = False


class ProductionSettings(Settings):
    """Production environment settings."""
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    RELOAD_ON_CHANGE: bool = False
    DATABASE_ECHO: bool = False
    SECURE_COOKIES: bool = True
    RATE_LIMIT_ENABLED: bool = True
    PROMETHEUS_ENABLED: bool = True


class TestSettings(Settings):
    """Test environment settings."""
    DEBUG: bool = True
    LOG_LEVEL: str = "WARNING"
    DATABASE_URL: str = "postgresql://test:test@localhost/test_novadocs"
    REDIS_URL: str = "redis://localhost:6379/1"
    RATE_LIMIT_ENABLED: bool = False
    FEATURE_REAL_TIME_COLLABORATION: bool = False


def get_environment_settings():
    """Get settings based on environment."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionSettings()
    elif env == "test":
        return TestSettings()
    else:
        return DevelopmentSettings()


# Use environment-specific settings
settings = get_environment_settings()