from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.models.message import Message
from app.models.message_read_status import MessageReadStatus
from app.models.request import Request
from app.models.user import User


def create_chat_message(
    db: Session,
    request_id: uuid.UUID,
    sender: User,
    content: str,
) -> Message:
    msg = Message(
        request_id=request_id,
        sender_id=sender.id,
        type="chat",
        sender_role=sender.role,
        content=content,
    )
    db.add(msg)
    db.commit()

    loaded_msg = (
        db.query(Message)
        .options(joinedload(Message.sender), joinedload(Message.attachments))
        .filter(Message.id == msg.id)
        .first()
    )
    return loaded_msg or msg


def create_system_message(
    db: Session,
    request_id: uuid.UUID,
    content: str,
    metadata: dict | None = None,
) -> Message:
    msg = Message(
        request_id=request_id,
        sender_id=None,
        type="system",
        sender_role="system",
        content=content,
        metadata_=metadata,
    )
    db.add(msg)
    db.commit()

    loaded_msg = (
        db.query(Message)
        .options(joinedload(Message.attachments))
        .filter(Message.id == msg.id)
        .first()
    )
    return loaded_msg or msg


def get_timeline(
    db: Session,
    request_id: uuid.UUID,
    user_id: uuid.UUID,
    msg_type: str = "all",
    page: int = 1,
    limit: int = 50,
) -> tuple[list[Message], int]:
    query = db.query(Message).filter(Message.request_id == request_id)

    if msg_type != "all":
        query = query.filter(Message.type == msg_type)

    total = query.count()
    messages = (
        query
        .order_by(Message.created_at.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return messages, total


def filter_message_ids_for_user(
    db: Session,
    user: User,
    message_ids: list[uuid.UUID],
) -> list[uuid.UUID]:
    """Message IDs that belong to requests this user may access (same rule as timeline)."""
    if not message_ids:
        return []
    q = (
        db.query(Message.id)
        .filter(Message.id.in_(message_ids))
        .join(Request, Message.request_id == Request.id)
    )
    if user.role == "agent":
        q = q.filter(Request.agent_id == user.id)
    return [row[0] for row in q.all()]


def mark_messages_read(
    db: Session,
    message_ids: list[uuid.UUID],
    user_id: uuid.UUID,
) -> int:
    """Mark the given messages as read for ``user_id``.

    Uses one bulk SELECT to find already-read rows and one bulk INSERT for
    the rest — replacing the previous per-id SELECT/INSERT pair (N+1).
    """
    if not message_ids:
        return 0

    already_read = {
        row[0]
        for row in db.query(MessageReadStatus.message_id)
        .filter(
            MessageReadStatus.user_id == user_id,
            MessageReadStatus.message_id.in_(message_ids),
        )
        .all()
    }
    to_insert = [mid for mid in set(message_ids) if mid not in already_read]
    if not to_insert:
        return 0

    now = datetime.now(timezone.utc)
    db.bulk_save_objects(
        [
            MessageReadStatus(message_id=mid, user_id=user_id, read_at=now)
            for mid in to_insert
        ]
    )
    db.commit()
    return len(to_insert)


def is_message_read_by(db: Session, message_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return (
        db.query(MessageReadStatus)
        .filter(MessageReadStatus.message_id == message_id, MessageReadStatus.user_id == user_id)
        .first()
    ) is not None


def format_message(msg: Message, current_user_id: uuid.UUID | None = None, db: Session | None = None) -> dict:
    sender = None
    if msg.sender:
        sender = {
            "id": str(msg.sender.id),
            "name": msg.sender.name,
            "role": msg.sender_role or msg.sender.role,
        }
    elif msg.type == "system":
        sender = None

    is_read = False
    if current_user_id and db:
        is_read = is_message_read_by(db, msg.id, current_user_id)

    return {
        "id": str(msg.id),
        "request_id": str(msg.request_id),
        "type": msg.type,
        "sender": sender,
        "content": msg.content,
        "attachments": [
            {
                "id": str(a.id),
                "filename": a.filename,
                "file_url": a.file_url,
                "file_type": a.file_type,
                "file_size": a.file_size,
            }
            for a in msg.attachments
        ],
        "is_read": is_read,
        "timestamp": msg.created_at.isoformat(),
    }
