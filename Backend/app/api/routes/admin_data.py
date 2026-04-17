"""Admin-only exploration and maintenance of stored email and attachment rows."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request as FastAPIRequest, Response, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_role
from app.models.attachment import Attachment
from app.models.email_attachment import EmailAttachment
from app.models.email_message import EmailMessage
from app.models.email_thread import EmailThread
from app.models.request import Request
from app.models.user import User
from app.schemas.admin_data_schema import (
    AdminEmailAttachmentItem,
    AdminEmailAttachmentUpdate,
    AdminEmailMessageDetail,
    AdminEmailMessageUpdate,
    AdminEmailThreadDetailResponse,
    AdminEmailThreadListItem,
    AdminEmailThreadListResponse,
    AdminEmailThreadUpdate,
    AdminRequestAttachmentListItem,
    AdminRequestAttachmentListResponse,
    AdminRequestAttachmentUpdate,
)
from app.services.admin_audit import log_admin_action
from app.services.incoming_email_body import sanitize_incoming_rm_body

router = APIRouter()


def _build_thread_detail(db: Session, thread_id: uuid.UUID) -> AdminEmailThreadDetailResponse:
    t = (
        db.query(EmailThread)
        .options(joinedload(EmailThread.request).joinedload(Request.agent))
        .filter(EmailThread.id == thread_id)
        .first()
    )
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Thread not found"}})
    req = t.request
    msgs = (
        db.query(EmailMessage)
        .options(joinedload(EmailMessage.attachments))
        .filter(EmailMessage.thread_id == thread_id)
        .order_by(EmailMessage.sent_at.asc(), EmailMessage.created_at.asc())
        .all()
    )
    details: list[AdminEmailMessageDetail] = []
    for m in msgs:
        details.append(
            AdminEmailMessageDetail(
                id=m.id,
                thread_id=m.thread_id,
                direction=m.direction,
                from_email=m.from_email,
                to_email=m.to_email,
                subject=m.subject,
                body=m.body,
                html_body=m.html_body,
                message_id=m.message_id,
                in_reply_to=m.in_reply_to,
                status=m.status,
                sent_at=m.sent_at,
                received_at=m.received_at,
                created_at=m.created_at,
                attachments=[AdminEmailAttachmentItem.model_validate(a) for a in (m.attachments or [])],
            )
        )
    return AdminEmailThreadDetailResponse(
        thread_id=t.id,
        request_id=req.id,
        request_code=req.request_code,
        route=req.route,
        request_status=req.status,
        subject=t.subject,
        rm_email=t.rm_email,
        thread_status=t.status,
        created_at=t.created_at,
        updated_at=t.updated_at,
        messages=details,
    )


def _client_ip(http_request: FastAPIRequest) -> str | None:
    if http_request.client:
        return http_request.client.host
    return None


@router.get("/email-threads", response_model=AdminEmailThreadListResponse)
def admin_list_email_threads(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Request code, route, or subject"),
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = (
        db.query(EmailThread)
        .join(Request, Request.id == EmailThread.request_id)
        .options(joinedload(EmailThread.request).joinedload(Request.agent))
    )
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Request.request_code.ilike(term),
                Request.route.ilike(term),
                EmailThread.subject.ilike(term),
            )
        )
    total = q.count()
    threads = (
        q.order_by(EmailThread.updated_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    items: list[AdminEmailThreadListItem] = []
    for t in threads:
        req = t.request
        agent = req.agent if req else None
        msg_count = (
            db.query(func.count(EmailMessage.id)).filter(EmailMessage.thread_id == t.id).scalar() or 0
        )
        last = (
            db.query(EmailMessage)
            .filter(EmailMessage.thread_id == t.id)
            .order_by(EmailMessage.sent_at.desc())
            .first()
        )
        preview = ""
        last_at = t.updated_at
        if last:
            last_at = last.sent_at or last.created_at
            body = last.body or ""
            if last.direction == "incoming":
                body = sanitize_incoming_rm_body(body)
            preview = body if len(body) <= 200 else body[:197] + "..."
        items.append(
            AdminEmailThreadListItem(
                thread_id=t.id,
                request_id=req.id,
                request_code=req.request_code,
                route=req.route,
                request_status=req.status,
                agent_name=agent.name if agent else None,
                subject=t.subject,
                rm_email=t.rm_email,
                thread_status=t.status,
                message_count=int(msg_count),
                last_activity_at=last_at,
                preview=preview,
            )
        )
    return AdminEmailThreadListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/email-threads/{thread_id}", response_model=AdminEmailThreadDetailResponse)
def admin_get_email_thread(
    thread_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    return _build_thread_detail(db, thread_id)


@router.put("/email-threads/{thread_id}", response_model=AdminEmailThreadDetailResponse)
def admin_update_email_thread(
    thread_id: uuid.UUID,
    payload: AdminEmailThreadUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    t = db.query(EmailThread).filter(EmailThread.id == thread_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Thread not found"}})
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(t, k, v)
    t.updated_at = datetime.now(timezone.utc)
    log_admin_action(
        db,
        action="email_thread_updated",
        actor_id=actor.id,
        target_type="email_thread",
        target_id=thread_id,
        details=str(data),
        ip_address=_client_ip(http_request),
    )
    db.commit()
    return _build_thread_detail(db, thread_id)


@router.delete("/email-threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_email_thread(
    thread_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    t = db.query(EmailThread).filter(EmailThread.id == thread_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Thread not found"}})
    log_admin_action(
        db,
        action="email_thread_deleted",
        actor_id=actor.id,
        target_type="email_thread",
        target_id=thread_id,
        details=f"Deleted thread subject={t.subject!r}",
        ip_address=_client_ip(http_request),
    )
    db.delete(t)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/email-messages/{message_id}", response_model=AdminEmailMessageDetail)
def admin_update_email_message(
    message_id: uuid.UUID,
    payload: AdminEmailMessageUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    m = db.query(EmailMessage).options(joinedload(EmailMessage.attachments)).filter(EmailMessage.id == message_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Message not found"}})
    data = payload.model_dump(exclude_unset=True)
    if data.get("direction") and data["direction"] not in ("incoming", "outgoing"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_DIRECTION", "message": "direction must be incoming or outgoing"}},
        )
    for k, v in data.items():
        setattr(m, k, v)
    log_admin_action(
        db,
        action="email_message_updated",
        actor_id=actor.id,
        target_type="email_message",
        target_id=message_id,
        details=str(list(data.keys())),
        ip_address=_client_ip(http_request),
    )
    db.commit()
    m = (
        db.query(EmailMessage)
        .options(joinedload(EmailMessage.attachments))
        .filter(EmailMessage.id == message_id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Message not found"}})
    return AdminEmailMessageDetail(
        id=m.id,
        thread_id=m.thread_id,
        direction=m.direction,
        from_email=m.from_email,
        to_email=m.to_email,
        subject=m.subject,
        body=m.body,
        html_body=m.html_body,
        message_id=m.message_id,
        in_reply_to=m.in_reply_to,
        status=m.status,
        sent_at=m.sent_at,
        received_at=m.received_at,
        created_at=m.created_at,
        attachments=[AdminEmailAttachmentItem.model_validate(a) for a in (m.attachments or [])],
    )


@router.delete("/email-messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_email_message(
    message_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    m = db.query(EmailMessage).filter(EmailMessage.id == message_id).first()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Message not found"}})
    log_admin_action(
        db,
        action="email_message_deleted",
        actor_id=actor.id,
        target_type="email_message",
        target_id=message_id,
        details=f"thread_id={m.thread_id}",
        ip_address=_client_ip(http_request),
    )
    db.delete(m)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/email-attachments/{attachment_id}", response_model=AdminEmailAttachmentItem)
def admin_update_email_attachment(
    attachment_id: uuid.UUID,
    payload: AdminEmailAttachmentUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    a = db.query(EmailAttachment).filter(EmailAttachment.id == attachment_id).first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Attachment not found"}})
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(a, k, v)
    log_admin_action(
        db,
        action="email_attachment_updated",
        actor_id=actor.id,
        target_type="email_attachment",
        target_id=attachment_id,
        details=str(list(data.keys())),
        ip_address=_client_ip(http_request),
    )
    db.commit()
    db.refresh(a)
    return AdminEmailAttachmentItem.model_validate(a)


@router.delete("/email-attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_email_attachment(
    attachment_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    a = db.query(EmailAttachment).filter(EmailAttachment.id == attachment_id).first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Attachment not found"}})
    log_admin_action(
        db,
        action="email_attachment_deleted",
        actor_id=actor.id,
        target_type="email_attachment",
        target_id=attachment_id,
        details=a.filename,
        ip_address=_client_ip(http_request),
    )
    db.delete(a)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/request-attachments", response_model=AdminRequestAttachmentListResponse)
def admin_list_request_attachments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Request code or filename"),
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin")),
):
    q = db.query(Attachment).join(Request, Request.id == Attachment.request_id).options(joinedload(Attachment.request).joinedload(Request.agent))
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(Request.request_code.ilike(term), Attachment.filename.ilike(term)))
    total = q.count()
    rows = (
        q.order_by(Attachment.uploaded_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    items = []
    for att in rows:
        req = att.request
        agent = req.agent if req else None
        items.append(
            AdminRequestAttachmentListItem(
                id=att.id,
                request_id=req.id,
                request_code=req.request_code,
                route=req.route,
                request_status=req.status,
                agent_name=agent.name if agent else None,
                filename=att.filename,
                file_url=att.file_url,
                file_type=att.file_type,
                file_size=att.file_size,
                uploaded_at=att.uploaded_at,
            )
        )
    return AdminRequestAttachmentListResponse(items=items, total=total, page=page, limit=limit)


@router.put("/request-attachments/{attachment_id}", response_model=AdminRequestAttachmentListItem)
def admin_update_request_attachment(
    attachment_id: uuid.UUID,
    payload: AdminRequestAttachmentUpdate,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    att = (
        db.query(Attachment)
        .options(joinedload(Attachment.request).joinedload(Request.agent))
        .filter(Attachment.id == attachment_id)
        .first()
    )
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Attachment not found"}})
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(att, k, v)
    log_admin_action(
        db,
        action="request_attachment_updated",
        actor_id=actor.id,
        target_type="request_attachment",
        target_id=attachment_id,
        details=str(list(data.keys())),
        ip_address=_client_ip(http_request),
    )
    db.commit()
    db.refresh(att)
    req = att.request
    agent = req.agent if req else None
    return AdminRequestAttachmentListItem(
        id=att.id,
        request_id=req.id,
        request_code=req.request_code,
        route=req.route,
        request_status=req.status,
        agent_name=agent.name if agent else None,
        filename=att.filename,
        file_url=att.file_url,
        file_type=att.file_type,
        file_size=att.file_size,
        uploaded_at=att.uploaded_at,
    )


@router.delete("/request-attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_request_attachment(
    attachment_id: uuid.UUID,
    http_request: FastAPIRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_role("admin")),
):
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"code": "NOT_FOUND", "message": "Attachment not found"}})
    log_admin_action(
        db,
        action="request_attachment_deleted",
        actor_id=actor.id,
        target_type="request_attachment",
        target_id=attachment_id,
        details=att.filename,
        ip_address=_client_ip(http_request),
    )
    db.delete(att)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
