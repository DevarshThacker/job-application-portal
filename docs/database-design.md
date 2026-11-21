# Database design (PostgreSQL via Prisma)

Schema: `backend/prisma/schema.prisma`. Migration: `backend/prisma/migrations/20261116133220_init`.

| Table | Purpose | Key columns |
|---|---|---|
| `User` | Every account | `email` UNIQUE, `passwordHash` (bcrypt), `role` (CANDIDATE/RECRUITER/ADMIN), `isActive` |
| `CandidateProfile` | 1:1 with candidate user | `phone, location, skills, education, bio` |
| `RecruiterProfile` | 1:1 with recruiter user | `companyName, companyDescription, website` |
| `Job` | Postings | `recruiterId → RecruiterProfile`, `employmentType`, `status` OPEN/CLOSED, `salaryRange`, `description`, `requirements` |
| `Resume` | Upload metadata | `candidateId → User`, `fileName`, `storageKey` UNIQUE, `contentType`, `fileSize` |
| `Application` | Candidate ↔ job | `candidateId`, `jobId`, `resumeId`, `status`, `coverNote` |
| `ApplicationStatusHistory` | Audit trail | `applicationId`, `oldStatus` (null for first row), `newStatus`, `changedBy → User`, `note`, `changedAt` |

```
User 1─1 CandidateProfile        User 1─* Resume 1─* Application *─1 Job *─1 RecruiterProfile 1─1 User
User 1─1 RecruiterProfile        User 1─* Application (as candidate)
Application 1─* ApplicationStatusHistory *─1 User (actor)
```

## Constraints and indexes
- `UNIQUE (candidateId, jobId)` on `Application` — duplicate applications are impossible even under races (API returns 409).
- `UNIQUE (email)`, `UNIQUE (storageKey)`, `UNIQUE (userId)` on both profile tables.
- Indexes: `Job(status, createdAt)`, `Job(recruiterId)`, `Job(location)`, `Job(employmentType)`, `Application(jobId, status)`, `Application(candidateId)`, `Resume(candidateId)`, `ApplicationStatusHistory(applicationId, changedAt)`, `User(role)`.
- Cascades: deleting a user removes profiles/resumes/applications; deleting a job removes its applications and history.
- `Application.resumeId` and `ApplicationStatusHistory.changedBy` are `ON DELETE RESTRICT` deliberately: audit rows and in-use resumes must not disappear implicitly. The app never hard-deletes users — admins **deactivate** them (`isActive=false`), which also invalidates their session.

## Additions beyond the brief
`User.isActive` (recruiter/user access control), `Application.coverNote`, `ApplicationStatusHistory.note`, and a `WITHDRAWN` status for candidate withdrawals.

## Seed (`prisma/seed.js`)
Idempotent: users via `upsert` on email, jobs matched by recruiter+title, applications skipped when the (candidate, job) pair exists. Demo resumes are real one-page PDFs written under `UPLOAD_DIR` using the same key layout as the app.
