import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_role
from app.core.config import settings
from app.models.email_attachment import EmailAttachment
from app.models.email_message import EmailMessage
from app.models.email_thread import EmailThread
from app.models.request import Request
from app.models.request_history import RequestHistory
from app.models.user import User
from app.schemas.email_schema import (
    EmailAttachmentRead,
    EmailMessageRead,
    EmailThreadRead,
    ReplyEmailRequest,
    ReplyEmailResponse,
    SendEmailRequest,
    SendEmailResponse,
    SimulateReplyRequest,
)
from app.services.email_service import build_html_body, build_subject, send_smtp_email

router = APIRouter()


def _get_request_or_404(db: Session, request_id: uuid.UUID) -> Request:
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Request not found"}},
        )
    return req


def _log_history(db: Session, request_id: uuid.UUID, action: str, actor_id: uuid.UUID,
                 from_status: str | None = None, to_status: str | None = None, details: str | None = None):
    db.add(RequestHistory(
        request_id=request_id, action=action, actor_id=actor_id,
        from_status=from_status, to_status=to_status, details=details,
    ))


@router.post("/send", response_model=SendEmailResponse)
def send_email_to_rm(
    payload: SendEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    req = _get_request_or_404(db, payload.request_id)

    if req.status not in ("under_review", "rm_pending"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_STATE", "message": "Request must be under_review or rm_pending to email RM"}},
        )

    rm_email = payload.to or settings.RM_DEFAULT_EMAIL
    subject = build_subject(req.request_code, req.route)

    travel_date_str = str(req.travel_date) if req.travel_date else None
    html_body = build_html_body(
        req.request_code, req.route, req.pax, float(req.price),
        travel_date_str, payload.message, current_user.name,
    )

    message_id = send_smtp_email(rm_email, subject, payload.message, html_body)

    thread = db.query(EmailThread).filter(EmailThread.request_id == req.id).first()
    if not thread:
        thread = EmailThread(
            request_id=req.id,
            subject=subject,
            rm_email=rm_email,
        )
        db.add(thread)
        db.flush()

    now = datetime.now(timezone.utc)
    email_msg = EmailMessage(
        thread_id=thread.id,
        direction="outgoing",
        from_email=settings.SMTP_FROM_EMAIL,
        to_email=rm_email,
        subject=subject,
        body=payload.message,
        html_body=html_body,
        message_id=message_id,
        status="sent" if message_id else "failed",
        sent_at=now,
    )
    db.add(email_msg)

    if payload.include_attachments and req.attachments:
        for att in req.attachments:
            db.add(EmailAttachment(
                email_id=email_msg.id,
                filename=att.filename,
                file_url=att.file_url,
                file_type=att.file_type,
                file_size=att.file_size,
            ))

    old_status = req.status
    if req.status == "under_review":
        req.status = "rm_pending"

    _log_history(db, req.id, "email_sent_to_rm", current_user.id,
                 from_status=old_status, to_status=req.status,
                 details=f"Email sent to {rm_email}")

    db.commit()
    db.refresh(email_msg)

    return SendEmailResponse(
        message="Email sent successfully",
        email_id=email_msg.id,
        request_code=req.request_code,
        status=req.status,
        sent_at=email_msg.sent_at,
    )


@router.get("/thread/{request_id}", response_model=EmailThreadRead)
def get_email_thread(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin", "agent")),
):
    req = _get_request_or_404(db, request_id)

    if current_user.role == "agent" and req.agent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Access denied"}},
        )

    thread = (
        db.query(EmailThread)
        .options(joinedload(EmailThread.messages).joinedload(EmailMessage.attachments))
        .filter(EmailThread.request_id == request_id)
        .first()
    )

    if not thread:
        return EmailThreadRead(
            request_code=req.request_code,
            thread_id=uuid.UUID(int=0),
            subject=build_subject(req.request_code, req.route),
            rm_email=settings.RM_DEFAULT_EMAIL,
            status="empty",
            emails=[],
        )

    emails = [
        EmailMessageRead(
            id=m.id,
            direction=m.direction,
            from_email=m.from_email,
            to_email=m.to_email,
            subject=m.subject,
            body=m.body,
            status=m.status,
            attachments=[EmailAttachmentRead.model_validate(a) for a in m.attachments],
            sent_at=m.sent_at,
            received_at=m.received_at,
            created_at=m.created_at,
        )
        for m in thread.messages
    ]

    return EmailThreadRead(
        request_code=req.request_code,
        thread_id=thread.id,
        subject=thread.subject,
        rm_email=thread.rm_email,
        status=thread.status,
        emails=emails,
    )


@router.post("/reply", response_model=ReplyEmailResponse)
def reply_to_rm(
    payload: ReplyEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    req = _get_request_or_404(db, payload.request_id)
    thread = db.query(EmailThread).filter(EmailThread.id == payload.thread_id).first()
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Email thread not found"}},
        )

    subject = f"Re: {thread.subject}"
    html_body = build_html_body(
        req.request_code, req.route, req.pax, float(req.price),
        str(req.travel_date) if req.travel_date else None,
        payload.message, current_user.name,
    )

    last_msg = (
        db.query(EmailMessage)
        .filter(EmailMessage.thread_id == thread.id)
        .order_by(EmailMessage.sent_at.desc())
        .first()
    )
    in_reply_to = last_msg.message_id if last_msg else None

    message_id = send_smtp_email(thread.rm_email, subject, payload.message, html_body)

    now = datetime.now(timezone.utc)
    email_msg = EmailMessage(
        thread_id=thread.id,
        direction="outgoing",
        from_email=settings.SMTP_FROM_EMAIL,
        to_email=thread.rm_email,
        subject=subject,
        body=payload.message,
        html_body=html_body,
        message_id=message_id,
        in_reply_to=in_reply_to,
        status="sent" if message_id else "failed",
        sent_at=now,
    )
    db.add(email_msg)

    _log_history(db, req.id, "email_reply_sent", current_user.id,
                 details=f"Reply sent to {thread.rm_email}")

    db.commit()
    db.refresh(email_msg)

    return ReplyEmailResponse(
        message="Reply sent successfully",
        email_id=email_msg.id,
        sent_at=email_msg.sent_at,
    )


@router.post("/simulate-reply", response_model=dict)
def simulate_rm_reply(
    payload: SimulateReplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("sales", "admin")),
):
    """Dev/demo endpoint: simulate an incoming RM reply."""
    req = _get_request_or_404(db, payload.request_id)
    thread = db.query(EmailThread).filter(EmailThread.request_id == req.id).first()
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NO_THREAD", "message": "No email thread exists for this request. Send an email first."}},
        )

    last_outgoing = (
        db.query(EmailMessage)
        .filter(EmailMessage.thread_id == thread.id, EmailMessage.direction == "outgoing")
        .order_by(EmailMessage.sent_at.desc())
        .first()
    )

    now = datetime.now(timezone.utc)
    email_msg = EmailMessage(
        thread_id=thread.id,
        direction="incoming",
        from_email=payload.from_email,
        to_email=settings.SMTP_FROM_EMAIL,
        subject=f"Re: {thread.subject}",
        body=payload.message,
        message_id=f"<{uuid.uuid4()}@rm.salamair.com>",
        in_reply_to=last_outgoing.message_id if last_outgoing else None,
        status="received",
        sent_at=now,
        received_at=now,
    )
    db.add(email_msg)

    _log_history(db, req.id, "rm_reply_received", current_user.id,
                 details=f"RM reply received from {payload.from_email}")

    db.commit()

    return {
        "message": "RM reply simulated successfully",
        "email_id": str(email_msg.id),
        "request_id": str(req.id),
    }
