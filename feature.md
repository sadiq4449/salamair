# ✈️ Salam Air SmartDeal Platform

## 📘 Feature-wise EPICs & User Stories (Structured)

---

# 1️⃣ EPIC: AGENT REQUEST MANAGEMENT

## 🎯 Goal

Enable agents to create, manage, and track fare requests efficiently.

---

## 1.1 Create Request

**User Story:**
As an Agent, I want to create a request so that I can request fare approval.

**Acceptance Criteria:**

* Form includes route, pax, price, dates
* Required field validation
* Unique REQ ID generated
* Status = Submitted

---

## 1.2 Save Draft

**User Story:**
As an Agent, I want to save draft requests so I can complete them later.

**Acceptance Criteria:**

* Partial data allowed
* Status = Draft
* Editable later

---

## 1.3 Upload Documents

**User Story:**
As an Agent, I want to upload files so I can share booking details.

**Acceptance Criteria:**

* Supports PDF, Excel
* Multiple file upload
* Files linked to request

---

## 1.4 Track Request Status

**User Story:**
As an Agent, I want to track request status so I know progress.

**Acceptance Criteria:**

* Status visible
* Timeline view available

---

## 1.5 View Communication

**User Story:**
As an Agent, I want to view all messages so I stay updated.

**Acceptance Criteria:**

* Chat + email visible
* Sorted by timestamp

---

# 2️⃣ EPIC: SALES SUPPORT WORKFLOW

## 🎯 Goal

Allow sales team to review and process requests efficiently.

---

## 2.1 View Request Queue

**User Story:**
As Sales, I want to see all incoming requests.

**Acceptance Criteria:**

* Filter by status, agent, city
* Sorted by priority

---

## 2.2 Review Request

**User Story:**
As Sales, I want to view request details before decision.

**Acceptance Criteria:**

* Shows route, pax, price
* Shows history and attachments

---

## 2.3 Approve / Reject Request

**User Story:**
As Sales, I want to approve or reject requests.

**Acceptance Criteria:**

* Status updates correctly
* Agent notified

---

## 2.4 Counter Offer

**User Story:**
As Sales, I want to send counter pricing.

**Acceptance Criteria:**

* Message sent to agent
* Request remains active

---

## 2.5 Send to RM

**User Story:**
As Sales, I want to send request to RM via email.

**Acceptance Criteria:**

* Email generated with REQ ID
* Email logged in system

---

# 3️⃣ EPIC: EMAIL INTEGRATION SYSTEM

## 🎯 Goal

Integrate email communication into platform seamlessly.

---

## 3.1 Send Email to RM

**User Story:**
As Sales, I want to send request via email.

**Acceptance Criteria:**

* Subject includes REQ ID
* Email stored in DB

---

## 3.2 Capture Email Replies

**User Story:**
As System, I want to capture RM replies automatically.

**Acceptance Criteria:**

* Detect REQ ID
* Attach to request thread

---

## 3.3 Email Thread View

**User Story:**
As User, I want to view email conversations.

**Acceptance Criteria:**

* Thread grouped by request
* Chronological order

---

## 3.4 Reply from Portal

**User Story:**
As Sales, I want to reply from portal.

**Acceptance Criteria:**

* Email sent externally
* Message saved internally

---

# 4️⃣ EPIC: COMMUNICATION SYSTEM

## 🎯 Goal

Provide unified messaging system (chat + email).

---

## 4.1 Unified Timeline

**User Story:**
As User, I want a single conversation thread.

**Acceptance Criteria:**

* Chat + email combined
* Sorted by time

---

## 4.2 Role-based Messages

**User Story:**
As User, I want to identify sender roles.

**Acceptance Criteria:**

* Agent, Sales, RM tags visible

---

## 4.3 File Sharing

**User Story:**
As User, I want to share files in chat.

**Acceptance Criteria:**

* Attachments supported
* Download option available

---

# 5️⃣ EPIC: AI INTELLIGENCE

## 🎯 Goal

Provide smart assistance for decisions.

---

## 5.1 Price Suggestion

**User Story:**
As Sales, I want AI to suggest pricing.

**Acceptance Criteria:**

* Suggested price displayed
* Confidence score shown

---

## 5.2 Email Summary

**User Story:**
As User, I want summarized email threads.

**Acceptance Criteria:**

* Key points extracted
* Displayed clearly

---

## 5.3 Smart Replies

**User Story:**
As Sales, I want reply suggestions.

**Acceptance Criteria:**

* Click to insert message

---

## 5.4 Risk Detection

**User Story:**
As System, detect suspicious patterns.

**Acceptance Criteria:**

* Alert generated for anomalies

---

# 6️⃣ EPIC: ANALYTICS & REPORTING

## 🎯 Goal

Provide insights for decision making.

---

## 6.1 Agent Performance

**User Story:**
As Admin, I want to view agent stats.

**Acceptance Criteria:**

* Approval rate
* Revenue shown

---

## 6.2 Sales Dashboard

**User Story:**
As Manager, I want sales overview.

**Acceptance Criteria:**

* Pending requests
* Response time

---

## 6.3 Revenue Analytics

**User Story:**
As CEO, I want revenue insights.

**Acceptance Criteria:**

* Trends visible
* Total revenue shown

---

# 7️⃣ EPIC: ADMIN MANAGEMENT

## 🎯 Goal

Control system and users.

---

## 7.1 Manage Users

**User Story:**
As Admin, I want to manage users.

**Acceptance Criteria:**

* Create/edit/delete users
* Assign roles

---

## 7.2 Manage Agents

**User Story:**
As Admin, I want to manage agent profiles.

**Acceptance Criteria:**

* Edit company details
* Set credit limits

---

## 7.3 System Logs

**User Story:**
As Admin, I want to track system activity.

**Acceptance Criteria:**

* All actions logged

---

# 8️⃣ EPIC: NOTIFICATION SYSTEM

## 🎯 Goal

Keep users updated in real time.

---

## 8.1 Real-time Notifications

**User Story:**
As User, I want alerts for events.

**Acceptance Criteria:**

* New message alert
* Approval alert

---

## 8.2 Manage Notifications

**User Story:**
As User, I want to manage notifications.

**Acceptance Criteria:**

* Mark as read/unread

---

# 9️⃣ EPIC: ADVANCED FEATURES

## 🎯 Goal

Enhance automation and efficiency.

---

## 9.1 SLA Tracking

**User Story:**
As Sales, I want deadlines for requests.

**Acceptance Criteria:**

* SLA timer visible
* Overdue highlighted

---

## 9.2 Auto Reminder

**User Story:**
As System, send reminders automatically.

**Acceptance Criteria:**

* Trigger after delay
* Email sent

---

## 9.3 Bulk Upload

**User Story:**
As Agent, I want to upload Excel.

**Acceptance Criteria:**

* Multiple requests created

---

## 9.4 Tagging System

**User Story:**
As User, I want to tag requests.

**Acceptance Criteria:**

* Tags visible and filterable

---

## 9.5 Smart Search

**User Story:**
As User, I want to search easily.

**Acceptance Criteria:**

* Search by REQ ID, agent, route

---

# ✅ END OF DOCUMENT
