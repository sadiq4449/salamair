import html
import logging
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import quote
from uuid import UUID

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")


def build_subject(request_code: str, route: str) -> str:
    return f"[{request_code}] Fare Approval Request - {route}"


def _esc(s: str) -> str:
    return html.escape(s, quote=True)


def build_plain_body(
    request_code: str,
    route: str,
    pax: int,
    price: float,
    travel_date: str | None,
    message: str,
    sender_name: str,
    sender_email: str,
    sender_id: UUID,
) -> str:
    """Full plain-text body so RM retains sender identity in their mailbox without the portal."""
    td = travel_date or "—"
    sid = str(sender_id)
    return (
        "Salam Air SmartDeal — Fare approval request\n"
        "—" * 48 + "\n\n"
        "Sales contact (portal user)\n"
        f"  Name:    {sender_name}\n"
        f"  User ID: {sid}\n"
        f"  Email:   {sender_email}\n\n"
        "Request details\n"
        f"  Request ID:     {request_code}\n"
        f"  Route:          {route}\n"
        f"  Passengers:     {pax}\n"
        f"  Proposed price: {price:.2f} OMR\n"
        f"  Travel date:    {td}\n\n"
        "Message\n"
        f"{message}\n\n"
        "—" * 48 + "\n"
        "This thread is also stored in the SmartDeal portal. "
        "Keep this email in your mailbox as a standalone record of the sales contact above.\n"
    )


def build_html_body(
    request_code: str,
    route: str,
    pax: int,
    price: float,
    travel_date: str | None,
    message: str,
    sender_name: str,
    sender_email: str,
    sender_id: UUID,
) -> str:
    td = travel_date or "—"
    sid = str(sender_id)
    return f"""
    <div style="font-family:Inter,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:linear-gradient(135deg,#0d9488,#3b82f6);padding:24px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">Salam Air SmartDeal</h2>
        <p style="color:#ccfbf1;margin:4px 0 0;font-size:13px">Fare Approval Request</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;padding:24px;border-radius:0 0 12px 12px">
        <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.04em">Sales contact (portal user)</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px">
          <tr><td style="padding:10px 12px;color:#6b7280;font-size:13px;width:120px;border-bottom:1px solid #f3f4f6">Name</td><td style="padding:10px 12px;font-weight:600;font-size:14px;border-bottom:1px solid #f3f4f6">{_esc(sender_name)}</td></tr>
          <tr><td style="padding:10px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6">User ID</td><td style="padding:10px 12px;font-weight:600;font-size:14px;font-family:ui-monospace,monospace;border-bottom:1px solid #f3f4f6">{_esc(sid)}</td></tr>
          <tr><td style="padding:10px 12px;color:#6b7280;font-size:13px">Email</td><td style="padding:10px 12px;font-weight:600;font-size:14px"><a href="mailto:{quote(sender_email, safe='@+.-_')}" style="color:#0d9488">{_esc(sender_email)}</a></td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px">Request ID</td><td style="padding:8px 0;font-weight:600;font-size:14px">{_esc(request_code)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Route</td><td style="padding:8px 0;font-weight:600;font-size:14px">{_esc(route)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Passengers</td><td style="padding:8px 0;font-weight:600;font-size:14px">{pax}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Proposed Price</td><td style="padding:8px 0;font-weight:600;font-size:14px;color:#0d9488">{price:.2f} OMR</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Travel Date</td><td style="padding:8px 0;font-weight:600;font-size:14px">{_esc(td)}</td></tr>
        </table>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;border-left:3px solid #0d9488;margin-bottom:16px">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap">{_esc(message)}</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.5">Sent via Salam Air SmartDeal. This message includes the sales user above for identification. Retain this email as a record independent of the portal.</p>
      </div>
    </div>
    """


def send_smtp_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: str,
) -> tuple[str | None, str | None]:
    """Send via SMTP. Returns (message_id, None) on success, (None, error_hint) if skipped or failed."""
    if not settings.EMAIL_ENABLED:
        logger.info("EMAIL_ENABLED=false — SMTP not sent to %s: %s", to_email, subject)
        return None, "EMAIL_ENABLED is false (set true in server env, e.g. Railway)"

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        message_id = f"<{uuid.uuid4()}@salamair.com>"
        msg["Message-ID"] = message_id

        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("Email sent to %s: %s", to_email, subject)
        return message_id, None
    except Exception as e:
        err = str(e)[:800]
        logger.exception("Failed to send email to %s", to_email)
        return None, err
