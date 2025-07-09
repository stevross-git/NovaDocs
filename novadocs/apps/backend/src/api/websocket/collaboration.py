# apps/backend/src/api/websocket/collaboration.py
"""WebSocket collaboration endpoint with Yjs integration."""

import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.security import HTTPBearer
from jose import JWTError, jwt

from src.core.config import settings
from src.core.database import get_db
from src.core.models import User
from src.services.collaboration import collaboration_service
from src.core.redis import redis_manager

router = APIRouter()
logger = logging.getLogger(__name__)
security = HTTPBearer()


async def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """Get user info from JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        async with get_db() as db:
            result = await db.execute(
                "SELECT id, name, email FROM users WHERE id = :user_id",
                {"user_id": user_id}
            )
            user = result.fetchone()
            
            if user:
                return {
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "color": f"#{hash(user.name) % 0xFFFFFF:06x}"  # Generate color from name
                }
        
        return None
    
    except JWTError:
        return None


@router.websocket("/collaboration/{doc_id}")
async def websocket_collaboration(
    websocket: WebSocket,
    doc_id: str,
    token: str = None
):
    """WebSocket endpoint for real-time document collaboration."""
    
    # Authenticate user
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return
    
    user_info = await get_user_from_token(token)
    if not user_info:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    user_id = user_info["id"]
    
    # Accept WebSocket connection
    await websocket.accept()
    
    # Join document collaboration
    try:
        await collaboration_service.join_document(doc_id, user_id, websocket, user_info)
        
        # Send initial connection success message
        await websocket.send_text(json.dumps({
            "type": "connected",
            "doc_id": doc_id,
            "user_id": user_id,
            "timestamp": "2025-01-01T00:00:00Z"
        }))
        
        # Start message handling loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await collaboration_service.handle_websocket_message(
                    doc_id, user_id, message
                )
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for user {user_id} in doc {doc_id}")
                break
            
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from user {user_id}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            
            except Exception as e:
                logger.error(f"Error handling message from user {user_id}: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Internal server error"
                }))
    
    except Exception as e:
        logger.error(f"Error in collaboration session: {e}")
        await websocket.close(code=4000, reason="Internal server error")
    
    finally:
        # Clean up on disconnect
        await collaboration_service.leave_document(doc_id, user_id)


@router.websocket("/collaboration/{doc_id}/presence")
async def websocket_presence(
    websocket: WebSocket,
    doc_id: str,
    token: str = None
):
    """WebSocket endpoint for user presence updates."""
    
    # Authenticate user
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        return
    
    user_info = await get_user_from_token(token)
    if not user_info:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    user_id = user_info["id"]
    
    # Accept WebSocket connection
    await websocket.accept()
    
    try:
        # Send current presence information
        presence = await redis_manager.get_document_presence(doc_id)
        await websocket.send_text(json.dumps({
            "type": "presence_update",
            "users": presence
        }))
        
        # Listen for presence updates
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "presence_update":
                    # Update user presence
                    await redis_manager.set_user_presence(user_id, doc_id, {
                        "name": user_info["name"],
                        "color": user_info["color"],
                        "cursor_position": message.get("cursor_position"),
                        "selection": message.get("selection"),
                        "viewport": message.get("viewport")
                    })
                    
                    # Get updated presence and broadcast
                    presence = await redis_manager.get_document_presence(doc_id)
                    await websocket.send_text(json.dumps({
                        "type": "presence_update",
                        "users": presence
                    }))
            
            except WebSocketDisconnect:
                break
            
            except Exception as e:
                logger.error(f"Error handling presence update: {e}")
    
    finally:
        # Remove presence on disconnect
        await redis_manager.remove_user_presence(user_id, doc_id)


# Health check endpoint for WebSocket
@router.get("/collaboration/health")
async def collaboration_health():
    """Health check for collaboration service."""
    return {
        "status": "healthy",
        "active_documents": len(collaboration_service.documents),
        "total_users": sum(
            len(doc.users) for doc in collaboration_service.documents.values()
        )
    }


# Get document collaboration stats
@router.get("/collaboration/{doc_id}/stats")
async def get_document_stats(doc_id: str):
    """Get collaboration statistics for a document."""
    stats = {
        "doc_id": doc_id,
        "active_users": 0,
        "total_updates": 0,
        "current_version": 0,
        "last_activity": None
    }
    
    if doc_id in collaboration_service.documents:
        doc_manager = collaboration_service.documents[doc_id]
        stats.update({
            "active_users": len(doc_manager.users),
            "total_updates": len(doc_manager.update_queue),
            "current_version": doc_manager.version,
            "users": [
                {
                    "id": user.user_id,
                    "name": user.name,
                    "color": user.color,
                    "last_seen": user.last_seen.isoformat() if user.last_seen else None
                }
                for user in doc_manager.users.values()
            ]
        })
    
    return stats


# Force sync document state
@router.post("/collaboration/{doc_id}/sync")
async def force_sync_document(doc_id: str):
    """Force synchronization of document state."""
    if doc_id in collaboration_service.documents:
        doc_manager = collaboration_service.documents[doc_id]
        await doc_manager._persist_document_state()
        
        return {
            "message": "Document synced successfully",
            "version": doc_manager.version
        }
    
    return {"message": "Document not found in active sessions"}


# Kick user from document
@router.post("/collaboration/{doc_id}/kick/{user_id}")
async def kick_user_from_document(doc_id: str, user_id: str):
    """Kick a user from document collaboration (admin only)."""
    if doc_id in collaboration_service.documents:
        doc_manager = collaboration_service.documents[doc_id]
        await doc_manager.remove_user(user_id)
        
        return {"message": f"User {user_id} kicked from document {doc_id}"}
    
    return {"message": "Document not found in active sessions"}