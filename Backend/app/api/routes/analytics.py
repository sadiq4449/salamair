import csv
import io
import uuid
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.models.user import User
from app.services.analytics_cache import cached_or_compute
from app.services.analytics_service import (
    compute_agent_performance,
    compute_city_breakdown,
    compute_kpis,
    compute_request_trends,
    compute_revenue,
    compute_route_revenue,
    compute_sales_overview,
    snapshot_daily_metrics,
)

router = APIRouter()


def _parse_date(s: str) -> date:
    return date.fromisoformat(s)


def _default_range() -> tuple[date, date]:
    to_d = date.today()
    from_d = to_d - timedelta(days=29)
    return from_d, to_d


def _dates_from_period(period: str) -> tuple[date, date]:
    to_d = date.today()
    if period == "today":
        return to_d, to_d
    if period in ("week", "weekly"):
        return to_d - timedelta(days=6), to_d
    if period in ("month", "monthly"):
        return to_d - timedelta(days=29), to_d
    if period in ("quarter", "quarterly"):
        return to_d - timedelta(days=90), to_d
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error": {
                "code": "INVALID_PERIOD",
                "message": "period must be today, week | weekly, month | monthly, or quarter | quarterly",
            }
        },
    )


def _resolve_date_range(
    from_: str | None,
    to_: str | None,
    period: str | None,
) -> tuple[date, date]:
    """Explicit from/to win when provided; otherwise optional quick period; else default last 30 days."""
    if from_ or to_:
        d_from, d_to = _default_range()
        if from_:
            d_from = _parse_date(from_)
        if to_:
            d_to = _parse_date(to_)
        return d_from, d_to
    if period:
        return _dates_from_period(period)
    return _default_range()


def _agent_scope(user: User) -> uuid.UUID | None:
    if user.role == "agent":
        return user.id
    return None


def _require_analytics_user(current_user: User) -> None:
    if current_user.role not in ("agent", "sales", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Analytics not available for this role"}},
        )


@router.get("/kpis")
def analytics_kpis(
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    period: str | None = Query(
        None,
        description="Quick range when from/to omitted: today | week | month | quarter",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_analytics_user(current_user)

    d_from, d_to = _resolve_date_range(from_, to_, period)

    scope = _agent_scope(current_user)

    def build():
        raw = compute_kpis(db, d_from, d_to, scope)
        status_dist = raw.pop("status_distribution", {})
        return {
            "period": {"from": d_from.isoformat(), "to": d_to.isoformat()},
            "kpis": {
                **raw,
                "status_distribution": status_dist,
            },
        }

    return cached_or_compute(
        {
            "ep": "kpis",
            "from": str(d_from),
            "to": str(d_to),
            "period": period or "",
            "scope": str(scope) if scope else "all",
        },
        build,
    )


@router.get("/sales-overview")
def analytics_sales_overview(
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    period: str | None = Query(None, description="today | week | month | quarter when from/to omitted"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    d_from, d_to = _resolve_date_range(from_, to_, period)

    def build():
        return {
            "period": {"from": d_from.isoformat(), "to": d_to.isoformat()},
            "overview": compute_sales_overview(db, d_from, d_to, None),
        }

    return cached_or_compute(
        {"ep": "sales-overview", "from": str(d_from), "to": str(d_to), "period": period or ""},
        build,
    )


@router.get("/agent-performance")
def analytics_agent_performance(
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    period: str | None = Query(None, description="today | week | month | quarter when from/to omitted"),
    sort: str = Query("revenue"),
    limit: int = Query(20, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_analytics_user(current_user)
    if sort not in ("revenue", "requests", "approval_rate"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_SORT", "message": "sort must be revenue, requests, or approval_rate"}},
        )

    d_from, d_to = _resolve_date_range(from_, to_, period)

    scope = _agent_scope(current_user)

    def build():
        agents, total = compute_agent_performance(db, d_from, d_to, scope, sort, limit)
        return {
            "period": {"from": d_from.isoformat(), "to": d_to.isoformat()},
            "agents": agents,
            "total": total,
        }

    return cached_or_compute(
        {
            "ep": "agent-performance",
            "from": str(d_from),
            "to": str(d_to),
            "sort": sort,
            "limit": limit,
            "period": period or "",
            "scope": str(scope) if scope else "all",
        },
        build,
    )


@router.get("/revenue")
def analytics_revenue(
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    period: str | None = Query(None, description="today | week | month | quarter when from/to omitted"),
    granularity: Literal["daily", "weekly", "monthly"] = "monthly",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_analytics_user(current_user)

    d_from, d_to = _resolve_date_range(from_, to_, period)

    scope = _agent_scope(current_user)

    def build():
        body = compute_revenue(db, d_from, d_to, scope, granularity)
        return {"period": {"from": d_from.isoformat(), "to": d_to.isoformat()}, **body}

    return cached_or_compute(
        {
            "ep": "revenue",
            "from": str(d_from),
            "to": str(d_to),
            "g": granularity,
            "period": period or "",
            "scope": str(scope) if scope else "all",
        },
        build,
    )


@router.get("/request-trends")
def analytics_request_trends(
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    period: str | None = Query(None, description="today | week | month | quarter when from/to omitted"),
    granularity: Literal["daily", "weekly", "monthly"] = "daily",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_analytics_user(current_user)

    d_from, d_to = _resolve_date_range(from_, to_, period)

    scope = _agent_scope(current_user)

    def build():
        data = compute_request_trends(db, d_from, d_to, scope, granularity)
        return {"period": {"from": d_from.isoformat(), "to": d_to.isoformat()}, "data": data}

    return cached_or_compute(
        {
            "ep": "request-trends",
            "from": str(d_from),
            "to": str(d_to),
            "g": granularity,
            "period": period or "",
            "scope": str(scope) if scope else "all",
        },
        build,
    )


@router.get("/city-breakdown")
def analytics_city_breakdown(
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    period: str | None = Query(None, description="today | week | month | quarter when from/to omitted"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_analytics_user(current_user)

    d_from, d_to = _resolve_date_range(from_, to_, period)

    scope = _agent_scope(current_user)

    def build():
        rows = compute_city_breakdown(db, d_from, d_to, scope)
        return {"period": {"from": d_from.isoformat(), "to": d_to.isoformat()}, "data": rows}

    return cached_or_compute(
        {
            "ep": "city-breakdown",
            "from": str(d_from),
            "to": str(d_to),
            "period": period or "",
            "scope": str(scope) if scope else "all",
        },
        build,
    )


@router.get("/route-revenue")
def analytics_route_revenue(
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    period: str | None = Query(None, description="today | week | month | quarter when from/to omitted"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_analytics_user(current_user)
    d_from, d_to = _resolve_date_range(from_, to_, period)
    scope = _agent_scope(current_user)

    def build():
        rows = compute_route_revenue(db, d_from, d_to, scope, limit)
        return {"period": {"from": d_from.isoformat(), "to": d_to.isoformat()}, "data": rows}

    return cached_or_compute(
        {
            "ep": "route-revenue",
            "from": str(d_from),
            "to": str(d_to),
            "limit": limit,
            "period": period or "",
            "scope": str(scope) if scope else "all",
        },
        build,
    )


@router.get("/export")
def analytics_export(
    type: str = Query(
        ...,
        description="agent_performance | kpis | revenue | request_trends | city_breakdown | route_revenue",
    ),
    file_format: str = Query("csv", alias="format"),
    from_: str | None = Query(None, alias="from"),
    to_: str | None = Query(None, alias="to"),
    period: str | None = Query(None, description="today | week | month | quarter when from/to omitted"),
    granularity: Literal["daily", "weekly", "monthly"] = "daily",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_analytics_user(current_user)
    if file_format not in ("csv", "xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_FORMAT", "message": "format must be csv or xlsx"}},
        )

    d_from, d_to = _resolve_date_range(from_, to_, period)

    scope = _agent_scope(current_user)

    if type == "agent_performance":
        agents, _ = compute_agent_performance(db, d_from, d_to, scope, "revenue", 500)
        headers = [
            "id",
            "name",
            "company",
            "city",
            "total_requests",
            "approved",
            "rejected",
            "pending",
            "approval_rate",
            "total_revenue",
            "avg_response_time_hours",
        ]
        rows = [[str(a.get(h, "")) for h in headers] for a in agents]
    elif type == "kpis":
        k = compute_kpis(db, d_from, d_to, scope)
        sd = k.pop("status_distribution", {})
        flat: dict[str, str] = {str(key): str(val) for key, val in k.items()}
        for sk, sv in sd.items():
            flat[f"status_{sk}"] = str(sv)
        headers = list(flat.keys())
        rows = [[flat[h] for h in headers]]
    elif type == "revenue":
        r = compute_revenue(db, d_from, d_to, scope, granularity)
        headers = ["period", "revenue", "request_count"]
        rows = [[str(x["period"]), str(x["revenue"]), str(x["request_count"])] for x in r["data"]]
    elif type == "request_trends":
        data = compute_request_trends(db, d_from, d_to, scope, granularity)
        headers = ["date", "submitted", "approved", "rejected", "pending", "avg_response_time_hours"]
        rows = [[str(x.get(h, "")) for h in headers] for x in data]
    elif type == "city_breakdown":
        data = compute_city_breakdown(db, d_from, d_to, scope)
        headers = ["city", "requests", "revenue", "agents"]
        rows = [[str(x.get(h, "")) for h in headers] for x in data]
    elif type == "route_revenue":
        data = compute_route_revenue(db, d_from, d_to, scope, 500)
        headers = ["route", "revenue"]
        rows = [[str(x.get(h, "")) for h in headers] for x in data]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_TYPE", "message": "Invalid export type"}},
        )

    if file_format == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(headers)
        w.writerows(rows)
        payload = buf.getvalue().encode("utf-8")
        media = "text/csv; charset=utf-8"
        ext = "csv"
    else:
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.title = "export"
        ws.append(headers)
        for row in rows:
            ws.append(row)
        bio = io.BytesIO()
        wb.save(bio)
        payload = bio.getvalue()
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"

    filename = f"analytics_{type}_{d_from}_{d_to}.{ext}"
    return StreamingResponse(
        io.BytesIO(payload),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/snapshot-run", status_code=204)
def run_snapshot(
    target: date | None = Query(None, description="Date to snapshot (default: yesterday)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    day = target or (date.today() - timedelta(days=1))
    snapshot_daily_metrics(db, day)
    return Response(status_code=204)
