# REST API

Base URL `http://localhost:5000/api` (or `/api` via the Vite proxy). JSON in/out except resume upload (multipart) and download (binary).

**Auth**: an httpOnly cookie `jp_token` set by register/login. No bearer tokens. **Success**: `{ "data": … , "meta"?: { page, limit, total, totalPages } }`. **Error**: `{ "error": { "code", "message", "details"? } }`.

Common statuses: 400 validation, 401 not authenticated, 403 forbidden (role/ownership), 404, 409 conflict, 413 payload too large, 429 rate limited, 503 not ready.

## Monitoring
| | | |
|---|---|---|
| GET | `/health` | `{ "status":"ok","uptime":12.3,"timestamp":"…" }` (no DB) |
| GET | `/ready` | `{ "status":"ready","database":"up" }` or 503 `{ "status":"not_ready","database":"down" }` |

## Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password, role: "CANDIDATE"\|"RECRUITER", companyName? }` | `ADMIN` rejected (400). Password ≥8 chars with letter + digit. Recruiters need `companyName`. 201 + cookie. 409 if email exists. |
| POST | `/auth/login` | `{ email, password }` | 200 + cookie · 401 bad credentials · 403 deactivated. Rate limited. |
| POST | `/auth/logout` | — | Clears cookie. |
| GET | `/auth/me` | — | `{ data: { user } }` · 401 |

Response: `{ "data": { "user": { "id","name","email","role","isActive","createdAt" } } }`

## Profile (any logged-in user)
`GET /profile` · `PUT /profile` `{ name?, phone?, location?, skills?, education?, bio?, companyName?, companyDescription?, website? }` (candidate fields for candidates, company fields for recruiters; website must be http/https).

## Jobs
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/jobs?q&type&location&status&mine&page&limit` | public | Public sees OPEN only. `type` ∈ FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, REMOTE. `q` matches title/company/description/requirements; `location` is case-insensitive contains. `mine=true` (recruiter) lists own jobs incl. closed. Admin sees all (`status` filter). Max `limit` 50. |
| GET | `/jobs/:id` | public | Adds `hasApplied` for candidates. Closed jobs hidden from anonymous users. |
| POST | `/jobs` | recruiter | `{ title, location, employmentType, salaryRange?, description (≥20), requirements (≥10) }` → 201 |
| PATCH | `/jobs/:id` | owner recruiter / admin | any subset incl. `status: "OPEN"\|"CLOSED"` · 403 for other recruiters |
| DELETE | `/jobs/:id` | owner recruiter / admin | cascades applications |

## Applications
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/applications` | candidate | `{ jobId, resumeId, coverNote? }` · 201 · 409 duplicate · 400 closed job / foreign resume |
| GET | `/applications/my?status&page&limit` | candidate | |
| GET | `/applications?jobId&status&q&page&limit` | recruiter (own jobs) / admin (all) | |
| GET | `/applications/:id` | candidate (own), recruiter (own job), admin | includes `job`, `candidate` + profile, `resume`, `history[]` with actors |
| PATCH | `/applications/:id/status` | recruiter (own job) / admin | `{ status, note? }`. Recruiter: only valid next stage (400 otherwise). Admin: any status, **note required** for non-workflow moves; recorded as `[ADMIN OVERRIDE]`. |
| PATCH | `/applications/:id/withdraw` | applicant | only from APPLIED/SHORTLISTED/INTERVIEW |

Example history item: `{ "id","oldStatus":"APPLIED","newStatus":"SHORTLISTED","changedAt":"…","note":null,"actor":{ "id","name":"Priya Sharma","role":"RECRUITER" } }`

## Resumes
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/resumes` | candidate | multipart field `resume`; PDF/DOCX ≤5 MB; content-sniffed → 201 `{ id, fileName, contentType, fileSize, uploadedAt }` · 400 unsupported · 413 too big |
| GET | `/resumes/my` | candidate | with usage counts |
| DELETE | `/resumes/:id` | owner | 409 if attached to an application |
| GET | `/resumes/:id/download` | owner, admin, recruiter of a job it was submitted to | attachment download |

## Dashboards
`GET /dashboard/candidate` → `{ totals:{applications,resumes,openJobs}, byStatus, recent[] }` ·
`GET /dashboard/recruiter` → `{ totals:{openJobs,closedJobs,applications}, byStatus, recent[], perJob[] }` ·
`GET /dashboard/admin` → `{ totals:{users,recruiters,candidates,jobs,openJobs,applications}, byStatus, jobsByType[] }`

## Admin
`GET /admin/users?role&q&page&limit` · `PATCH /admin/users/:id` `{ isActive: boolean }` (cannot change self; deactivated users are logged out on their next request).
