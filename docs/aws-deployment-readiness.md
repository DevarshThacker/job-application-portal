# AWS deployment readiness (input for Phase 2)

Phase 1 created **no AWS resources**. This document lists what Phase 2 needs. AWS Academy Learner Lab specifics (pre-made `LabRole` / `LabInstanceProfile`, no IAM role creation, rotating credentials, region limits) must be re-verified when you start the lab.

## Services
| Service | Role |
|---|---|
| EC2 (Amazon Linux 2023 / Ubuntu) | runs Node API (+ nginx serving the built SPA) |
| RDS PostgreSQL 16 (or Postgres on the instance for a minimal setup) | database |
| S3 (private bucket, block public access) | resume storage |
| IAM instance profile (Learner Lab: `LabInstanceProfile`) | S3 access without keys; CodeDeploy agent access |
| CodePipeline + CodeBuild + CodeDeploy | CI/CD |
| CloudWatch Logs (agent) | collects JSON logs from stdout / journald |
| SSM Parameter Store or Secrets Manager (optional) | `DATABASE_URL`, `JWT_SECRET` |
| Security groups | 80/443 public, 22 restricted, 5432 only from the app SG |

## Environment variables (backend)
| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (nginx proxies `/api` to it) |
| `DATABASE_URL` | `postgresql://USER:PASS@RDS_ENDPOINT:5432/jobportal?schema=public` |
| `JWT_SECRET` | random ≥32 chars (app exits if it starts with `change-me`) |
| `JWT_EXPIRES_IN` | `8h` |
| `COOKIE_SECURE` | `true` when served over HTTPS; **`false` if the lab only offers plain HTTP** |
| `COOKIE_SAMESITE` | `lax` (same-origin through nginx) |
| `CORS_ORIGIN` | public origin, e.g. `https://app.example.com` or `http://EC2_PUBLIC_DNS` |
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET` / `AWS_REGION` | bucket name / region — **no access keys**; SDK uses the instance profile |
| `AUTH_RATE_LIMIT_MAX` | `30` |
| `LOG_LEVEL` | `info` |

Frontend needs no build-time variables when served same-origin (`VITE_API_URL` defaults to `/api`).

## Build commands (CodeBuild)
```bash
npm ci --prefix backend
npx --prefix backend prisma generate --schema backend/prisma/schema.prisma
npm run lint && npm test            # needs a Postgres service/container for backend integration tests (TEST_DATABASE_URL)
npm ci --prefix frontend && npm run build        # → frontend/dist
# artifact: backend/ (src, prisma, package*.json), frontend/dist, appspec.yml, deploy scripts
```
Builds are deterministic (lockfiles committed, `npm ci`). Install on the server with `npm ci --omit=dev --prefix backend` — `prisma` is a runtime dependency so `migrate deploy` works there.

## Start / stop strategy (Linux)
- Run the API as a systemd unit (`ExecStart=/usr/bin/node src/server.js`, `WorkingDirectory=…/backend`, `EnvironmentFile=/etc/jobportal.env`, `Restart=on-failure`). It handles SIGTERM gracefully (drains, disconnects Prisma).
- nginx: serve `frontend/dist` with SPA fallback (`try_files $uri /index.html`) and `location /api/ { proxy_pass http://127.0.0.1:5000; }` (the app sets `trust proxy` = 1).
- Stdout is newline-delimited JSON (`level, time, service, env, req, res`) — ship via the CloudWatch agent or journald.

## Database
- PostgreSQL 16, UTF-8. Apply schema with `npx prisma migrate deploy` (idempotent, run in CodeDeploy `AfterInstall`).
- Seed (`npm run seed`) is demo-only — **do not run in production** unless you intend demo accounts; it uses `SEED_*_PASSWORD`. Create the first admin deliberately (set `SEED_ADMIN_PASSWORD` to a strong value for a one-off run, then change/remove demo users).

## Storage
Private S3 bucket, SSE-S3 enabled (the driver sets AES256), no public ACLs. Instance role needs `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::BUCKET/resumes/*`. Downloads stream through the API after authorization, so no pre-signed URLs or public access are needed. The S3 driver is covered by a mocked unit test only — **first real S3 round-trip is a Phase 2 smoke test**.

## Health checks
`GET /api/health` (liveness, no DB) and `GET /api/ready` (readiness, 503 if DB down) — use `/api/ready` in the CodeDeploy `ValidateService` hook / ALB target group.

## CodeDeploy prerequisites (to create in Phase 2)
1. EC2 with CodeDeploy agent installed (needs Ruby), tag for the deployment group, instance profile with CodeDeploy + S3 permissions.
2. `appspec.yml` (`os: linux`, `files` → `/opt/jobportal`) and hook scripts: `ApplicationStop` (systemctl stop), `BeforeInstall` (install Node 20+/nginx once), `AfterInstall` (`npm ci --omit=dev`, `prisma migrate deploy`, copy `dist` to nginx root), `ApplicationStart` (systemctl start), `ValidateService` (`curl -f localhost:5000/api/ready`).
3. Environment file with secrets on the instance (or fetched from SSM at `AfterInstall`).
4. CodePipeline: Source (GitHub/CodeCommit) → Build (CodeBuild with `buildspec.yml`) → Deploy (CodeDeploy). Service roles — in Learner Lab use the provided `LabRole` where creation is blocked.
5. RDS/SG connectivity from EC2, S3 bucket created, `.env` values filled in.

## Repository state for CI/CD
Lockfiles committed-ready; `.gitignore` excludes `.env*`, `node_modules`, `dist`, `backend/uploads/*`; no credentials or uploads in the tree; no hardcoded local paths (`UPLOAD_DIR` is relative to the backend working dir; DB/ports/origins come from env).
