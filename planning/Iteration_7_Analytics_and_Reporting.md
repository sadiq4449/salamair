# Iteration 7: Analytics & Reporting Dashboard

## Duration: Sprint 12-13 (2 Weeks)

## Priority: MEDIUM

## Depends On: Iteration 6 (Notification System)

---

## Objective

Build comprehensive analytics and reporting dashboards that provide actionable insights on agent performance, sales metrics, revenue trends, and operational KPIs for data-driven decision making.

---

## Scope

### Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 7.1 | Analytics Aggregation Service | Service to calculate and cache metrics | Pending |
| 7.2 | Agent Performance API | `GET /api/v1/analytics/agent-performance` | Pending |
| 7.3 | Sales Dashboard API | `GET /api/v1/analytics/sales-overview` | Pending |
| 7.4 | Revenue Analytics API | `GET /api/v1/analytics/revenue` | Pending |
| 7.5 | Request Trends API | `GET /api/v1/analytics/request-trends` | Pending |
| 7.6 | City-wise Analytics API | `GET /api/v1/analytics/city-breakdown` | Pending |
| 7.7 | KPI Summary API | `GET /api/v1/analytics/kpis` | Pending |
| 7.8 | Export Report API | `GET /api/v1/analytics/export` - CSV/Excel export | Pending |
| 7.9 | Date Range Filtering | All analytics endpoints support date range params | Pending |
| 7.10 | Redis Caching | Cache computed analytics with TTL (5-15 min) | Pending |
| 7.11 | Celery Aggregation Job | Background job to pre-compute daily/weekly analytics | Pending |
| 7.12 | Analytics Model | Create `analytics_snapshots` table for historical data | Pending |

### Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 7.13 | Analytics Page Layout | Main analytics page with section navigation | Pending |
| 7.14 | KPI Cards Row | Top-level metrics: total requests, approval rate, avg response time, revenue | Pending |
| 7.15 | Request Trend Chart | Line chart showing request volume over time | Pending |
| 7.16 | Status Distribution Chart | Pie/donut chart of request statuses | Pending |
| 7.17 | Agent Performance Table | Ranked list of agents by performance metrics | Pending |
| 7.18 | Revenue Chart | Bar chart with revenue by period (week/month) | Pending |
| 7.19 | City Breakdown Chart | Bar/map showing requests by city | Pending |
| 7.20 | Response Time Chart | Average response time trends | Pending |
| 7.21 | Date Range Picker | Filter all analytics by custom date range | Pending |
| 7.22 | Period Selector | Quick select: Today, This Week, This Month, This Quarter | Pending |
| 7.23 | Export Button | Download analytics as CSV/Excel | Pending |
| 7.24 | Loading Skeletons | Skeleton states for chart loading | Pending |
| 7.25 | Comparison Indicators | Up/down arrows showing change vs previous period | Pending |

---

## API Contracts (This Iteration)

### GET /api/v1/analytics/kpis

**Query Params:**
```
?from=2026-04-01&to=2026-04-14&period=weekly
```

**Response (200):**
```json
{
  "period": {
    "from": "2026-04-01",
    "to": "2026-04-14"
  },
  "kpis": {
    "total_requests": 342,
    "total_requests_change": 12.5,
    "approval_rate": 68.4,
    "approval_rate_change": 3.2,
    "avg_response_time_hours": 4.2,
    "avg_response_time_change": -15.0,
    "total_revenue": 2450000,
    "total_revenue_change": 8.7,
    "pending_requests": 23,
    "active_agents": 45
  }
}
```

### GET /api/v1/analytics/agent-performance

**Query Params:**
```
?from=2026-04-01&to=2026-04-14&sort=revenue&limit=20
```

**Response (200):**
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "Ali Khan",
      "company": "Sky Travels",
      "city": "Karachi",
      "total_requests": 28,
      "approved": 18,
      "rejected": 5,
      "pending": 5,
      "approval_rate": 64.3,
      "total_revenue": 185000,
      "avg_response_time_hours": 3.5
    }
  ],
  "total": 45
}
```

### GET /api/v1/analytics/revenue

**Query Params:**
```
?from=2026-01-01&to=2026-04-14&granularity=monthly
```

**Response (200):**
```json
{
  "data": [
    { "period": "2026-01", "revenue": 1200000, "request_count": 180 },
    { "period": "2026-02", "revenue": 1450000, "request_count": 210 },
    { "period": "2026-03", "revenue": 1800000, "request_count": 265 },
    { "period": "2026-04", "revenue": 980000, "request_count": 142 }
  ],
  "total_revenue": 5430000,
  "avg_monthly_revenue": 1357500
}
```

### GET /api/v1/analytics/request-trends

**Query Params:**
```
?from=2026-04-01&to=2026-04-14&granularity=daily
```

**Response (200):**
```json
{
  "data": [
    { "date": "2026-04-01", "submitted": 25, "approved": 18, "rejected": 4, "pending": 3 },
    { "date": "2026-04-02", "submitted": 30, "approved": 22, "rejected": 5, "pending": 3 }
  ]
}
```

### GET /api/v1/analytics/city-breakdown

**Response (200):**
```json
{
  "data": [
    { "city": "Karachi", "requests": 120, "revenue": 850000, "agents": 15 },
    { "city": "Lahore", "requests": 95, "revenue": 620000, "agents": 12 },
    { "city": "Dubai", "requests": 80, "revenue": 950000, "agents": 8 }
  ]
}
```

### GET /api/v1/analytics/export

**Query Params:**
```
?type=agent_performance&format=csv&from=2026-04-01&to=2026-04-14
```

**Response:** CSV/Excel file download

---

## Database Schema

### analytics_snapshots

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key |
| snapshot_date | DATE | NOT NULL |
| metric_type | VARCHAR(50) | NOT NULL |
| metric_data | JSONB | NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |

**Index:** (snapshot_date, metric_type) UNIQUE

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Date Range Picker]  [Period: Today | Week | Month]    │
├──────────┬──────────┬──────────┬────────────────────────┤
│  Total   │ Approval │ Avg Resp │  Total Revenue         │
│  342     │  68.4%   │  4.2 hrs │  PKR 2.45M            │
│  ↑ 12.5% │  ↑ 3.2%  │  ↓ 15%   │  ↑ 8.7%               │
├──────────┴──────────┴──────────┴────────────────────────┤
│                                                         │
│  Request Trends (Line Chart)        Status Distribution │
│  ─────────────────                  ┌───────────┐       │
│                                     │  Pie Chart │       │
│                                     └───────────┘       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Revenue Chart (Bar)              City Breakdown (Bar)  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Agent Performance Table                   [Export CSV] │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Rank │ Agent │ Requests │ Approved │ Revenue       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Chart Library

Recommended: **Recharts** or **Chart.js** (via react-chartjs-2)

Charts needed:
- Line chart (request trends, response time)
- Bar chart (revenue, city breakdown)
- Pie/Donut chart (status distribution)
- Stat cards with delta indicators

---

## Acceptance Criteria

- [ ] KPI cards display correct real-time metrics
- [ ] Change indicators show comparison with previous period
- [ ] Request trends chart renders daily/weekly/monthly data
- [ ] Revenue chart shows correct financial data
- [ ] Agent performance table is sortable and paginated
- [ ] City breakdown displays geographic distribution
- [ ] Date range picker filters all analytics
- [ ] Period quick selectors work correctly
- [ ] CSV/Excel export downloads correctly
- [ ] Analytics load within 2 seconds (cached)
- [ ] Empty states for periods with no data
- [ ] Role-based access (admin/sales see all, agents see own)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Slow query performance | Pre-compute aggregates, Redis caching |
| Stale data displayed | TTL-based cache invalidation, show "last updated" |
| Large data exports | Async export generation, streaming download |
| Chart rendering performance | Limit data points, use virtualization |

---

## Definition of Done

- All KPI metrics calculated correctly
- Charts render with real data
- Date range filtering works across all sections
- Export generates valid CSV/Excel
- Analytics cached with appropriate TTL
- Role-based access enforced
- Responsive layout on all screen sizes
