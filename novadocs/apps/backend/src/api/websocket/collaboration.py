"""WebSocket collaboration server - Simplified version without Yjs."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio

router = APIRouter()


class CollaborationManager:
    """Manages WebSocket connections for collaboration."""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_connections: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, user_info: dict):
        """Connect user to collaboration room."""
        await websocket.accept()
        
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        
        self.active_connections[room_id].add(websocket)
        self.user_connections[websocket] = {
            "room_id": room_id,
            "user": user_info
        }
        
        # Notify others about new user
        await self.broadcast_to_room(room_id, {
            "type": "user_joined",
            "user": user_info
        }, exclude=websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect user from collaboration."""
        if websocket in self.user_connections:
            room_id = self.user_connections[websocket]["room_id"]
            user_info = self.user_connections[websocket]["user"]
            
            # Remove from active connections
            if room_id in self.active_connections:
                self.active_connections[room_id].discard(websocket)
                if not self.active_connections[room_id]:
                    del self.active_connections[room_id]
            
            # Remove user connection info
            del self.user_connections[websocket]
            
            # Notify others about user leaving
            asyncio.create_task(self.broadcast_to_room(room_id, {
                "type": "user_left",
                "user": user_info
            }))
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast message to all users in room."""
        if room_id not in self.active_connections:
            return
        
        disconnected = []
        for websocket in self.active_connections[room_id]:
            if websocket == exclude:
                continue
            
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                disconnected.append(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)


# Global collaboration manager
collaboration_manager = CollaborationManager()


@router.websocket("/collaboration/{room_id}")
async def websocket_collaboration(
    websocket: WebSocket,
    room_id: str,
    token: str = None
):
    """WebSocket endpoint for real-time collaboration."""
    
    # Mock user info for now
    user_info = {
        "id": "anonymous",
        "name": "Anonymous User",
        "color": "#3B82F6"
    }
    
    await collaboration_manager.connect(websocket, room_id, user_info)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "cursor_update":
                await collaboration_manager.broadcast_to_room(
                    room_id, 
                    {
                        "type": "cursor_update",
                        "user": user_info,
                        "position": message.get("position"),
                        "selection": message.get("selection")
                    },
                    exclude=websocket
                )
            elif message.get("type") == "content_update":
                await collaboration_manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "content_update",
                        "content": message.get("content"),
                        "user": user_info
                    },
                    exclude=websocket
                )
    
    except WebSocketDisconnect:
        collaboration_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        collaboration_manager.disconnect(websocket)
