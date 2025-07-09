# apps/backend/src/services/collaboration.py
"""Yjs collaboration service for real-time document editing."""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from fastapi import WebSocket, WebSocketDisconnect

from src.core.redis import redis_manager
from src.core.database import get_db
from src.core.models import Page, User
from src.services.permissions import PermissionService

logger = logging.getLogger(__name__)


@dataclass
class CollaborationUser:
    """Represents a user in a collaboration session."""
    user_id: str
    name: str
    color: str
    cursor_position: Optional[int] = None
    selection: Optional[Dict[str, Any]] = None
    last_seen: Optional[datetime] = None


@dataclass
class YjsUpdate:
    """Represents a Yjs document update."""
    doc_id: str
    user_id: str
    update_data: bytes
    timestamp: datetime
    version: int


class DocumentCollaborationManager:
    """Manages real-time collaboration for a single document."""
    
    def __init__(self, doc_id: str):
        self.doc_id = doc_id
        self.connections: Dict[str, WebSocket] = {}
        self.users: Dict[str, CollaborationUser] = {}
        self.document_state: Optional[bytes] = None
        self.update_queue: List[YjsUpdate] = []
        self.version = 0
        self.lock = asyncio.Lock()
        
    async def add_user(self, user_id: str, websocket: WebSocket, user_info: Dict[str, Any]) -> None:
        """Add a user to the collaboration session."""
        async with self.lock:
            self.connections[user_id] = websocket
            self.users[user_id] = CollaborationUser(
                user_id=user_id,
                name=user_info.get("name", "Unknown"),
                color=user_info.get("color", "#3B82F6"),
                last_seen=datetime.now()
            )
            
            # Send current document state to new user
            if self.document_state:
                await self._send_to_user(user_id, {
                    "type": "sync_state",
                    "state": self.document_state.hex(),
                    "version": self.version
                })
            
            # Send current user list to new user
            await self._send_to_user(user_id, {
                "type": "users_updated",
                "users": [
                    {
                        "id": user.user_id,
                        "name": user.name,
                        "color": user.color,
                        "cursor_position": user.cursor_position,
                        "selection": user.selection
                    }
                    for user in self.users.values()
                ]
            })
            
            # Notify other users about new user
            await self._broadcast_except_user(user_id, {
                "type": "user_joined",
                "user": {
                    "id": user_id,
                    "name": self.users[user_id].name,
                    "color": self.users[user_id].color
                }
            })
            
            # Update presence in Redis
            await redis_manager.set_user_presence(user_id, self.doc_id, {
                "name": self.users[user_id].name,
                "color": self.users[user_id].color,
                "last_seen": datetime.now().isoformat()
            })
    
    async def remove_user(self, user_id: str) -> None:
        """Remove a user from the collaboration session."""
        async with self.lock:
            if user_id in self.connections:
                del self.connections[user_id]
            
            if user_id in self.users:
                user_name = self.users[user_id].name
                del self.users[user_id]
                
                # Notify other users about user leaving
                await self._broadcast_except_user(user_id, {
                    "type": "user_left",
                    "user": {
                        "id": user_id,
                        "name": user_name
                    }
                })
                
                # Remove presence from Redis
                await redis_manager.remove_user_presence(user_id, self.doc_id)
    
    async def handle_yjs_update(self, user_id: str, update_data: bytes) -> None:
        """Handle a Yjs document update."""
        async with self.lock:
            # Create update object
            update = YjsUpdate(
                doc_id=self.doc_id,
                user_id=user_id,
                update_data=update_data,
                timestamp=datetime.now(),
                version=self.version + 1
            )
            
            # Add to update queue
            self.update_queue.append(update)
            self.version += 1
            
            # Apply update to document state (simplified)
            # In a real implementation, you'd use Y.js library here
            self.document_state = update_data
            
            # Broadcast update to all other users
            await self._broadcast_except_user(user_id, {
                "type": "yjs_update",
                "update": update_data.hex(),
                "version": self.version,
                "user_id": user_id
            })
            
            # Cache updated document
            await redis_manager.cache_document(self.doc_id, {
                "state": update_data.hex(),
                "version": self.version,
                "last_updated": datetime.now().isoformat()
            })
            
            # Persist to database periodically
            if self.version % 10 == 0:  # Every 10 updates
                await self._persist_document_state()
    
    async def handle_cursor_update(self, user_id: str, cursor_data: Dict[str, Any]) -> None:
        """Handle cursor position update."""
        if user_id in self.users:
            self.users[user_id].cursor_position = cursor_data.get("position")
            self.users[user_id].selection = cursor_data.get("selection")
            self.users[user_id].last_seen = datetime.now()
            
            # Broadcast cursor update
            await self._broadcast_except_user(user_id, {
                "type": "cursor_update",
                "user_id": user_id,
                "position": cursor_data.get("position"),
                "selection": cursor_data.get("selection")
            })
            
            # Update Redis presence
            await redis_manager.publish_cursor_update(self.doc_id, {
                "user_id": user_id,
                "position": cursor_data.get("position"),
                "selection": cursor_data.get("selection")
            })
    
    async def _send_to_user(self, user_id: str, message: Dict[str, Any]) -> None:
        """Send message to specific user."""
        if user_id in self.connections:
            try:
                await self.connections[user_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")
                await self.remove_user(user_id)
    
    async def _broadcast_except_user(self, except_user_id: str, message: Dict[str, Any]) -> None:
        """Broadcast message to all users except specified one."""
        disconnected_users = []
        
        for user_id, websocket in self.connections.items():
            if user_id != except_user_id:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send message to user {user_id}: {e}")
                    disconnected_users.append(user_id)
        
        # Remove disconnected users
        for user_id in disconnected_users:
            await self.remove_user(user_id)
    
    async def _persist_document_state(self) -> None:
        """Persist document state to database."""
        if not self.document_state:
            return
        
        try:
            async with get_db() as db:
                # Update page content in database
                result = await db.execute(
                    "UPDATE pages SET content = :content, version = :version WHERE id = :id",
                    {
                        "content": self.document_state.hex(),
                        "version": self.version,
                        "id": self.doc_id
                    }
                )
                await db.commit()
                
                logger.info(f"Persisted document {self.doc_id} state, version {self.version}")
        
        except Exception as e:
            logger.error(f"Failed to persist document state: {e}")
    
    async def cleanup_inactive_users(self) -> None:
        """Remove users who haven't been active recently."""
        cutoff_time = datetime.now() - timedelta(minutes=5)
        inactive_users = []
        
        for user_id, user in self.users.items():
            if user.last_seen and user.last_seen < cutoff_time:
                inactive_users.append(user_id)
        
        for user_id in inactive_users:
            await self.remove_user(user_id)


class CollaborationService:
    """Main collaboration service managing all documents."""
    
    def __init__(self):
        self.documents: Dict[str, DocumentCollaborationManager] = {}
        self.cleanup_task: Optional[asyncio.Task] = None
        
    async def start(self) -> None:
        """Start the collaboration service."""
        # Start cleanup task
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Collaboration service started")
    
    async def stop(self) -> None:
        """Stop the collaboration service."""
        if self.cleanup_task:
            self.cleanup_task.cancel()
        
        # Clean up all documents
        for doc_manager in self.documents.values():
            for user_id in list(doc_manager.users.keys()):
                await doc_manager.remove_user(user_id)
        
        self.documents.clear()
        logger.info("Collaboration service stopped")
    
    async def join_document(self, doc_id: str, user_id: str, websocket: WebSocket, user_info: Dict[str, Any]) -> None:
        """Join a document collaboration session."""
        # Check permissions
        async with get_db() as db:
            permission_service = PermissionService(db)
            has_permission = await permission_service.check_permission(
                user_id, doc_id, "read"
            )
            
            if not has_permission:
                await websocket.close(code=4003, reason="Forbidden")
                return
        
        # Get or create document manager
        if doc_id not in self.documents:
            self.documents[doc_id] = DocumentCollaborationManager(doc_id)
        
        doc_manager = self.documents[doc_id]
        await doc_manager.add_user(user_id, websocket, user_info)
        
        logger.info(f"User {user_id} joined document {doc_id}")
    
    async def leave_document(self, doc_id: str, user_id: str) -> None:
        """Leave a document collaboration session."""
        if doc_id in self.documents:
            doc_manager = self.documents[doc_id]
            await doc_manager.remove_user(user_id)
            
            # Remove document manager if no users left
            if not doc_manager.users:
                del self.documents[doc_id]
        
        logger.info(f"User {user_id} left document {doc_id}")
    
    async def handle_websocket_message(self, doc_id: str, user_id: str, message: Dict[str, Any]) -> None:
        """Handle incoming WebSocket message."""
        if doc_id not in self.documents:
            return
        
        doc_manager = self.documents[doc_id]
        message_type = message.get("type")
        
        if message_type == "yjs_update":
            update_data = bytes.fromhex(message.get("update", ""))
            await doc_manager.handle_yjs_update(user_id, update_data)
        
        elif message_type == "cursor_update":
            await doc_manager.handle_cursor_update(user_id, message.get("data", {}))
        
        elif message_type == "ping":
            # Keep user active
            if user_id in doc_manager.users:
                doc_manager.users[user_id].last_seen = datetime.now()
    
    async def _cleanup_loop(self) -> None:
        """Periodic cleanup of inactive users and documents."""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                # Clean up inactive users in each document
                for doc_id, doc_manager in list(self.documents.items()):
                    await doc_manager.cleanup_inactive_users()
                    
                    # Remove empty documents
                    if not doc_manager.users:
                        del self.documents[doc_id]
                        logger.info(f"Removed empty document {doc_id}")
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")


# Global collaboration service instance
collaboration_service = CollaborationService()


async def get_collaboration_service() -> CollaborationService:
    """Get collaboration service instance."""
    return collaboration_service