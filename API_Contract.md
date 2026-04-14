# ✈️ Salam Air SmartDeal Platform

## 📘 API CONTRACT (Frontend ↔ Backend)

---

# 🧭 1. BASE CONFIG

**Base URL**

```
/api/v1
```

**Auth Type**

```
Bearer Token (JWT)
```

**Headers**

```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

---

# 🔐 2. AUTH APIs

## ➤ Login

**POST** `/auth/login`

### Request

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

### Response

```json
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "name": "Sadiq",
    "role": "agent"
  }
}
```

---

# 📦 3. REQUEST APIs

---

## ➤ Create Request

**POST** `/requests`

### Request

```json
{
  "route": "KHI → DXB",
  "pax": 2,
  "price": 50000
}
```

### Response

```json
{
  "id": "uuid",
  "request_code": "REQ-1023",
  "route": "KHI → DXB",
  "pax": 2,
  "price": 50000,
  "status": "submitted",
  "created_at": "2026-04-14T10:00:00Z"
}
```

---

## ➤ List Requests

**GET** `/requests`

### Query Params (optional)

```
status=approved
agent_id=uuid
```

### Response

```json
[
  {
    "id": "uuid",
    "request_code": "REQ-1023",
    "route": "KHI → DXB",
    "status": "submitted"
  }
]
```

---

## ➤ Get Request Detail

**GET** `/requests/{id}`

### Response

```json
{
  "id": "uuid",
  "request_code": "REQ-1023",
  "route": "KHI → DXB",
  "pax": 2,
  "price": 50000,
  "status": "under_review",
  "agent": {
    "id": "uuid",
    "name": "Ali"
  }
}
```

---

## ➤ Update Request Status

**PUT** `/requests/{id}/status`

### Request

```json
{
  "status": "approved"
}
```

### Response

```json
{
  "message": "Status updated",
  "status": "approved"
}
```

---

## ➤ Send to RM

**POST** `/requests/{id}/send-to-rm`

### Response

```json
{
  "message": "Sent to RM",
  "status": "rm_pending"
}
```

---

# 💬 4. MESSAGE APIs

---

## ➤ Send Message

**POST** `/messages`

### Request

```json
{
  "request_id": "uuid",
  "content": "Please review this pricing"
}
```

### Response

```json
{
  "id": "uuid",
  "type": "chat",
  "sender": "agent",
  "content": "Please review this pricing",
  "timestamp": "2026-04-14T10:05:00Z"
}
```

---

## ➤ Get Messages (Timeline)

**GET** `/messages/{request_id}`

### Response

```json
[
  {
    "type": "chat",
    "sender": "agent",
    "content": "Please review",
    "timestamp": "2026-04-14T10:00:00Z"
  },
  {
    "type": "email",
    "sender": "rm",
    "content": "Approved with changes",
    "timestamp": "2026-04-14T10:10:00Z"
  }
]
```

---

# 📧 5. EMAIL APIs

---

## ➤ Send Email

**POST** `/email/send`

### Request

```json
{
  "request_id": "uuid",
  "message": "Please approve this fare"
}
```

### Response

```json
{
  "message": "Email sent",
  "status": "rm_pending"
}
```

---

## ➤ Get Email Thread

**GET** `/email/thread/{request_id}`

### Response

```json
[
  {
    "from": "sales@salamair.com",
    "to": "rm@salamair.com",
    "subject": "REQ-1023 Approval",
    "body": "Please review",
    "timestamp": "2026-04-14T10:00:00Z"
  }
]
```

---

# 🔔 6. NOTIFICATION EVENTS (Frontend Use)

Backend should return event-based responses:

### Example

```json
{
  "event": "REQUEST_APPROVED",
  "message": "Request approved successfully"
}
```

### Event Types

```
REQUEST_CREATED
REQUEST_APPROVED
REQUEST_REJECTED
NEW_MESSAGE
EMAIL_RECEIVED
```

---

# 📊 7. STATUS ENUM

```
draft
submitted
under_review
rm_pending
approved
rejected
```

---

# ⚠️ 8. ERROR FORMAT

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Route is required"
  }
}
```

---

# 🔥 FINAL NOTE

👉 Frontend must rely ONLY on this contract
👉 No hardcoded fields
👉 All UI states driven from API
