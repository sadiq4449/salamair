import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_role
from app.models.attachment import Attachment
from app.models.counter_offer import CounterOffer
from app.models.request import Request
from app.models.request_history import RequestHistory
from app.models.user import User
from app.schemas.counter_offer_schema import CounterOfferCreate, CounterOfferRead
from app.schemas.advanced_schema import TagBrief
from app.schemas.request import (
    RequestListItem,
    RequestListResponse,
    StatusUpdate,
)
from app.schemas.request_history_schema import HistoryRead
from app.services.notification_service import (
    format_notification,
    notify_counter_offered,
    notify_request_approved,
    notify_request_assigned,
    notify_request_rejected,
    notify_sent_to_rm,
)
from app.services.sla_service import sync_sla_for_request
from app.services.websocket_manager import manager

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

VALID_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"submitted"},
    "submitted": {"under_review"},
    "under_review": {"rm_pending", "approved", "rejected", "counter_offered"},
    "rm_pending": {"approved", "rejected"},
    # `counter_offered` is primarily resolved via the agent-facing
    # `/requests/{id}/counter/{offer_id}/{accept|reject}` endpoints.
    # The admin/sales status endpoint keeps these two transitions as a
    # safety net (e.g. admin force-finishing a stalled negotiation).
    "counter_offered": {"submitted", "approved"},
}

ALLOWED_FORCE_STATUSES = frozenset(VALID_TRANSITIONS.keys()) | frozenset(
    s for v in VALID_TRANSITIONS.values() for s in v
)


def _log_history(
    db: Session,
    request_id: uuid.UUID,
    action: str,
    actor_id: uuid.UUID,
    from_status: str | None = None,
    to_status: str | None = None,
    details: str | None = None,
) -> None:
    entry = RequestHistory(
        request_id=request_id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        actor_id=actor_id,
        details=details,
    )
    db.add(entry)


@router.get("/queue", response_model=RequestListResponse)
def sales_queue(
    status_filter: str | None = Query(None, alias="status"),
    route: str | None = None,
    priority: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    queue_statuses = {"submitted", "under_review", "rm_pending"}

    query = db.query(Request).options(joinedload(Request.agent), joinedload(Request.tags))

    if status_filter:
        if status_filter not in queue_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "INVALID_FILTER", "message": f"Queue status must be one of: {', '.join(sorted(queue_statuses))}"}},
            )
        query = query.filter(Request.status == status_filter)
    else:
        query = query.filter(Request.status.in_(queue_statuses))

    if route:
        query = query.filter(Request.route.ilike(f"%{route}%"))
    if priority:
        query = query.filter(Request.priority == priority)

    total = query.count()
    requests = (
        query.order_by(Request.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    request_ids = [r.id for r in requests]
    counts_by_request: dict[uuid.UUID, int] = {}
    if request_ids:
        rows = (
            db.query(Attachment.request_id, func.count(Attachment.id))
            .filter(Attachment.request_id.in_(request_ids))
            .group_by(Attachment.request_id)
            .all()
        )
        counts_by_request = {rid: int(c) for rid, c in rows}

    items = [
        RequestListItem(
            id=r.id,
            request_code=r.request_code,
            agent_id=r.agent_id,
            agent_name=r.agent.name if r.agent else None,
            route=r.route,
            pax=r.pax,
            price=r.price,
            status=r.status,
            priority=r.priority,
            travel_date=r.travel_date,
            tags=[TagBrief.model_validate(t) for t in (r.tags or [])],
            attachments_count=counts_by_request.get(r.id, 0),
            created_at=r.created_at,
        )
        for r in requests
    ]
    return RequestListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/requests/{request_id}/status", response_model=dict)
def update_request_status(
    request_id: uuid.UUID,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )

    force = bool(payload.force) and current_user.role == "admin"
    if payload.force and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Only administrators may use forced status updates"}},
        )

    if force:
        if payload.status not in ALLOWED_FORCE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_STATUS",
                        "message": f"Status must be one of: {', '.join(sorted(ALLOWED_FORCE_STATUSES))}",
                    }
                },
            )
    else:
        allowed = VALID_TRANSITIONS.get(req.status, set())
        if payload.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_TRANSITION",
                        "message": f"Cannot transition from '{req.status}' to '{payload.status}'. Allowed: {', '.join(sorted(allowed))}",
                    }
                },
            )

    old_status = req.status
    req.status = payload.status

    if current_user.id and not req.assigned_to:
        req.assigned_to = current_user.id

    reason = payload.reason
    if force:
        reason = (reason + " " if reason else "") + "[Admin forced status]"

    _log_history(
        db,
        req.id,
        "status_changed",
        current_user.id,
        from_status=old_status,
        to_status=payload.status,
        details=reason,
    )
    sync_sla_for_request(db, req)
    db.commit()

    try:
        notifications = []
        if payload.status == "approved":
            notifications = notify_request_approved(db, req)
        elif payload.status == "rejected":
            notifications = notify_request_rejected(db, req, payload.reason)
        elif payload.status == "under_review" and req.assigned_to:
            notifications = notify_request_assigned(db, req, req.assigned_to)
        for n in notifications:
            manager.push_to_user_threadsafe(str(n.user_id), {
                "event": "notification",
                "data": format_notification(n),
            })
    except Exception as e:
        logger.warning("Failed to send status-change notifications: %s", e)

    return {"message": f"Status updated from '{old_status}' to '{payload.status}'", "request_id": str(req.id)}


@router.post("/requests/{request_id}/counter", response_model=CounterOfferRead, status_code=status.HTTP_201_CREATED)
def create_counter_offer(
    request_id: uuid.UUID,
    payload: CounterOfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if req.status != "under_review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_STATE", "message": "Can only counter-offer requests that are under review"}},
        )
    if abs(float(payload.counter_price) - float(req.price)) < 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "SAME_PRICE", "message": "Counter price must differ from the current request price"}},
        )
    existing_pending = (
        db.query(CounterOffer)
        .filter(CounterOffer.request_id == req.id, CounterOffer.status == "pending")
        .first()
    )
    if existing_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "OFFER_EXISTS", "message": "A pending counter offer already exists for this request"}},
        )

    offer = CounterOffer(
        request_id=req.id,
        original_price=req.price,
        counter_price=payload.counter_price,
        message=payload.message,
        created_by=current_user.id,
    )
    db.add(offer)

    old_status = req.status
    req.status = "counter_offered"

    _log_history(
        db,
        req.id,
        "counter_offered",
        current_user.id,
        from_status=old_status,
        to_status="counter_offered",
        details=f"Counter price: {payload.counter_price}" + (f" — {payload.message}" if payload.message else ""),
    )
    sync_sla_for_request(db, req)
    db.commit()
    db.refresh(offer)

    try:
        notifications = notify_counter_offered(db, req, float(payload.counter_price))
        for n in notifications:
            manager.push_to_user_threadsafe(str(n.user_id), {
                "event": "notification",
                "data": format_notification(n),
            })
    except Exception as e:
        logger.warning("Failed to send counter-offer notifications: %s", e)

    return CounterOfferRead(
        id=offer.id,
        request_id=offer.request_id,
        original_price=offer.original_price,
        counter_price=offer.counter_price,
        message=offer.message,
        created_by=offer.created_by,
        creator_name=current_user.name,
        status=offer.status,
        created_at=offer.created_at,
    )


@router.post("/requests/{request_id}/send-to-rm", response_model=dict)
def send_to_rm(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    if req.status != "under_review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_STATE", "message": "Can only send to RM from 'under_review' status"}},
        )

    old_status = req.status
    req.status = "rm_pending"

    _log_history(
        db,
        req.id,
        "sent_to_rm",
        current_user.id,
        from_status=old_status,
        to_status="rm_pending",
        details="Request forwarded to Revenue Management for approval",
    )
    sync_sla_for_request(db, req)
    db.commit()

    try:
        notifications = notify_sent_to_rm(db, req)
        for n in notifications:
            manager.push_to_user_threadsafe(str(n.user_id), {
                "event": "notification",
                "data": format_notification(n),
            })
    except Exception as e:
        logger.warning("Failed to send sent-to-rm notifications: %s", e)

    return {"message": "Request sent to Revenue Management", "request_id": str(req.id)}


@router.get("/requests/{request_id}/history", response_model=list[HistoryRead])
def get_request_history(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin", "agent")),
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
            detail={"error": {"code": "FORBIDDEN", "message": "You can only view history of your own requests"}},
        )

    entries = (
        db.query(RequestHistory)
        .options(joinedload(RequestHistory.actor))
        .filter(RequestHistory.request_id == request_id)
        .order_by(RequestHistory.created_at.asc())
        .all()
    )

    return [
        HistoryRead(
            id=e.id,
            request_id=e.request_id,
            action=e.action,
            from_status=e.from_status,
            to_status=e.to_status,
            actor_id=e.actor_id,
            actor_name=e.actor.name if e.actor else None,
            details=e.details,
            created_at=e.created_at,
        )
        for e in entries
    ]


class SalesNoteBody(BaseModel):
    note: str


@router.post("/requests/{request_id}/notes", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_sales_note(
    request_id: uuid.UUID,
    payload: SalesNoteBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )

    _log_history(
        db,
        req.id,
        "internal_note",
        current_user.id,
        details=payload.note,
    )
    db.commit()

    return {"message": "Note added successfully", "request_id": str(req.id)}
