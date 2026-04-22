"""Build downloadable text/ZIP exports for a request (deal + chat + history; RM email for sales/admin)."""

from __future__ import annotations

import io
import re
import uuid
import zipfile
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from sqlalchemy.orm import Session, joinedload

from app.models.counter_offer import CounterOffer
from app.models.email_message import EmailMessage
from app.models.email_thread import EmailThread, THREAD_CHANNEL_AGENT_SALES, THREAD_CHANNEL_RM
from app.models.message import Message
from app.models.request import Request
from app.models.request_history import RequestHistory
from app.models.user import User


def _ts(dt) -> str:
    if dt is None:
        return "—"
    if hasattr(dt, "astimezone"):
        return dt.astimezone(timezone.utc).isoformat()
    return str(dt)


def _email_message_plain(m: EmailMessage) -> str:
    b = (m.body or "").strip()
    if b:
        return b
    h = (m.html_body or "").strip()
    if h:
        return re.sub(r"<[^>]+>", " ", h).replace("&nbsp;", " ")
    return "(no body)"


def build_request_deal_text(db: Session, req: Request) -> str:
    agent = req.agent
    tag_names: list[str] = []
    if req.tags:
        tag_names = [t.name for t in req.tags]
    lines: list[str] = [
        "Salam Air SmartDeal — Request / deal export",
        "=" * 72,
        f"Request code:    {req.request_code}",
        f"Route:           {req.route}",
        f"Passengers:     {req.pax}",
        f"Proposed price:  {req.price} OMR",
        f"Travel date:     {req.travel_date or '—'}",
        f"Return date:     {req.return_date or '—'}",
        f"Status:         {req.status}",
        f"Priority:        {req.priority}",
        f"Agent:          {agent.name if agent else '—'} ({agent.email if agent else '—'})",
        f"Created:         {_ts(req.created_at)}",
        f"Updated:         {_ts(req.updated_at)}",
    ]
    if tag_names:
        lines.append(f"Tags:            {', '.join(tag_names)}")
    if req.notes and str(req.notes).strip():
        lines.extend(["", "Agent / deal notes:", str(req.notes).strip()])

    offers = (
        db.query(CounterOffer)
        .options(joinedload(CounterOffer.creator))
        .filter(CounterOffer.request_id == req.id)
        .order_by(CounterOffer.created_at.asc())
        .all()
    )
    if offers:
        lines.extend(["", "Counter offers:", "-" * 40])
        for o in offers:
            st = (o.status or "pending").strip() or "pending"
            who = o.creator.name if o.creator else "—"
            lines.append(
                f"  • {o.original_price} → {o.counter_price} OMR | {st} | by {who} @ {_ts(o.created_at)}"
            )
            if o.message:
                lines.append(f"    Message: {o.message}")

    atts = req.attachments or []
    if atts:
        lines.extend(["", "Request file attachments (URLs):", "-" * 40])
        for a in atts:
            lines.append(f"  • {a.filename} ({a.file_size} bytes) — {a.file_url}")
    else:
        lines.extend(["", "Request file attachments: (none)"])
    return "\n".join(lines) + "\n"


def build_activity_log_text(db: Session, request_id: uuid.UUID) -> str:
    lines = [
        "Activity / status history",
        "=" * 72,
    ]
    entries = (
        db.query(RequestHistory)
        .options(joinedload(RequestHistory.actor))
        .filter(RequestHistory.request_id == request_id)
        .order_by(RequestHistory.created_at.asc())
        .all()
    )
    if not entries:
        return "\n".join(lines + ["(No history entries.)", ""])
    for e in entries:
        who = e.actor.name if e.actor else "—"
        lines.append("-" * 40)
        lines.append(f"{_ts(e.created_at)} | {e.action} | {who}")
        if e.from_status and e.to_status:
            lines.append(f"  Status: {e.from_status} → {e.to_status}")
        if e.details and str(e.details).strip():
            lines.append(f"  Details: {e.details}")
        lines.append("")
    return "\n".join(lines) + "\n"


def build_portal_chat_text(db: Session, request_id: uuid.UUID) -> str:
    lines = [
        "Portal chat (Agent ↔ Sales)",
        "=" * 72,
    ]
    msgs = (
        db.query(Message)
        .options(joinedload(Message.sender), joinedload(Message.attachments))
        .filter(Message.request_id == request_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    if not msgs:
        return "\n".join(lines + ["(No messages.)", ""])
    for m in msgs:
        who = m.sender.name if m.sender else ("System" if m.type == "system" else "—")
        lines.append("-" * 40)
        lines.append(f"{_ts(m.created_at)} | {m.type} | role={m.sender_role or '—'} | {who}")
        if m.attachments:
            lines.append("Attachments: " + ", ".join(a.filename for a in m.attachments))
        lines.append("")
        lines.append((m.content or "").strip() or "(empty)")
        lines.append("")
    return "\n".join(lines) + "\n"


def build_rm_email_text(db: Session, request_id: uuid.UUID) -> str | None:
    t = (
        db.query(EmailThread)
        .filter(EmailThread.request_id == request_id, EmailThread.thread_channel == THREAD_CHANNEL_RM)
        .first()
    )
    if not t:
        return None
    req = db.query(Request).filter(Request.id == request_id).first()
    code = req.request_code if req else "unknown"
    lines: list[str] = [
        "Sales ↔ RM email (portal-stored copy)",
        "=" * 72,
        f"Request code:   {code}",
        f"Thread subject: {t.subject}",
        f"RM email:      {t.rm_email}",
        "",
    ]
    msgs = (
        db.query(EmailMessage)
        .options(joinedload(EmailMessage.attachments))
        .filter(EmailMessage.thread_id == t.id)
        .order_by(EmailMessage.sent_at.asc(), EmailMessage.created_at.asc())
        .all()
    )
    if not msgs:
        lines.append("(No email messages in thread.)")
        return "\n".join(lines) + "\n"
    for i, m in enumerate(msgs, 1):
        ts = m.sent_at or m.received_at or m.created_at
        lines.append("-" * 40)
        lines.append(f"#{i} | {m.direction} | {_ts(ts)}")
        lines.append(f"From: {m.from_email}  To: {m.to_email}")
        lines.append(f"Subject: {m.subject}")
        if m.attachments:
            lines.append("Attachments: " + ", ".join(a.filename for a in m.attachments))
        lines.append("")
        lines.append(_email_message_plain(m))
        lines.append("")
    return "\n".join(lines) + "\n"


def build_agent_sales_email_text(db: Session, request_id: uuid.UUID) -> str | None:
    t = (
        db.query(EmailThread)
        .filter(EmailThread.request_id == request_id, EmailThread.thread_channel == THREAD_CHANNEL_AGENT_SALES)
        .first()
    )
    if not t:
        return None
    req = db.query(Request).filter(Request.id == request_id).first()
    code = req.request_code if req else "unknown"
    lines: list[str] = [
        "Sales ↔ Agent email (portal-stored copy)",
        "=" * 72,
        f"Request code:   {code}",
        f"Thread subject: {t.subject}",
        f"Agent mailbox:  {t.rm_email}",
        "",
    ]
    msgs = (
        db.query(EmailMessage)
        .options(joinedload(EmailMessage.attachments))
        .filter(EmailMessage.thread_id == t.id)
        .order_by(EmailMessage.sent_at.asc(), EmailMessage.created_at.asc())
        .all()
    )
    if not msgs:
        lines.append("(No email messages in thread.)")
        return "\n".join(lines) + "\n"
    for i, m in enumerate(msgs, 1):
        ts = m.sent_at or m.received_at or m.created_at
        lines.append("-" * 40)
        lines.append(f"#{i} | {m.direction} | {_ts(ts)}")
        lines.append(f"From: {m.from_email}  To: {m.to_email}")
        lines.append(f"Subject: {m.subject}")
        if m.attachments:
            lines.append("Attachments: " + ", ".join(a.filename for a in m.attachments))
        lines.append("")
        lines.append(_email_message_plain(m))
        lines.append("")
    return "\n".join(lines) + "\n"


def build_combined_text(db: Session, req: Request, user: User) -> str:
    deal = build_request_deal_text(db, req)
    act = build_activity_log_text(db, req.id)
    chat = build_portal_chat_text(db, req.id)
    parts = [deal, "\n" + act, "\n" + chat]
    if user.role in ("sales", "admin"):
        rm = build_rm_email_text(db, req.id)
        if rm:
            parts.append("\n" + rm)
        sa = build_agent_sales_email_text(db, req.id)
        if sa:
            parts.append("\n" + sa)
    if user.role == "agent":
        sa = build_agent_sales_email_text(db, req.id)
        if sa:
            parts.append("\n" + sa)
    return "\n".join(parts)


def _stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def build_pdf_from_plain_text(text: str, document_title: str) -> bytes:
    """Build a multi-page PDF from plain text. Title is shown at the top (HTML-escaped for ReportLab)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "ExportBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        leading=9,
    )
    title = ParagraphStyle("ExportTitle", parent=styles["Heading1"], fontSize=12, spaceAfter=8)

    story: list = [
        Paragraph(escape(document_title), title),
        Spacer(1, 2 * mm),
    ]
    # ReportLab Paragraph uses mini-HTML: escape content, newlines = <br/>
    html = "<br/>".join(escape(text or "").splitlines()) or " "
    chunk_size = 50000
    for i in range(0, len(html), chunk_size):
        story.append(Paragraph(html[i : i + chunk_size], body))
    doc.build(story)
    return buf.getvalue()


def build_combined_text_pdf_bytes(db: Session, req: Request, user: User) -> bytes:
    """Build a multi-page PDF (same text content as the .txt export)."""
    return build_pdf_from_plain_text(
        build_combined_text(db, req, user),
        "Salam Air SmartDeal — request & conversation export",
    )


def build_export_bytes(db: Session, req: Request, user: User, format: str) -> tuple[bytes, str, str]:
    """
    Returns (body bytes, media type, download filename).
    format: "zip" | "txt" | "pdf"
    """
    code_safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", (req.request_code or "request").strip())[:64] or "request"
    stamp = _stamp()
    if format == "txt":
        text = build_combined_text(db, req, user)
        fn = f"{code_safe}-deal-export-{stamp}.txt"
        return text.encode("utf-8"), "text/plain; charset=utf-8", fn
    if format == "pdf":
        body = build_combined_text_pdf_bytes(db, req, user)
        fn = f"{code_safe}-deal-export-{stamp}.pdf"
        return body, "application/pdf", fn
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("01_request_deal.txt", build_request_deal_text(db, req))
        zf.writestr("02_activity_log.txt", build_activity_log_text(db, req.id))
        zf.writestr("03_portal_chat.txt", build_portal_chat_text(db, req.id))
        if user.role in ("sales", "admin"):
            rm = build_rm_email_text(db, req.id)
            if rm:
                zf.writestr("04_sales_rm_email.txt", rm)
            sa = build_agent_sales_email_text(db, req.id)
            if sa:
                zf.writestr("05_sales_agent_email.txt", sa)
        if user.role == "agent":
            sa = build_agent_sales_email_text(db, req.id)
            if sa:
                zf.writestr("04_sales_agent_email.txt", sa)
    buf.seek(0)
    fn = f"{code_safe}-deal-export-{stamp}.zip"
    return buf.getvalue(), "application/zip", fn
