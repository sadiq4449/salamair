"""Admin-only CRUD over operational tables (no direct DB access needed)."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request as FastAPIRequest, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_role
from app.models.counter_offer import CounterOffer
from app.models.message import Message
from app.models.message_attachment import MessageAttachment
from app.models.notification import Notification
from app.models.request import Request
from app.models.request_history import RequestHistory
from app.models.sla_tracking import SlaTracking
from app.models.user import User
from app.schemas.admin_explorer_schema import (
    AdminDbChatAttachmentListResponse,
    AdminDbChatAttachmentRow,
    AdminDbChatAttachmentUpdate,
    AdminDbCounterOfferListResponse,
    AdminDbCounterOfferRow,
    AdminDbCounterOfferUpdate,
    AdminDbHistoryListResponse,
    AdminDbHistoryRow,
    AdminDbHistoryUpdate,
    AdminDbMessageListResponse,
    AdminDbMessageRow,
    AdminDbMessageUpdate,
    AdminDbNotificationListResponse,
    AdminDbNotificationRow,
    AdminDbNotificationUpdate,
    AdminDbRequestListResponse,
    AdminDbRequestRow,
    AdminDbRequestUpdate,
    AdminDbSlaListResponse,
    AdminDbSlaRow,
    AdminDbSlaUpdate,
)
from app.services.admin_audit import log_admin_action

router = APIRouter()


def _ip(req: FastAPIRequest) -> str | None:
    return req.client.host if req.client else None


# --- Requests ---
@router.get("/requests", response_model=AdminDbRequestListResponse)
def explorer_list_requests(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(Request).options(joinedload(Request.agent))
    if status_filter:
        q = q.filter(Request.status == status_filter)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Request.request_code.ilike(term),
                Request.route.ilike(term),
                Request.notes.ilike(term),
            )
        )
    total = q.count()
    rows = q.order_by(Request.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    items = [
        AdminDbRequestRow(
            id=r.id,
            request_code=r.request_code,
            agent_id=r.agent_id,
            agent_name=r.agent.name if r.agent else None,
            route=r.route,
            pax=r.pax,
            price=float(r.price),
            status=r.status,
            priority=r.priority,
            travel_date=r.travel_date.isoformat() if r.travel_date else None,
            return_date=r.return_date.isoformat() if r.return_date else None,
            notes=r.notes,
            assigned_to=r.assigned_to,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]
    return AdminDbRequestListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/requests/{request_id}", response_model=AdminDbRequestRow)
def explorer_update_request(
    request_id: uuid.UUID,
    payload: AdminDbRequestUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    r = db.query(Request).options(joinedload(Request.agent)).filter(Request.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}})
    data = payload.model_dump(exclude_unset=True)
    if "travel_date" in data:
        v = data.pop("travel_date")
        r.travel_date = date.fromisoformat(v) if v else None
    if "return_date" in data:
        v = data.pop("return_date")
        r.return_date = date.fromisoformat(v) if v else None
    if "priority" in data and data["priority"] not in ("normal", "urgent"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_PRIORITY", "message": "priority must be normal or urgent"}},
        )
    for k, v in data.items():
        setattr(r, k, v)
    r.updated_at = datetime.now(timezone.utc)
    log_admin_action(
        db,
        action="explorer_request_updated",
        actor_id=actor.id,
        target_type="request",
        target_id=request_id,
        details=str(list(payload.model_dump(exclude_unset=True).keys())),
        ip_address=_ip(http_request),
    )
    db.commit()
    db.refresh(r)
    return AdminDbRequestRow(
        id=r.id,
        request_code=r.request_code,
        agent_id=r.agent_id,
        agent_name=r.agent.name if r.agent else None,
        route=r.route,
        pax=r.pax,
        price=float(r.price),
        status=r.status,
        priority=r.priority,
        travel_date=r.travel_date.isoformat() if r.travel_date else None,
        return_date=r.return_date.isoformat() if r.return_date else None,
        notes=r.notes,
        assigned_to=r.assigned_to,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def explorer_delete_request(
    request_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    r = db.query(Request).filter(Request.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}})
    log_admin_action(
        db,
        action="explorer_request_deleted",
        actor_id=actor.id,
        target_type="request",
        target_id=request_id,
        details=r.request_code,
        ip_address=_ip(http_request),
    )
    db.delete(r)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Platform messages ---
@router.get("/messages", response_model=AdminDbMessageListResponse)
def explorer_list_messages(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    type_filter: str | None = Query(None, alias="type"),
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(Message).join(Request, Request.id == Message.request_id).options(joinedload(Message.sender))
    if type_filter:
        q = q.filter(Message.type == type_filter)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(Message.content.ilike(term), Request.request_code.ilike(term)))
    total = q.count()
    rows = (
        q.order_by(Message.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    )
    rid_set = {m.request_id for m in rows}
    code_map = (
        {r.id: r.request_code for r in db.query(Request).filter(Request.id.in_(rid_set)).all()} if rid_set else {}
    )
    items = []
    for m in rows:
        items.append(
            AdminDbMessageRow(
                id=m.id,
                request_id=m.request_id,
                request_code=code_map.get(m.request_id, "?"),
                sender_id=m.sender_id,
                sender_name=m.sender.name if m.sender else None,
                type=m.type,
                sender_role=m.sender_role,
                content=m.content,
                is_internal=m.is_internal,
                created_at=m.created_at,
            )
        )
    return AdminDbMessageListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/messages/{message_id}", response_model=AdminDbMessageRow)
def explorer_update_message(
    message_id: uuid.UUID,
    payload: AdminDbMessageUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    m = db.query(Message).options(joinedload(Message.sender)).filter(Message.id == message_id).first()
    if not m:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Message not found"}})
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(m, k, v)
    log_admin_action(
        db,
        action="explorer_message_updated",
        actor_id=actor.id,
        target_type="message",
        target_id=message_id,
        details=str(list(data.keys())),
        ip_address=_ip(http_request),
    )
    db.commit()
    db.refresh(m)
    req = db.query(Request).filter(Request.id == m.request_id).first()
    return AdminDbMessageRow(
        id=m.id,
        request_id=m.request_id,
        request_code=req.request_code if req else "?",
        sender_id=m.sender_id,
        sender_name=m.sender.name if m.sender else None,
        type=m.type,
        sender_role=m.sender_role,
        content=m.content,
        is_internal=m.is_internal,
        created_at=m.created_at,
    )


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def explorer_delete_message(
    message_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    m = db.query(Message).filter(Message.id == message_id).first()
    if not m:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Message not found"}})
    log_admin_action(
        db,
        action="explorer_message_deleted",
        actor_id=actor.id,
        target_type="message",
        target_id=message_id,
        details=f"type={m.type}",
        ip_address=_ip(http_request),
    )
    db.delete(m)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Request history ---
@router.get("/request-history", response_model=AdminDbHistoryListResponse)
def explorer_list_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(RequestHistory).join(Request, Request.id == RequestHistory.request_id).options(joinedload(RequestHistory.actor))
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(Request.request_code.ilike(term), RequestHistory.action.ilike(term), RequestHistory.details.ilike(term)))
    total = q.count()
    rows = q.order_by(RequestHistory.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    # Bulk-load the related Requests in one query to avoid N+1.
    req_ids = {h.request_id for h in rows}
    req_codes: dict[uuid.UUID, str] = {}
    if req_ids:
        for rid, code in db.query(Request.id, Request.request_code).filter(Request.id.in_(req_ids)).all():
            req_codes[rid] = code
    items = [
        AdminDbHistoryRow(
            id=h.id,
            request_id=h.request_id,
            request_code=req_codes.get(h.request_id, "?"),
            action=h.action,
            from_status=h.from_status,
            to_status=h.to_status,
            actor_id=h.actor_id,
            actor_name=h.actor.name if h.actor else None,
            details=h.details,
            created_at=h.created_at,
        )
        for h in rows
    ]
    return AdminDbHistoryListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/request-history/{entry_id}", response_model=AdminDbHistoryRow)
def explorer_update_history(
    entry_id: uuid.UUID,
    payload: AdminDbHistoryUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    h = db.query(RequestHistory).options(joinedload(RequestHistory.actor)).filter(RequestHistory.id == entry_id).first()
    if not h:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "History entry not found"}})
    if payload.details is not None:
        h.details = payload.details
    log_admin_action(
        db,
        action="explorer_history_updated",
        actor_id=actor.id,
        target_type="request_history",
        target_id=entry_id,
        details="details field",
        ip_address=_ip(http_request),
    )
    db.commit()
    db.refresh(h)
    req = db.query(Request).filter(Request.id == h.request_id).first()
    return AdminDbHistoryRow(
        id=h.id,
        request_id=h.request_id,
        request_code=req.request_code if req else "?",
        action=h.action,
        from_status=h.from_status,
        to_status=h.to_status,
        actor_id=h.actor_id,
        actor_name=h.actor.name if h.actor else None,
        details=h.details,
        created_at=h.created_at,
    )


@router.delete("/request-history/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def explorer_delete_history(
    entry_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    h = db.query(RequestHistory).filter(RequestHistory.id == entry_id).first()
    if not h:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "History entry not found"}})
    log_admin_action(
        db,
        action="explorer_history_deleted",
        actor_id=actor.id,
        target_type="request_history",
        target_id=entry_id,
        ip_address=_ip(http_request),
    )
    db.delete(h)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Notifications (all users) ---
@router.get("/notifications", response_model=AdminDbNotificationListResponse)
def explorer_list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(Notification).join(User, User.id == Notification.user_id)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Notification.title.ilike(term),
                Notification.message.ilike(term),
                User.email.ilike(term),
                Notification.type.ilike(term),
            )
        )
    total = q.count()
    rows = q.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    # Bulk-load recipient emails in a single query (avoids N+1).
    user_ids = {n.user_id for n in rows}
    user_emails: dict[uuid.UUID, str] = {}
    if user_ids:
        for uid, email in db.query(User.id, User.email).filter(User.id.in_(user_ids)).all():
            user_emails[uid] = email
    items = [
        AdminDbNotificationRow(
            id=n.id,
            user_id=n.user_id,
            user_email=user_emails.get(n.user_id, "?"),
            type=n.type,
            title=n.title,
            message=n.message,
            request_id=n.request_id,
            request_code=n.request_code,
            is_read=n.is_read,
            is_email_sent=n.is_email_sent,
            created_at=n.created_at,
        )
        for n in rows
    ]
    return AdminDbNotificationListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/notifications/{notif_id}", response_model=AdminDbNotificationRow)
def explorer_update_notification(
    notif_id: uuid.UUID,
    payload: AdminDbNotificationUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if not n:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Notification not found"}})
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(n, k, v)
    log_admin_action(
        db,
        action="explorer_notification_updated",
        actor_id=actor.id,
        target_type="notification",
        target_id=notif_id,
        details=str(list(data.keys())),
        ip_address=_ip(http_request),
    )
    db.commit()
    db.refresh(n)
    u = db.query(User).filter(User.id == n.user_id).first()
    return AdminDbNotificationRow(
        id=n.id,
        user_id=n.user_id,
        user_email=u.email if u else "?",
        type=n.type,
        title=n.title,
        message=n.message,
        request_id=n.request_id,
        request_code=n.request_code,
        is_read=n.is_read,
        is_email_sent=n.is_email_sent,
        created_at=n.created_at,
    )


@router.delete("/notifications/{notif_id}", status_code=status.HTTP_204_NO_CONTENT)
def explorer_delete_notification(
    notif_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if not n:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Notification not found"}})
    log_admin_action(
        db,
        action="explorer_notification_deleted",
        actor_id=actor.id,
        target_type="notification",
        target_id=notif_id,
        ip_address=_ip(http_request),
    )
    db.delete(n)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Counter offers ---
@router.get("/counter-offers", response_model=AdminDbCounterOfferListResponse)
def explorer_list_counter_offers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(CounterOffer).join(Request, Request.id == CounterOffer.request_id).options(joinedload(CounterOffer.creator))
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(Request.request_code.ilike(term), CounterOffer.message.ilike(term)))
    total = q.count()
    rows = q.order_by(CounterOffer.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    # Bulk-load request codes once (avoids N+1).
    req_ids = {c.request_id for c in rows}
    req_codes: dict[uuid.UUID, str] = {}
    if req_ids:
        for rid, code in db.query(Request.id, Request.request_code).filter(Request.id.in_(req_ids)).all():
            req_codes[rid] = code
    items = [
        AdminDbCounterOfferRow(
            id=c.id,
            request_id=c.request_id,
            request_code=req_codes.get(c.request_id, "?"),
            original_price=float(c.original_price),
            counter_price=float(c.counter_price),
            message=c.message,
            created_by=c.created_by,
            creator_name=c.creator.name if c.creator else None,
            status=c.status,
            created_at=c.created_at,
        )
        for c in rows
    ]
    return AdminDbCounterOfferListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/counter-offers/{offer_id}", response_model=AdminDbCounterOfferRow)
def explorer_update_counter_offer(
    offer_id: uuid.UUID,
    payload: AdminDbCounterOfferUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    c = db.query(CounterOffer).options(joinedload(CounterOffer.creator)).filter(CounterOffer.id == offer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Counter offer not found"}})
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(c, k, v)
    log_admin_action(
        db,
        action="explorer_counter_offer_updated",
        actor_id=actor.id,
        target_type="counter_offer",
        target_id=offer_id,
        details=str(list(data.keys())),
        ip_address=_ip(http_request),
    )
    db.commit()
    db.refresh(c)
    req = db.query(Request).filter(Request.id == c.request_id).first()
    return AdminDbCounterOfferRow(
        id=c.id,
        request_id=c.request_id,
        request_code=req.request_code if req else "?",
        original_price=float(c.original_price),
        counter_price=float(c.counter_price),
        message=c.message,
        created_by=c.created_by,
        creator_name=c.creator.name if c.creator else None,
        status=c.status,
        created_at=c.created_at,
    )


@router.delete("/counter-offers/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def explorer_delete_counter_offer(
    offer_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    c = db.query(CounterOffer).filter(CounterOffer.id == offer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Counter offer not found"}})
    log_admin_action(
        db,
        action="explorer_counter_offer_deleted",
        actor_id=actor.id,
        target_type="counter_offer",
        target_id=offer_id,
        ip_address=_ip(http_request),
    )
    db.delete(c)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- SLA rows ---
@router.get("/sla", response_model=AdminDbSlaListResponse)
def explorer_list_sla(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(SlaTracking).join(Request, Request.id == SlaTracking.request_id)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(Request.request_code.ilike(term), SlaTracking.status.ilike(term)))
    total = q.count()
    rows = q.order_by(SlaTracking.started_at.desc()).offset((page - 1) * limit).limit(limit).all()
    items = []
    for s in rows:
        req = db.query(Request).filter(Request.id == s.request_id).first()
        items.append(
            AdminDbSlaRow(
                id=s.id,
                request_id=s.request_id,
                request_code=req.request_code if req else "?",
                status=s.status,
                started_at=s.started_at,
                deadline_at=s.deadline_at,
                completed_at=s.completed_at,
                is_breached=s.is_breached,
            )
        )
    return AdminDbSlaListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/sla/{sla_id}", response_model=AdminDbSlaRow)
def explorer_update_sla(
    sla_id: uuid.UUID,
    payload: AdminDbSlaUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    s = db.query(SlaTracking).filter(SlaTracking.id == sla_id).first()
    if not s:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "SLA row not found"}})
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(s, k, v)
    log_admin_action(
        db,
        action="explorer_sla_updated",
        actor_id=actor.id,
        target_type="sla_tracking",
        target_id=sla_id,
        details=str(list(data.keys())),
        ip_address=_ip(http_request),
    )
    db.commit()
    db.refresh(s)
    req = db.query(Request).filter(Request.id == s.request_id).first()
    return AdminDbSlaRow(
        id=s.id,
        request_id=s.request_id,
        request_code=req.request_code if req else "?",
        status=s.status,
        started_at=s.started_at,
        deadline_at=s.deadline_at,
        completed_at=s.completed_at,
        is_breached=s.is_breached,
    )


@router.delete("/sla/{sla_id}", status_code=status.HTTP_204_NO_CONTENT)
def explorer_delete_sla(
    sla_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    s = db.query(SlaTracking).filter(SlaTracking.id == sla_id).first()
    if not s:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "SLA row not found"}})
    log_admin_action(
        db,
        action="explorer_sla_deleted",
        actor_id=actor.id,
        target_type="sla_tracking",
        target_id=sla_id,
        ip_address=_ip(http_request),
    )
    db.delete(s)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Chat attachments ---
@router.get("/chat-attachments", response_model=AdminDbChatAttachmentListResponse)
def explorer_list_chat_attachments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = (
        db.query(MessageAttachment)
        .join(Message, Message.id == MessageAttachment.message_id)
        .join(Request, Request.id == Message.request_id)
    )
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(MessageAttachment.filename.ilike(term), Request.request_code.ilike(term)))
    total = q.count()
    rows = (
        q.order_by(Message.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    # Bulk-load parent messages and requests to avoid N+1.
    msg_ids = {a.message_id for a in rows}
    msgs: dict[uuid.UUID, Message] = {}
    if msg_ids:
        msgs = {m.id: m for m in db.query(Message).filter(Message.id.in_(msg_ids)).all()}
    req_ids = {m.request_id for m in msgs.values() if m.request_id}
    req_codes: dict[uuid.UUID, str] = {}
    if req_ids:
        for rid, code in db.query(Request.id, Request.request_code).filter(Request.id.in_(req_ids)).all():
            req_codes[rid] = code
    items: list[AdminDbChatAttachmentRow] = []
    for a in rows:
        msg = msgs.get(a.message_id)
        # Orphaned attachments (no message) expose `request_id=None` so
        # operators can see the data inconsistency rather than a bogus id.
        req_id = msg.request_id if msg else None
        items.append(
            AdminDbChatAttachmentRow(
                id=a.id,
                message_id=a.message_id,
                request_id=req_id,
                request_code=req_codes.get(req_id) if req_id else None,
                filename=a.filename,
                file_url=a.file_url,
                file_type=a.file_type,
                file_size=a.file_size,
            )
        )
    return AdminDbChatAttachmentListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/chat-attachments/{att_id}", response_model=AdminDbChatAttachmentRow)
def explorer_update_chat_attachment(
    att_id: uuid.UUID,
    payload: AdminDbChatAttachmentUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    a = db.query(MessageAttachment).filter(MessageAttachment.id == att_id).first()
    if not a:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Attachment not found"}})
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(a, k, v)
    log_admin_action(
        db,
        action="explorer_chat_attachment_updated",
        actor_id=actor.id,
        target_type="message_attachment",
        target_id=att_id,
        details=str(list(data.keys())),
        ip_address=_ip(http_request),
    )
    db.commit()
    db.refresh(a)
    msg = db.query(Message).filter(Message.id == a.message_id).first()
    req = db.query(Request).filter(Request.id == msg.request_id).first() if msg and msg.request_id else None
    return AdminDbChatAttachmentRow(
        id=a.id,
        message_id=a.message_id,
        request_id=msg.request_id if msg else None,
        request_code=req.request_code if req else None,
        filename=a.filename,
        file_url=a.file_url,
        file_type=a.file_type,
        file_size=a.file_size,
    )


@router.delete("/chat-attachments/{att_id}", status_code=status.HTTP_204_NO_CONTENT)
def explorer_delete_chat_attachment(
    att_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    a = db.query(MessageAttachment).filter(MessageAttachment.id == att_id).first()
    if not a:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Attachment not found"}})
    log_admin_action(
        db,
        action="explorer_chat_attachment_deleted",
        actor_id=actor.id,
        target_type="message_attachment",
        target_id=att_id,
        details=a.filename,
        ip_address=_ip(http_request),
    )
    db.delete(a)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
