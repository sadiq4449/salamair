# Iteration 2: Request Management (Core Module)

## Duration: Sprint 3-4 (2 Weeks)

## Priority: CRITICAL (Core business logic)

## Depends On: Iteration 1 (Authentication & Foundation)

---

## Objective

Build the core request management system that allows agents to create, edit, track fare requests and upload supporting documents.

---

## Scope

### Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 2.1 | Request Model | Create `requests` table with all fields and status lifecycle | Pending |
| 2.2 | Attachment Model | Create `attachments` table for file storage references | Pending |
| 2.3 | Agent Profile Model | Create `agent_profiles` table with company details, credit limits | Pending |
| 2.4 | REQ ID Generator | Auto-generate unique request codes (e.g., REQ-1001, REQ-1002...) | Pending |
| 2.5 | Create Request API | `POST /api/v1/requests` - Full request creation with validation | Pending |
| 2.6 | Save Draft API | `POST /api/v1/requests` with status=draft (partial data allowed) | Pending |
| 2.7 | List Requests API | `GET /api/v1/requests` with filters (status, agent_id, route, date) | Pending |
| 2.8 | Get Request Detail API | `GET /api/v1/requests/{id}` - Full details with agent info | Pending |
| 2.9 | Update Request API | `PUT /api/v1/requests/{id}` - Edit draft/submitted requests | Pending |
| 2.10 | File Upload API | `POST /api/v1/requests/{id}/attachments` - Upload PDF/Excel | Pending |
| 2.11 | List Attachments API | `GET /api/v1/requests/{id}/attachments` | Pending |
| 2.12 | Status Lifecycle | Enforce valid status transitions (Draft → Submitted → ...) | Pending |
| 2.13 | Pagination | Implement offset/limit pagination for list endpoints | Pending |
| 2.14 | Search & Filter | Filter by status, agent, route, date range | Pending |
| 2.15 | File Storage | Configure S3 or local file storage for uploads | Pending |

### Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 2.16 | Request Store | State management for requests (list, detail, create) | Pending |
| 2.17 | Create Request Form | Multi-field form: route, pax, price, travel dates, notes | Pending |
| 2.18 | Form Validation | Client-side validation for required fields | Pending |
| 2.19 | Save Draft Button | Save incomplete request as draft | Pending |
| 2.20 | Request List Page | Table view with columns: REQ ID, Route, Status, Date, Actions | Pending |
| 2.21 | Request Filters | Filter bar: status dropdown, route search, date picker | Pending |
| 2.22 | Request Detail Page | Full request view with status badge, details, timeline | Pending |
| 2.23 | File Upload UI | Drag-and-drop or file picker for PDF/Excel uploads | Pending |
| 2.24 | Status Badge Component | Color-coded status indicators | Pending |
| 2.25 | Agent Dashboard | Stats cards (total, pending, approved, rejected) + recent requests | Pending |
| 2.26 | Pagination Component | Page navigation for request list | Pending |
| 2.27 | Empty States | UI for no requests found, no drafts, etc. | Pending |

---

## API Contracts (This Iteration)

### POST /api/v1/requests

**Request:**
```json
{
  "route": "KHI → DXB",
  "pax": 2,
  "price": 50000,
  "travel_date": "2026-05-15",
  "return_date": "2026-05-22",
  "notes": "Group booking for corporate client",
  "is_draft": false
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "request_code": "REQ-1023",
  "route": "KHI → DXB",
  "pax": 2,
  "price": 50000,
  "travel_date": "2026-05-15",
  "return_date": "2026-05-22",
  "notes": "Group booking for corporate client",
  "status": "submitted",
  "agent": {
    "id": "uuid",
    "name": "Ali Khan"
  },
  "created_at": "2026-04-14T10:00:00Z"
}
```

### GET /api/v1/requests

**Query Params:**
```
?status=submitted&agent_id=uuid&route=KHI&page=1&limit=20
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
      "created_at": "2026-04-14T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

### GET /api/v1/requests/{id}

**Response (200):**
```json
{
  "id": "uuid",
  "request_code": "REQ-1023",
  "route": "KHI → DXB",
  "pax": 2,
  "price": 50000,
  "travel_date": "2026-05-15",
  "return_date": "2026-05-22",
  "notes": "Group booking for corporate client",
  "status": "under_review",
  "agent": {
    "id": "uuid",
    "name": "Ali Khan",
    "company": "Sky Travels"
  },
  "attachments": [
    {
      "id": "uuid",
      "filename": "booking_details.pdf",
      "url": "/files/booking_details.pdf",
      "uploaded_at": "2026-04-14T10:05:00Z"
    }
  ],
  "created_at": "2026-04-14T10:00:00Z",
  "updated_at": "2026-04-14T10:30:00Z"
}
```

### POST /api/v1/requests/{id}/attachments

**Request:** `multipart/form-data` with file field

**Response (201):**
```json
{
  "id": "uuid",
  "filename": "booking_details.pdf",
  "url": "/files/booking_details.pdf",
  "uploaded_at": "2026-04-14T10:05:00Z"
}
```

---

## Database Schema

### requests

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| request_code | VARCHAR(20) | UNIQUE, NOT NULL |
| agent_id | UUID | FK → users.id |
| route | VARCHAR(100) | NOT NULL |
| pax | INTEGER | NOT NULL |
| price | DECIMAL(12,2) | NOT NULL |
| travel_date | DATE | NULLABLE |
| return_date | DATE | NULLABLE |
| notes | TEXT | NULLABLE |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'draft' |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

### attachments

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| request_id | UUID | FK → requests.id |
| filename | VARCHAR(255) | NOT NULL |
| file_url | VARCHAR(500) | NOT NULL |
| file_type | VARCHAR(50) | NOT NULL |
| file_size | INTEGER | NOT NULL |
| uploaded_at | TIMESTAMP | DEFAULT now() |

### agent_profiles

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| user_id | UUID | FK → users.id, UNIQUE |
| company_name | VARCHAR(200) | NULLABLE |
| credit_limit | DECIMAL(12,2) | NULLABLE |
| contact_phone | VARCHAR(20) | NULLABLE |
| address | TEXT | NULLABLE |

---

## Status Lifecycle

```
draft → submitted → under_review → rm_pending → approved
                                              → rejected
                                              → counter_offered
```

Valid transitions:
- `draft` → `submitted` (Agent submits)
- `submitted` → `under_review` (Sales picks up)
- `under_review` → `rm_pending` (Sales sends to RM)
- `under_review` → `approved` (Sales approves directly)
- `under_review` → `rejected` (Sales rejects)
- `under_review` → `counter_offered` (Sales counters)
- `rm_pending` → `approved` (After RM response)
- `rm_pending` → `rejected` (After RM response)
- `counter_offered` → `submitted` (Agent re-submits)

---

## Acceptance Criteria

- [ ] Agent can create a new request with all required fields
- [ ] System generates unique REQ ID automatically
- [ ] Agent can save incomplete request as draft
- [ ] Agent can edit and resubmit draft requests
- [ ] Request list shows with pagination and filters
- [ ] Request detail page shows all information
- [ ] File upload works for PDF and Excel files
- [ ] Invalid status transitions are rejected with error
- [ ] Dashboard shows correct statistics
- [ ] Empty states display when no data exists
- [ ] Agent can only see their own requests

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large file uploads | Set max file size limit (10MB), validate file types |
| Concurrent status updates | Use DB-level locking on status transitions |
| REQ ID collisions | Use DB sequence for auto-increment |

---

## Definition of Done

- All CRUD operations tested end-to-end
- File upload/download works correctly
- Status transitions validated and enforced
- Pagination working with correct counts
- Dashboard stats accurate
- Responsive UI on desktop
