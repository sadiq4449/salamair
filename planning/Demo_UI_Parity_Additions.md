# Demo UI parity — added features

This document describes how the React app aligns with the static HTML demos under `UI.demo_design/` (`agent.html`, `sales.html`, `admin.html`) and the JavaScript behaviour in `agent.js` / `sales.js`. It is kept in sync with the current implementation.

## Summary

The app mirrors the demo navigation structure, request-detail side panels (AI assistant, AI summary, RM actions), email smart replies, **live-style flight search** on `/flights`, admin “all requests,” and supporting queues. The agent bulk-upload sidebar link is registered in `App.tsx`.

---

## Routes added or fixed

| Route | Roles | Purpose |
|-------|-------|---------|
| `/bulk-upload` | Agent | Bulk Excel upload (sidebar link wired in `App.tsx`). |
| `/flights` | Agent, Sales, Admin | **Mock** flight schedule (`FlightDemoSchedule` via `FlightAvailability.tsx`; data and airport options from `frontend/src/data/flightMock.ts`). |
| `/inbox` | Sales, Admin | Email aggregation inbox; listed in the sidebar for **both** roles. |
| `/city-view` | Sales, Admin | City-wise request table with airport tabs (demo “City-Wise View”). |
| `/agent-history` | Sales, Admin | Per-agent cards with counts from loaded requests; admins merge company names from `/admin/agents` when available. |
| `/admin/requests` | Admin | Full request list with filters and SLA column; opens `/pending/:id` for review. |

**Deep link:** `/pending?search=<text>` pre-fills the pending queue search (used from Agent history cards).

---

## New or updated UI components

- **`AiPricingAssistant`** — Suggested OMR, confidence bar, recommendation line. Heuristics follow `sales.js` `updateAI` (suggested price uses `price > 100 ? 0.9 : 0.95`; no extra urgency factor on the suggested price).
- **`EmailThreadSummaryCard`** — Bullet “key points” summary from request context (`buildDemoEmailSummaryPoints`). Loads **chat message count** and **RM email thread count** via `messageService` / `emailService` so it stays correct when the Agent ↔ Sales tab is hidden. If both counts are zero, shows **“No messages to summarize”** (aligned with the demo); otherwise a short “analyzing” delay then key points with “N messages analyzed.” Reset per request via `key={req.id}` on the sales detail page.
- **`demoAiHelpers.ts`** — Shared helpers for suggested price, confidence, summary bullets, and RM smart-reply strings (`DEMO_SMART_REPLIES` matches `sales.js` `SMART_REPLIES` wording).

---

## Behaviour updates

- **Sales request detail** — Right column order: AI Assistant → AI Summary → Actions → Attachments → Notes (matches demo).
- **Agent request detail** — AI Assistant card above Notes (matches demo).
- **Send to RM modal** — “Smart replies” chips **replace** the RM message body with the chosen template (same strings as `sales.js` `SMART_REPLIES`; `insertSmartReply` behaviour in the demo).
- **Email thread (Sales ↔ RM)** — “Nudge RM” sends a short reminder via the reply API when status is `rm_pending`, a thread exists, and the user can reply (`canReply`). It does **not** require simulate/dev mode.
- **Flight availability** — Default `/flights` uses `SalamAirLiveSearch` (SalamAir session + search API). A separate **offline mock** page exists as `FlightDemoSchedule.tsx` (uses `MOCK_FLIGHTS` from `flightMock.ts`) for reference or future routing, but it is **not** the default for `/flights`.
- **Agent dashboard** — “Check Flights” quick action navigates to `/flights`.
- **Sidebar** — Role-based labels and order; **admin** includes “All requests,” “Email aggregation,” and “Flight availability.” Active-state helper keeps `/admin/*` highlighting correct.
- **Admin sub-nav** — “All requests” entry points to `/admin/requests`.
- **Pending approvals** — Table includes an **SLA** column (`SlaIndicator`) for non-terminal statuses; supports `search` query param as above.

---

## Notes

- AI panels use **deterministic heuristics** (no external LLM). They are intended to match the demo UX, not to provide production pricing advice.
- `/flights` mounts **`SalamAirLiveSearch`** by default. **`FlightDemoSchedule`** remains in the repo as an optional mock schedule (not routed unless you add a route).
- City-wise filtering uses **substring match** on the request `route` field for the selected IATA code (same idea as the demo’s `route.includes(curCity)`).

---

## Files touched (reference)

| Area | Files |
|------|--------|
| Routes | `frontend/src/App.tsx` |
| Navigation | `frontend/src/components/Layout/Sidebar.tsx` |
| Admin shell | `frontend/src/components/admin/AdminLayout.tsx` |
| Pages | `frontend/src/pages/sales/CityWiseView.tsx`, `AgentHistoryPage.tsx`, `frontend/src/pages/admin/AdminAllRequestsPage.tsx` |
| AI / demo text | `frontend/src/components/AiPricingAssistant.tsx`, `EmailThreadSummaryCard.tsx`, `utils/demoAiHelpers.ts` |
| Request detail | `frontend/src/pages/sales/SalesRequestDetail.tsx`, `frontend/src/pages/agent/RequestDetail.tsx` |
| RM email UX | `frontend/src/components/EmailPreviewModal.tsx`, `EmailThreadView.tsx` |
| Flights | `frontend/src/pages/FlightAvailability.tsx`, `frontend/src/components/flight/SalamAirLiveSearch.tsx`, `frontend/src/services/salamairApi.ts`, `frontend/src/data/flightMock.ts` (airports); optional mock: `FlightDemoSchedule.tsx` |
| Agent home | `frontend/src/pages/agent/AgentDashboard.tsx` |
| Pending queue | `frontend/src/pages/sales/PendingApprovals.tsx` |
