# Demo UI parity — added features

This document lists features and routes aligned with the static HTML demos under `UI.demo_design/` (`agent.html`, `sales.html`, `admin.html`) and the JavaScript behaviour in `agent.js` / `sales.js`.

## Summary

The React app now mirrors the demo navigation structure, request-detail side panels (AI assistant, AI summary, RM actions), email “smart replies,” flight reference grid filters, and admin “all requests” overview. A previously broken sidebar link to bulk upload is wired to a real route.

---

## Routes added or fixed

| Route | Roles | Purpose |
|-------|-------|---------|
| `/bulk-upload` | Agent | Bulk Excel upload (was linked in the sidebar but not registered in `App.tsx`). |
| `/flights` | Agent, Sales, Admin | Flight availability grid (mock schedule — same role as demo). |
| `/inbox` | Sales, Admin | Email aggregation inbox (existing page, now in the nav). |
| `/city-view` | Sales, Admin | City-wise request table with airport tabs (demo `City-Wise View`). |
| `/agent-history` | Sales, Admin | Per-agent cards with counts from loaded requests; admins merge company names from `/admin/agents` when available. |
| `/admin/requests` | Admin | Full request list with filters and SLA column; opens `/pending/:id` for review. |

Deep link: `/pending?search=<text>` pre-fills the pending queue search (used from Agent history cards).

---

## New or updated UI components

- **`AiPricingAssistant`** — Suggested OMR, confidence bar, recommendation line (heuristics matching `sales.js` `updateAI`).
- **`EmailThreadSummaryCard`** — Bullet “key points” summary from request context (heuristics matching `generateEmailSummary` / `createSummary`).
- **`demoAiHelpers.ts`** — Shared helpers for suggested price, confidence, summary bullets, and RM smart-reply strings.

## Behaviour updates

- **Sales request detail** — Right column order: AI Assistant → AI Summary → Actions → Attachments → Notes (matches demo).
- **Agent request detail** — AI Assistant card above Notes (matches demo).
- **Send to RM modal** — “Smart replies” chip row appends template lines to the message (matches `SMART_REPLIES` in `sales.js`).
- **Email thread (Sales ↔ RM)** — “Nudge RM” sends a short reminder via the existing reply API when status is `rm_pending` and a thread exists.
- **Flight availability** — Date filter added next to route filter (mock dates from `flightMock.ts`).
- **Agent dashboard** — “Check Flights” quick action (demo primary actions).
- **Sidebar** — Rebuilt to follow demo labels and order; admin includes “All requests” and “Flight availability.” Active-state logic for `/admin/*` routes fixed so only the current admin section highlights.
- **Admin sub-nav** — “All requests” entry points to `/admin/requests`.

---

## Notes

- AI panels use **deterministic heuristics** (no external LLM). They are intended to match the demo UX, not to provide production pricing advice.
- Flight data remains **demo / reference only** (`frontend/src/data/flightMock.ts`).
- City-wise filtering uses **substring match** on the request `route` field for the selected IATA code (same idea as the demo’s `route.includes(curCity)`).

---

## Files touched (reference)

- `frontend/src/App.tsx` — Routes.
- `frontend/src/components/Layout/Sidebar.tsx` — Navigation + active state helper.
- `frontend/src/components/admin/AdminLayout.tsx` — Admin tabs.
- `frontend/src/pages/sales/CityWiseView.tsx`, `AgentHistoryPage.tsx` — New pages.
- `frontend/src/pages/admin/AdminAllRequestsPage.tsx` — New page.
- `frontend/src/components/AiPricingAssistant.tsx`, `EmailThreadSummaryCard.tsx`, `utils/demoAiHelpers.ts` — New.
- `frontend/src/pages/sales/SalesRequestDetail.tsx`, `frontend/src/pages/agent/RequestDetail.tsx` — AI panels.
- `frontend/src/components/EmailPreviewModal.tsx`, `EmailThreadView.tsx` — Smart replies and nudge.
- `frontend/src/pages/FlightAvailability.tsx`, `frontend/src/pages/agent/AgentDashboard.tsx` — Demo parity tweaks.
- `frontend/src/pages/sales/PendingApprovals.tsx` — `search` query parameter support.
