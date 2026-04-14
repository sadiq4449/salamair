# ✈️ Salam Air SmartDeal Platform

## 🏗️ Technical Design Document (TDD)

---

# 🧭 1. OVERVIEW

## 🎯 Purpose

This document defines the **technical architecture, system design, and implementation details** for the Salam Air SmartDeal Platform.

## 📌 Scope

* Backend (FastAPI)
* Frontend (React)
* Database (PostgreSQL)
* Email Integration
* AI-ready architecture

---

# 🧱 2. SYSTEM ARCHITECTURE

## 🔹 High-Level Architecture

```text
Client (React)
      ↓
API Gateway (FastAPI)
      ↓
Application Services Layer
      ↓
Database + External Services
```

---

## 🔹 Architecture Style

* Phase 1: Modular Monolith
* Phase 2: Service-Oriented
* Phase 3: Microservices (if needed)

---

# 🖥️ 3. FRONTEND DESIGN

## 🔹 Tech Stack

* React (Vite / Next.js)
* Tailwind CSS
* Zustand / Redux Toolkit
* Axios (API calls)
* WebSocket (real-time)

---

## 🔹 Module Structure

```text
/src
 ├── pages/
 ├── components/
 ├── services/
 ├── store/
 ├── hooks/
```

---

## 🔹 Key UI Modules

* Dashboard
* Request List
* Request Detail (Chat + Email)
* Analytics
* Admin Panel

---

# ⚙️ 4. BACKEND DESIGN

## 🔹 Framework

* FastAPI (async support)

---

## 🔹 Architecture Pattern

* Layered Architecture

```text
API Layer → Service Layer → Repository Layer → DB
```

---

## 🔹 Module Breakdown

### Auth Module

* JWT authentication
* Password hashing
* Role management

---

### Request Module

* Create / update / delete requests
* Status lifecycle
* SLA tracking

---

### Message Module

* Chat + Email messages
* Unified timeline

---

### Email Module (CORE)

* Send emails (SMTP / Graph API)
* Fetch emails (IMAP / Webhook)
* Parse threads

---

### Notification Module

* In-app alerts
* Email alerts
* WebSocket push

---

### AI Module (Future-ready)

* Pricing suggestions
* Email summarization

---

# 🗄️ 5. DATABASE DESIGN

## 🔹 Database: PostgreSQL

---

## 🔹 Core Tables

### Users

```text
id, name, email, password, role, city
```

### Requests

```text
id, request_code, agent_id, route, pax, price, status
```

### Messages

```text
id, request_id, sender, message, type
```

### Email Threads

```text
id, request_id, thread_id
```

### Attachments

```text
id, request_id, file_url
```

### Notifications

```text
id, user_id, message, is_read
```

---

## 🔹 Relationships

* User → Requests (1:M)
* Request → Messages (1:M)
* Request → Attachments (1:M)

---

# 🔌 6. API DESIGN

## 🔹 REST APIs

### Auth

```http
POST /auth/register
POST /auth/login
GET /auth/me
```

---

### Requests

```http
POST /requests
GET /requests
GET /requests/{id}
PUT /requests/{id}
```

---

### Messages

```http
POST /messages
GET /messages/{request_id}
```

---

### Email

```http
POST /email/send
GET /email/thread/{request_id}
```

---

# 🔄 7. WORKFLOW ENGINE

## 🔹 Request Lifecycle

```text
Draft → Submitted → Under Review → RM Pending → Approved / Rejected
```

---

## 🔹 Process Flow

```text
Agent → Create Request
        ↓
Sales → Review
        ↓
Send to RM (Email)
        ↓
RM Reply (Email)
        ↓
System Capture
        ↓
Sales Decision
        ↓
Agent Notification
```

---

# 📧 8. EMAIL SYSTEM DESIGN

## 🔹 Outgoing Emails

* Generated via backend
* Include REQ ID in subject

---

## 🔹 Incoming Emails

* IMAP polling / Webhooks
* Parse subject for REQ ID
* Store message

---

## 🔹 Threading Logic

* Match by REQ ID
* Store thread ID

---

# ⚡ 9. BACKGROUND JOBS

## 🔹 Tool: Celery + Redis

### Jobs:

* Email polling
* Email parsing
* Notifications
* SLA tracking
* Analytics aggregation

---

# 🔔 10. REAL-TIME SYSTEM

## 🔹 Technology

* WebSockets (FastAPI)

## 🔹 Use Cases

* New messages
* Notifications
* Status updates

---

# 🔐 11. SECURITY DESIGN

* JWT authentication
* RBAC (Role-Based Access Control)
* Input validation
* Rate limiting
* File scanning

---

# 📊 12. PERFORMANCE & SCALABILITY

## 🔹 Strategies

* DB indexing
* Query optimization
* Redis caching
* Async processing

---

## 🔹 Expected Load

* 3000+ users
* 1000+ requests/day

---

# 🧪 13. TESTING STRATEGY

## 🔹 Types

* Unit Testing
* Integration Testing
* API Testing
* Load Testing

---

# 🚀 14. DEPLOYMENT ARCHITECTURE

## 🔹 Environments

* Development
* Staging
* Production

---

## 🔹 Tools

* Docker
* CI/CD (GitHub Actions)
* AWS / Railway

---

## 🔹 Deployment Flow

```text
Code → Build → Test → Deploy → Monitor
```

---

# 📈 15. MONITORING & LOGGING

* Application logs
* Error tracking
* Email failure logs
* Performance monitoring

---

# 🧠 16. FUTURE EXTENSIONS

* AI-powered pricing engine
* Mobile app
* External API integrations
* Advanced analytics

---

# 💣 FINAL NOTE

> This system is designed as a **scalable, modular, and AI-ready aviation deal management platform**

---

# ✅ END OF TECHNICAL DESIGN
