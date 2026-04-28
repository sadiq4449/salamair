# Iteration 4: Email Integration System

## Duration: Sprint 7-8 (2 Weeks)

## Priority: CRITICAL (Core differentiator of the platform)

## Depends On: Iteration 3 (Sales Workflow)

---

## Objective

Build the complete email integration system that enables sending structured emails to Revenue Management (RM), automatically capturing RM replies, threading emails to requests, and allowing portal-based email replies.

---

## Scope

### Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 4.1 | Email Configuration | Set up SMTP credentials and config in Settings + .env | Done |
| 4.2 | Email Template Engine | Create HTML email templates with REQ ID in subject | Done |
| 4.3 | Send Email Service | Service to send structured emails to RM via SMTP | Done |
| 4.4 | Send Email API | `POST /api/v1/email/send` - Trigger email to RM for a request | Done |
| 4.5 | Email Thread Model | Create `email_threads`, `email_messages`, `email_attachments` tables | Done |
| 4.6 | IMAP Polling Service | Simulated via `POST /api/v1/email/simulate-reply` (Celery deferred to infra) | Done |
| 4.7 | Email Parser | REQ ID embedded in subject `[REQ-XXXX]`, parsed by thread linkage | Done |
| 4.8 | Reply Capture Logic | Match incoming emails to requests via thread_id + request_id | Done |
| 4.9 | Get Email Thread API | `GET /api/v1/email/thread/{request_id}` - Full email chain | Done |
| 4.10 | Reply from Portal API | `POST /api/v1/email/reply` - Send reply email from portal | Done |
| 4.11 | Email Retry Mechanism | SMTP retry logic in service; Celery-based retry deferred to infra | Partial |
| 4.12 | Email Status Tracking | Track sent, failed, received statuses on each message | Done |
| 4.13 | Celery Task: Poll Emails | Simulated via API endpoint; Celery infra deferred | Partial |
| 4.14 | Celery Task: Send Email | Sync SMTP send; async Celery wrapper deferred to infra | Partial |
| 4.15 | Email Logging | All email activity logged via uvicorn.error logger | Done |
| 4.16 | Attachment Handling | Forward request attachments in emails, capture reply attachments | Done |

### Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 4.17 | Email Thread View | Display email conversation within request detail (both roles) | Done |
| 4.18 | Send to RM Button | Opens email preview modal before sending | Done |
| 4.19 | Email Preview Modal | Preview email content, subject, recipients before sending | Done |
| 4.20 | Reply Composer | Inline reply input in email thread view | Done |
| 4.21 | Email Status Indicators | Sent, Received, Failed badges on each email bubble | Done |
| 4.22 | Email Loading States | Spinner loading for email thread fetch | Done |
| 4.23 | Attachment Display | Show email attachments with download links | Done |
| 4.24 | Email Notification Badge | Deferred to Iteration 6 (Notifications) | Deferred |

---

## API Contracts (This Iteration)

### POST /api/v1/email/send

**Request:**
```json
{
  "request_id": "uuid",
  "to": "rm@salamair.com",
  "message": "Please review and approve the fare for KHI → DXB route.\n\nDetails:\n- PAX: 2\n- Requested Price: 50,000\n- Travel Date: 2026-05-15",
  "include_attachments": true
}
```

**Response (200):**
```json
{
  "message": "Email sent successfully",
  "email_id": "uuid",
  "request_code": "REQ-1023",
  "status": "rm_pending",
  "sent_at": "2026-04-14T10:35:00Z"
}
```

### GET /api/v1/email/thread/{request_id}

**Response (200):**
```json
{
  "request_code": "REQ-1023",
  "thread_id": "uuid",
  "emails": [
    {
      "id": "uuid",
      "direction": "outgoing",
      "from": "sales@salamair.com",
      "to": "rm@salamair.com",
      "subject": "[REQ-1023] Fare Approval Request - KHI → DXB",
      "body": "Please review and approve the fare...",
      "attachments": [
        {
          "filename": "booking_details.pdf",
          "url": "/files/booking_details.pdf"
        }
      ],
      "status": "delivered",
      "timestamp": "2026-04-14T10:35:00Z"
    },
    {
      "id": "uuid",
      "direction": "incoming",
      "from": "rm@salamair.com",
      "to": "sales@salamair.com",
      "subject": "Re: [REQ-1023] Fare Approval Request - KHI → DXB",
      "body": "Approved with fare at 48,000. Valid for 7 days.",
      "attachments": [],
      "status": "received",
      "timestamp": "2026-04-14T14:20:00Z"
    }
  ]
}
```

### POST /api/v1/email/reply

**Request:**
```json
{
  "request_id": "uuid",
  "thread_id": "uuid",
  "message": "Thank you for the approval. Confirming the fare at 48,000.",
  "attachments": []
}
```

**Response (200):**
```json
{
  "message": "Reply sent successfully",
  "email_id": "uuid",
  "sent_at": "2026-04-14T14:30:00Z"
}
```

---

## Database Schema

### email_threads

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| request_id | UUID | FK → requests.id, UNIQUE |
| subject | VARCHAR(500) | NOT NULL |
| rm_email | VARCHAR(255) | NOT NULL |
| status | VARCHAR(20) | DEFAULT 'active' |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

### email_messages

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| thread_id | UUID | FK → email_threads.id |
| direction | VARCHAR(10) | NOT NULL (incoming/outgoing) |
| from_email | VARCHAR(255) | NOT NULL |
| to_email | VARCHAR(255) | NOT NULL |
| subject | VARCHAR(500) | NOT NULL |
| body | TEXT | NOT NULL |
| html_body | TEXT | NULLABLE |
| message_id | VARCHAR(255) | Email Message-ID header |
| in_reply_to | VARCHAR(255) | Reference to parent email |
| status | VARCHAR(20) | sent/delivered/bounced/received |
| sent_at | TIMESTAMP | NOT NULL |
| received_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | DEFAULT now() |

### email_attachments

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| email_id | UUID | FK → email_messages.id |
| filename | VARCHAR(255) | NOT NULL |
| file_url | VARCHAR(500) | NOT NULL |
| file_type | VARCHAR(50) | NOT NULL |
| file_size | INTEGER | NOT NULL |

---

## Email Flow Architecture

```
OUTGOING FLOW:
Sales clicks "Send to RM"
    → API creates email record
    → Celery task picks up
    → Email sent via SMTP/Graph API
    → Status updated to "sent"
    → Request status → "rm_pending"

INCOMING FLOW:
Celery polls inbox (every 2 min)
    → New email detected
    → Parser extracts REQ ID from subject
    → Matched to request in DB
    → Email stored in email_messages
    → Request updated with RM response
    → Notification triggered for sales user
```

## Email Subject Format

```
Outgoing: [REQ-1023] Fare Approval Request - KHI → DXB
Reply:    Re: [REQ-1023] Fare Approval Request - KHI → DXB
```

REQ ID extraction regex: `\[REQ-(\d+)\]`

---

## Background Jobs (Celery)

| Job | Schedule | Description |
|-----|----------|-------------|
| poll_inbox | Every 2 minutes | Check for new RM replies |
| send_email | On-demand (async) | Send outgoing emails without blocking API |
| retry_failed_emails | Every 15 minutes | Retry bounced/failed emails (max 3 retries) |

---

## Acceptance Criteria

- [x] Sales can send email to RM from within the portal
- [x] Email includes REQ ID in subject line
- [x] Email preview shows correct content before sending
- [x] Request status changes to `rm_pending` after email sent
- [x] System captures RM reply emails (simulated via API; IMAP polling deferred)
- [x] RM replies are matched to correct request via thread linkage
- [x] Email thread view shows full conversation history
- [x] Sales can reply to RM from the portal
- [x] Email attachments are forwarded and captured
- [ ] Failed emails are retried automatically (Celery infra deferred)
- [x] Email activity is logged for debugging
- [ ] Unmatched emails are flagged for manual review (IMAP deferred)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Email parsing fails (no REQ ID) | Flag unmatched emails, strict subject format |
| SMTP rate limiting | Queue emails, implement backoff |
| RM changes email subject | Also check In-Reply-To header and thread ID |
| Email server downtime | Retry mechanism with alerts |
| Spam filtering blocks emails | Whitelist sender domain, use SPF/DKIM |

---

## Definition of Done

- Outgoing emails sent successfully via SMTP/Graph API
- RM replies captured and linked to requests automatically
- Full email thread visible within portal
- Reply from portal works end-to-end
- Background polling job running reliably
- Failed emails retried with proper logging
- Email attachments handled correctly
