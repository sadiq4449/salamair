from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.request import Request
from app.models.user import User
from app.schemas.admin_schema import AdminStatsResponse, AdminUserItem, AdminUserListResponse

router = APIRouter()


@router.get("/stats", response_model=AdminStatsResponse)
def admin_stats(
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    users_total = db.query(func.count(User.id)).scalar() or 0
    agents_count = db.query(func.count(User.id)).filter(User.role == "agent").scalar() or 0
    sales_count = db.query(func.count(User.id)).filter(User.role == "sales").scalar() or 0
    admins_count = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    requests_total = db.query(func.count(Request.id)).scalar() or 0
    open_statuses = ("draft", "submitted", "under_review", "rm_pending", "counter_offered")
    requests_open = db.query(func.count(Request.id)).filter(Request.status.in_(open_statuses)).scalar() or 0

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    requests_today = (
        db.query(func.count(Request.id)).filter(Request.created_at >= today_start).scalar() or 0
    )

    return AdminStatsResponse(
        users_total=int(users_total),
        agents_count=int(agents_count),
        sales_count=int(sales_count),
        admins_count=int(admins_count),
        requests_total=int(requests_total),
        requests_open=int(requests_open),
        requests_today=int(requests_today),
    )


@router.get("/users", response_model=AdminUserListResponse)
def admin_list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = Query(None, description="agent | sales | admin"),
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(User)
    if role and role in ("agent", "sales", "admin"):
        q = q.filter(User.role == role)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(User.name.ilike(term), User.email.ilike(term)))

    total = q.count()
    rows = (
        q.order_by(User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [
        AdminUserItem(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            city=u.city,
            is_active=u.is_active,
            created_at=u.created_at,
        )
        for u in rows
    ]
    return AdminUserListResponse(items=items, total=total, page=page, limit=limit)
