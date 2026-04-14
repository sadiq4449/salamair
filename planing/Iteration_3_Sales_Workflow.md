# Iteration 3: Sales Workflow & Review System

## Duration: Sprint 5-6 (2 Weeks)

## Priority: HIGH

## Depends On: Iteration 2 (Request Management)

---

## Objective

Build the sales support module that enables the sales team to review incoming requests, take actions (approve/reject/counter), and send requests to Revenue Management via email.

---

## Scope

### Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 3.1 | Sales Queue API | `GET /api/v1/sales/queue` - List all requests for sales review | Pending |
| 3.2 | Update Request Status API | `PUT /api/v1/requests/{id}/status` - Approve/Reject/Counter | Pending |
| 3.3 | Counter Offer API | `POST /api/v1/requests/{id}/counter` - Submit counter pricing | Pending |
| 3.4 | Send to RM API | `POST /api/v1/requests/{id}/send-to-rm` - Trigger email to RM | Pending |
| 3.5 | Assign Request API | `PUT /api/v1/requests/{id}/assign` - Assign to sales person | Pending |
| 3.6 | Sales Notes API | `POST /api/v1/requests/{id}/notes` - Add internal sales notes | Pending |
| 3.7 | Request History API | `GET /api/v1/requests/{id}/history` - Action audit trail | Pending |
| 3.8 | Priority Sorting | Sort requests by submission date, priority, SLA urgency | Pending |
| 3.9 | Request History Model | Create `request_history` table for audit logging | Pending |
| 3.10 | Counter Offer Model | Create `counter_offers` table | Pending |
| 3.11 | Permission Guards | Sales-only access for review/approve/reject endpoints | Pending |
| 3.12 | Bulk Status Update | `PUT /api/v1/requests/bulk-status` - Update multiple requests | Pending |

### Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 3.13 | Sales Dashboard | Overview: pending count, today's actions, average response time | Pending |
| 3.14 | Request Queue Page | Table with priority indicators, filter by status/agent/city | Pending |
| 3.15 | Review Request Modal | Side panel or modal showing full request details | Pending |
| 3.16 | Action Buttons | Approve, Reject, Counter Offer, Send to RM buttons | Pending |
| 3.17 | Counter Offer Form | Price input, message field, send to agent | Pending |
| 3.18 | Reject Reason | Required reason field when rejecting | Pending |
| 3.19 | Request History Timeline | Visual timeline of all actions taken on a request | Pending |
| 3.20 | Sales Notes Panel | Internal notes section (not visible to agents) | Pending |
| 3.21 | Quick Filters | Status tabs: All, Pending, Under Review, RM Pending | Pending |
| 3.22 | Confirmation Dialogs | Confirm before approve/reject/send to RM actions | Pending |
| 3.23 | Agent Info Card | Show agent details in review context | Pending |

---

## API Contracts (This Iteration)

### GET /api/v1/sales/queue

**Query Params:**
```
?status=submitted&city=Karachi&priority=high&page=1&limit=20
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "request_code": "REQ-1023",
      "route": "KHI → DXB",
      "pax": 2,
      "price": 50000,
      "status": "submitted",
      "agent": {
        "id": "uuid",
        "name": "Ali Khan",
        "company": "Sky Travels",
        "city": "Karachi"
      },
      "created_at": "2026-04-14T10:00:00Z",
      "sla_deadline": "2026-04-15T10:00:00Z"
    }
  ],
  "total": 30,
  "page": 1,
  "limit": 20
}
```

### PUT /api/v1/requests/{id}/status

**Request:**
```json
{
  "status": "approved",
  "reason": "Competitive pricing for the route"
}
```

**Response (200):**
```json
{
  "message": "Status updated",
  "request_code": "REQ-1023",
  "old_status": "under_review",
  "new_status": "approved"
}
```

### POST /api/v1/requests/{id}/counter

**Request:**
```json
{
  "counter_price": 45000,
  "message": "We can offer at 45,000 for this route. Please confirm."
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "request_code": "REQ-1023",
  "original_price": 50000,
  "counter_price": 45000,
  "message": "We can offer at 45,000 for this route. Please confirm.",
  "status": "counter_offered",
  "created_at": "2026-04-14T11:00:00Z"
}
```

### POST /api/v1/requests/{id}/send-to-rm

**Response (200):**
```json
{
  "message": "Request sent to RM via email",
  "request_code": "REQ-1023",
  "status": "rm_pending",
  "email_sent_to": "rm@salamair.com"
}
```

### GET /api/v1/requests/{id}/history

**Response (200):**
```json
[
  {
    "action": "created",
    "actor": "Ali Khan (Agent)",
    "timestamp": "2026-04-14T10:00:00Z"
  },
  {
    "action": "status_changed",
    "from_status": "submitted",
    "to_status": "under_review",
    "actor": "Sadiq (Sales)",
    "timestamp": "2026-04-14T10:30:00Z"
  },
  {
    "action": "sent_to_rm",
    "actor": "Sadiq (Sales)",
    "timestamp": "2026-04-14T10:35:00Z"
  }
]
```

---

## Database Schema

### request_history

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| request_id | UUID | FK → requests.id |
| action | VARCHAR(50) | NOT NULL |
| from_status | VARCHAR(20) | NULLABLE |
| to_status | VARCHAR(20) | NULLABLE |
| actor_id | UUID | FK → users.id |
| details | TEXT | NULLABLE (reason, notes) |
| created_at | TIMESTAMP | DEFAULT now() |

### counter_offers

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| request_id | UUID | FK → requests.id |
| original_price | DECIMAL(12,2) | NOT NULL |
| counter_price | DECIMAL(12,2) | NOT NULL |
| message | TEXT | NULLABLE |
| created_by | UUID | FK → users.id |
| status | VARCHAR(20) | DEFAULT 'pending' |
| created_at | TIMESTAMP | DEFAULT now() |

### Add to requests table

| Column | Type | Constraints |
|--------|------|-------------|
| assigned_to | UUID | FK → users.id, NULLABLE |
| priority | VARCHAR(10) | DEFAULT 'normal' |
| sla_deadline | TIMESTAMP | NULLABLE |

---

## Sales Workflow

```
Agent submits request
        ↓
Request appears in Sales Queue (status: submitted)
        ↓
Sales picks up request (status: under_review)
        ↓
Sales reviews details, attachments, agent info
        ↓
Decision:
  ├── Approve directly → status: approved → Agent notified
  ├── Reject → status: rejected → Reason required → Agent notified
  ├── Counter Offer → status: counter_offered → Agent notified
  └── Send to RM → status: rm_pending → Email sent to RM
```

---

## Acceptance Criteria

- [ ] Sales can see all incoming requests in a queue
- [ ] Queue is filterable by status, agent, city
- [ ] Sales can view full request details in review mode
- [ ] Approve action updates status and notifies agent
- [ ] Reject action requires a reason
- [ ] Counter offer sends alternative pricing to agent
- [ ] Send to RM triggers email (mock in this iteration, real in Iteration 4)
- [ ] All actions are logged in request history
- [ ] Request history shows complete audit trail
- [ ] Sales notes are internal and not visible to agents
- [ ] Only users with "sales" role can access sales endpoints

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Multiple sales acting on same request | Implement assignment/locking mechanism |
| Accidental approval/rejection | Confirmation dialogs on all destructive actions |
| Agent disputes on counter offers | Full history trail for transparency |

---

## Definition of Done

- Sales can process requests end-to-end
- All status transitions working correctly
- Audit trail captures every action
- Counter offer flow works for agent
- Permission guards block unauthorized access
- UI is responsive and intuitive
