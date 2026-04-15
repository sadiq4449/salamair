import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User
from app.services.message_service import create_chat_message, format_message
from app.services.websocket_manager import manager

logger = logging.getLogger("uvicorn.error")
router = APIRouter()


def _authenticate_ws(token: str) -> User | None:
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
        return user
    finally:
        db.close()


@router.websocket("/ws/{request_id}")
async def websocket_endpoint(websocket: WebSocket, request_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    user = _authenticate_ws(token)
    if not user:
        await websocket.close(code=4003, reason="Invalid token")
        return

    user_id = str(user.id)
    room_id = request_id
    user_info = {"name": user.name, "role": user.role}

    await manager.connect(websocket, room_id, user_id, user_info)

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
                        "name": user.name,
                        "is_typing": data.get("data", {}).get("is_typing", False),
                    },
                }, exclude=user_id)

            elif event == "send_message":
                msg_data = data.get("data", {})
                content = msg_data.get("content", "").strip()
                if not content:
                    continue

                db = SessionLocal()
                try:
                    msg = create_chat_message(db, request_id, user, content)
                    formatted = format_message(msg, user.id, db)
                finally:
                    db.close()

                await manager.broadcast(room_id, {
                    "event": "new_message",
                    "data": formatted,
                })

            elif event == "mark_read":
                msg_id = data.get("data", {}).get("message_id")
                if msg_id:
                    from app.services.message_service import mark_messages_read
                    import uuid as _uuid
                    db = SessionLocal()
                    try:
                        mark_messages_read(db, [_uuid.UUID(msg_id)], _uuid.UUID(user_id))
                    finally:
                        db.close()

    except WebSocketDisconnect:
        await manager.disconnect(room_id, user_id)
    except Exception as e:
        logger.exception("WebSocket error: %s", e)
        await manager.disconnect(room_id, user_id)
