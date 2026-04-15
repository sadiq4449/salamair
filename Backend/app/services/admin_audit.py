from uuid import UUID

from sqlalchemy.orm import Session

from app.models.system_config import SystemConfig
from app.models.system_log import SystemLog

DEFAULT_SYSTEM_CONFIG: list[tuple[str, str, str]] = [
    ("sla_submitted_hours", "4", "SLA for submitted requests (hours)"),
    ("sla_review_hours", "8", "SLA for under-review requests (hours)"),
    ("sla_rm_hours", "24", "SLA for RM pending requests (hours)"),
    ("email_polling_interval", "120", "Email poll interval in seconds"),
    ("max_file_size_mb", "10", "Max upload file size (MB)"),
    ("allowed_file_types", "pdf,xlsx,docx", "Allowed upload types (comma-separated)"),
    ("rm_email_address", "rm@salamair.com", "Default RM email"),
]

ADMIN_CONFIG_KEYS: frozenset[str] = frozenset(k for k, _, _ in DEFAULT_SYSTEM_CONFIG)


def ensure_default_system_config(db: Session) -> None:
    existing = {r.key for r in db.query(SystemConfig.key).all()}
    added = False
    for key, value, description in DEFAULT_SYSTEM_CONFIG:
        if key not in existing:
            db.add(SystemConfig(key=key, value=value, description=description))
            added = True
    if added:
        db.commit()


def log_admin_action(
    db: Session,
    *,
    action: str,
    actor_id: UUID | None,
    target_type: str | None = None,
    target_id: UUID | None = None,
    details: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    db.add(
        SystemLog(
            action=action,
            actor_id=actor_id,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address,
            user_agent=(user_agent[:500] if user_agent else None),
        )
    )
