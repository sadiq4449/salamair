import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role
from app.api.request_access import ensure_sales_can_view_request
from app.models.request import Request
from app.models.user import User
from app.services.sla_service import sla_dashboard_payload, sla_history_for_request

router = APIRouter()


@router.get("/dashboard")
def sla_dashboard(
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("sales", "admin")),
):
    return sla_dashboard_payload(db)


@router.get("/requests/{request_id}")
def sla_request_timeline(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if current_user.role == "agent" and req.agent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )
    ensure_sales_can_view_request(req, current_user)
    return {
        "request_id": str(req.id),
        "request_code": req.request_code,
        "timeline": sla_history_for_request(db, request_id),
    }
