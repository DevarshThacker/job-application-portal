# Architecture

```
Browser (React SPA, :5173)
   │  same-origin /api  (Vite proxy in dev, reverse proxy in prod)
   ▼
Express API (:5000) ── middleware: pino-http → helmet → CORS → JSON → cookies → origin check
   │   routes → validators (Zod) → auth (JWT cookie) → role guard → controllers
   ├── Prisma ORM ──► PostgreSQL 16
   └── Storage abstraction ──► local ./uploads   |   S3 (AWS SDK v3, instance role)
```

## Frontend
- **Routing**: public layout (home, jobs, login/register, 404) and a role-aware dashboard layout (sidebar). `ProtectedRoute` checks the session and role; wrong roles are redirected to their own home.
- **State**: `AuthContext` (user from `GET /api/auth/me`), `ToastContext`; server data fetched with a small `useFetch` hook that ignores stale responses. Forms use React Hook Form.
- **Security**: no token ever touches JS — the session is an httpOnly cookie. All API calls go through one Axios instance (`withCredentials`).
- **Shared screens**: `ApplicationDetail` serves candidate, recruiter and admin views; `ManageJobs` and `Applicants` are shared by recruiter and admin with an `admin` flag.

## Backend
- `config/` validates env with Zod at boot (fails fast; refuses the example JWT secret in production, requires `S3_BUCKET` for S3).
- `middleware/auth.js`: verifies the cookie JWT, reloads the user (so deactivation takes effect immediately), `requireRole(...)`.
- Ownership is enforced in controllers: recruiters can only touch jobs/applications under their own `RecruiterProfile`; candidates only their own data; admins everything.
- `errorHandler` maps `AppError`, Zod, Multer and Prisma errors (P2002→409, P2025→404, P2003→409) to `{ "error": { code, message, details? } }`.
- Auth endpoints are rate limited (`AUTH_RATE_LIMIT_MAX` per 15 min per IP).
- State-changing requests with an `Origin` header outside `CORS_ORIGIN` are rejected (defence in depth on top of `SameSite` cookies).
- Logging: Pino JSON to stdout (CloudWatch-friendly), cookies/authorization redacted, `/api/health` not logged.
- Graceful shutdown on SIGTERM/SIGINT.

## Resume flow
1. `POST /api/resumes` (multipart, memory storage, 5 MB cap).
2. Content sniffed from magic bytes (`%PDF-` or `file-type` for DOCX) — filename/client MIME ignored.
3. Stored under `resumes/<userId>/<uuid>.<ext>` via the storage driver; only metadata + key go in PostgreSQL.
4. `GET /api/resumes/:id/download` streams through the API after an authorization check (owner, admin, or the recruiter who owns a job the resume was submitted to). `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment`, `Cache-Control: private, no-store`. The uploads folder is never served statically.

## Application data flow (example)
Candidate clicks *Apply* → `POST /api/applications` → validate → check job OPEN, resume belongs to caller, no duplicate (also enforced by a DB unique index) → create application + first history row in one write → recruiter sees it in `GET /api/applications` → `PATCH /:id/status` runs inside a transaction with an optimistic `WHERE status = <old>` guard and writes a history row → candidate's `GET /api/applications/:id` returns the timeline.
