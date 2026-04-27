import html
import logging
import smtplib
import socket
import ssl
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import quote
from uuid import UUID

import httpx

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")


class SMTPIPv4(smtplib.SMTP):
    """SMTP client that connects over IPv4 only.

    Many PaaS containers (e.g. Railway) have no working IPv6 egress; Python may try IPv6
    first for smtp.gmail.com and fail with [Errno 101] Network is unreachable.
    """

    def connect(self, host="localhost", port=0, source_address=None):
        self.host = host
        self.port = port
        self.sock = None
        self.source_address = source_address
        last_exc: OSError | None = None
        for res in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
            af, socktype, proto, _canon, sa = res
            try:
                self.sock = socket.socket(af, socktype, proto)
                if self.timeout is not socket._GLOBAL_DEFAULT_TIMEOUT:
                    self.sock.settimeout(self.timeout)
                if source_address:
                    self.sock.bind(source_address)
                self.sock.connect(sa)
                break
            except OSError as e:
                last_exc = e
                if self.sock:
                    self.sock.close()
                    self.sock = None
        if self.sock is None:
            raise last_exc or OSError(f"Could not reach {host}:{port} over IPv4")
        return self.getreply()


class SMTPIPv4_SSL(smtplib.SMTP_SSL):
    """SMTP over implicit TLS (port 465), IPv4 only."""

    def _get_socket(self, host, port, timeout):
        if self.debuglevel > 0:
            self._print_debug("connect:", (host, port))
        last_exc: OSError | None = None
        for res in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
            af, socktype, proto, _canon, sa = res
            sock = None
            try:
                sock = socket.socket(af, socktype, proto)
                if timeout is not None and timeout is not socket._GLOBAL_DEFAULT_TIMEOUT:
                    sock.settimeout(timeout)
                sock.connect(sa)
                return self.context.wrap_socket(sock, server_hostname=host)
            except OSError as e:
                last_exc = e
                if sock:
                    sock.close()
        raise last_exc or OSError(f"Could not reach {host}:{port} over IPv4 (SSL)")


def _enhance_smtp_error(err: str) -> str:
    """Add short hints for common failures (shown in API/UI)."""
    low = err.lower()
    if "timed out" in low or "timeout" in low:
        return (
            f"{err}\n\n"
            "Many hosted plans (e.g. Railway Free/Hobby, Render) block outbound SMTP (465/587). "
            "Use RESEND_API_KEY (Resend over HTTPS/443) or a host that allows SMTP. "
            "See Backend/.env.example. IMAP inbound on 993 often still works."
        )
    return err


def _enhance_resend_error(err: str) -> str:
    """Resend test sender (onboarding@resend.dev) only allows sending to the account email until a domain is verified."""
    low = err.lower()
    if "only send testing" in low or "verify a domain" in low:
        return (
            f"{err}\n\n"
            "While using Resend’s test sender (onboarding@resend.dev), Resend only delivers to the email "
            "address tied to your Resend API key. To email other recipients (e.g. RM), verify a domain at "
            "https://resend.com/domains and set RESEND_FROM_EMAIL to an address on that domain in your "
            "host environment or .env."
        )
    return err


# Resend only allows verified domains. Public inboxes (Gmail, Yahoo, …) cannot be "from".
RESEND_PUBLIC_SENDER = "onboarding@resend.dev"


def _resend_from_and_reply_to() -> tuple[str, list[str] | None]:
    """
    Returns (from_address, optional reply_to list).
    If SMTP_FROM_EMAIL is Gmail/Yahoo/etc., use Resend's test sender + reply_to real address.
    Override with RESEND_FROM_EMAIL when you have a verified domain in Resend.
    """
    override = (settings.RESEND_FROM_EMAIL or "").strip()
    contact = (settings.SMTP_FROM_EMAIL or "").strip() or "noreply@salamair.com"
    if override:
        return override, None

    lower = contact.lower()
    public_suffixes = (
        "@gmail.com",
        "@googlemail.com",
        "@yahoo.com",
        "@yahoo.co.uk",
        "@hotmail.com",
        "@outlook.com",
        "@live.com",
        "@icloud.com",
        "@protonmail.com",
        "@aol.com",
        "@msn.com",
    )
    if any(lower.endswith(s) for s in public_suffixes):
        return RESEND_PUBLIC_SENDER, [contact]
    return contact, None


def resend_test_sender_mode() -> bool:
    """True when Resend uses onboarding@resend.dev (public From like Gmail) — sandbox limits recipients until domain verified."""
    if not (settings.RESEND_API_KEY or "").strip():
        return False
    _from_addr, reply_to = _resend_from_and_reply_to()
    return reply_to is not None


def resend_outbound_summary() -> str | None:
    """Human-readable Resend envelope for admin status (matches actual API sends)."""
    if not (settings.RESEND_API_KEY or "").strip():
        return None
    from_addr, reply_to = _resend_from_and_reply_to()
    disp = (settings.SMTP_FROM_NAME or "Salam Air").strip()
    if reply_to:
        return (
            f"Envelope From: {disp} <{from_addr}> | Reply-To: {reply_to[0]}\n"
            "Test sender: Resend only accepts the recipient = your Resend account email until you verify a domain "
            "and set RESEND_FROM_EMAIL (e.g. noreply@yourdomain.com)."
        )
    return f"Envelope From: {disp} <{from_addr}>"


def _coerce_to_list(to_email: str | list[str]) -> list[str]:
    """Normalize a string ("a@x.com, b@y.com") or list into a clean list of addresses."""
    if isinstance(to_email, list):
        items = [str(x).strip() for x in to_email]
    else:
        items = [p.strip() for p in str(to_email or "").replace(";", ",").split(",")]
    out: list[str] = []
    seen: set[str] = set()
    for x in items:
        if not x:
            continue
        low = x.lower()
        if low in seen:
            continue
        seen.add(low)
        out.append(x)
    return out


def _send_via_resend(
    to_email: str | list[str],
    subject: str,
    body_text: str,
    body_html: str,
    message_id: str,
    *,
    in_reply_to: str | None = None,
    references: str | None = None,
) -> tuple[str | None, str | None]:
    """Send via Resend HTTP API (works when SMTP egress is blocked, e.g. Railway or Render)."""
    key = (settings.RESEND_API_KEY or "").strip()
    if not key:
        return None, "RESEND_API_KEY is not set"

    from_addr, reply_to = _resend_from_and_reply_to()
    recipients = _coerce_to_list(to_email)
    if not recipients:
        return None, "No recipient email address provided."
    payload: dict = {
        "from": f"{settings.SMTP_FROM_NAME} <{from_addr}>",
        "to": recipients,
        "subject": subject,
        "html": body_html,
        "text": body_text,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    if in_reply_to:
        payload["headers"] = {
            "In-Reply-To": _normalize_msg_id_header(in_reply_to),
            "References": (references or in_reply_to).strip(),
        }
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json=payload,
            timeout=45.0,
        )
        if r.status_code >= 400:
            try:
                detail = r.json()
                msg = detail.get("message") or detail.get("name") or str(detail)
            except Exception:
                msg = r.text or r.reason_phrase
            return None, _enhance_resend_error(str(msg))[:1200]

        return message_id, None
    except httpx.RequestError as e:
        return None, str(e)[:800]


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


def build_thread_reply_plain(
    request_code: str,
    route: str,
    message: str,
    sender_name: str,
    contact_email: str,
) -> str:
    """Short plain body for follow-up replies in an existing RM thread (not the full fare template)."""
    msg = message.strip()
    ce = contact_email.strip()
    return (
        f"{msg}\n\n"
        "—\n"
        f"{sender_name}\n"
        f"{ce}\n"
        f"[{request_code}] {route} · Salam Air SmartDeal\n"
    )


def build_thread_reply_html(
    request_code: str,
    route: str,
    message: str,
    sender_name: str,
    contact_email: str,
) -> str:
    """Minimal HTML for thread replies — message + small signature (matches plain)."""
    msg = _esc(message.strip())
    ce_raw = contact_email.strip()
    ce = _esc(ce_raw)
    safe_mailto = quote(ce_raw, safe="@+.-_")
    return f"""
    <div style="font-family:Inter,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;font-size:15px;line-height:1.55">
      <p style="margin:0 0 8px;white-space:pre-wrap;color:#374151">{msg}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
      <p style="margin:0;font-size:13px;color:#6b7280">{_esc(sender_name)} · <a href="mailto:{safe_mailto}" style="color:#0d9488">{ce}</a></p>
      <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">[{_esc(request_code)}] {_esc(route)} · Salam Air SmartDeal</p>
    </div>
    """


def _normalize_msg_id_header(value: str) -> str:
    v = value.strip()
    if v.startswith("<") and v.endswith(">"):
        return v
    return f"<{v}>" if v else value


def send_smtp_email(
    to_email: str | list[str],
    subject: str,
    body_text: str,
    body_html: str,
    *,
    in_reply_to: str | None = None,
    references: str | None = None,
) -> tuple[str | None, str | None]:
    """Send via SMTP (or Resend). ``to_email`` may be a single address, a comma-separated
    string, or a list. Returns (message_id, None) on success, (None, error_hint) otherwise.
    """
    recipients = _coerce_to_list(to_email)
    if not recipients:
        return None, "No recipient email address provided."
    display_to = ", ".join(recipients)

    if not settings.email_sending_active:
        logger.info("Email disabled — not sent to %s: %s", display_to, subject)
        return None, (
            "Email sending is off: set RESEND_API_KEY, or SMTP_USER + SMTP_PASSWORD "
            "(omit EMAIL_ENABLED=false). On Railway/Render, prefer RESEND_API_KEY when SMTP is blocked."
        )

    message_id = f"<{uuid.uuid4()}@salamair.com>"

    if (settings.RESEND_API_KEY or "").strip():
        mid, err = _send_via_resend(
            recipients,
            subject,
            body_text,
            body_html,
            message_id,
            in_reply_to=in_reply_to,
            references=references,
        )
        if mid:
            logger.info("Resend email to %s: %s", display_to, subject)
        return mid, err

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = display_to
        msg["Subject"] = subject
        msg["Message-ID"] = message_id
        if in_reply_to:
            irt = _normalize_msg_id_header(in_reply_to)
            msg["In-Reply-To"] = irt
            msg["References"] = references.strip() if references else irt

        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        timeout = max(15, int(settings.SMTP_TIMEOUT_SECONDS))

        if settings.SMTP_IMPLICIT_SSL:
            context = ssl.create_default_context()
            with SMTPIPv4_SSL(
                settings.SMTP_HOST,
                settings.SMTP_PORT,
                timeout=timeout,
                context=context,
            ) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg, to_addrs=recipients)
        else:
            with SMTPIPv4(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls(context=ssl.create_default_context())
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg, to_addrs=recipients)

        logger.info("Email sent to %s: %s", display_to, subject)
        return message_id, None
    except Exception as e:
        err = _enhance_smtp_error(str(e))[:1200]
        logger.exception("Failed to send email to %s", display_to)
        return None, err
