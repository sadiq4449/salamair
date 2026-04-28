# Iteration 10: AI Features & Optimization

## Duration: Sprint 17-18 (2 Weeks)

## Priority: LOW (Future Enhancement)

## Depends On: Iterations 1-9 (Complete platform)

---

## Objective

Integrate AI-powered features for intelligent pricing suggestions, email summarization, smart reply generation, and risk detection. Also perform platform-wide performance optimization and prepare for production deployment.

---

## Scope

### AI Features - Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 10.1 | AI Service Layer | Create pluggable AI service (OpenAI / local model integration) | Pending |
| 10.2 | Rule-based Pricing (Phase 1) | Suggest prices based on historical route/pax data | Pending |
| 10.3 | AI Pricing Model (Phase 2) | ML-based pricing suggestions with confidence score | Pending |
| 10.4 | Price Suggestion API | `GET /api/v1/ai/price-suggestion?route=KHI-DXB&pax=2` | Pending |
| 10.5 | Email Summarization API | `POST /api/v1/ai/summarize-email` - Summarize email threads | Pending |
| 10.6 | Smart Reply API | `POST /api/v1/ai/smart-reply` - Generate reply suggestions | Pending |
| 10.7 | Risk Detection Service | Detect anomalies: unusual pricing, suspicious patterns | Pending |
| 10.8 | Risk Alert API | `GET /api/v1/ai/risk-alerts` - List flagged anomalies | Pending |
| 10.9 | AI Feedback Loop | `POST /api/v1/ai/feedback` - User accepts/rejects suggestion | Pending |
| 10.10 | Historical Data Pipeline | ETL pipeline to prepare training data from past requests | Pending |

### Optimization - Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 10.11 | Database Indexing | Add indexes on frequently queried columns | Pending |
| 10.12 | Query Optimization | Optimize N+1 queries, use eager loading | Pending |
| 10.13 | Redis Caching | Cache frequently accessed data (user profiles, request lists) | Pending |
| 10.14 | API Response Compression | Enable gzip compression on API responses | Pending |
| 10.15 | Rate Limiting | Implement per-user rate limiting on all endpoints | Pending |
| 10.16 | Connection Pooling | Optimize DB connection pool settings | Pending |
| 10.17 | Async Optimization | Ensure all I/O operations are async | Pending |
| 10.18 | Load Testing | Test platform under expected load (1000+ requests/day) | Pending |
| 10.19 | Error Monitoring | Set up error tracking (Sentry or similar) | Pending |
| 10.20 | API Documentation | Auto-generate OpenAPI/Swagger docs | Pending |

### AI Features - Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 10.21 | Price Suggestion Widget | Show AI-suggested price with confidence in request form | Pending |
| 10.22 | Email Summary Panel | Collapsible summary above email thread | Pending |
| 10.23 | Smart Reply Buttons | Quick-insert buttons for AI-generated replies | Pending |
| 10.24 | Risk Alert Badge | Visual indicator on flagged requests | Pending |
| 10.25 | Risk Alert Dashboard | Admin view of all AI-flagged anomalies | Pending |
| 10.26 | AI Feedback UI | Accept/reject buttons on suggestions for learning | Pending |
| 10.27 | AI Feature Toggles | Admin setting to enable/disable AI features | Pending |

### Optimization - Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 10.28 | Code Splitting | Lazy load routes and heavy components | Pending |
| 10.29 | Bundle Optimization | Analyze and reduce bundle size | Pending |
| 10.30 | Image Optimization | Compress and lazy load images | Pending |
| 10.31 | Memoization | React.memo and useMemo for expensive renders | Pending |
| 10.32 | Virtual Scrolling | Virtualize long lists (requests, messages) | Pending |
| 10.33 | Service Worker | Offline support and asset caching | Pending |
| 10.34 | Performance Monitoring | Core Web Vitals tracking | Pending |

---

## API Contracts (This Iteration)

### GET /api/v1/ai/price-suggestion

**Query Params:**
```
?route=KHI-DXB&pax=2&travel_date=2026-05-15
```

**Response (200):**
```json
{
  "suggested_price": 47500,
  "confidence": 0.85,
  "price_range": {
    "min": 42000,
    "max": 55000
  },
  "basis": "Based on 45 similar requests in the last 90 days",
  "similar_requests": [
    {
      "request_code": "REQ-0980",
      "price": 48000,
      "status": "approved",
      "date": "2026-03-20"
    },
    {
      "request_code": "REQ-0945",
      "price": 46000,
      "status": "approved",
      "date": "2026-03-15"
    }
  ]
}
```

### POST /api/v1/ai/summarize-email

**Request:**
```json
{
  "request_id": "uuid"
}
```

**Response (200):**
```json
{
  "summary": "RM approved the fare at PKR 48,000 for KHI→DXB route (2 PAX). Valid for 7 days from April 14. RM noted seasonal pricing may apply after May 1.",
  "key_points": [
    "Fare approved at PKR 48,000",
    "Valid for 7 days",
    "Seasonal pricing may apply after May 1"
  ],
  "email_count": 4,
  "generated_at": "2026-04-14T15:00:00Z"
}
```

### POST /api/v1/ai/smart-reply

**Request:**
```json
{
  "request_id": "uuid",
  "context": "RM just approved at 48,000"
}
```

**Response (200):**
```json
{
  "suggestions": [
    {
      "id": 1,
      "text": "Thank you for the approval. I'll confirm this with the agent and process the booking.",
      "tone": "professional"
    },
    {
      "id": 2,
      "text": "Confirmed. Proceeding with the fare at PKR 48,000. Will update the request status.",
      "tone": "concise"
    },
    {
      "id": 3,
      "text": "Noted. Could we also get approval for the return leg at a similar rate?",
      "tone": "follow-up"
    }
  ]
}
```

### GET /api/v1/ai/risk-alerts

**Response (200):**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "type": "UNUSUAL_PRICING",
      "severity": "medium",
      "request_code": "REQ-1030",
      "message": "Requested price is 40% below average for this route",
      "details": {
        "requested_price": 25000,
        "average_price": 42000,
        "deviation_percentage": -40.5
      },
      "created_at": "2026-04-14T12:00:00Z"
    }
  ],
  "total": 3
}
```

### POST /api/v1/ai/feedback

**Request:**
```json
{
  "suggestion_type": "price_suggestion",
  "suggestion_id": "uuid",
  "accepted": true,
  "actual_value": 48000
}
```

**Response (200):**
```json
{
  "message": "Feedback recorded. This helps improve future suggestions."
}
```

---

## AI Architecture

```
Request Data (Historical)
        ↓
Data Pipeline (ETL)
        ↓
Feature Engineering
        ↓
┌───────────────────┐
│   AI Service       │
│  ┌──────────────┐  │
│  │ Phase 1:     │  │
│  │ Rule-based   │  │  ← Simple averages, percentiles
│  │ Engine       │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ Phase 2:     │  │
│  │ ML Model     │  │  ← Trained on historical data
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │ Phase 3:     │  │
│  │ LLM (OpenAI) │  │  ← Email summary, smart replies
│  └──────────────┘  │
└───────────────────┘
        ↓
API Responses
```

### Phase 1: Rule-Based (This Iteration)
- Average price by route/pax from last 90 days
- Flag requests with >30% deviation from average
- Simple pattern matching for risk detection

### Phase 2: ML-Based (Future)
- Train regression model on historical pricing
- Factor in seasonality, demand, advance booking
- Confidence scoring

### Phase 3: LLM Integration (Future)
- OpenAI API for email summarization
- Context-aware smart reply generation
- Natural language risk explanations

---

## Risk Detection Rules (Phase 1)

| Rule | Threshold | Severity |
|------|-----------|----------|
| Price below average | > 30% below | Medium |
| Price above average | > 50% above | Low |
| High volume from single agent | > 20 requests/day | Medium |
| Unusual route | Never requested before | Low |
| Rapid status changes | > 5 changes in 1 hour | High |

---

## Performance Optimization Checklist

### Backend
- [ ] Add composite indexes on (agent_id, status), (created_at), (request_code)
- [ ] Implement query result caching (Redis, TTL: 5 min)
- [ ] Enable connection pooling (min: 5, max: 20)
- [ ] Add gzip middleware for API responses
- [ ] Implement rate limiting (100 req/min per user)
- [ ] Profile and optimize slow queries (> 100ms)
- [ ] Ensure all email/file operations are async

### Frontend
- [ ] Lazy load all route components
- [ ] Reduce initial bundle size to < 200KB gzip
- [ ] Implement virtual scrolling for lists > 100 items
- [ ] Add React.memo to frequently re-rendered components
- [ ] Enable service worker for asset caching
- [ ] Optimize images with WebP format
- [ ] Monitor Core Web Vitals (LCP < 2.5s, FID < 100ms)

---

## Acceptance Criteria

- [ ] Price suggestion shows relevant recommendation with confidence
- [ ] Email summary extracts key points accurately
- [ ] Smart replies are contextually appropriate
- [ ] Risk alerts flag genuine anomalies
- [ ] AI feedback loop records user responses
- [ ] AI features toggleable from admin panel
- [ ] API response times < 300ms for standard endpoints
- [ ] Platform handles 1000+ concurrent users
- [ ] Load test passes without degradation
- [ ] Frontend loads within 3 seconds on standard connection
- [ ] Swagger documentation auto-generated and accessible
- [ ] Error monitoring captures and reports issues

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI suggestions inaccurate | Start with rule-based, improve with data |
| LLM API costs | Cache frequent queries, rate limit AI calls |
| Performance regression | Continuous load testing, monitoring alerts |
| AI bias in pricing | Regular model audits, human override always available |

---

## Definition of Done

- Rule-based pricing suggestions working
- Email summarization producing useful summaries
- Smart reply generation contextually relevant
- Risk detection flagging anomalies
- Platform performance meets SLA targets
- Frontend optimized for production
- Full API documentation available
- Load testing completed successfully
