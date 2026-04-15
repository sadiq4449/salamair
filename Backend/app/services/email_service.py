import logging
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")


def build_subject(request_code: str, route: str) -> str:
    return f"[{request_code}] Fare Approval Request - {route}"


def build_html_body(
    request_code: str,
    route: str,
    pax: int,
    price: float,
    travel_date: str | None,
    message: str,
    sender_name: str,
) -> str:
    return f"""
    <div style="font-family:Inter,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:linear-gradient(135deg,#0d9488,#3b82f6);padding:24px;border-radius:12px 12px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">Salam Air SmartDeal</h2>
        <p style="color:#ccfbf1;margin:4px 0 0;font-size:13px">Fare Approval Request</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;padding:24px;border-radius:0 0 12px 12px">
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px">Request ID</td><td style="padding:8px 0;font-weight:600;font-size:14px">{request_code}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Route</td><td style="padding:8px 0;font-weight:600;font-size:14px">{route}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Passengers</td><td style="padding:8px 0;font-weight:600;font-size:14px">{pax}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Proposed Price</td><td style="padding:8px 0;font-weight:600;font-size:14px;color:#0d9488">{price:.2f} OMR</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Travel Date</td><td style="padding:8px 0;font-weight:600;font-size:14px">{travel_date or '—'}</td></tr>
        </table>
        <div style="background:#f9fafb;padding:16px;border-radius:8px;border-left:3px solid #0d9488;margin-bottom:16px">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#374151">{message}</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin:0">Sent by {sender_name} via Salam Air SmartDeal Platform</p>
      </div>
    </div>
    """


def send_smtp_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: str,
) -> str | None:
    """Send email via SMTP. Returns Message-ID on success, None if email is disabled."""
    if not settings.EMAIL_ENABLED:
        logger.info("Email disabled — skipping SMTP send to %s: %s", to_email, subject)
        return f"<{uuid.uuid4()}@salamair.local>"

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        message_id = f"<{uuid.uuid4()}@salamair.com>"
        msg["Message-ID"] = message_id

        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("Email sent to %s: %s", to_email, subject)
        return message_id
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return None
