# SmartAir / SalamPortal — Code Audit Report

_Generated: 2026-04-20_  
_Fix pass: 2026-04-21 — all P0 and P1 items implemented; see "Fix log" at the bottom._

Scope: full-repo review of the FastAPI backend (`Backend/app/**`) and the
React/TypeScript frontend (`frontend/src/**`). Findings are grouped by
severity. Each item includes the file, a short description, the concrete
risk, and a recommended fix.

Severity legend:
- **P0** – functional bug or security issue that will hit users in production.
- **P1** – correctness/performance issue likely to cause pain under load or
  specific scenarios.
- **P2** – hygiene / maintainability / minor risk.

---

## P0 — Critical

### 1. `asyncio.ensure_future(...)` inside **sync** FastAPI endpoints
**Files:**
- `Backend/app/api/routes/sales.py` lines 207–220, 271–278, 328–335
- `Backend/app/api/routes/requests.py` lines ~161–164

These endpoints are declared as plain `def` (not `async def`), so FastAPI
runs them in a threadpool where **there is no running event loop**.
`asyncio.ensure_future(...)` therefore raises
`RuntimeError: no running event loop`. The call is wrapped in
`try/except Exception` which **silently swallows** the failure and only
logs a warning, so:

- The DB-side notification is created.
- The realtime WebSocket fan-out **never happens**.
- No one notices because it looks like a generic warning in the log.

**Fix (either/or):**
- Convert the endpoints to `async def` and `await` a helper, or
- Use `anyio.from_thread.run(...)`, or
- Schedule via a dedicated background worker, or
- Call `manager.push_to_user_threadsafe(...)` backed by
  `asyncio.run_coroutine_threadsafe(..., loop)` where `loop` is the app's
  main loop captured at startup.

---

### 2. Request-code generation — race condition + wrong sort
**File:** `Backend/app/api/routes/requests.py` (`_generate_request_code`,
lines 53–68) and `Backend/app/services/bulk_request_excel.py`
(`_generate_request_code`, lines 24–39).

```python
last = (
    db.query(Request)
    .filter(extract("year", Request.created_at) == year)
    .order_by(Request.request_code.desc())
    .first()
)
```

Problems:
1. **String sort, not numeric sort.** `REQ-2026-100` sorts _before_
   `REQ-2026-99`, so the "next" sequence number can collide with an
   existing one → `IntegrityError` on `request_code` unique constraint
   (if any) or silent duplicate codes.
2. **Read-compute-write race.** Two concurrent requests read the same
   `last` value, both compute `seq+1`, and both write the same code.
3. The bulk path additionally uses `datetime.utcnow()` (deprecated in
   3.12+).

**Fix:**
- Parse the sequence out of the code (or store the integer sequence in
  its own column) and `MAX(seq)` on that.
- Put code generation inside a transaction with `SELECT ... FOR UPDATE`
  on a per-year counter row, or use a Postgres `SEQUENCE` per year, or
  generate code in a DB trigger / `DEFAULT nextval(...)`.
- Replace `datetime.utcnow()` with `datetime.now(timezone.utc)`.

---

### 3. Frontend `updateRequest` silently drops `status`
**Files:**
- `frontend/src/services/requestService.ts` (`updateRequest`, line ~75)
- `Backend/app/schemas/request.py` (`RequestUpdate`)
- Consumers that call `updateRequest({ status: ... })`

`updateRequest` sends `Partial<CreateRequestData>` which on the TS side
includes `status`, but the backend Pydantic `RequestUpdate` schema does
not declare a `status` field, so Pydantic strips it. Any code calling
`updateRequest({ status: 'submitted' })` to "move" a draft forward
succeeds with 200 OK but **nothing changes** server-side. Agents will
report "I submitted my draft and nothing happened."

**Fix:** either
- Expose an explicit `POST /requests/{id}/submit` (recommended), or
- Add a validated `status` field on `RequestUpdate` with a whitelist and
  the correct permissions, and have the frontend call the dedicated
  endpoint.

---

### 4. `HistoryEvent` frontend type is wrong for the backend payload
**Files:**
- `frontend/src/types/index.ts` — `HistoryEvent` declares
  `actor: string`.
- `Backend/app/schemas/request.py` — `HistoryRead` returns `actor_id:
  UUID` and `actor_name: str | None` (no `actor` object).
- `frontend/src/pages/admin/AdminLogsPage.tsx` lines 101–102:
  `row.actor.name` and `row.actor.role`.

`AdminLogsPage` is consuming a **different** backend route
(`AdminLogsRow` / admin-logs explorer) that does return a nested
`actor`, but the shared `HistoryEvent` type used by
`requestService.getHistory` / `requestStore.fetchHistory` is
structurally wrong for `/sales/requests/{id}/history`. Any UI that ever
tries to render `event.actor` will show `[object Object]` or crash at
runtime. Currently no UI renders it, so this is latent, but it will
bite the first consumer.

**Fix:** split into two types:
```ts
// matches /sales/requests/{id}/history
export interface RequestHistoryEvent {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_id: string;
  actor_name: string | null;
  details: string | null;
  created_at: string;
}
// matches /admin/logs
export interface AdminLogsRow {
  id: string;
  action: string;
  actor: { id: string; name: string; role: string };
  // ...
}
```
and use them in their respective stores/pages.

---

### 5. `NotificationType` union is missing `"REMINDER"`
**Files:**
- `Backend/app/services/notification_service.py` line 16 includes
  `"REMINDER"` in `NOTIFICATION_TYPES`.
- `frontend/src/types/index.ts` — `NotificationType` union omits it.

When a REMINDER notification arrives over WebSocket or REST, TypeScript
narrowing (`switch(type)`) will fall through to `default` and the
notification rendering/grouping logic will be wrong (wrong icon, wrong
sound, no toast). On strict code paths it is also a compile-time error.

**Fix:** add `'REMINDER'` to the union and to any `switch` that enumerates
types (icons, colors, grouping).

---

### 6. Secrets stored in committed location (`Backend/.env`)
**File:** `Backend/.env`

Contains real-looking values for `SECRET_KEY`, `SMTP_PASSWORD`,
`RESEND_API_KEY`, `GROQ_API_KEY`.

Current status:
- `.gitignore` does list `Backend/.env` ✔️ so it is not tracked now.
- But anyone cloning from a backup/zip gets those creds; and if someone
  renames/moves the file or adds `-f` to `git add`, they leak.

**Fix:**
- Rotate the keys **now** (assume they are compromised; at minimum
  `SECRET_KEY` and `GROQ_API_KEY`).
- Keep `Backend/.env.example` in the repo with placeholders only.
- Verify CI/CD does not print env to logs.
- Regenerate `SECRET_KEY` via `secrets.token_urlsafe(64)`.

---

## P1 — High

### 7. N+1 queries in admin explorer listings
**File:** `Backend/app/api/routes/admin_explorer.py`

`explorer_list_notifications` (~line 409), `explorer_list_history`
(~line 305), `explorer_list_counter_offers` (~line 508), and
`explorer_list_chat_attachments` (~line 711) loop over rows and fire a
separate `db.query(User).get(...)` / `db.query(Request).get(...)` per
row to enrich each record. For 200-row pages that is hundreds of
round-trips.

**Fix:** collect the IDs, do **one** `IN (...)` query per related table,
build a `dict[id, obj]`, and enrich in memory. Alternatively use
`joinedload` / `selectinload` on the top query.

---

### 8. N+1 in `mark_messages_read`
**File:** `Backend/app/services/message_service.py` lines 107–128.

The function iterates `message_ids` and for each id runs
`db.query(MessageReadStatus).filter(...).first()` plus an insert. This
is one round-trip per message on every "open thread" action.

**Fix:** one `SELECT ... WHERE message_id IN (:ids)` to find existing
rows, then a single `bulk_save_objects`/`insert().values([...])` for the
missing ones. Even better, use Postgres
`INSERT ... ON CONFLICT DO NOTHING`.

---

### 9. `compute_sla` timezone handling is unsafe
**File:** `Backend/app/services/notification_service.py` around line 206.

```python
req.updated_at.replace(tzinfo=timezone.utc)
```

`updated_at` is mapped to a TIMESTAMP column. If the column is
`TIMESTAMP WITH TIME ZONE` (default for Postgres with SQLAlchemy
`DateTime(timezone=True)`), `updated_at` is **already** tz-aware, and
`.replace(tzinfo=UTC)` throws away the real offset (e.g. a value that
is actually 10:00+04:00 becomes 10:00Z, a 4-hour shift).

**Fix:**
```python
ts = req.updated_at
if ts.tzinfo is None:
    ts = ts.replace(tzinfo=timezone.utc)
else:
    ts = ts.astimezone(timezone.utc)
```
Also audit every other `.replace(tzinfo=...)` in the backend.

---

### 10. SLA compliance metric excludes `at_risk`
**File:** `Backend/app/services/sla_service.py` around lines 139–163.

```python
total_tracked = on_track + at_risk + breached
compliance = round((on_track / total_tracked * 100), 2)
```

By definition, `at_risk` requests are **not yet breached** — they are
still within SLA. Excluding them from the numerator systematically
under-reports compliance to the business, which then drives wrong
operational decisions.

**Fix:**
```python
compliance = round(((on_track + at_risk) / total_tracked * 100), 2)
```
…and surface `at_risk` separately (e.g. "compliance 97%, of which 12% at
risk").

---

### 11. React WebSocket hooks reconnect on every render
**Files:**
- `frontend/src/hooks/useNotificationSocket.ts`
- `frontend/src/hooks/useWebSocket.ts`

`connect` is a closure over props/callbacks that are **not** memoized by
the caller (`addToast`, `addRealtimeNotification`,
`preferences?.sound_enabled`, `onNewMessage`, `onTyping`, `onUserOnline`,
`onRoomState`). The `useEffect(() => connect(), [connect])` therefore
tears down and re-opens the WebSocket on essentially every parent
render. Symptoms: flickering "online" indicator, transient message
loss, spammy reconnect logs on the server, extra auth calls.

**Fix:**
- Wrap `connect` in `useCallback` with a **stable** dependency list
  (pull values out of refs, not the closure).
- Store mutable callbacks in a `useRef` that is updated in a separate
  effect, and have `connect` read from the ref. Pattern:
  ```ts
  const handlersRef = useRef(handlers);
  useEffect(() => { handlersRef.current = handlers; }, [handlers]);
  ```
- Depend only on the URL / auth token in the connect effect.

---

### 12. `AdminDbChatAttachmentRow` fabricates a `request_id`
**File:** `Backend/app/api/routes/admin_explorer.py` lines 715 & 757.

```python
request_id = (msg and msg.request_id) or (req and req.id) or uuid.uuid4()
```

Falling back to a fresh `uuid.uuid4()` means the admin UI shows an
attachment tied to a request that doesn't exist — **every call produces
a different bogus id**. Real data integrity issues (orphaned
attachments) are hidden instead of surfaced.

**Fix:** return `request_id: Optional[UUID] = None` in the Pydantic
model and leave it `None` when the relationship is missing. Flag such
rows in the UI.

---

## P2 — Medium / Hygiene

### 13. Deprecated `datetime.utcnow()` usages
Python 3.12+ deprecates `datetime.utcnow()`. It still works but emits a
`DeprecationWarning` and returns a **naive** datetime, which is the
root cause of the tz bug in #9.

Affected (non-exhaustive):
- `Backend/app/api/routes/requests.py` line 54
- `Backend/app/services/bulk_request_excel.py` line 25
- any other module using `datetime.utcnow()` (grep-able)

**Fix:** replace with `datetime.now(timezone.utc)` everywhere.

---

### 14. `UPLOAD_DIR.mkdir` called twice in `main.py`
**File:** `Backend/app/main.py` — once at module import (~line 159) and
again inside the `lifespan` handler (~line 71/72).

Harmless (`exist_ok=True`) but indicates the lifespan version is dead
code or the module-level one should be removed. Pick one (lifespan is
cleaner for test isolation).

---

### 15. Dead / unused fetched history in the store
`requestStore.fetchHistory` populates `history` but no page currently
renders it (only the admin page uses the separate admin-logs endpoint).
Either wire it into `RequestDetail.tsx` or remove the call from
`agent/RequestDetail.tsx` and `sales/SalesRequestDetail.tsx` to save a
round-trip.

---

### 16. `SECRET_KEY` length only just passes validation
`config.py` enforces `len(SECRET_KEY) >= 32`. Current value is ~37
chars, which is fine, but for JWT HS256 a 64-byte (base64url) secret is
best practice. Generate with:
```python
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

### 17. Versioning mismatch between frontend and backend for notifications
The backend now emits `"REMINDER"` events (see #5) and, separately, the
WebSocket payload shape is whatever `format_notification(n)` returns,
while the frontend declares its own `Notification` type. Add a schema
contract (generate TS types from Pydantic with e.g. `datamodel-code-
generator` or `pydantic-to-typescript`) to prevent drift.

---

### 18. Sync endpoints doing heavy work without `run_in_threadpool` control
Multiple sync `def` endpoints (bulk Excel parse/commit, SLA recompute,
notification send) can block FastAPI workers for seconds on large
inputs. Under concurrent load this will cap throughput.

**Fix:** make those endpoints `async def` and move the CPU-bound parts
into `anyio.to_thread.run_sync(...)` so other requests aren't starved.

---

## Suggested order of fixes

1. **Rotate secrets in `Backend/.env`** (#6) — do this first, today.
2. Fix `asyncio.ensure_future` in sync endpoints (#1) — realtime is
   currently silently broken.
3. Replace request-code generator with a safe scheme (#2).
4. Reconcile `HistoryEvent` + `NotificationType` types and `updateRequest`
   schema (#3, #4, #5) — these are cheap and stop a class of silent
   bugs.
5. Fix SLA tz handling + compliance formula (#9, #10) — they drive
   management reports.
6. Batch the admin-explorer and `mark_messages_read` queries (#7, #8).
7. Stabilize `useWebSocket` / `useNotificationSocket` dependencies
   (#11).
8. Sweep deprecated `datetime.utcnow()` calls (#13) and the rest of the
   P2 items.

---

## Quick-win patches (copy-paste ready)

### A. Replace `datetime.utcnow()` (generic)
```python
from datetime import datetime, timezone
now_utc = datetime.now(timezone.utc)
year = now_utc.year
```

### B. Safe notification fan-out from sync endpoint
```python
# Backend/app/services/websocket_manager.py
import asyncio

class WebSocketManager:
    def __init__(self) -> None:
        self._loop: asyncio.AbstractEventLoop | None = None
        # ...

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def push_to_user_threadsafe(self, user_id: str, payload: dict) -> None:
        if self._loop is None:
            return
        asyncio.run_coroutine_threadsafe(
            self.push_to_user(user_id, payload), self._loop
        )
```
Bind in `main.py` lifespan:
```python
@asynccontextmanager
async def lifespan(app):
    manager.bind_loop(asyncio.get_running_loop())
    yield
```
Then in every sync endpoint replace `asyncio.ensure_future(manager.push_to_user(...))`
with `manager.push_to_user_threadsafe(...)`.

### C. SLA compliance
```python
compliance = round(((on_track + at_risk) / total_tracked * 100), 2) \
    if total_tracked else 100.0
```

### D. Stable `connect` in hooks
```ts
const handlersRef = useRef({ onNewMessage, onTyping, onUserOnline, onRoomState });
useEffect(() => {
  handlersRef.current = { onNewMessage, onTyping, onUserOnline, onRoomState };
}, [onNewMessage, onTyping, onUserOnline, onRoomState]);

const connect = useCallback(() => {
  const ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    const h = handlersRef.current;
    // dispatch using h.onNewMessage / h.onTyping / ...
  };
  return ws;
}, [url]);
```

---

---

## Fix log (applied 2026-04-21)

| # | Status | Where it was fixed |
| --- | --- | --- |
| 1 | FIXED | `Backend/app/services/websocket_manager.py` gained `bind_loop` + `push_to_user_threadsafe`/`push_to_users_threadsafe`. `Backend/app/main.py` calls `ws_manager.bind_loop(asyncio.get_running_loop())` inside `lifespan`. All 6 `asyncio.ensure_future(manager.push_to_user(...))` call sites in `sales.py`, `requests.py`, and `services/reminder_runner.py` now use the threadsafe variant. |
| 2 | FIXED | New `Backend/app/services/request_codes.py` centralizes the generator. It parses the numeric suffix (so `REQ-YYYY-100` sorts after `REQ-YYYY-99`) and acquires a `pg_advisory_xact_lock(year)` to serialize concurrent callers. `requests.py` and `bulk_request_excel.py` both import from it; the unique constraint on `request_code` remains the final guard. |
| 3 | FIXED | `Backend/app/schemas/request.py::RequestUpdate` now uses `ConfigDict(extra="forbid")` — unknown fields (like stray `status`) return 422 instead of being silently dropped. Frontend exposes a dedicated `UpdateRequestData` type (no `status`/`agent_id`) used by `requestService.updateRequest` and `requestStore.updateRequest`. |
| 4 | FIXED | `frontend/src/types/index.ts::HistoryEvent` now matches the backend `HistoryRead` (`actor_id`, `actor_name`, `request_id`). The admin-logs screen already consumes a separate shape so nothing breaks. |
| 5 | FIXED | `'REMINDER'` added to `NotificationType` and to the `Record<NotificationType, …>` icon/color/label maps in `NotificationDropdown.tsx` and `NotificationsPage.tsx`, plus the preferences toggle in `NotificationSettings.tsx`. |
| 6 | NOTED | `Backend/.env.example` already exists with placeholders. The live `Backend/.env` still contains real-looking secrets — **rotate `SECRET_KEY`, `SMTP_PASSWORD`, `IMAP_PASSWORD`, `RESEND_API_KEY`, and `GROQ_API_KEY` now**. |
| 7 | FIXED | `admin_explorer.py` bulk-loads `Request.request_code` / `User.email` / `Message` once per page for `explorer_list_history`, `explorer_list_notifications`, `explorer_list_counter_offers`, and `explorer_list_chat_attachments`. |
| 8 | FIXED | `message_service.mark_messages_read` now does one bulk SELECT for existing read rows and one `bulk_save_objects` for the rest — no more per-id round-trips. |
| 9 | FIXED | `notification_service.compute_sla` coerces `req.updated_at` with `astimezone(UTC)` when it is already tz-aware, falling back to `.replace(tzinfo=UTC)` only for naive values. Other `.replace(tzinfo=…)` sites in the backend are already guarded. |
| 10 | FIXED | `sla_service.sla_dashboard_payload` now counts `at_risk` requests as compliant: `compliance = (on_track + at_risk) / total_tracked`. |
| 11 | FIXED | `useNotificationSocket` and `useWebSocket` moved their handlers into a `handlersRef`, so the connection only opens on mount (and, for `useWebSocket`, on `requestId` change). Parent re-renders no longer tear the socket down. |
| 12 | FIXED | `AdminDbChatAttachmentRow.request_id` / `request_code` are now `Optional` in `admin_explorer_schema.py`. The list and update handlers in `admin_explorer.py` return `None` for orphaned attachments instead of inventing a `uuid.uuid4()`. |
| 13 | FIXED | No `datetime.utcnow()` calls remain under `Backend/app`; all code paths use `datetime.now(timezone.utc)`. |
| 14 | FIXED | The module-level `UPLOAD_DIR.mkdir` runs once (before `StaticFiles` mount); the duplicate call inside `lifespan` is removed. |

### Still on the backlog (P2)

- **#15 Dead `fetchHistory` data** — backend call fires from request detail pages but no UI renders it. Remove the calls or wire a timeline view.
- **#16 Stronger `SECRET_KEY`** — regenerate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- **#17 Typed contract between FE/BE** — add `datamodel-code-generator` / `pydantic-to-typescript` to keep `NotificationType`, `HistoryEvent`, etc. from drifting again.
- **#18 `async def` for heavy endpoints** — bulk Excel and SLA recompute endpoints still run in the threadpool and can saturate workers.

_End of report._
