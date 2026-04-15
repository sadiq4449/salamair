import json
import logging
import uuid as _uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.message import Message
from app.models.user import User
from app.services.message_service import create_chat_message, format_message, mark_messages_read
from app.services.websocket_manager import manager

logger = logging.getLogger("uvicorn.error")
router = APIRouter()


def _authenticate_ws(token: str) -> dict | None:
    """Validate JWT and return plain dict of user attributes (no ORM object)."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
        if not user:
            return None
        return {
            "id": str(user.id),
            "id_uuid": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        }
    finally:
        db.close()


@router.websocket("/ws/{request_id}")
async def websocket_endpoint(websocket: WebSocket, request_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    user_info = _authenticate_ws(token)
    if not user_info:
        await websocket.close(code=4003, reason="Invalid token")
        return

    user_id = user_info["id"]
    room_id = request_id

    await manager.connect(websocket, room_id, user_id, {"name": user_info["name"], "role": user_info["role"]})

    online_users = manager.get_online_users(room_id)
    await manager.send_personal(room_id, user_id, {
        "event": "room_state",
        "data": {"online_users": online_users},
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event = data.get("event")

            if event == "typing":
                await manager.broadcast(room_id, {
                    "event": "typing",
                    "data": {
                        "user_id": user_id,
                        "name": user_info["name"],
                        "is_typing": data.get("data", {}).get("is_typing", False),
                    },
                }, exclude=user_id)

            elif event == "send_message":
                msg_data = data.get("data", {})
                content = msg_data.get("content", "").strip()
                if not content:
                    continue

                try:
                    db = SessionLocal()
                    try:
                        sender = db.query(User).filter(User.id == user_info["id_uuid"]).first()
                        if not sender:
                            continue
                        msg = create_chat_message(db, request_id, sender, content)
                        formatted = format_message(msg, user_info["id_uuid"], db)
                    finally:
                        db.close()

                    await manager.broadcast(room_id, {
                        "event": "new_message",
                        "data": formatted,
                    })
                except Exception as e:
                    logger.exception("WS send_message error: %s", e)
                    await manager.send_personal(room_id, user_id, {
                        "event": "error",
                        "data": {"message": "Failed to send message"},
                    })

            elif event == "mark_read":
                msg_id = data.get("data", {}).get("message_id")
                if msg_id:
                    try:
                        db = SessionLocal()
                        try:
                            mark_messages_read(db, [_uuid.UUID(msg_id)], _uuid.UUID(user_id))
                        finally:
                            db.close()
                    except Exception as e:
                        logger.exception("WS mark_read error: %s", e)

    except WebSocketDisconnect:
        await manager.disconnect(room_id, user_id)
    except Exception as e:
        logger.exception("WebSocket connection error: %s", e)
        await manager.disconnect(room_id, user_id)
