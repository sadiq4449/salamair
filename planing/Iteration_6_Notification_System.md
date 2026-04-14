# Iteration 6: Notification System & Real-time Updates

## Duration: Sprint 11 (1 Week)

## Priority: HIGH

## Depends On: Iteration 5 (Communication & Messaging)

---

## Objective

Build a comprehensive notification system that keeps all users informed about important events through in-app notifications, email alerts, and real-time WebSocket push notifications with SLA tracking.

---

## Scope

### Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 6.1 | Notification Model | Create `notifications` table with event types, targets, status | Pending |
| 6.2 | Notification Service | Centralized service to create and dispatch notifications | Pending |
| 6.3 | Event Triggers | Auto-trigger notifications on: request created, approved, rejected, counter offered, RM replied, new message | Pending |
| 6.4 | Get Notifications API | `GET /api/v1/notifications` - List user's notifications | Pending |
| 6.5 | Mark Read API | `PUT /api/v1/notifications/{id}/read` - Mark single as read | Pending |
| 6.6 | Mark All Read API | `PUT /api/v1/notifications/read-all` - Mark all as read | Pending |
| 6.7 | Unread Count API | `GET /api/v1/notifications/unread-count` | Pending |
| 6.8 | WebSocket Push | Push notification events to connected users in real-time | Pending |
| 6.9 | Email Alert Service | Send critical notifications via email (approval, rejection) | Pending |
| 6.10 | SLA Timer Service | Calculate and track SLA deadlines per request | Pending |
| 6.11 | SLA Warning Job | Celery task to check approaching/breached SLA deadlines | Pending |
| 6.12 | Notification Preferences | User-level settings for which notifications to receive | Pending |
| 6.13 | Notification Cleanup Job | Archive old notifications (>30 days) | Pending |

### Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 6.14 | Notification Bell Icon | Header bell icon with unread count badge | Pending |
| 6.15 | Notification Dropdown | Dropdown panel listing recent notifications | Pending |
| 6.16 | Notification List Page | Full-page view of all notifications with filters | Pending |
| 6.17 | Mark as Read | Click to mark individual notification as read | Pending |
| 6.18 | Mark All as Read | Button to clear all unread notifications | Pending |
| 6.19 | Real-time Push | New notifications appear instantly via WebSocket | Pending |
| 6.20 | Toast Notifications | Pop-up toast for high-priority events | Pending |
| 6.21 | SLA Indicators | Timer display on requests, color-coded by urgency | Pending |
| 6.22 | Notification Sound | Optional sound alert for new notifications | Pending |
| 6.23 | Notification Settings | UI for managing notification preferences | Pending |

---

## API Contracts (This Iteration)

### GET /api/v1/notifications

**Query Params:**
```
?is_read=false&type=request_approved&page=1&limit=20
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "REQUEST_APPROVED",
      "title": "Request Approved",
      "message": "Your request REQ-1023 (KHI → DXB) has been approved",
      "request_id": "uuid",
      "request_code": "REQ-1023",
      "is_read": false,
      "created_at": "2026-04-14T14:30:00Z"
    },
    {
      "id": "uuid",
      "type": "NEW_MESSAGE",
      "title": "New Message",
      "message": "Sadiq (Sales) sent a message on REQ-1023",
      "request_id": "uuid",
      "request_code": "REQ-1023",
      "is_read": false,
      "created_at": "2026-04-14T14:25:00Z"
    }
  ],
  "total": 15,
  "unread_count": 5,
  "page": 1,
  "limit": 20
}
```

### GET /api/v1/notifications/unread-count

**Response (200):**
```json
{
  "unread_count": 5
}
```

### PUT /api/v1/notifications/{id}/read

**Response (200):**
```json
{
  "message": "Notification marked as read"
}
```

### PUT /api/v1/notifications/read-all

**Response (200):**
```json
{
  "message": "All notifications marked as read",
  "count": 5
}
```

### WebSocket Notification Events

```json
{
  "event": "notification",
  "data": {
    "id": "uuid",
    "type": "REQUEST_APPROVED",
    "title": "Request Approved",
    "message": "Your request REQ-1023 has been approved",
    "request_id": "uuid",
    "request_code": "REQ-1023",
    "created_at": "2026-04-14T14:30:00Z"
  }
}
```

---

## Database Schema

### notifications

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| user_id | UUID | FK → users.id |
| type | VARCHAR(50) | NOT NULL |
| title | VARCHAR(200) | NOT NULL |
| message | TEXT | NOT NULL |
| request_id | UUID | FK → requests.id, NULLABLE |
| request_code | VARCHAR(20) | NULLABLE |
| is_read | BOOLEAN | DEFAULT false |
| is_email_sent | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT now() |

### notification_preferences

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| user_id | UUID | FK → users.id, UNIQUE |
| in_app_enabled | BOOLEAN | DEFAULT true |
| email_enabled | BOOLEAN | DEFAULT true |
| sound_enabled | BOOLEAN | DEFAULT true |
| types_disabled | JSONB | DEFAULT '[]' |

---

## Notification Event Types

| Event Type | Target User | Trigger |
|------------|-------------|---------|
| REQUEST_CREATED | Sales | Agent submits a new request |
| REQUEST_APPROVED | Agent | Sales approves request |
| REQUEST_REJECTED | Agent | Sales rejects request |
| COUNTER_OFFERED | Agent | Sales sends counter offer |
| SENT_TO_RM | Sales | Request forwarded to RM |
| EMAIL_RECEIVED | Sales | RM replies via email |
| NEW_MESSAGE | Agent/Sales | New chat message received |
| SLA_WARNING | Sales | SLA deadline approaching (< 2 hrs) |
| SLA_BREACHED | Sales/Admin | SLA deadline passed |
| REQUEST_ASSIGNED | Sales | Request assigned to sales person |

---

## SLA Configuration

| Request Status | SLA Deadline |
|----------------|-------------|
| submitted | 4 hours (to start review) |
| under_review | 8 hours (to take action) |
| rm_pending | 24 hours (expected RM response) |

### SLA Color Coding

| Time Remaining | Color | Label |
|----------------|-------|-------|
| > 50% | Green | On Track |
| 25-50% | Yellow | Attention |
| < 25% | Orange | Urgent |
| Breached | Red | Overdue |

---

## Acceptance Criteria

- [ ] Notifications auto-generate on all defined trigger events
- [ ] Notification bell shows correct unread count
- [ ] Dropdown shows recent notifications grouped by time
- [ ] Click on notification navigates to relevant request
- [ ] Mark as read updates count and visual state
- [ ] Mark all read clears all unread notifications
- [ ] Real-time notifications arrive via WebSocket
- [ ] Toast popup appears for high-priority notifications
- [ ] SLA timers display on request cards and detail pages
- [ ] SLA warnings trigger at correct thresholds
- [ ] Email alerts sent for critical events (approval, rejection)
- [ ] Notification preferences respected per user

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Notification overload | Rate limiting, grouping similar notifications |
| WebSocket disconnections | Fall back to polling, reconnect logic |
| SLA calculation errors | Use server time only, test edge cases |
| Email alert spam | Respect user preferences, batch similar alerts |

---

## Definition of Done

- All notification event types triggering correctly
- Real-time delivery via WebSocket working
- Notification UI complete (bell, dropdown, full page)
- SLA tracking and visual indicators working
- Email alerts for critical events
- Notification preferences configurable
- Toast notifications for high-priority events
