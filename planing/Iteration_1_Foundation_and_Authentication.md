# Iteration 1: Foundation & Authentication

## Duration: Sprint 1-2 (2 Weeks)

## Priority: CRITICAL (Blocker for all other iterations)

---

## Objective

Set up the project infrastructure, database, and authentication system that forms the backbone of the entire platform.

---

## Scope

### Backend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 1.1 | Project Scaffolding | Initialize FastAPI project with proper folder structure | Pending |
| 1.2 | Database Setup | Configure PostgreSQL connection, SQLAlchemy ORM, Alembic migrations | Pending |
| 1.3 | User Model | Create `users` table with fields: id, name, email, password, role, city, created_at, updated_at | Pending |
| 1.4 | Password Hashing | Implement bcrypt password hashing via passlib | Pending |
| 1.5 | JWT Authentication | Implement token generation and validation using python-jose | Pending |
| 1.6 | Register API | `POST /api/v1/auth/register` - Create user account | Pending |
| 1.7 | Login API | `POST /api/v1/auth/login` - Authenticate and return JWT token | Pending |
| 1.8 | Current User API | `GET /api/v1/auth/me` - Return logged-in user profile | Pending |
| 1.9 | Role-Based Access Control | Implement RBAC middleware for Agent, Sales Support, Admin roles | Pending |
| 1.10 | Input Validation | Pydantic schemas for all request/response models | Pending |
| 1.11 | Error Handling | Global exception handler with standard error response format | Pending |
| 1.12 | CORS Configuration | Allow frontend origin for cross-origin requests | Pending |

### Frontend Tasks

| # | Task | Details | Status |
|---|------|---------|--------|
| 1.13 | Project Scaffolding | Initialize React project with Vite, Tailwind CSS, folder structure | Pending |
| 1.14 | Routing Setup | Configure React Router with protected/public routes | Pending |
| 1.15 | API Service Layer | Set up Axios instance with base URL, interceptors, token handling | Pending |
| 1.16 | Auth Store | Zustand/Redux store for auth state (user, token, login/logout) | Pending |
| 1.17 | Login Page | Email + password form, validation, error display | Pending |
| 1.18 | App Layout | Sidebar navigation, header with user info, role-based menu items | Pending |
| 1.19 | Route Guards | Redirect unauthenticated users to login, role-based route protection | Pending |
| 1.20 | Token Persistence | Store JWT in localStorage/cookie, auto-refresh on app load | Pending |

---

## Backend Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── core/
│   │   ├── config.py          # Environment variables, settings
│   │   ├── security.py        # JWT, password hashing
│   │   ├── dependencies.py    # Common dependencies
│   ├── db/
│   │   ├── base.py            # SQLAlchemy Base
│   │   ├── session.py         # DB session factory
│   ├── models/
│   │   ├── user.py            # User ORM model
│   ├── schemas/
│   │   ├── user.py            # Pydantic schemas
│   │   ├── auth.py            # Login/Register schemas
│   ├── api/
│   │   ├── deps.py            # Dependency injection (get_db, get_current_user)
│   │   ├── routes/
│   │   │   ├── auth.py        # Auth endpoints
├── alembic/                   # Database migrations
├── requirements.txt
├── .env
```

## Frontend Folder Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── AppLayout.tsx
│   ├── services/
│   │   ├── api.ts             # Axios instance
│   │   ├── authService.ts
│   ├── store/
│   │   ├── authStore.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   ├── utils/
│   │   ├── constants.ts
│   ├── App.tsx
│   ├── main.tsx
├── package.json
├── tailwind.config.js
├── vite.config.ts
```

---

## API Contracts (This Iteration)

### POST /api/v1/auth/register

**Request:**
```json
{
  "name": "Sadiq Ali",
  "email": "sadiq@agent.com",
  "password": "securepass123",
  "role": "agent",
  "city": "Karachi"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Sadiq Ali",
  "email": "sadiq@agent.com",
  "role": "agent"
}
```

### POST /api/v1/auth/login

**Request:**
```json
{
  "email": "sadiq@agent.com",
  "password": "securepass123"
}
```

**Response (200):**
```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "name": "Sadiq Ali",
    "role": "agent"
  }
}
```

### GET /api/v1/auth/me

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Sadiq Ali",
  "email": "sadiq@agent.com",
  "role": "agent",
  "city": "Karachi"
}
```

---

## Database Schema

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | Primary Key, default uuid4 |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password | VARCHAR(255) | NOT NULL (hashed) |
| role | VARCHAR(20) | NOT NULL (agent/sales/admin) |
| city | VARCHAR(100) | NULLABLE |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

---

## Acceptance Criteria

- [ ] Backend starts without errors on `uvicorn app.main:app --reload`
- [ ] PostgreSQL connected and migrations run successfully
- [ ] User can register with valid data
- [ ] Duplicate email returns proper error
- [ ] User can login and receive JWT token
- [ ] Invalid credentials return 401 error
- [ ] Protected routes reject requests without valid token
- [ ] Role-based access control blocks unauthorized roles
- [ ] Frontend login page renders correctly
- [ ] Successful login redirects to dashboard
- [ ] Unauthenticated users redirected to login page
- [ ] Layout displays correct menu items per role
- [ ] Token persists across page refresh

---

## Dependencies

**Backend:** fastapi, uvicorn, sqlalchemy, psycopg2-binary, python-jose, passlib[bcrypt], pydantic, python-multipart, alembic, python-dotenv

**Frontend:** react, react-router-dom, axios, zustand (or @reduxjs/toolkit), tailwindcss, @headlessui/react, lucide-react

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| DB connection issues | Use environment variables, test connection on startup |
| JWT token expiry handling | Implement refresh token or auto-logout |
| CORS errors | Configure CORS middleware properly |

---

## Definition of Done

- All APIs tested via Postman/Swagger
- Frontend login flow works end-to-end
- Role-based routing verified for all 3 roles
- No console errors in browser
- Code committed with clean structure
