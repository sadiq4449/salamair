# Iteration 9: Advanced Features

## Duration: Sprint 15-16 (2 Weeks)

## Priority: MEDIUM

## Depends On: Iteration 8 (Admin Module)

---

## Objective

Implement advanced features that enhance platform efficiency: SLA tracking with visual timers, auto-reminders, bulk request upload via Excel, tagging system, and smart search capabilities.

---

## Scope

### Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 9.1 | Enhanced SLA Service | Full SLA tracking with configurable deadlines per status | Done (DB `sla_tracking` + sync on transitions; `counter_offered` SLA window) |
| 9.2 | SLA Dashboard API | `GET /api/v1/sla/dashboard` - SLA compliance overview | Done |
| 9.3 | SLA History API | `GET /api/v1/sla/requests/{id}` - SLA timeline per request | Done |
| 9.4 | Auto Reminder Service | Celery task to send reminders for stale requests | Done (scan via `POST /api/v1/admin/reminders/run`; no Celery in repo) |
| 9.5 | Reminder Config API | `GET/PUT /api/v1/admin/reminders` - Configure reminder rules | Done |
| 9.6 | Bulk Upload API | `POST /api/v1/requests/bulk-upload` - Upload Excel to create multiple requests | Done |
| 9.7 | Excel Parser Service | Parse Excel file, validate rows, return preview | Done |
| 9.8 | Bulk Upload Preview API | `POST /api/v1/requests/bulk-preview` - Preview before confirming | Done |
| 9.9 | Tags Model | Create `tags` and `request_tags` tables | Done |
| 9.10 | Create Tag API | `POST /api/v1/tags` - Create reusable tags | Done |
| 9.11 | Tag Request API | `POST /api/v1/requests/{id}/tags` - Add tags to request | Done |
| 9.12 | List Tags API | `GET /api/v1/tags` - All available tags | Done |
| 9.13 | Smart Search API | `GET /api/v1/search` - Global search across requests, agents, messages | Done |
| 9.14 | Search Indexing | Build search indexes for fast lookups | Partial (DB `ilike` + indexes on existing columns; no Elasticsearch) |
| 9.15 | Reminder Email Templates | HTML templates for different reminder types | Partial (inline HTML in SMTP body; no separate template files) |
| 9.16 | Bulk Upload Validation | Validate route codes, date formats, price ranges | Done |

### Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 9.17 | SLA Timer Component | Countdown timer on request cards with color coding | Done (list + detail; existing `SlaIndicator`) |
| 9.18 | SLA Dashboard Page | Compliance metrics, overdue requests, SLA trends | Done (`/sla-dashboard`) |
| 9.19 | Bulk Upload Page | Excel upload zone, preview table, confirm button | Done (`/bulk-upload`) |
| 9.20 | Excel Template Download | Downloadable template with correct column headers | Done (`GET /requests/bulk-template`) |
| 9.21 | Bulk Upload Preview Table | Show parsed rows with validation status per row | Done |
| 9.22 | Bulk Upload Progress | Progress bar during bulk creation | Partial (button loading state; no multi-step bar) |
| 9.23 | Tag Management UI | Create, edit, delete tags with color picker | Partial (create/delete + color; no edit name) |
| 9.24 | Tag Input Component | Autocomplete tag input on request forms/detail | Partial (`RequestTagsEditor` checkboxes) |
| 9.25 | Tag Filter | Filter requests by tags in list view | Done (agent list; `tag_ids` query) |
| 9.26 | Global Search Bar | Search input in header with instant results dropdown | Done |
| 9.27 | Search Results Page | Full search results grouped by type (requests, agents) | Done (`/search`) |
| 9.28 | Recent Searches | Show recent search history | Done (localStorage in `GlobalSearchBar`) |
| 9.29 | Reminder Settings UI | Configure reminder intervals in admin panel | Done (`/admin/reminders`) |

---

## API Contracts (This Iteration)

### POST /api/v1/requests/bulk-upload

**Request:** `multipart/form-data` with Excel file

**Response (200):**
```json
{
  "message": "Bulk upload completed",
  "total_rows": 25,
  "created": 22,
  "failed": 3,
  "results": [
    { "row": 1, "request_code": "REQ-1050", "status": "created" },
    { "row": 2, "request_code": "REQ-1051", "status": "created" },
    { "row": 5, "status": "failed", "error": "Invalid route format" }
  ]
}
```

### POST /api/v1/requests/bulk-preview

**Request:** `multipart/form-data` with Excel file

**Response (200):**
```json
{
  "total_rows": 25,
  "valid_rows": 22,
  "invalid_rows": 3,
  "preview": [
    { "row": 1, "route": "KHI → DXB", "pax": 2, "price": 50000, "valid": true },
    { "row": 2, "route": "LHE → ISB", "pax": 5, "price": 30000, "valid": true },
    { "row": 5, "route": "", "pax": 2, "price": 50000, "valid": false, "errors": ["Route is required"] }
  ]
}
```

### GET /api/v1/search

**Query Params:**
```
?q=REQ-1023&type=all&page=1&limit=20
```

**Response (200):**
```json
{
  "query": "REQ-1023",
  "results": {
    "requests": [
      {
        "id": "uuid",
        "request_code": "REQ-1023",
        "route": "KHI → DXB",
        "status": "approved",
        "highlight": "**REQ-1023** - KHI → DXB"
      }
    ],
    "agents": [],
    "messages": [
      {
        "id": "uuid",
        "request_code": "REQ-1023",
        "content": "...discussing REQ-1023 pricing...",
        "highlight": "...discussing **REQ-1023** pricing..."
      }
    ]
  },
  "total": 3
}
```

### POST /api/v1/tags

**Request:**
```json
{
  "name": "Urgent",
  "color": "#FF4444"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Urgent",
  "color": "#FF4444",
  "usage_count": 0
}
```

### POST /api/v1/requests/{id}/tags

**Request:**
```json
{
  "tag_ids": ["uuid-1", "uuid-2"]
}
```

**Response (200):**
```json
{
  "message": "Tags updated",
  "tags": [
    { "id": "uuid-1", "name": "Urgent", "color": "#FF4444" },
    { "id": "uuid-2", "name": "Corporate", "color": "#4488FF" }
  ]
}
```

### GET /api/v1/sla/dashboard

**Response (200):**
```json
{
  "compliance_rate": 85.5,
  "total_tracked": 200,
  "on_track": 150,
  "at_risk": 30,
  "breached": 20,
  "overdue_requests": [
    {
      "request_code": "REQ-1015",
      "status": "under_review",
      "sla_deadline": "2026-04-13T18:00:00Z",
      "overdue_hours": 12.5,
      "assigned_to": "Sadiq (Sales)"
    }
  ]
}
```

---

## Database Schema

### tags

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| name | VARCHAR(50) | UNIQUE, NOT NULL |
| color | VARCHAR(7) | DEFAULT '#6B7280' |
| created_by | UUID | FK → users.id |
| created_at | TIMESTAMP | DEFAULT now() |

### request_tags

| Column | Type | Constraints |
|--------|------|-------------|
| request_id | UUID | FK → requests.id |
| tag_id | UUID | FK → tags.id |
| PRIMARY KEY | | (request_id, tag_id) |

### sla_tracking

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| request_id | UUID | FK → requests.id |
| status | VARCHAR(20) | NOT NULL |
| started_at | TIMESTAMP | NOT NULL |
| deadline_at | TIMESTAMP | NOT NULL |
| completed_at | TIMESTAMP | NULLABLE |
| is_breached | BOOLEAN | DEFAULT false |

### reminder_config

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| trigger_status | VARCHAR(20) | NOT NULL |
| delay_hours | INTEGER | NOT NULL |
| reminder_type | VARCHAR(20) | email/in_app/both |
| message_template | TEXT | NOT NULL |
| is_active | BOOLEAN | DEFAULT true |

---

## Excel Template Format

| Route | PAX | Price | Travel Date | Return Date | Notes |
|-------|-----|-------|-------------|-------------|-------|
| KHI → DXB | 2 | 50000 | 2026-05-15 | 2026-05-22 | Group booking |
| LHE → ISB | 5 | 30000 | 2026-05-20 | | One-way trip |

---

## Auto Reminder Rules

| Trigger | Delay | Action |
|---------|-------|--------|
| Request submitted, no review | 4 hours | Email + in-app to Sales |
| Under review, no action | 6 hours | In-app reminder to assigned Sales |
| Sent to RM, no reply | 24 hours | Email reminder to RM |
| Sent to RM, no reply | 48 hours | Escalation email to RM + Sales manager |
| Counter offered, no agent response | 24 hours | Email to Agent |

---

## Acceptance Criteria

- [ ] SLA timers display correctly on all request views
- [ ] SLA dashboard shows compliance metrics
- [ ] Overdue requests highlighted visually
- [ ] Auto reminders trigger at configured intervals
- [ ] Reminder emails sent to correct recipients
- [ ] Bulk upload accepts valid Excel files
- [ ] Preview shows parsed data with validation errors
- [ ] Bulk creation handles partial failures gracefully
- [ ] Tags can be created with custom colors
- [ ] Tags can be assigned/removed from requests
- [ ] Request list filterable by tags
- [ ] Global search returns results across all entities
- [ ] Search results highlight matching terms
- [ ] Search is responsive (< 500ms)
- [ ] Excel template downloadable from UI

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large Excel file crashes parser | Set row limit (max 500), async processing |
| Search performance on large datasets | Database indexing, consider Elasticsearch later |
| Reminder spam | Rate limiting per request, de-duplication |
| SLA calculation timezone issues | Store all times in UTC, convert for display |

---

## Definition of Done

- SLA tracking visual and functional
- Auto reminders triggering correctly
- Bulk upload creates requests from Excel
- Tagging system fully operational
- Global search works across entities
- All features integrated into existing UI
- Performance acceptable under load
