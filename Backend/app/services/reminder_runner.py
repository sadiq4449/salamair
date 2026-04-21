"""Evaluate reminder_config rules and enqueue in-app (and optional email) notifications."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.reminder_config import ReminderConfig
from app.models.request import Request
from app.models.user import User
from app.services.email_service import send_smtp_email
from app.services.notification_service import format_notification
from app.services.websocket_manager import manager

logger = logging.getLogger("uvicorn.error")


def ensure_default_reminder_rules(db: Session) -> None:
    if db.query(ReminderConfig).first():
        return
    defaults = [
        ("submitted", 4, "both", "Request {{code}} is still awaiting review after {{hours}} hours."),
        ("under_review", 6, "in_app", "Request {{code}} has been under review with no action for {{hours}} hours."),
        ("rm_pending", 24, "email", "Request {{code}} is pending RM response for {{hours}} hours."),
        ("counter_offered", 24, "email", "Request {{code}} counter-offer awaiting agent response ({{hours}}h)."),
    ]
    for status, delay, rtype, tmpl in defaults:
        db.add(
            ReminderConfig(
                trigger_status=status,
                delay_hours=delay,
                reminder_type=rtype,
                message_template=tmpl,
                is_active=True,
            )
        )
    db.commit()


def _dedupe_recent(db: Session, user_id: uuid.UUID, request_id: uuid.UUID, hours: int = 12) -> bool:
    """True if a REMINDER notification already exists recently for this user+request."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    exists = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.request_id == request_id,
            Notification.type == "REMINDER",
            Notification.created_at >= since,
        )
        .first()
    )
    return exists is not None


def run_reminder_scan(db: Session) -> dict[str, int]:
    """Scan active rules and notify eligible users. Returns counts."""
    ensure_default_reminder_rules(db)
    now = datetime.now(timezone.utc)
    rules = db.query(ReminderConfig).filter(ReminderConfig.is_active.is_(True)).all()
    created = 0
    emails = 0

    for rule in rules:
        threshold = now - timedelta(hours=rule.delay_hours)
        reqs = (
            db.query(Request)
            .filter(Request.status == rule.trigger_status, Request.updated_at <= threshold)
            .all()
        )
        for req in reqs:
            recipients: list[User] = []
            if rule.trigger_status in ("submitted",):
                recipients = db.query(User).filter(User.role == "sales", User.is_active.is_(True)).all()
            elif rule.trigger_status == "under_review" and req.assigned_to:
                u = db.query(User).filter(User.id == req.assigned_to).first()
                if u:
                    recipients = [u]
            elif rule.trigger_status == "rm_pending":
                recipients = db.query(User).filter(User.role == "sales", User.is_active.is_(True)).all()
            elif rule.trigger_status == "counter_offered":
                u = db.query(User).filter(User.id == req.agent_id).first()
                if u:
                    recipients = [u]

            msg = (
                rule.message_template.replace("{{code}}", req.request_code)
                .replace("{{hours}}", str(rule.delay_hours))
            )

            for user in recipients:
                if _dedupe_recent(db, user.id, req.id):
                    continue

                n: Notification | None = None
                if rule.reminder_type in ("in_app", "both"):
                    n = Notification(
                        user_id=user.id,
                        type="REMINDER",
                        title="Follow-up reminder",
                        message=msg,
                        request_id=req.id,
                        request_code=req.request_code,
                        is_email_sent=False,
                    )
                    db.add(n)
                    db.flush()
                    created += 1
                    try:
                        manager.push_to_user_threadsafe(
                            str(user.id),
                            {"event": "notification", "data": format_notification(n)},
                        )
                    except Exception as e:
                        logger.debug("WS push reminder: %s", e)

                if rule.reminder_type in ("email", "both") and user.email:
                    try:
                        send_smtp_email(
                            to_email=user.email,
                            subject=f"Reminder: {req.request_code}",
                            body_text=msg,
                            body_html=f"<p>{msg}</p>",
                        )
                        emails += 1
                    except Exception as e:
                        logger.warning("Reminder email failed for %s: %s", user.email, e)

    db.commit()
    return {"notifications_created": created, "emails_sent": emails}
