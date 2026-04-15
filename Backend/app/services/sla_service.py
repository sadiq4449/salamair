"""SLA segments in DB + dashboard/history helpers."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.request import Request
from app.models.sla_tracking import SlaTracking
from app.models.user import User
from app.services.notification_service import SLA_DEADLINES


def _utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def hours_for_status(_db: Session, status: str) -> int | None:
    return SLA_DEADLINES.get(status)


def close_open_segments(db: Session, request_id: uuid.UUID, at: datetime) -> None:
    at_utc = _utc(at)
    rows = (
        db.query(SlaTracking)
        .filter(SlaTracking.request_id == request_id, SlaTracking.completed_at.is_(None))
        .all()
    )
    for row in rows:
        row.completed_at = at_utc
        dl = _utc(row.deadline_at)
        row.is_breached = at_utc > dl


def open_segment(db: Session, request_id: uuid.UUID, status: str, hours: int) -> SlaTracking:
    now = datetime.now(timezone.utc)
    deadline = now + timedelta(hours=hours)
    row = SlaTracking(
        request_id=request_id,
        status=status,
        started_at=now,
        deadline_at=deadline,
        completed_at=None,
        is_breached=False,
    )
    db.add(row)
    return row


def sync_sla_for_request(db: Session, req: Request, _old_status: str | None = None) -> None:
    """Close any open SLA segment and open a new one when the new status has an SLA window."""
    now = datetime.now(timezone.utc)
    close_open_segments(db, req.id, now)
    h = hours_for_status(db, req.status)
    if h is not None:
        open_segment(db, req.id, req.status, h)


def compute_sla_with_db(db: Session, req: Request) -> dict | None:
    """Prefer active sla_tracking row; otherwise fall back to SLA_DEADLINES from last update."""
    active = (
        db.query(SlaTracking)
        .filter(SlaTracking.request_id == req.id, SlaTracking.completed_at.is_(None))
        .order_by(desc(SlaTracking.started_at))
        .first()
    )
    now = datetime.now(timezone.utc)

    if active:
        deadline = _utc(active.deadline_at)
        started = _utc(active.started_at)
        total = max(1, int((deadline - started).total_seconds()))
        remaining = int((deadline - now).total_seconds())
        rem = max(0, remaining)
        pct = max(0, min(100, int(rem / total * 100)))
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
            "remaining_seconds": rem,
            "total_seconds": total,
            "percentage": pct,
            "color": color,
            "label": label,
            "segment_status": active.status,
        }

    hours = SLA_DEADLINES.get(req.status)
    if hours is None:
        return None
    deadline = _utc(req.updated_at) + timedelta(hours=hours)
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
        "segment_status": req.status,
    }


def sla_dashboard_payload(db: Session) -> dict:
    tracked_statuses = tuple(SLA_DEADLINES.keys())
    reqs = (
        db.query(Request)
        .filter(Request.status.in_(tracked_statuses))
        .options()
        .all()
    )
    on_track = at_risk = breached = 0
    overdue_list: list[dict] = []

    for r in reqs:
        info = compute_sla_with_db(db, r)
        if not info:
            continue
        rem = info["remaining_seconds"]
        total = info["total_seconds"] or 1
        ratio = rem / total
        assignee_name = None
        if r.assigned_to:
            u = db.query(User).filter(User.id == r.assigned_to).first()
            assignee_name = u.name if u else None
        if rem <= 0:
            breached += 1
            overdue_hours = abs(rem) / 3600.0
            overdue_list.append(
                {
                    "request_code": r.request_code,
                    "status": r.status,
                    "sla_deadline": info["deadline"],
                    "overdue_hours": round(overdue_hours, 2),
                    "assigned_to": assignee_name or "—",
                }
            )
        elif ratio < 0.25:
            at_risk += 1
        else:
            on_track += 1

    total_tracked = on_track + at_risk + breached
    compliance = round((on_track / total_tracked * 100), 2) if total_tracked else 100.0

    return {
        "compliance_rate": compliance,
        "total_tracked": total_tracked,
        "on_track": on_track,
        "at_risk": at_risk,
        "breached": breached,
        "overdue_requests": sorted(overdue_list, key=lambda x: x["overdue_hours"], reverse=True)[:50],
    }


def sla_history_for_request(db: Session, request_id: uuid.UUID) -> list[dict]:
    rows = (
        db.query(SlaTracking)
        .filter(SlaTracking.request_id == request_id)
        .order_by(SlaTracking.started_at.asc())
        .all()
    )
    out = []
    for row in rows:
        out.append(
            {
                "id": str(row.id),
                "status": row.status,
                "started_at": _utc(row.started_at).isoformat(),
                "deadline_at": _utc(row.deadline_at).isoformat(),
                "completed_at": _utc(row.completed_at).isoformat() if row.completed_at else None,
                "is_breached": row.is_breached,
            }
        )
    return out
