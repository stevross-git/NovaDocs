# apps/backend/src/core/exceptions.py
"""Custom exceptions for the application."""

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse



"""Custom exceptions for NovaDocs."""


class NovadocsException(Exception):
    """Base exception for NovaDocs."""
    pass


class StorageError(NovadocsException):
    """Exception raised for storage-related errors."""
    pass


class NotFoundError(NovadocsException):
    """Exception raised when a resource is not found."""
    pass


class PermissionError(NovadocsException):
    """Exception raised for permission-related errors."""
    pass


class ValidationError(NovadocsException):
    """Exception raised for validation errors."""
    pass


class AuthenticationError(NovadocsException):
    """Exception raised for authentication errors."""
    pass


class ConfigurationError(NovadocsException):
    """Exception raised for configuration errors."""
    pass

class AppException(Exception):
    """Base application exception."""
    
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ValidationError(AppException):
    """Validation error exception."""
    
    def __init__(self, message: str):
        super().__init__(message, status.HTTP_400_BAD_REQUEST)


class NotFoundError(AppException):
    """Not found error exception."""
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class PermissionError(AppException):
    """Permission error exception."""
    
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class AuthenticationError(AppException):
    """Authentication error exception."""
    
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


# Exception handlers
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle validation errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "Validation Error", "message": exc.message}
    )


async def not_found_exception_handler(request: Request, exc: NotFoundError):
    """Handle not found errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "Not Found", "message": exc.message}
    )


async def permission_exception_handler(request: Request, exc: PermissionError):
    """Handle permission errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "Permission Denied", "message": exc.message}
    )