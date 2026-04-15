from __future__ import annotations

import json
import logging
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger("uvicorn.error")


class ConnectionManager:
    """Manages WebSocket connections grouped by request room."""

    def __init__(self):
        self.rooms: dict[str, dict[str, WebSocket]] = defaultdict(dict)
        self.user_info: dict[str, dict] = {}
        self.user_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, user_info: dict):
        await websocket.accept()
        self.rooms[room_id][user_id] = websocket
        self.user_info[user_id] = user_info
        logger.info("WS connected: user=%s room=%s", user_id, room_id)
        await self.broadcast(room_id, {
            "event": "user_online",
            "data": {"user_id": user_id, "name": user_info.get("name", ""), "online": True},
        }, exclude=user_id)

    async def disconnect(self, room_id: str, user_id: str):
        self.rooms[room_id].pop(user_id, None)
        if not self.rooms[room_id]:
            del self.rooms[room_id]
        user_info = self.user_info.pop(user_id, {})
        logger.info("WS disconnected: user=%s room=%s", user_id, room_id)
        await self.broadcast(room_id, {
            "event": "user_online",
            "data": {"user_id": user_id, "name": user_info.get("name", ""), "online": False},
        })

    async def broadcast(self, room_id: str, message: dict, exclude: str | None = None):
        payload = json.dumps(message)
        dead: list[str] = []
        for uid, ws in self.rooms.get(room_id, {}).items():
            if uid == exclude:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.rooms[room_id].pop(uid, None)

    async def send_personal(self, room_id: str, user_id: str, message: dict):
        ws = self.rooms.get(room_id, {}).get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                self.rooms[room_id].pop(user_id, None)

    def get_online_users(self, room_id: str) -> list[dict]:
        users = []
        for uid in self.rooms.get(room_id, {}):
            info = self.user_info.get(uid, {})
            users.append({"user_id": uid, "name": info.get("name", ""), "online": True})
        return users

    # ── Global user-level connections (for notifications) ──

    async def connect_user(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.user_connections[user_id].append(websocket)
        logger.info("Notification WS connected: user=%s", user_id)

    async def disconnect_user(self, websocket: WebSocket, user_id: str):
        conns = self.user_connections.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.user_connections.pop(user_id, None)
        logger.info("Notification WS disconnected: user=%s", user_id)

    async def push_to_user(self, user_id: str, message: dict):
        """Send a notification payload to all active connections of a user."""
        payload = json.dumps(message)
        dead: list[WebSocket] = []
        for ws in self.user_connections.get(user_id, []):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns = self.user_connections.get(user_id, [])
            if ws in conns:
                conns.remove(ws)

    async def push_to_users(self, user_ids: list[str], message: dict):
        """Push notification to multiple users."""
        for uid in user_ids:
            await self.push_to_user(uid, message)


manager = ConnectionManager()
