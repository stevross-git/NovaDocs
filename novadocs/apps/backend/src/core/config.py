"""
Application configuration using Pydantic settings.
"""
from typing import List, Optional
from pydantic import BaseSettings, PostgresDsn, RedisDsn, validator
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "NovaDocs"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Security
    SECRET_KEY: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database
    DATABASE_URL: PostgresDsn
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 0
    
    # Redis
    REDIS_URL: RedisDsn
    REDIS_EXPIRE_SECONDS: int = 3600
    
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
    
    # Authentication
    OIDC_ISSUER: Optional[str] = None
    OIDC_CLIENT_ID: Optional[str] = None
    OIDC_CLIENT_SECRET: Optional[str] = None
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
    RATE_LIMIT_REQUESTS_PER_HOUR: int = 1000
    
    # Monitoring
    PROMETHEUS_ENABLED: bool = True
    SENTRY_DSN: Optional[str] = None
    
    # AI/ML
    OPENAI_API_KEY: Optional[str] = None
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    
    # Collaboration
    YJS_PERSISTENCE_ENABLED: bool = True
    YJS_SNAPSHOT_INTERVAL: int = 300  # 5 minutes
    
    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    
    # Feature flags
    FEATURE_AI_ENABLED: bool = False
    FEATURE_ANALYTICS_ENABLED: bool = False
    FEATURE_WEBHOOKS_ENABLED: bool = True
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("DATABASE_URL", pre=True)
    def validate_database_url(cls, v):
        """Validate database URL."""
        if isinstance(v, str):
            # Handle postgres:// scheme for backwards compatibility
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql://", 1)
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()