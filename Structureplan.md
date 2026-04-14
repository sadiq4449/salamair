# ✈️ Salam Air SmartDeal Platform

## 📘 Full Product & Technical Plan (Markdown Document)

---

# 🧭 1. PRODUCT VISION

## 🎯 Objective

Build a **B2B Aviation Deal Management Platform** to replace unstructured email workflows with a centralized, intelligent system.

## 💡 Value Proposition

* Reduce negotiation time by **70%+**
* Centralize all communications
* Improve pricing decisions with data & AI
* Maintain **email-based workflow for Revenue Management (RM)**

---

# 🧱 2. SYSTEM OVERVIEW

## High-Level Architecture

```
Frontend (React)
        ↓
API Layer (FastAPI)
        ↓
Core Services Layer
        ↓
Infrastructure (DB, Email, Cache, Storage)
```

---

# 🏗️ 3. TECHNICAL ARCHITECTURE

## Frontend

* React (Vite / Next.js)
* Tailwind CSS
* State: Zustand / Redux Toolkit
* API: Axios
* Realtime: WebSocket

## Backend

* Python (FastAPI)
* Async support (important for email + notifications)

## Infrastructure

* PostgreSQL (primary DB)
* Redis (cache + queues)
* Celery (background jobs)
* S3 (file storage)
* Nginx (reverse proxy)

---

# 🧩 4. CORE MODULES

---

## 4.1 Agent Module

### Features:

* Dashboard (stats + recent requests)
* Create request
* Upload documents
* Track status
* Communication panel
* Notifications

### Request Flow:

```
Draft → Submitted → Under Review → RM Pending → Approved / Rejected
```

---

## 4.2 Sales Support Module

### Features:

* Request queue
* Filters (agent, city, priority)
* Review request
* Approve / Reject / Counter
* Send to RM (email)
* Nudge RM (reminder)

---

## 4.3 Email Integration (CORE)

### Outgoing:

* Structured email with REQ ID
* Sent via SMTP / Graph API

### Incoming:

* Inbox polling
* REQ ID detection
* Attach to request thread

### Key Feature:

* **Full email thread inside portal**

---

## 4.4 Communication Engine

* Unified timeline (chat + email)
* Role-based messages:

  * Agent
  * Sales
  * RM (email)
* Attachments support

---

## 4.5 AI Intelligence (Phase-wise)

### Phase 1:

* Rule-based pricing hints

### Phase 2:

* AI pricing suggestions
* Email summarization
* Smart reply generation

---

## 4.6 Analytics & Reporting

### Metrics:

* Agent performance
* Approval rate
* Revenue
* Avg negotiation time
* City-level insights

---

## 4.7 Admin Module

### Features:

* User management
* Role assignment
* Agent profiles
* System logs
* Configurations

---

## 4.8 Notification System

* In-app notifications
* Email alerts
* SLA warnings
* Real-time updates (WebSocket)

---

# 🗄️ 5. DATABASE DESIGN (SUMMARY)

## Core Tables:

* `users`
* `agent_profiles`
* `requests`
* `messages`
* `email_threads`
* `attachments`
* `notifications`
* `analytics`
* `system_logs`

---

# 🔌 6. API DESIGN

## Auth

* POST /auth/login
* POST /auth/register

## Requests

* POST /requests
* GET /requests
* GET /requests/{id}
* PUT /requests/{id}

## Messages

* POST /messages
* GET /messages/{request_id}

## Email

* POST /email/send
* GET /email/thread/{request_id}

---

# 🔄 7. SYSTEM WORKFLOW

```
Agent → Create Request
        ↓
Sales → Review
        ↓
Send to RM (Email)
        ↓
RM Reply (Email)
        ↓
System Captures Reply
        ↓
Sales Final Decision
        ↓
Agent Notification
```

---

# ⚙️ 8. BACKGROUND JOBS

Using Celery:

* Email polling
* Email parsing
* Notification dispatch
* SLA tracking
* Analytics aggregation

---

# 🔐 9. SECURITY DESIGN

* JWT authentication
* Role-Based Access Control (RBAC)
* Input validation
* Rate limiting
* File validation & scanning

---

# 📊 10. PERFORMANCE & SCALABILITY

## Expected Load:

* 3000+ agents
* 1000+ requests/day

## Strategy:

* DB indexing
* Redis caching
* Async processing
* Horizontal scaling

---

# 🧪 11. TESTING STRATEGY

## Levels:

* Unit Testing (FastAPI)
* Integration Testing (email flow)
* UI Testing
* Load Testing

---

# 🚀 12. DEVOPS & DEPLOYMENT

## Environments:

* Development
* Staging
* Production

## Tools:

* Docker
* CI/CD (GitHub Actions)
* AWS / Railway

---

# 🗺️ 13. DEVELOPMENT ROADMAP

---

## Phase 1 (MVP)

* Auth system
* Request management
* Email integration (basic)
* Dashboard

---

## Phase 2

* Communication thread
* Notifications
* Analytics

---

## Phase 3

* AI features
* Advanced reporting
* Optimization

---

# 📅 14. SPRINT PLAN

## Sprint 1:

* Auth + DB setup

## Sprint 2:

* Request module

## Sprint 3:

* Email integration

## Sprint 4:

* Dashboard UI

---

# ⚠️ 15. RISKS & MITIGATION

| Risk                 | Solution                 |
| -------------------- | ------------------------ |
| Email parsing errors | Use strict REQ ID format |
| RM not responding    | Reminder system          |
| Performance issues   | Async + caching          |

---

# 💰 16. BUSINESS METRICS

* Deal conversion rate
* Avg negotiation time
* Revenue per agent
* Email reduction %

---

# 💣 FINAL INSIGHT

> This is not just a portal —
> This is a **decision-making + communication system for aviation sales**

---

# 🔥 CORE STRENGTH

* Email + Portal hybrid system
* Structured workflows
* Scalable architecture
* AI-ready foundation

---


---
