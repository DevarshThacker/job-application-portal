# HireFlow — Job Application Management Portal

A recruitment portal where **candidates** browse jobs, upload resumes and track applications, **recruiters** post jobs and move applicants through a hiring pipeline, and **administrators** oversee the platform.

This is **Phase 1** (local development + testing) of a two-phase project. **Phase 2** deploys the same code to AWS Academy Learner Lab with CodePipeline / CodeBuild / CodeDeploy. Nothing in this repo touches AWS by default.

## Features

| Role | Capabilities |
|---|---|
| Candidate | Register/login, profile, search & filter jobs, upload PDF/DOCX resume (≤5 MB), apply (no duplicates), track status + timeline, withdraw before a final decision |
| Recruiter | Dashboard & stats, create/edit/close/reopen/delete own jobs, view applicants, view profiles, download resumes, move applicants Applied → Shortlisted → Interview → Offer (or Rejected) |
| Admin (seeded only) | Platform stats, list/search/deactivate users, moderate any job, application overview, audited status override (note required) |

Status workflow: `APPLIED → SHORTLISTED → INTERVIEW → OFFER`, and `APPLIED/SHORTLISTED/INTERVIEW → REJECTED`. Every change stores old/new status, actor and timestamp. `OFFER`, `REJECTED`, `WITHDRAWN` are final (only an admin override with a note can change them).

## Technology

React 18 + Vite + Tailwind CSS 4 · React Router · React Hook Form · Axios · Lucide · Recharts — Node 24 / Express 4 · Prisma 6 · PostgreSQL 16 · JWT in an **httpOnly cookie** · bcrypt · Zod · Multer · Pino — Vitest · Supertest · React Testing Library · Playwright · ESLint.

## Prerequisites

Node.js ≥ 20 (tested on 24.19), npm, Docker + Docker Compose. Linux (developed on Zorin OS).

## Install & run

```bash
# 1. dependencies (uses lockfiles)
npm run install:all

# 2. environment
cp .env.example backend/.env        # then edit secrets if you like

# 3. database (Docker, host port 5433), migrations, demo data
npm run db:setup                    # = db:up + db:migrate + db:seed

# 4. start API (5000) and web app (5173)
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Health / readiness | http://localhost:5000/api/health · `/api/ready` |
| PostgreSQL | `localhost:5433` (container `jobportal-db`) |

> **Why 5433?** A system PostgreSQL commonly owns 5432. Change `POSTGRES_HOST_PORT` and `DATABASE_URL` in `.env` if you prefer 5432.

The Vite dev server proxies `/api` to the backend, so the browser sees one origin and the auth cookie is first-party.

## Demo credentials (development only)

Seeded by `npm run db:seed` (safe to re-run). Passwords come from `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD`.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@jobportal.dev` | `Admin@12345` |
| Recruiters | `recruiter1@jobportal.dev` … `recruiter3@jobportal.dev` | `Password@123` |
| Candidates | `candidate1@jobportal.dev` … `candidate10@jobportal.dev` | `Password@123` |

Seed: 1 admin, 3 recruiters, 10 candidates, 18 jobs (Software/Python/React/Full-Stack/Cloud/DevOps/ML engineers, data analysts, …), 21 applications across every stage. Never use these credentials outside local development.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | API + web with reload |
| `npm run db:up` / `db:down` | start/stop PostgreSQL container |
| `npm run db:migrate` | apply migrations (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | create a new migration during development |
| `npm run db:seed` | idempotent demo data |
| `npm run lint` | ESLint (backend + frontend) |
| `npm run test:backend` | Vitest + Supertest integration tests (uses `jobportal_test` DB, auto-migrated) |
| `npm run test:frontend` | Vitest + React Testing Library |
| `npm run test:e2e` | Playwright (needs DB up; starts/reuses dev servers; cleans up its own users) |
| `npm run build` | production frontend build → `frontend/dist` |
| `npm start` | production backend (`NODE_ENV=production` + real `JWT_SECRET`) |

First time with Playwright: `npx playwright install chromium`.

## Documentation

[architecture](docs/architecture.md) · [database design](docs/database-design.md) · [API](docs/api-documentation.md) · [local testing report](docs/local-testing-report.md) · [AWS deployment readiness](docs/aws-deployment-readiness.md) · screenshots in `docs/screenshots/`.

## Repository layout

```
frontend/   React app (src/{components,pages,layouts,context,hooks,services,utils,tests})
backend/    Express API (src/{config,controllers,routes,middleware,storage,validators,utils,tests}, prisma/, scripts/)
tests/e2e/  Playwright specs
docs/       Documentation and screenshots
docker-compose.yml   local PostgreSQL
```
