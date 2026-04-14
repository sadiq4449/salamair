# ✈️ Salam Air SmartDeal Platform

## 📘 Product Requirements Document (PRD)

---

# 🧭 1. PRODUCT OVERVIEW

## 🎯 Product Name

**Salam Air SmartDeal Platform**

---

## 📌 Objective

To build a **centralized aviation deal management system** that replaces manual email-based workflows with a structured, efficient, and intelligent platform.

---

## 💡 Problem Statement

Current system challenges:

* Negotiations scattered across emails
* No centralized tracking
* Slow approval cycles
* No analytics or visibility
* High dependency on manual processes

---

## 🚀 Solution

A **hybrid system (Portal + Email)** that:

* Structures all deal requests
* Integrates email communication
* Provides real-time tracking
* Enables data-driven decisions

---

# 👥 2. TARGET USERS

---

## 🧑‍✈️ Agent

* Creates fare requests
* Tracks status
* Communicates with sales

---

## 🧑‍💻 Sales Support

* Reviews requests
* Negotiates pricing
* Communicates with RM

---

## 📧 Revenue Management (RM)

* Receives email requests
* Responds via email

---

## 🛠️ Admin

* Manages users
* Monitors system
* Access analytics

---

# 🎯 3. GOALS & SUCCESS METRICS

---

## 📊 Business Goals

* Reduce negotiation time by **70%**
* Increase deal conversion rate
* Improve operational visibility
* Reduce email dependency

---

## 📈 Success Metrics (KPIs)

* Avg. response time
* Approval rate (%)
* Revenue per agent
* Requests processed per day
* Email reduction %

---

# 🧩 4. PRODUCT FEATURES

---

## 🔹 4.1 Request Management

* Create / Edit / Draft requests
* Upload documents
* Status tracking

---

## 🔹 4.2 Sales Workflow

* Review requests
* Approve / Reject / Counter
* Send to RM

---

## 🔹 4.3 Email Integration (Core)

* Send structured emails
* Capture replies automatically
* Threaded conversation view

---

## 🔹 4.4 Communication System

* Unified chat + email
* Real-time updates

---

## 🔹 4.5 Analytics Dashboard

* Agent performance
* Revenue insights
* Conversion rates

---

## 🔹 4.6 Admin Controls

* User management
* Role assignment
* System logs

---

## 🔹 4.7 AI Features (Future)

* Pricing suggestions
* Email summarization
* Smart replies

---

# 🔄 5. USER FLOW

---

```text
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
Sales Decision
        ↓
Agent Notification
```

---

# 📌 6. FUNCTIONAL REQUIREMENTS

---

## 6.1 Request System

* Users can create requests
* System generates unique REQ ID
* Status lifecycle maintained

---

## 6.2 Email System

* Emails sent via backend
* Replies automatically captured
* Messages linked to requests

---

## 6.3 Communication

* Unified message timeline
* Role-based message display

---

## 6.4 Notifications

* Alerts for key events
* Real-time updates

---

## 6.5 Analytics

* Generate reports
* Track KPIs

---

# ⚙️ 7. NON-FUNCTIONAL REQUIREMENTS

---

## 🔐 Security

* JWT authentication
* Role-based access control
* Data validation

---

## ⚡ Performance

* Handle 1000+ requests/day
* Fast API response (<300ms)

---

## 📈 Scalability

* Horizontal scaling supported
* Async processing

---

## 🔄 Reliability

* Email retry mechanism
* Error handling

---

# 🧪 8. ASSUMPTIONS

* RM will continue using email
* Agents have basic system access
* Internet connectivity available

---

# ⚠️ 9. RISKS

| Risk                 | Mitigation          |
| -------------------- | ------------------- |
| Email parsing errors | Strict REQ ID usage |
| RM delays            | Reminder system     |
| System adoption      | Simple UI/UX        |

---


# ✅ FINAL NOTE

> This product is designed to become a **central decision-making system for aviation deal management**, combining structured workflows with email integration and future AI capabilities.

---
