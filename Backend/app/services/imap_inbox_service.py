"""
Poll IMAP inbox for incoming RM replies. Matches emails to requests via [REQ-YYYY-NNN] in subject.

Requires imap_polling_active (IMAP credentials or IMAP_ENABLED) and IMAP_USER/IMAP_PASSWORD.
Typically use the same mailbox as SMTP (e.g. Gmail).
"""
from __future__ import annotations

import html as html_std
import imaplib
import logging
import re
import socket
import uuid
from datetime import datetime, timedelta, timezone
from email import message_from_bytes
from email.header import decode_header
from email.message import Message
from email.utils import parseaddr, parsedate_to_datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.incoming_email_body import sanitize_incoming_rm_body
from app.services.notification_service import notify_email_received
from app.models.email_message import EmailMessage
from app.models.email_thread import EmailThread
from app.models.request import Request
from app.models.request_history import RequestHistory
from app.models.user import User

logger = logging.getLogger("uvicorn.error")


class IMAP4_SSL_IPv4(imaplib.IMAP4_SSL):
    """IMAP4 over SSL, IPv4 only (same rationale as SMTP IPv4 on hosts without IPv6 egress)."""

    def _create_socket(self, timeout):
        if timeout is not None and not timeout:
            raise ValueError("Non-blocking socket (timeout=0) is not supported")
        host = None if not self.host else self.host
        last_exc: OSError | None = None
        for res in socket.getaddrinfo(host, self.port, socket.AF_INET, socket.SOCK_STREAM):
            af, socktype, proto, _canon, sa = res
            sock = None
            try:
                sock = socket.socket(af, socktype, proto)
                if timeout is not None:
                    sock.settimeout(timeout)
                sock.connect(sa)
                return self.ssl_context.wrap_socket(sock, server_hostname=self.host)
            except OSError as e:
                last_exc = e
                if sock:
                    sock.close()
        raise last_exc or OSError(f"Could not reach {host}:{self.port} over IPv4")


class IMAP4_IPv4(imaplib.IMAP4):
    """Plain IMAP, IPv4 only."""

    def _create_socket(self, timeout):
        if timeout is not None and not timeout:
            raise ValueError("Non-blocking socket (timeout=0) is not supported")
        host = None if not self.host else self.host
        last_exc: OSError | None = None
        for res in socket.getaddrinfo(host, self.port, socket.AF_INET, socket.SOCK_STREAM):
            af, socktype, proto, _canon, sa = res
            sock = None
            try:
                sock = socket.socket(af, socktype, proto)
                if timeout is not None:
                    sock.settimeout(timeout)
                sock.connect(sa)
                return sock
            except OSError as e:
                last_exc = e
                if sock:
                    sock.close()
        raise last_exc or OSError(f"Could not reach {host}:{self.port} over IPv4")


# Matches [REQ-2026-001] style codes from build_subject()
REQ_CODE_PATTERN = re.compile(r"\[(REQ-\d{4}-\d{3})\]", re.IGNORECASE)
# Gmail may drop long IMAP sessions; keep each poll small.
# Use SINCE (not only UNSEEN) so replies already opened in Gmail still get imported.
_IMAP_SINCE_DAYS = 45
_MAX_MESSAGES_PER_POLL = 80
_MAX_ERROR_LINES = 12


def _decode_subject(subject: str | None) -> str:
    if not subject:
        return ""
    parts = decode_header(subject)
    out: list[str] = []
    for fragment, charset in parts:
        if isinstance(fragment, bytes):
            out.append(fragment.decode(charset or "utf-8", errors="replace"))
        else:
            out.append(fragment)
    return "".join(out).strip()


def _html_to_plain(raw: str) -> str:
    """Strip tags / boilerplate from HTML parts so the portal shows readable text."""
    if not raw or not raw.strip():
        return ""
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", "", raw)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|div|tr|table|h[1-6])>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html_std.unescape(text)
    lines = [ln.rstrip() for ln in text.splitlines()]
    out = "\n".join(ln for ln in lines if ln.strip())
    return out.strip()


def _collapse_duplicate_lines(text: str) -> str:
    """Remove consecutive duplicate lines (nested HTML often decodes to the same title many times)."""
    lines = text.splitlines()
    if not lines:
        return text.strip()
    out: list[str] = []
    prev_key: str | None = None
    for line in lines:
        key = line.strip()
        if key and key == prev_key:
            continue
        out.append(line)
        prev_key = key if key else prev_key
    return "\n".join(out).strip()


def _ctype_lower(part: Message) -> str:
    return (part.get_content_type() or "").lower()


def _decode_text_part(part: Message) -> str:
    raw = part.get_payload(decode=True)
    if not raw:
        return ""
    charset = part.get_content_charset() or "utf-8"
    return raw.decode(charset, errors="replace")


def _direct_subparts(msg: Message) -> list[Message]:
    pl = msg.get_payload()
    if not isinstance(pl, list):
        return []
    return [p for p in pl if isinstance(p, Message)]


def _body_from_multipart(msg: Message) -> str:
    """Pick one logical body (do not join every nested MIME part — that duplicates content)."""
    ctype = (msg.get_content_type() or "").lower()
    parts = _direct_subparts(msg)

    if ctype == "multipart/alternative":
        plains = [p for p in parts if _ctype_lower(p) == "text/plain"]
        htmls = [p for p in parts if _ctype_lower(p) == "text/html"]
        if plains:
            t = _decode_text_part(plains[0]).strip()
            if t:
                return t
        if htmls:
            raw = _decode_text_part(htmls[-1])
            return _html_to_plain(raw) if raw else ""
        return ""

    # mixed / related / signed outer: first non-attachment text block
    for p in parts:
        cd = (p.get("Content-Disposition") or "").lower()
        if "attachment" in cd and _ctype_lower(p) not in ("text/plain", "text/html"):
            continue
        st = _ctype_lower(p)
        if st.startswith("multipart/"):
            inner = _body_from_multipart(p)
            if inner.strip():
                return inner
        elif st == "text/plain":
            t = _decode_text_part(p).strip()
            if t:
                return t
        elif st == "text/html":
            raw = _decode_text_part(p)
            pl = _html_to_plain(raw) if raw else ""
            if pl.strip():
                return pl
    return ""


def _get_body_text(msg: Message) -> str:
    if not msg.is_multipart():
        raw = msg.get_payload(decode=True)
        if not raw:
            return ""
        charset = msg.get_content_charset() or "utf-8"
        text = raw.decode(charset, errors="replace")
        if _ctype_lower(msg) == "text/html":
            text = _html_to_plain(text)
        return _collapse_duplicate_lines(text.strip())

    extracted = _body_from_multipart(msg).strip()
    if extracted:
        return _collapse_duplicate_lines(extracted)
    return ""


def _normalize_message_id(raw: str | None) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    if raw.startswith("<") and raw.endswith(">"):
        return raw
    return f"<{raw}>" if raw else None


def extract_request_code(subject: str) -> str | None:
    m = REQ_CODE_PATTERN.search(subject)
    return m.group(1).upper() if m else None


def poll_inbox_once(db: Session) -> dict:
    """
    Fetch recent messages from IMAP (SINCE window, not only UNSEEN), match [REQ-YYYY-NNN] in subject,
    store as incoming EmailMessage. Using SINCE imports replies even if already opened in Gmail.
    Returns summary dict for API response.
    """
    if not settings.imap_polling_active:
        return {
            "ok": False,
            "skipped": True,
            "reason": "IMAP polling off (set IMAP_USER+IMAP_PASSWORD, or IMAP_ENABLED=true with creds)",
            "processed": 0,
            "stored": 0,
            "errors": [],
        }

    if not settings.IMAP_USER or not settings.IMAP_PASSWORD:
        logger.warning("IMAP active but IMAP_USER/IMAP_PASSWORD not set")
        return {
            "ok": False,
            "skipped": True,
            "reason": "IMAP credentials missing",
            "processed": 0,
            "stored": 0,
            "errors": [],
        }

    processed = 0
    stored = 0
    errors: list[str] = []

    try:
        if settings.IMAP_USE_SSL:
            mail = IMAP4_SSL_IPv4(settings.IMAP_HOST, settings.IMAP_PORT, timeout=30)
        else:
            mail = IMAP4_IPv4(settings.IMAP_HOST, settings.IMAP_PORT, timeout=30)

        mail.login(settings.IMAP_USER, settings.IMAP_PASSWORD)
        mail.select(settings.IMAP_MAILBOX)

        since = (datetime.now(timezone.utc).date() - timedelta(days=_IMAP_SINCE_DAYS)).strftime("%d-%b-%Y")
        typ, data = mail.search(None, f"(SINCE {since})")
        if typ != "OK" or not data or not data[0]:
            mail.logout()
            return {"ok": True, "skipped": False, "processed": 0, "stored": 0, "errors": []}

        id_bytes = data[0].split()
        if not id_bytes:
            mail.logout()
            return {"ok": True, "skipped": False, "processed": 0, "stored": 0, "errors": []}

        if len(id_bytes) > _MAX_MESSAGES_PER_POLL:
            errors.append(
                f"IMAP: processing newest {_MAX_MESSAGES_PER_POLL} of {len(id_bytes)} messages in "
                f"{_IMAP_SINCE_DAYS}-day window; click Sync again to continue."
            )
            id_bytes = id_bytes[-_MAX_MESSAGES_PER_POLL:]

        for num in id_bytes:
            processed += 1
            try:
                typ, msg_data = mail.fetch(num, "(RFC822)")
                if typ != "OK" or not msg_data or not msg_data[0]:
                    continue
                raw = msg_data[0][1]
                if not isinstance(raw, (bytes, bytearray)):
                    continue

                msg = message_from_bytes(bytes(raw))
                subject = _decode_subject(msg.get("Subject"))
                from_header = msg.get("From") or ""
                _, from_email = parseaddr(from_header)
                from_email = (from_email or "").strip().lower()

                our_box = (settings.SMTP_FROM_EMAIL or "").strip().lower()
                if from_email == our_box:
                    mail.store(num, "+FLAGS", "\\Seen")
                    continue

                mid_raw = msg.get("Message-ID")
                mid = _normalize_message_id(mid_raw)
                if mid:
                    dup = db.query(EmailMessage).filter(EmailMessage.message_id == mid).first()
                    if dup:
                        mail.store(num, "+FLAGS", "\\Seen")
                        continue

                request_code = extract_request_code(subject)
                if not request_code:
                    # Other mail in the same inbox window — skip quietly (avoid error spam on Sync).
                    mail.store(num, "+FLAGS", "\\Seen")
                    continue

                req = db.query(Request).filter(Request.request_code == request_code).first()
                if not req:
                    errors.append(f"Unknown request code: {request_code}")
                    mail.store(num, "+FLAGS", "\\Seen")
                    continue

                thread = (
                    db.query(EmailThread)
                    .filter(EmailThread.request_id == req.id)
                    .first()
                )
                if not thread:
                    thread = EmailThread(
                        request_id=req.id,
                        subject=f"[{request_code}] Fare Approval Request - {req.route}",
                        rm_email=from_email or settings.RM_DEFAULT_EMAIL,
                    )
                    db.add(thread)
                    db.flush()

                body = _get_body_text(msg)
                body = sanitize_incoming_rm_body(body)
                if not body:
                    body = "(No text body)"

                to_header = msg.get("To") or ""
                _, to_email = parseaddr(to_header)
                to_email = (to_email or settings.SMTP_FROM_EMAIL).strip()

                date_hdr = msg.get("Date")
                try:
                    recv_dt = parsedate_to_datetime(date_hdr) if date_hdr else datetime.now(timezone.utc)
                    if recv_dt.tzinfo is None:
                        recv_dt = recv_dt.replace(tzinfo=timezone.utc)
                except Exception:
                    recv_dt = datetime.now(timezone.utc)

                in_reply = _normalize_message_id(msg.get("In-Reply-To"))

                email_msg = EmailMessage(
                    thread_id=thread.id,
                    direction="incoming",
                    from_email=from_email or "unknown",
                    to_email=to_email,
                    subject=subject or f"Re: {thread.subject}",
                    body=body,
                    html_body=None,
                    message_id=mid or f"<{uuid.uuid4()}@imap.imported>",
                    in_reply_to=in_reply,
                    status="received",
                    sent_at=recv_dt,
                    received_at=datetime.now(timezone.utc),
                )
                db.add(email_msg)

                sales = db.query(User).filter(User.role == "sales", User.is_active.is_(True)).first()
                actor = sales.id if sales else req.agent_id
                db.add(RequestHistory(
                    request_id=req.id,
                    action="rm_reply_received_imap",
                    actor_id=actor,
                    details=f"IMAP: reply from {from_email}",
                ))

                db.commit()
                stored += 1

                try:
                    notify_email_received(db, req)
                except Exception as e:
                    logger.warning("notify_email_received failed: %s", e)

                mail.store(num, "+FLAGS", "\\Seen")

            except Exception as e:
                err_s = str(e)
                # One line only — full tracebacks per message flood host log limits (e.g. Railway 500/sec).
                logger.warning("IMAP message %s: %s", num, err_s)
                errors.append(err_s[:500])
                if "EOF" in err_s or "reset" in err_s.lower() or "Broken pipe" in err_s:
                    logger.warning("IMAP connection dropped; stopping poll (process remaining on next sync).")
                    break
                try:
                    mail.store(num, "+FLAGS", "\\Seen")
                except Exception:
                    pass

        try:
            mail.logout()
        except Exception:
            pass
    except Exception as e:
        logger.exception("IMAP poll failed: %s", e)
        return {
            "ok": False,
            "skipped": False,
            "processed": processed,
            "stored": stored,
            "errors": errors + [str(e)],
        }

    if len(errors) > _MAX_ERROR_LINES:
        errors = errors[:_MAX_ERROR_LINES]

    return {
        "ok": True,
        "skipped": False,
        "processed": processed,
        "stored": stored,
        "errors": errors,
    }
