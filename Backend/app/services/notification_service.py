from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.request import Request
from app.models.user import User

logger = logging.getLogger("uvicorn.error")

NOTIFICATION_TYPES = {
    "REQUEST_CREATED",
    "REQUEST_APPROVED",
    "REQUEST_REJECTED",
    "COUNTER_OFFERED",
    "SENT_TO_RM",
    "EMAIL_RECEIVED",
    "NEW_MESSAGE",
    "SLA_WARNING",
    "SLA_BREACHED",
    "REQUEST_ASSIGNED",
}

EMAIL_WORTHY_TYPES = {
    "REQUEST_APPROVED",
    "REQUEST_REJECTED",
    "SLA_BREACHED",
}

SLA_DEADLINES: dict[str, int] = {
    "submitted": 4,       # hours to start review
    "under_review": 8,    # hours to take action
    "rm_pending": 24,     # hours for expected RM response
}

SLA_WARNING_THRESHOLD = 2  # hours before deadline


def _user_allows_notification(db: Session, user_id: uuid.UUID, notif_type: str) -> tuple[bool, bool]:
    """Return (in_app_allowed, email_allowed) for a given user and type."""
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    if not pref:
        return True, notif_type in EMAIL_WORTHY_TYPES

    disabled = pref.types_disabled or []
    if notif_type in disabled:
        return False, False

    in_app = pref.in_app_enabled
    email = pref.email_enabled and notif_type in EMAIL_WORTHY_TYPES
    return in_app, email


def create_notification(
    db: Session,
    user_id: uuid.UUID,
    notif_type: str,
    title: str,
    message: str,
    request_id: uuid.UUID | None = None,
    request_code: str | None = None,
) -> Notification | None:
    """Create a single notification if user preferences allow it."""
    in_app, should_email = _user_allows_notification(db, user_id, notif_type)
    if not in_app:
        return None

    notif = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        request_id=request_id,
        request_code=request_code,
        is_email_sent=should_email,
    )
    db.add(notif)
    db.flush()
    return notif


def format_notification(notif: Notification) -> dict:
    return {
        "id": str(notif.id),
        "type": notif.type,
        "title": notif.title,
        "message": notif.message,
        "request_id": str(notif.request_id) if notif.request_id else None,
        "request_code": notif.request_code,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
    }


def get_notifications(
    db: Session,
    user_id: uuid.UUID,
    is_read: bool | None = None,
    notif_type: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Notification], int, int]:
    """Return (notifications, total, unread_count)."""
    base = db.query(Notification).filter(Notification.user_id == user_id)

    unread_count = base.filter(Notification.is_read.is_(False)).count()

    query = db.query(Notification).filter(Notification.user_id == user_id)
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    if notif_type:
        query = query.filter(Notification.type == notif_type)

    total = query.count()
    items = (
        query
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return items, total, unread_count


def get_unread_count(db: Session, user_id: uuid.UUID) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .count()
    )


def mark_read(db: Session, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not notif:
        return False
    notif.is_read = True
    db.commit()
    return True


def mark_all_read(db: Session, user_id: uuid.UUID) -> int:
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return count


def get_or_create_preferences(db: Session, user_id: uuid.UUID) -> NotificationPreference:
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    if not pref:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def update_preferences(
    db: Session,
    user_id: uuid.UUID,
    in_app_enabled: bool | None = None,
    email_enabled: bool | None = None,
    sound_enabled: bool | None = None,
    types_disabled: list[str] | None = None,
) -> NotificationPreference:
    pref = get_or_create_preferences(db, user_id)
    if in_app_enabled is not None:
        pref.in_app_enabled = in_app_enabled
    if email_enabled is not None:
        pref.email_enabled = email_enabled
    if sound_enabled is not None:
        pref.sound_enabled = sound_enabled
    if types_disabled is not None:
        pref.types_disabled = types_disabled
    db.commit()
    db.refresh(pref)
    return pref


def compute_sla(req: Request) -> dict | None:
    """Compute SLA info for a request. Returns dict with deadline, remaining, color, label."""
    hours = SLA_DEADLINES.get(req.status)
    if hours is None:
        return None

    deadline = req.updated_at.replace(tzinfo=timezone.utc) + timedelta(hours=hours)
    now = datetime.now(timezone.utc)
    remaining = (deadline - now).total_seconds()
    total = hours * 3600

    if remaining <= 0:
        color, label = "red", "Overdue"
    elif remaining / total < 0.25:
        color, label = "orange", "Urgent"
    elif remaining / total < 0.50:
        color, label = "yellow", "Attention"
    else:
        color, label = "green", "On Track"

    return {
        "deadline": deadline.isoformat(),
        "remaining_seconds": max(0, int(remaining)),
        "total_seconds": total,
        "percentage": max(0, min(100, int(remaining / total * 100))),
        "color": color,
        "label": label,
    }


# ── Trigger helpers (called from route handlers) ──

def notify_request_created(db: Session, req: Request) -> list[Notification]:
    """Notify all active sales users when a new request is submitted."""
    sales_users = db.query(User).filter(User.role == "sales", User.is_active.is_(True)).all()
    notifications = []
    for user in sales_users:
        n = create_notification(
            db, user.id,
            "REQUEST_CREATED",
            "New Request Submitted",
            f"New request {req.request_code} ({req.route}) submitted by agent",
            request_id=req.id,
            request_code=req.request_code,
        )
        if n:
            notifications.append(n)
    db.commit()
    return notifications


def notify_request_approved(db: Session, req: Request) -> list[Notification]:
    n = create_notification(
        db, req.agent_id,
        "REQUEST_APPROVED",
        "Request Approved",
        f"Your request {req.request_code} ({req.route}) has been approved",
        request_id=req.id,
        request_code=req.request_code,
    )
    db.commit()
    return [n] if n else []


def notify_request_rejected(db: Session, req: Request, reason: str | None = None) -> list[Notification]:
    msg = f"Your request {req.request_code} ({req.route}) has been rejected"
    if reason:
        msg += f": {reason}"
    n = create_notification(
        db, req.agent_id,
        "REQUEST_REJECTED",
        "Request Rejected",
        msg,
        request_id=req.id,
        request_code=req.request_code,
    )
    db.commit()
    return [n] if n else []


def notify_counter_offered(db: Session, req: Request, counter_price: float) -> list[Notification]:
    n = create_notification(
        db, req.agent_id,
        "COUNTER_OFFERED",
        "Counter Offer Received",
        f"A counter offer of {counter_price} has been made on {req.request_code} ({req.route})",
        request_id=req.id,
        request_code=req.request_code,
    )
    db.commit()
    return [n] if n else []


def notify_sent_to_rm(db: Session, req: Request) -> list[Notification]:
    sales_users = db.query(User).filter(User.role == "sales", User.is_active.is_(True)).all()
    notifications = []
    for user in sales_users:
        n = create_notification(
            db, user.id,
            "SENT_TO_RM",
            "Sent to Revenue Management",
            f"Request {req.request_code} ({req.route}) forwarded to RM",
            request_id=req.id,
            request_code=req.request_code,
        )
        if n:
            notifications.append(n)
    db.commit()
    return notifications


def notify_new_message(db: Session, req: Request, sender: User, recipient_id: uuid.UUID) -> list[Notification]:
    n = create_notification(
        db, recipient_id,
        "NEW_MESSAGE",
        "New Message",
        f"{sender.name} ({sender.role}) sent a message on {req.request_code}",
        request_id=req.id,
        request_code=req.request_code,
    )
    db.commit()
    return [n] if n else []


def notify_request_assigned(db: Session, req: Request, assignee_id: uuid.UUID) -> list[Notification]:
    n = create_notification(
        db, assignee_id,
        "REQUEST_ASSIGNED",
        "Request Assigned",
        f"Request {req.request_code} ({req.route}) has been assigned to you",
        request_id=req.id,
        request_code=req.request_code,
    )
    db.commit()
    return [n] if n else []


def cleanup_old_notifications(db: Session, days: int = 30) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    count = (
        db.query(Notification)
        .filter(Notification.created_at < cutoff, Notification.is_read.is_(True))
        .delete()
    )
    db.commit()
    return count
