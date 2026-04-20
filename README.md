# Smart Air Salam Portal

Monorepo: **Vite + React** frontend and **FastAPI** backend. Production builds serve the SPA from the API container (see `Dockerfile`).

## Deployment (Railway)

Config-as-code lives in [`railway.toml`](railway.toml). Summary:

1. **New Railway project** → deploy this repo (root directory = repo root).
2. **Add PostgreSQL** — Railway injects `DATABASE_URL` on the web service.
3. **Set variables** on the web service (minimum):
   - `SECRET_KEY` — long random string (required in production).
   - `CORS_ORIGINS` — comma-separated origins, including your public app URL (for example the URL shown under **Networking** on Railway).
   - Optional: `CORS_ORIGIN_REGEX` — e.g. `https://.*\.up\.railway\.app$` if you use the default Railway host pattern.
   - If Postgres SSL errors: `DATABASE_SSLMODE=require` (or rely on URL `sslmode` from the plugin).
4. **Networking** → generate a public domain.
5. **Email**: On Railway Free/Hobby, outbound SMTP is often blocked — prefer **Resend** (`RESEND_API_KEY`, HTTPS). See `Backend/.env.example`.
6. **Optional analytics**: `REDIS_URL` — when set, analytics responses can use Redis; otherwise an in-process TTL cache is used (`ANALYTICS_CACHE_TTL_SECONDS`, default `600`).

**Health check:** `GET /api/health` (no DB query; DB is still required at startup for migrations/schema).

**After deploy:** Open `/` for the app. As admin, use **Dashboard** to confirm email config and live stats (users, requests, **API process uptime** since last deploy).

## Local development

- **Backend:** from `Backend/`, install deps and run uvicorn (see `Backend` layout and `.env` from `.env.example`).
- **Frontend:** from `frontend/`, `npm install` and `npm run dev` (Vite dev server; point API base URL to the backend).
