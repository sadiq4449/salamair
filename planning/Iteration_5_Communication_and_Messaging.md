# Iteration 5: Communication & Messaging System

## Duration: Sprint 9-10 (2 Weeks)

## Priority: HIGH

## Depends On: Iteration 4 (Email Integration)

---

## Objective

Build a unified communication system that combines chat messages and email conversations into a single timeline, with real-time messaging via WebSockets and role-based message identification.

---

## Scope

### Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 5.1 | Message Model Enhancement | Extend `messages` table with type (chat/email/system), sender role, metadata | Pending |
| 5.2 | Send Chat Message API | `POST /api/v1/messages` - Send in-app chat message | Pending |
| 5.3 | Get Unified Timeline API | `GET /api/v1/messages/{request_id}` - Combined chat + email timeline | Pending |
| 5.4 | WebSocket Server | Set up FastAPI WebSocket endpoint for real-time messaging | Pending |
| 5.5 | WebSocket Auth | Authenticate WebSocket connections via JWT token | Pending |
| 5.6 | WebSocket Room Management | Join/leave request-specific chat rooms | Pending |
| 5.7 | Message Broadcast | Broadcast new messages to all connected clients in a request room | Pending |
| 5.8 | File Sharing in Chat | `POST /api/v1/messages/attachment` - Upload and share files in chat | Pending |
| 5.9 | System Messages | Auto-generate system messages for status changes, actions | Pending |
| 5.10 | Message Read Status | Track read/unread status per user per message | Pending |
| 5.11 | Typing Indicators | WebSocket events for typing status | Pending |
| 5.12 | Online Presence | Track and broadcast user online/offline status | Pending |

### Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 5.13 | Unified Timeline Component | Single view combining chat, email, and system messages | Pending |
| 5.14 | Chat Input Component | Text input with send button, file attachment option | Pending |
| 5.15 | Message Bubble Component | Different styles for chat vs email vs system messages | Pending |
| 5.16 | Role Tags | Visual badges: Agent (blue), Sales (green), RM (orange), System (gray) | Pending |
| 5.17 | WebSocket Client | Connect to WebSocket, handle events, auto-reconnect | Pending |
| 5.18 | Real-time Message Updates | New messages appear instantly without page refresh | Pending |
| 5.19 | File Sharing UI | Upload button, file preview, download link in chat | Pending |
| 5.20 | Typing Indicator UI | "User is typing..." indicator | Pending |
| 5.21 | Online Status Dots | Green/gray dots next to user names | Pending |
| 5.22 | Message Timestamps | Relative time (2 min ago) with full timestamp on hover | Pending |
| 5.23 | Scroll Behavior | Auto-scroll to new messages, "jump to latest" button | Pending |
| 5.24 | Empty Chat State | Friendly prompt when no messages exist yet | Pending |

---

## API Contracts (This Iteration)

### POST /api/v1/messages

**Request:**
```json
{
  "request_id": "uuid",
  "content": "Please review the updated pricing for this route.",
  "type": "chat"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "request_id": "uuid",
  "type": "chat",
  "sender": {
    "id": "uuid",
    "name": "Ali Khan",
    "role": "agent"
  },
  "content": "Please review the updated pricing for this route.",
  "attachments": [],
  "timestamp": "2026-04-14T10:05:00Z"
}
```

### GET /api/v1/messages/{request_id}

**Query Params:**
```
?type=all&page=1&limit=50
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "chat",
      "sender": {
        "id": "uuid",
        "name": "Ali Khan",
        "role": "agent"
      },
      "content": "Requesting fare approval for KHI → DXB",
      "attachments": [],
      "timestamp": "2026-04-14T10:00:00Z"
    },
    {
      "id": "uuid",
      "type": "system",
      "sender": null,
      "content": "Request sent to RM via email by Sadiq (Sales)",
      "attachments": [],
      "timestamp": "2026-04-14T10:35:00Z"
    },
    {
      "id": "uuid",
      "type": "email",
      "sender": {
        "id": null,
        "name": "rm@salamair.com",
        "role": "rm"
      },
      "content": "Approved with fare at 48,000. Valid for 7 days.",
      "attachments": [],
      "timestamp": "2026-04-14T14:20:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 50
}
```

### WebSocket: ws://api/v1/ws/{request_id}

**Authentication:** Token sent as query param or first message

**Events (Server → Client):**
```json
{ "event": "new_message", "data": { "id": "uuid", "type": "chat", "sender": {...}, "content": "...", "timestamp": "..." } }
{ "event": "typing", "data": { "user_id": "uuid", "name": "Sadiq", "is_typing": true } }
{ "event": "user_online", "data": { "user_id": "uuid", "name": "Ali Khan", "online": true } }
{ "event": "status_changed", "data": { "request_id": "uuid", "new_status": "approved" } }
```

**Events (Client → Server):**
```json
{ "event": "typing", "data": { "is_typing": true } }
{ "event": "mark_read", "data": { "message_id": "uuid" } }
```

---

## Database Schema

### messages (Enhanced)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| request_id | UUID | FK → requests.id |
| sender_id | UUID | FK → users.id, NULLABLE (null for system) |
| type | VARCHAR(10) | NOT NULL (chat/email/system) |
| sender_role | VARCHAR(20) | agent/sales/rm/system |
| content | TEXT | NOT NULL |
| metadata | JSONB | NULLABLE (extra data) |
| is_read | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT now() |

### message_attachments

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| message_id | UUID | FK → messages.id |
| filename | VARCHAR(255) | NOT NULL |
| file_url | VARCHAR(500) | NOT NULL |
| file_type | VARCHAR(50) | NOT NULL |
| file_size | INTEGER | NOT NULL |

### message_read_status

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| message_id | UUID | FK → messages.id |
| user_id | UUID | FK → users.id |
| read_at | TIMESTAMP | NOT NULL |

---

## Message Types Visual Design

```
CHAT MESSAGE:
┌──────────────────────────────────────┐
│ 🔵 Ali Khan (Agent)     2 min ago   │
│ Please review the updated pricing    │
└──────────────────────────────────────┘

EMAIL MESSAGE:
┌──────────────────────────────────────┐
│ 📧 rm@salamair.com (RM)   1 hr ago  │
│ Approved with fare at 48,000         │
│ [View full email]                    │
└──────────────────────────────────────┘

SYSTEM MESSAGE:
┌──────────────────────────────────────┐
│ ⚙️ Request sent to RM - 10:35 AM    │
└──────────────────────────────────────┘
```

---

## Acceptance Criteria

- [ ] Chat messages can be sent and received in real-time
- [ ] Timeline shows chat, email, and system messages in chronological order
- [ ] Messages display correct sender role tags
- [ ] WebSocket connection establishes with valid JWT
- [ ] New messages appear instantly for all connected users
- [ ] File sharing works in chat (upload, preview, download)
- [ ] System messages auto-generate on status changes
- [ ] Typing indicator shows when another user is typing
- [ ] Online/offline status visible for connected users
- [ ] Messages paginate correctly for long conversations
- [ ] WebSocket auto-reconnects on connection drop
- [ ] Read/unread status tracked per user

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WebSocket connection drops | Auto-reconnect with exponential backoff |
| Message ordering issues | Use server timestamp, not client timestamp |
| High concurrent connections | Connection pooling, consider Redis pub/sub |
| Large chat histories | Pagination with lazy loading |

---

## Definition of Done

- Real-time chat working between agent and sales
- Unified timeline displays all message types correctly
- WebSocket connections are stable and authenticated
- File sharing works end-to-end
- System messages auto-generate on actions
- Typing indicators and online status functional
- Messages correctly ordered by timestamp
