"""Analytics aggregations (Iteration 7). Date filters use `requests.created_at` in UTC."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy import case, cast, distinct, func, text
from sqlalchemy.orm import Session
from sqlalchemy.types import Date as SA_Date, Numeric

from app.models.email_message import EmailMessage
from app.models.request import Request
from app.models.user import User

TERMINAL_STATUSES = ("approved", "rejected")
QUEUE_STATUSES = ("draft", "submitted", "under_review", "rm_pending", "counter_offered")


def _day_range(d0: date, d1: date) -> list[date]:
    out: list[date] = []
    cur = d0
    while cur <= d1:
        out.append(cur)
        cur += timedelta(days=1)
    return out


def _prev_period(d_from: date, d_to: date) -> tuple[date, date]:
    span = (d_to - d_from).days + 1
    prev_to = d_from - timedelta(days=1)
    prev_from = prev_to - timedelta(days=span - 1)
    return prev_from, prev_to


def _pct_change(cur: float, prev: float) -> float:
    if prev == 0:
        return 100.0 if cur > 0 else 0.0
    return round((cur - prev) / prev * 100.0, 1)


def _dt_range(d_from: date, d_to: date) -> tuple[datetime, datetime]:
    start_dt = datetime(d_from.year, d_from.month, d_from.day, tzinfo=timezone.utc)
    end_dt = datetime(d_to.year, d_to.month, d_to.day, 23, 59, 59, 999999, tzinfo=timezone.utc)
    return start_dt, end_dt


def _apply_agent_scope(q, agent_scope: uuid.UUID | None):
    if agent_scope is not None:
        return q.filter(Request.agent_id == agent_scope)
    return q


def _avg_first_response_hours(
    db: Session,
    start_dt: datetime,
    end_dt: datetime,
    agent_scope: uuid.UUID | None,
) -> float:
    """Mean hours from submission anchor to first `under_review` (PostgreSQL)."""
    params: dict[str, Any] = {"start": start_dt, "end": end_dt}
    extra = ""
    if agent_scope is not None:
        extra = " AND r.agent_id = CAST(:agent_id AS uuid)"
        params["agent_id"] = str(agent_scope)

    sql = text(
        f"""
        SELECT AVG(EXTRACT(EPOCH FROM (x.first_uv - x.anchor)) / 3600.0)
        FROM (
            SELECT
                COALESCE(
                    (SELECT MIN(created_at) FROM request_history
                     WHERE request_id = r.id AND to_status = 'submitted'),
                    r.created_at
                ) AS anchor,
                (SELECT MIN(created_at) FROM request_history
                 WHERE request_id = r.id AND to_status = 'under_review') AS first_uv
            FROM requests r
            WHERE r.created_at >= :start AND r.created_at <= :end
            {extra}
        ) x
        WHERE x.first_uv IS NOT NULL
        """
    )
    row = db.execute(sql, params).scalar()
    if row is None:
        return 0.0
    return round(float(row), 2)


def compute_kpis(
    db: Session,
    d_from: date,
    d_to: date,
    agent_scope: uuid.UUID | None,
) -> dict[str, Any]:
    start_dt, end_dt = _dt_range(d_from, d_to)

    base = _apply_agent_scope(
        db.query(Request).filter(Request.created_at >= start_dt, Request.created_at <= end_dt),
        agent_scope,
    )

    total_requests = base.count()
    approved_n = base.filter(Request.status == "approved").count()
    rejected_n = base.filter(Request.status == "rejected").count()
    decided_n = approved_n + rejected_n
    approval_rate = round(100.0 * approved_n / decided_n, 1) if decided_n else 0.0

    revenue_row = (
        _apply_agent_scope(
            db.query(func.coalesce(func.sum(Request.price), 0)).filter(
                Request.created_at >= start_dt,
                Request.created_at <= end_dt,
                Request.status == "approved",
            ),
            agent_scope,
        ).scalar()
    )
    total_revenue = float(revenue_row or 0)

    pending_requests = _apply_agent_scope(
        db.query(Request).filter(Request.status.in_(QUEUE_STATUSES)),
        agent_scope,
    ).count()

    active_agents = (
        _apply_agent_scope(
            db.query(func.count(distinct(Request.agent_id))).filter(
                Request.created_at >= start_dt,
                Request.created_at <= end_dt,
            ),
            agent_scope,
        ).scalar()
        or 0
    )

    avg_response = _avg_first_response_hours(db, start_dt, end_dt, agent_scope)

    status_breakdown = (
        _apply_agent_scope(
            db.query(Request.status, func.count())
            .filter(Request.created_at >= start_dt, Request.created_at <= end_dt)
            .group_by(Request.status),
            agent_scope,
        ).all()
    )
    status_distribution = {row[0]: int(row[1]) for row in status_breakdown}

    p_from, p_to = _prev_period(d_from, d_to)
    p_start, p_end = _dt_range(p_from, p_to)

    def period_totals(sf: date, st: date) -> tuple[int, float, float, float]:
        s0, s1 = _dt_range(sf, st)
        q = _apply_agent_scope(
            db.query(Request).filter(Request.created_at >= s0, Request.created_at <= s1),
            agent_scope,
        )
        tr = q.count()
        appr = q.filter(Request.status == "approved").count()
        rej = q.filter(Request.status == "rejected").count()
        dec = appr + rej
        ar = round(100.0 * appr / dec, 1) if dec else 0.0
        rev_row = (
            _apply_agent_scope(
                db.query(func.coalesce(func.sum(Request.price), 0)).filter(
                    Request.created_at >= s0,
                    Request.created_at <= s1,
                    Request.status == "approved",
                ),
                agent_scope,
            ).scalar()
        )
        rev = float(rev_row or 0)
        art = _avg_first_response_hours(db, s0, s1, agent_scope)
        return tr, ar, rev, art

    pt, par, prev_rev, part = period_totals(p_from, p_to)

    resp_change: float
    if part > 0:
        resp_change = _pct_change(avg_response, part)
    elif avg_response == 0 and part == 0:
        resp_change = 0.0
    else:
        resp_change = 100.0 if avg_response > 0 else 0.0

    return {
        "total_requests": total_requests,
        "total_requests_change": _pct_change(float(total_requests), float(pt)),
        "approval_rate": approval_rate,
        "approval_rate_change": _pct_change(approval_rate, par),
        "avg_response_time_hours": avg_response,
        "avg_response_time_change": resp_change,
        "total_revenue": total_revenue,
        "total_revenue_change": _pct_change(total_revenue, prev_rev),
        "pending_requests": pending_requests,
        "active_agents": int(active_agents),
        "status_distribution": status_distribution,
    }


def _agent_avg_response_map(
    db: Session,
    start_dt: datetime,
    end_dt: datetime,
    agent_scope: uuid.UUID | None,
) -> dict[str, float]:
    params: dict[str, Any] = {"start": start_dt, "end": end_dt}
    scope_clause = ""
    if agent_scope is not None:
        scope_clause = " AND r.agent_id = CAST(:agent_id AS uuid)"
        params["agent_id"] = str(agent_scope)

    sql = text(
        """
        SELECT q.agent_id::text,
               AVG(EXTRACT(EPOCH FROM (q.first_uv - q.anchor)) / 3600.0)
        FROM (
            SELECT
                r.agent_id,
                COALESCE(
                    (SELECT MIN(created_at) FROM request_history
                     WHERE request_id = r.id AND to_status = 'submitted'),
                    r.created_at
                ) AS anchor,
                (SELECT MIN(created_at) FROM request_history
                 WHERE request_id = r.id AND to_status = 'under_review') AS first_uv
            FROM requests r
            WHERE r.created_at >= :start AND r.created_at <= :end
            __AGENT_SCOPE__
        ) q
        WHERE q.first_uv IS NOT NULL
        GROUP BY q.agent_id
        """.replace("__AGENT_SCOPE__", scope_clause)
    )

    rows = db.execute(sql, params).fetchall()
    return {r[0]: round(float(r[1]), 2) for r in rows}


def compute_agent_performance(
    db: Session,
    d_from: date,
    d_to: date,
    agent_scope: uuid.UUID | None,
    sort: str,
    limit: int,
) -> tuple[list[dict[str, Any]], int]:
    start_dt, end_dt = _dt_range(d_from, d_to)
    rt_map = _agent_avg_response_map(db, start_dt, end_dt, agent_scope)

    q = (
        db.query(
            User.id,
            User.name,
            User.city,
            func.count(Request.id).label("total_requests"),
            func.sum(case((Request.status == "approved", 1), else_=0)).label("approved"),
            func.sum(case((Request.status == "rejected", 1), else_=0)).label("rejected"),
            func.sum(case((Request.status.in_(QUEUE_STATUSES), 1), else_=0)).label("pending"),
            func.sum(case((Request.status == "approved", cast(Request.price, Numeric)), else_=0)).label("total_revenue"),
        )
        .join(User, User.id == Request.agent_id)
        .filter(
            Request.created_at >= start_dt,
            Request.created_at <= end_dt,
            User.role == "agent",
        )
    )
    q = _apply_agent_scope(q, agent_scope)
    q = q.group_by(User.id, User.name, User.city)

    rows = q.all()
    total = len(rows)

    out: list[dict[str, Any]] = []
    for row in rows:
        uid, name, city, tr, appr, rej, pend, rev = row
        appr = int(appr or 0)
        rej = int(rej or 0)
        pend = int(pend or 0)
        decided = appr + rej
        rate = round(100.0 * appr / decided, 1) if decided else 0.0
        uid_s = str(uid)
        out.append(
            {
                "id": uid_s,
                "name": name,
                "company": name,
                "city": city or "—",
                "total_requests": int(tr or 0),
                "approved": appr,
                "rejected": rej,
                "pending": pend,
                "approval_rate": rate,
                "total_revenue": float(rev or 0),
                "avg_response_time_hours": rt_map.get(uid_s, 0.0),
                "_sort_approval_rate": rate,
            }
        )

    if sort == "approval_rate":
        out.sort(key=lambda x: x["_sort_approval_rate"], reverse=True)
    elif sort == "requests":
        out.sort(key=lambda x: x["total_requests"], reverse=True)
    else:
        out.sort(key=lambda x: x["total_revenue"], reverse=True)

    for o in out:
        del o["_sort_approval_rate"]

    return out[:limit], total


def compute_revenue(
    db: Session,
    d_from: date,
    d_to: date,
    agent_scope: uuid.UUID | None,
    granularity: Literal["daily", "weekly", "monthly"],
) -> dict[str, Any]:
    start_dt, end_dt = _dt_range(d_from, d_to)

    if granularity == "monthly":
        bucket = func.to_char(func.date_trunc("month", Request.created_at), "YYYY-MM")
    elif granularity == "weekly":
        bucket = func.to_char(func.date_trunc("week", Request.created_at), 'IYYY-"W"IW')
    else:
        bucket = cast(Request.created_at, SA_Date)

    q = (
        _apply_agent_scope(
            db.query(
                bucket.label("period"),
                func.coalesce(
                    func.sum(case((Request.status == "approved", cast(Request.price, Numeric)), else_=0)),
                    0,
                ).label("revenue"),
                func.count(Request.id).label("request_count"),
            ).filter(Request.created_at >= start_dt, Request.created_at <= end_dt),
            agent_scope,
        )
        .group_by(bucket)
        .order_by(bucket)
    )

    rows = q.all()
    data: list[dict[str, Any]] = []
    total_rev = 0.0
    for period, revenue, rc in rows:
        if granularity == "daily" and period is not None:
            p = period.isoformat() if hasattr(period, "isoformat") else str(period)
        else:
            p = str(period)
        rev_f = float(revenue or 0)
        total_rev += rev_f
        data.append({"period": p, "revenue": rev_f, "request_count": int(rc or 0)})

    n = len(data) if data else 1
    return {
        "data": data,
        "total_revenue": round(total_rev, 2),
        "avg_monthly_revenue": round(total_rev / max(n, 1), 2),
    }


def compute_request_trends(
    db: Session,
    d_from: date,
    d_to: date,
    agent_scope: uuid.UUID | None,
    granularity: Literal["daily", "weekly", "monthly"],
) -> list[dict[str, Any]]:
    start_dt, end_dt = _dt_range(d_from, d_to)

    if granularity == "daily":
        days = _day_range(d_from, d_to)
        out: list[dict[str, Any]] = []
        for d in days:
            d0, d1 = _dt_range(d, d)
            base = _apply_agent_scope(
                db.query(Request).filter(Request.created_at >= d0, Request.created_at <= d1),
                agent_scope,
            )
            submitted = base.count()
            approved = base.filter(Request.status == "approved").count()
            rejected = base.filter(Request.status == "rejected").count()
            pending = base.filter(Request.status.in_(QUEUE_STATUSES)).count()
            avg_h = _avg_first_response_hours(db, d0, d1, agent_scope)
            out.append(
                {
                    "date": d.isoformat(),
                    "submitted": submitted,
                    "approved": approved,
                    "rejected": rejected,
                    "pending": pending,
                    "avg_response_time_hours": avg_h,
                }
            )
        return out

    if granularity == "monthly":
        bucket = func.to_char(func.date_trunc("month", Request.created_at), "YYYY-MM")
    else:
        bucket = func.to_char(func.date_trunc("week", Request.created_at), 'IYYY-"W"IW')

    rows = (
        _apply_agent_scope(
            db.query(
                bucket.label("b"),
                func.count(Request.id).label("submitted"),
                func.sum(case((Request.status == "approved", 1), else_=0)).label("approved"),
                func.sum(case((Request.status == "rejected", 1), else_=0)).label("rejected"),
                func.sum(case((Request.status.in_(QUEUE_STATUSES), 1), else_=0)).label("pending"),
            ).filter(Request.created_at >= start_dt, Request.created_at <= end_dt),
            agent_scope,
        )
        .group_by(bucket)
        .order_by(bucket)
        .all()
    )

    return [
        {
            "date": str(r.b),
            "submitted": int(r.submitted or 0),
            "approved": int(r.approved or 0),
            "rejected": int(r.rejected or 0),
            "pending": int(r.pending or 0),
            "avg_response_time_hours": 0.0,
        }
        for r in rows
    ]


def compute_city_breakdown(
    db: Session,
    d_from: date,
    d_to: date,
    agent_scope: uuid.UUID | None,
) -> list[dict[str, Any]]:
    start_dt, end_dt = _dt_range(d_from, d_to)
    city_expr = func.coalesce(User.city, "Unknown")

    q = (
        _apply_agent_scope(
            db.query(
                city_expr.label("city"),
                func.count(Request.id).label("requests"),
                func.coalesce(
                    func.sum(case((Request.status == "approved", cast(Request.price, Numeric)), else_=0)),
                    0,
                ).label("revenue"),
                func.count(distinct(Request.agent_id)).label("agents"),
            )
            .join(User, User.id == Request.agent_id)
            .filter(
                Request.created_at >= start_dt,
                Request.created_at <= end_dt,
                User.role == "agent",
            ),
            agent_scope,
        )
        .group_by(city_expr)
        .order_by(func.count(Request.id).desc())
    )

    rows = q.all()
    return [
        {
            "city": str(r.city),
            "requests": int(r.requests or 0),
            "revenue": float(r.revenue or 0),
            "agents": int(r.agents or 0),
        }
        for r in rows
    ]


def count_outgoing_rm_emails(db: Session, d_from: date, d_to: date) -> int:
    """Sales → RM outbound messages recorded in `email_messages` (Iteration 7 / sales demo)."""
    start_dt, end_dt = _dt_range(d_from, d_to)
    n = (
        db.query(func.count(EmailMessage.id))
        .filter(
            EmailMessage.direction == "outgoing",
            EmailMessage.created_at >= start_dt,
            EmailMessage.created_at <= end_dt,
        )
        .scalar()
    )
    return int(n or 0)


def compute_route_revenue(
    db: Session,
    d_from: date,
    d_to: date,
    agent_scope: uuid.UUID | None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Top routes by approved fare revenue (for sales analytics doughnut)."""
    start_dt, end_dt = _dt_range(d_from, d_to)
    rev_sum = func.coalesce(
        func.sum(case((Request.status == "approved", cast(Request.price, Numeric)), else_=0)),
        0,
    ).label("revenue")

    q = (
        _apply_agent_scope(
            db.query(Request.route.label("route"), rev_sum)
            .filter(Request.created_at >= start_dt, Request.created_at <= end_dt)
            .group_by(Request.route)
            .order_by(rev_sum.desc())
            .limit(limit),
            agent_scope,
        )
    )
    rows = q.all()
    return [{"route": str(r.route), "revenue": float(r.revenue or 0)} for r in rows]


def compute_sales_overview(
    db: Session,
    d_from: date,
    d_to: date,
    agent_scope: uuid.UUID | None,
) -> dict[str, Any]:
    start_dt, end_dt = _dt_range(d_from, d_to)

    queue_pending = (
        _apply_agent_scope(
            db.query(func.count(Request.id)).filter(
                Request.status.in_(("submitted", "under_review", "rm_pending")),
            ),
            agent_scope,
        ).scalar()
        or 0
    )

    base = _apply_agent_scope(
        db.query(Request).filter(Request.created_at >= start_dt, Request.created_at <= end_dt),
        agent_scope,
    )
    appr = base.filter(Request.status == "approved").count()
    rej = base.filter(Request.status == "rejected").count()
    dec = appr + rej
    approval_rate = round(100.0 * appr / dec, 1) if dec else 0.0
    avg_rt = _avg_first_response_hours(db, start_dt, end_dt, agent_scope)

    return {
        "queue_pending": int(queue_pending),
        "approval_rate": approval_rate,
        "rejected_count": int(rej),
        "avg_response_time_hours": avg_rt,
        "rm_emails_sent": count_outgoing_rm_emails(db, d_from, d_to),
    }


def snapshot_daily_metrics(db: Session, snapshot_day: date) -> None:
    from app.models.analytics_snapshot import AnalyticsSnapshot

    kpis = compute_kpis(db, snapshot_day, snapshot_day, None)
    row = (
        db.query(AnalyticsSnapshot)
        .filter(
            AnalyticsSnapshot.snapshot_date == snapshot_day,
            AnalyticsSnapshot.metric_type == "daily_kpis",
        )
        .first()
    )
    payload = {"kpis": kpis, "generated_at": datetime.now(timezone.utc).isoformat()}
    if row:
        row.metric_data = payload
    else:
        db.add(
            AnalyticsSnapshot(
                snapshot_date=snapshot_day,
                metric_type="daily_kpis",
                metric_data=payload,
            )
        )
    db.commit()
