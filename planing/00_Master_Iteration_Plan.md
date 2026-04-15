# Salam Air SmartDeal Platform - Master Iteration Plan

## Project Overview

A centralized B2B aviation deal management platform replacing email-based workflows with structured, intelligent deal processing. Built with **FastAPI** (backend) + **React** (frontend) + **PostgreSQL** + **Redis**.

---

## Iteration Roadmap

```
Phase 1: MVP (Iterations 1-4)        ━━━━━━━━━━━━━━━━━━━━ 8 Weeks
Phase 2: Communication (Iter 5-6)    ━━━━━━━━━━━ 3 Weeks
Phase 3: Insights (Iterations 7-8)   ━━━━━━━━━━━ 3 Weeks
Phase 4: Advanced (Iterations 9-10)  ━━━━━━━━━━━━━━━━ 4 Weeks
                                     ─────────────────────────────
                                     Total: ~18 Weeks (4.5 Months)
```

---

## Iteration Summary

| # | Iteration | Duration | Priority | Phase | Depends On |
|---|-----------|----------|----------|-------|------------|
| 1 | [Foundation & Authentication](./Iteration_1_Foundation_and_Authentication.md) | 2 Weeks | CRITICAL | MVP | - |
| 2 | [Request Management](./Iteration_2_Request_Management.md) | 2 Weeks | CRITICAL | MVP | Iter 1 |
| 3 | [Sales Workflow & Review](./Iteration_3_Sales_Workflow.md) | 2 Weeks | HIGH | MVP | Iter 2 |
| 4 | [Email Integration](./Iteration_4_Email_Integration.md) | 2 Weeks | CRITICAL | MVP | Iter 3 |
| 5 | [Communication & Messaging](./Iteration_5_Communication_and_Messaging.md) | 2 Weeks | HIGH | Communication | Iter 4 |
| 6 | [Notification System](./Iteration_6_Notification_System.md) | 1 Week | HIGH | Communication | Iter 5 |
| 7 | [Analytics & Reporting](./Iteration_7_Analytics_and_Reporting.md) | 2 Weeks | MEDIUM | Insights | Iter 6 |
| 8 | [Admin Module](./Iteration_8_Admin_Module.md) | 1 Week | MEDIUM | Insights | Iter 7 |
| 9 | [Advanced Features](./Iteration_9_Advanced_Features.md) | 2 Weeks | MEDIUM | Advanced | Iter 8 |
| 10 | [AI Features & Optimization](./Iteration_10_AI_Features_and_Optimization.md) | 2 Weeks | LOW | Advanced | Iter 9 |

---

## Phase Breakdown

### Phase 1: MVP (Iterations 1-4) - 8 Weeks

The minimum viable product that delivers core value. After Phase 1, agents can create requests, sales can review them, and emails are sent to/from RM.

**Deliverables:**
- User authentication with role-based access
- Complete request lifecycle (create, review, approve/reject)
- File upload and attachments
- Sales review queue with actions
- Email integration with RM (send, capture replies)
- Basic dashboards for agents and sales

**MVP Users:** Agents, Sales Support, Revenue Management (via email)

---

### Phase 2: Communication (Iterations 5-6) - 3 Weeks

Adds real-time communication and keeps users informed automatically.

**Deliverables:**
- Unified message timeline (chat + email + system messages)
- Real-time WebSocket messaging
- In-app notification system
- SLA tracking and warnings
- Email alerts for critical events

---

### Phase 3: Insights (Iterations 7-8) - 3 Weeks

Provides visibility and control over the platform.

**Deliverables:**
- Analytics dashboards (KPIs, trends, revenue)
- Agent performance metrics
- Admin panel (user/agent management)
- System logs and audit trail
- System configuration management

---

### Phase 4: Advanced (Iterations 9-10) - 4 Weeks

Enhances efficiency and adds intelligence.

**Deliverables:**
- SLA tracking with visual timers
- Auto-reminders for stale requests
- Bulk upload from Excel
- Tagging and smart search
- AI pricing suggestions
- Email summarization
- Performance optimization

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), Tailwind CSS, Zustand |
| Backend | Python FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Cache | Redis |
| Background Jobs | Celery + Redis |
| Real-time | WebSockets (FastAPI) |
| File Storage | S3 / Local |
| Email | SMTP / Microsoft Graph API |
| AI | Rule-based → ML → OpenAI (phased) |
| Deployment | Docker, GitHub Actions, AWS/Railway |

---

## Database Tables (All Iterations)

| Table | Iteration | Description |
|-------|-----------|-------------|
| users | 1 | User accounts and authentication |
| agent_profiles | 2 | Agent company details and credit limits |
| requests | 2 | Fare requests with status lifecycle |
| attachments | 2 | File uploads linked to requests |
| request_history | 3 | Audit trail of all request actions |
| counter_offers | 3 | Counter pricing from sales |
| email_threads | 4 | Email conversation threads per request |
| email_messages | 4 | Individual email messages |
| email_attachments | 4 | Files attached to emails |
| messages | 5 | Unified chat/email/system messages |
| message_attachments | 5 | Files shared in chat |
| message_read_status | 5 | Per-user read tracking |
| notifications | 6 | In-app notification records |
| notification_preferences | 6 | User notification settings |
| analytics_snapshots | 7 | Pre-computed analytics data |
| system_logs | 8 | Admin activity audit log |
| system_config | 8 | Platform configuration settings |
| tags | 9 | Reusable request tags |
| request_tags | 9 | Tag-to-request associations |
| sla_tracking | 9 | SLA deadline tracking |
| reminder_config | 9 | Auto-reminder rules |

---

## API Endpoint Summary

### Iteration 1 - Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Iteration 2 - Requests
- `POST /api/v1/requests`
- `GET /api/v1/requests`
- `GET /api/v1/requests/{id}`
- `PUT /api/v1/requests/{id}`
- `POST /api/v1/requests/{id}/attachments`
- `GET /api/v1/requests/{id}/attachments`

### Iteration 3 - Sales
- `GET /api/v1/sales/queue`
- `PUT /api/v1/requests/{id}/status`
- `POST /api/v1/requests/{id}/counter`
- `POST /api/v1/requests/{id}/send-to-rm`
- `PUT /api/v1/requests/{id}/assign`
- `POST /api/v1/requests/{id}/notes`
- `GET /api/v1/requests/{id}/history`

### Iteration 4 - Email
- `POST /api/v1/email/send`
- `GET /api/v1/email/thread/{request_id}`
- `POST /api/v1/email/reply`
- `POST /api/v1/email/poll-inbox` (IMAP: fetch RM replies; see `planing/Email_SMTP_IMAP_Configuration.md`)

### Iteration 5 - Messages
- `POST /api/v1/messages`
- `GET /api/v1/messages/{request_id}`
- `WS /api/v1/ws/{request_id}`

### Iteration 6 - Notifications
- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PUT /api/v1/notifications/{id}/read`
- `PUT /api/v1/notifications/read-all`

### Iteration 7 - Analytics
- `GET /api/v1/analytics/kpis`
- `GET /api/v1/analytics/agent-performance`
- `GET /api/v1/analytics/revenue`
- `GET /api/v1/analytics/request-trends`
- `GET /api/v1/analytics/city-breakdown`
- `GET /api/v1/analytics/export`

### Iteration 8 - Admin
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `PUT /api/v1/admin/users/{id}`
- `PUT /api/v1/admin/users/{id}/deactivate`
- `GET /api/v1/admin/agents`
- `PUT /api/v1/admin/agents/{id}`
- `GET /api/v1/admin/logs`
- `GET/PUT /api/v1/admin/config`
- `GET /api/v1/admin/stats`

### Iteration 9 - Advanced
- `GET /api/v1/sla/dashboard`
- `GET /api/v1/sla/requests/{id}`
- `POST /api/v1/requests/bulk-upload`
- `POST /api/v1/requests/bulk-preview`
- `GET /api/v1/search`
- `POST /api/v1/tags`
- `GET /api/v1/tags`
- `POST /api/v1/requests/{id}/tags`

### Iteration 10 - AI
- `GET /api/v1/ai/price-suggestion`
- `POST /api/v1/ai/summarize-email`
- `POST /api/v1/ai/smart-reply`
- `GET /api/v1/ai/risk-alerts`
- `POST /api/v1/ai/feedback`

---

## User Roles & Access Matrix

| Feature | Agent | Sales | Admin |
|---------|-------|-------|-------|
| Create Request | Yes | No | No |
| View Own Requests | Yes | No | Yes |
| View All Requests | No | Yes | Yes |
| Review/Approve/Reject | No | Yes | No |
| Send to RM | No | Yes | No |
| Chat Messaging | Yes | Yes | No |
| View Analytics | Own only | All | All |
| Manage Users | No | No | Yes |
| System Config | No | No | Yes |
| View Logs | No | No | Yes |

---

## Risk Summary

| Category | Key Risk | Mitigation |
|----------|----------|------------|
| Technical | Email parsing failures | Strict REQ ID format, fallback matching |
| Technical | WebSocket stability | Auto-reconnect, polling fallback |
| Performance | Slow queries at scale | Indexing, caching, async processing |
| Business | Low user adoption | Simple UI, gradual rollout, training |
| Security | Unauthorized access | JWT + RBAC, input validation, rate limiting |
| Operations | RM email delays | Auto-reminders, escalation rules |

---

## Success Metrics

| Metric | Target | Measured After |
|--------|--------|---------------|
| Avg response time (request) | < 4 hours | Phase 1 |
| Deal approval rate | > 65% | Phase 1 |
| Email reduction | > 50% | Phase 2 |
| Platform adoption | > 80% agents | Phase 2 |
| Requests processed/day | > 200 | Phase 3 |
| System uptime | > 99.5% | All Phases |
