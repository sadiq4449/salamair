# Iteration 8: Admin Module

## Duration: Sprint 14 (1 Week)

## Priority: MEDIUM

## Depends On: Iteration 7 (Analytics & Reporting)

---

## Objective

Build a comprehensive admin module for managing users, agent profiles, roles, system configurations, and activity logs to ensure platform governance and operational control.

---

## Scope

### Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 8.1 | List Users API | `GET /api/v1/admin/users` - Paginated user list with filters | Pending |
| 8.2 | Create User API | `POST /api/v1/admin/users` - Admin creates new user account | Pending |
| 8.3 | Update User API | `PUT /api/v1/admin/users/{id}` - Edit user details and role | Pending |
| 8.4 | Deactivate User API | `PUT /api/v1/admin/users/{id}/deactivate` | Pending |
| 8.5 | Get Agent Profiles API | `GET /api/v1/admin/agents` - List agent profiles with details | Pending |
| 8.6 | Update Agent Profile API | `PUT /api/v1/admin/agents/{id}` - Edit company, credit limit | Pending |
| 8.7 | System Logs API | `GET /api/v1/admin/logs` - Activity audit log | Pending |
| 8.8 | System Log Model | Create `system_logs` table for all admin actions | Pending |
| 8.9 | Activity Logger Middleware | Auto-log all admin actions with actor, target, details | Pending |
| 8.10 | System Config API | `GET/PUT /api/v1/admin/config` - Manage system settings | Pending |
| 8.11 | Role Management | Validate role assignments, prevent role conflicts | Pending |
| 8.12 | Password Reset API | `POST /api/v1/admin/users/{id}/reset-password` | Pending |
| 8.13 | Admin Dashboard Stats API | `GET /api/v1/admin/stats` - System health overview | Pending |

### Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 8.14 | Admin Layout | Admin panel with sidebar navigation (Users, Agents, Logs, Config) | Pending |
| 8.15 | User Management Page | Table: Name, Email, Role, Status, Actions | Pending |
| 8.16 | Create User Form | Modal/page form with validation | Pending |
| 8.17 | Edit User Form | Pre-filled form for editing user details | Pending |
| 8.18 | Deactivate User Confirmation | Confirm dialog before deactivation | Pending |
| 8.19 | Agent Profiles Page | Table: Agent, Company, City, Credit Limit, Requests Count | Pending |
| 8.20 | Edit Agent Profile Form | Edit company details, credit limits | Pending |
| 8.21 | System Logs Page | Filterable log table with timestamp, actor, action, details | Pending |
| 8.22 | Log Filters | Filter by date range, actor, action type | Pending |
| 8.23 | System Config Page | Key-value settings editor | Pending |
| 8.24 | Admin Dashboard | System health: active users, requests today, system uptime | Pending |
| 8.25 | Role Badge Component | Color-coded role badges (Agent=blue, Sales=green, Admin=red) | Pending |

---

## API Contracts (This Iteration)

### GET /api/v1/admin/users

**Query Params:**
```
?role=agent&is_active=true&search=ali&page=1&limit=20
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Ali Khan",
      "email": "ali@agent.com",
      "role": "agent",
      "city": "Karachi",
      "is_active": true,
      "created_at": "2026-03-01T10:00:00Z",
      "last_login": "2026-04-14T09:30:00Z"
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 20
}
```

### POST /api/v1/admin/users

**Request:**
```json
{
  "name": "New Agent",
  "email": "new@agent.com",
  "password": "temppass123",
  "role": "agent",
  "city": "Lahore"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "New Agent",
  "email": "new@agent.com",
  "role": "agent",
  "city": "Lahore",
  "is_active": true,
  "created_at": "2026-04-14T15:00:00Z"
}
```

### PUT /api/v1/admin/users/{id}

**Request:**
```json
{
  "name": "Updated Name",
  "role": "sales",
  "city": "Dubai"
}
```

**Response (200):**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "uuid",
    "name": "Updated Name",
    "role": "sales",
    "city": "Dubai"
  }
}
```

### GET /api/v1/admin/logs

**Query Params:**
```
?action=user_created&actor_id=uuid&from=2026-04-01&to=2026-04-14&page=1&limit=50
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "action": "user_created",
      "actor": {
        "id": "uuid",
        "name": "Admin User",
        "role": "admin"
      },
      "target": {
        "type": "user",
        "id": "uuid",
        "name": "New Agent"
      },
      "details": "Created new agent account",
      "ip_address": "192.168.1.100",
      "timestamp": "2026-04-14T15:00:00Z"
    }
  ],
  "total": 350,
  "page": 1,
  "limit": 50
}
```

### GET /api/v1/admin/stats

**Response (200):**
```json
{
  "total_users": 150,
  "active_users_today": 45,
  "total_agents": 120,
  "total_sales": 25,
  "total_admins": 5,
  "requests_today": 38,
  "pending_requests": 12,
  "emails_sent_today": 25,
  "system_uptime": "99.8%"
}
```

---

## Database Schema

### system_logs

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| action | VARCHAR(50) | NOT NULL |
| actor_id | UUID | FK → users.id |
| target_type | VARCHAR(50) | NULLABLE (user, request, config) |
| target_id | UUID | NULLABLE |
| details | TEXT | NULLABLE |
| ip_address | VARCHAR(45) | NULLABLE |
| user_agent | VARCHAR(500) | NULLABLE |
| created_at | TIMESTAMP | DEFAULT now() |

**Indexes:** (created_at), (actor_id), (action)

### system_config

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| key | VARCHAR(100) | UNIQUE, NOT NULL |
| value | TEXT | NOT NULL |
| description | VARCHAR(500) | NULLABLE |
| updated_by | UUID | FK → users.id |
| updated_at | TIMESTAMP | DEFAULT now() |

---

## Log Action Types

| Action | Description |
|--------|-------------|
| user_created | Admin created a new user |
| user_updated | Admin updated user details |
| user_deactivated | Admin deactivated a user |
| user_reactivated | Admin reactivated a user |
| role_changed | User role was changed |
| password_reset | Admin reset user password |
| config_updated | System configuration changed |
| agent_profile_updated | Agent profile details changed |

---

## System Configuration Keys

| Key | Default | Description |
|-----|---------|-------------|
| sla_submitted_hours | 4 | SLA for submitted requests |
| sla_review_hours | 8 | SLA for under-review requests |
| sla_rm_hours | 24 | SLA for RM pending requests |
| email_polling_interval | 120 | Email poll interval in seconds |
| max_file_size_mb | 10 | Max upload file size |
| allowed_file_types | pdf,xlsx,docx | Allowed upload types |
| rm_email_address | rm@salamair.com | Default RM email |

---

## Acceptance Criteria

- [ ] Admin can list all users with filters (role, status, search)
- [ ] Admin can create new users with role assignment
- [ ] Admin can edit existing user details
- [ ] Admin can deactivate/reactivate users
- [ ] Admin can view and edit agent profiles
- [ ] System logs capture all admin actions
- [ ] Logs are filterable by date, actor, action type
- [ ] System configuration is editable through UI
- [ ] Admin dashboard shows system health metrics
- [ ] Only users with "admin" role can access admin endpoints
- [ ] Password reset sends new credentials to user
- [ ] All admin actions are logged with IP and timestamp

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Accidental user deactivation | Confirmation dialog, cannot deactivate own account |
| Config changes break system | Validation on config values, rollback option |
| Log table growing too large | Partition by month, archive old logs |
| Admin privilege escalation | Cannot create admin role without super-admin |

---

## Definition of Done

- Full user CRUD working with proper validation
- Agent profile management complete
- System logs recording all admin actions
- Configuration management UI functional
- Admin dashboard accurate
- Role-based access strictly enforced
- All admin actions logged with audit trail
