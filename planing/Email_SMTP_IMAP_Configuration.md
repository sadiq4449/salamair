# Real email: SMTP (send) and IMAP (receive)

This app supports **outbound** mail via SMTP and **inbound** RM replies via **IMAP polling** (manual “Sync inbox” or cron). Subjects must contain the request token **`[REQ-YYYY-NNN]`** (same format as outbound mail from the portal) so messages match the correct request.

---

## 1. What you need (typical Gmail / Google Workspace)

| Requirement | Notes |
|---------------|--------|
| Mailbox | One account used for **both** sending and receiving (e.g. `sales@...` or a test Gmail). |
| App password | Google: enable 2FA, create an [App Password](https://support.google.com/accounts/answer/185833), use it as `SMTP_PASSWORD` and `IMAP_PASSWORD`. |
| IMAP turned on | Gmail: Settings → See all settings → Forwarding and POP/IMAP → **Enable IMAP**. |
| Railway / server env | Set the same variables in the hosting provider’s environment; redeploy after changes. |

---

## 2. Environment variables

See `Backend/.env.example`. Minimum for **real send**:

- `EMAIL_ENABLED=true`
- `SMTP_HOST`, `SMTP_PORT` (587 + TLS is default)
- `SMTP_USER`, `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL` — usually the same as `SMTP_USER` for Gmail
- `RM_DEFAULT_EMAIL` — address you send fare requests to (for testing, can be your own second address)

Minimum for **real receive** (IMAP poll):

- `IMAP_ENABLED=true`
- `IMAP_HOST` (e.g. `imap.gmail.com`)
- `IMAP_PORT` (993)
- `IMAP_USE_SSL=true`
- `IMAP_USER`, `IMAP_PASSWORD` — often same as SMTP
- `IMAP_MAILBOX=INBOX`

Optional **cron / automation** without a user JWT:

- `EMAIL_POLL_SECRET` — long random string; call `POST /api/v1/email/poll-inbox` with header `X-Email-Poll-Secret: <same value>`.

---

## 3. API behaviour

| Endpoint | Role |
|----------|------|
| `POST /api/v1/email/send` | Sales sends to RM; uses SMTP when `EMAIL_ENABLED=true`. |
| `POST /api/v1/email/poll-inbox` | Connects to IMAP, reads **UNSEEN** messages, parses subject for `[REQ-...]`, stores incoming rows, notifies sales (`EMAIL_RECEIVED`). Auth: **sales/admin JWT** or **`X-Email-Poll-Secret`** when `EMAIL_POLL_SECRET` is set. |

---

## 4. End-to-end test (recommended)

1. Set env as above; restart the API.
2. Create a request and move it to a state that allows **Send to RM** (`under_review` or `rm_pending`).
3. Send email from the portal to an address you control (or RM test inbox).
4. **Reply** to that email from the RM mailbox so the **subject still contains** `[REQ-YYYY-NNN]` (normal “Re:” reply keeps it).
5. Open the request → **Sales ↔ RM** tab → **Sync inbox** (or call `POST /api/v1/email/poll-inbox`).
6. The reply should appear as an **incoming** message.

If `IMAP_ENABLED=false` or credentials are missing, sync returns `skipped: true` and the UI explains that IMAP is off.

---

## 5. Limitations

- Attachments on **inbound** IMAP messages are not yet persisted to disk (body text is stored).
- Polling is **on demand** or via your scheduler hitting `poll-inbox`; there is no built-in Celery loop in this repo (can be added later).
- Messages without a recognizable `[REQ-...]` in the subject are skipped (see API `errors` in the poll response).
