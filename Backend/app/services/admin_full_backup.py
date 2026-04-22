"""Assemble a single plain-text dump of users, all requests (deal+chat+RM), and system logs for admin PDF backup."""

from __future__ import annotations

from datetime import timezone

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.request import Request
from app.models.system_log import SystemLog
from app.models.user import User
from app.services.request_export_service import _ts, build_combined_text


def _format_user_line(u: User) -> str:
    extra = ""
    if u.role == "agent" and u.agent_profile:
        p = u.agent_profile
        co = p.company_name or "—"
        extra = f" | company={co} | credit_limit_OMR={p.credit_limit}"
    return (
        f"{_ts(u.created_at)} | {u.name} | {u.email} | role={u.role} | active={u.is_active} | city={u.city or '—'}{extra}"
    )


def build_full_portal_backup_text(db: Session, admin: User) -> str:
    if admin.role != "admin":
        raise ValueError("Full portal backup is restricted to admin users")
    from datetime import datetime

    now = datetime.now(timezone.utc)
    u_count = int(db.query(func.count(User.id)).scalar() or 0)
    r_count = int(db.query(func.count(Request.id)).scalar() or 0)
    log_count = int(db.query(func.count(SystemLog.id)).scalar() or 0)

    out: list[str] = [
        "Salam Air SmartDeal — full portal text backup",
        "=" * 80,
        f"Generated (UTC): {now.isoformat()}",
        f"Exported by: {admin.name} <{admin.email}>",
        "",
        "COUNTS (password hashes are never included)",
        "-" * 40,
        f"User accounts: {u_count}  |  Deal requests: {r_count}  |  System log rows: {log_count}",
        "",
    ]

    users = (
        db.query(User)
        .options(joinedload(User.agent_profile))
        .order_by(User.created_at.asc())
        .all()
    )
    out.append("USER ACCOUNTS")
    out.append("=" * 80)
    for u in users:
        out.append(_format_user_line(u))
    out.append("")

    reqs = (
        db.query(Request)
        .options(joinedload(Request.agent), joinedload(Request.tags), joinedload(Request.attachments))
        .order_by(Request.request_code.asc())
        .all()
    )
    out.append("REQUESTS (per request: deal, activity log, portal chat, Sales↔RM email when present)")
    out.append("=" * 80)
    for r in reqs:
        out.append("")
        out.append("█" * 80)
        out.append(f"REQUEST {r.request_code}  (id: {r.id})")
        out.append("█" * 80)
        out.append(build_combined_text(db, r, admin))
    out.append("")

    logs = (
        db.query(SystemLog)
        .options(joinedload(SystemLog.actor))
        .order_by(SystemLog.created_at.asc())
        .all()
    )
    out.append("SYSTEM / ADMIN AUDIT LOGS")
    out.append("=" * 80)
    for log in logs:
        who = log.actor.name if log.actor else "—"
        out.append("-" * 40)
        out.append(f"{_ts(log.created_at)} | {log.action} | actor={who} | target={log.target_type} {log.target_id or ''}")
        if log.details and str(log.details).strip():
            out.append(f"  {log.details}")
        if log.ip_address:
            out.append(f"  ip: {log.ip_address}")
    out.append("")
    return "\n".join(out)
