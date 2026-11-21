import { prisma } from '../config/db.js';
import { asyncHandler, parsePagination, pageMeta, assertUuid } from '../utils/http.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { canTransition, canWithdraw } from '../utils/statusFlow.js';

const detailInclude = {
  job: { select: { id: true, title: true, companyName: true, location: true, employmentType: true, status: true, recruiter: { select: { userId: true } } } },
  candidate: { select: { id: true, name: true, email: true, candidateProfile: true } },
  resume: { select: { id: true, fileName: true, contentType: true, fileSize: true, uploadedAt: true } },
  history: { orderBy: { changedAt: 'asc' }, include: { actor: { select: { id: true, name: true, role: true } } } },
};
const listInclude = {
  job: { select: { id: true, title: true, companyName: true, location: true, employmentType: true } },
  candidate: { select: { id: true, name: true, email: true } },
  resume: { select: { id: true, fileName: true } },
};

function strip(app) {
  if (app.job?.recruiter) { const { recruiter, ...job } = app.job; app.job = job; } // eslint-disable-line no-unused-vars
  return app;
}

export const apply = asyncHandler(async (req, res) => {
  const { jobId, resumeId, coverNote } = req.body;
  const [job, resume] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.resume.findUnique({ where: { id: resumeId } }),
  ]);
  if (!job) throw notFound('Job not found');
  if (job.status !== 'OPEN') throw badRequest('This job is closed to new applications');
  if (!resume || resume.candidateId !== req.user.id) throw badRequest('Selected resume not found');
  const existing = await prisma.application.findUnique({ where: { candidateId_jobId: { candidateId: req.user.id, jobId } } });
  if (existing) throw conflict('You have already applied for this job');
  const app = await prisma.application.create({
    data: {
      candidateId: req.user.id, jobId, resumeId, coverNote,
      history: { create: { oldStatus: null, newStatus: 'APPLIED', changedBy: req.user.id, note: 'Application submitted' } },
    },
    include: listInclude,
  });
  res.status(201).json({ data: app });
});

export const myApplications = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query);
  const where = { candidateId: req.user.id };
  if (req.query.status) where.status = String(req.query.status);
  const [total, rows] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({ where, include: listInclude, orderBy: { appliedAt: 'desc' }, skip: pg.skip, take: pg.take }),
  ]);
  res.json({ data: rows, meta: pageMeta(pg, total) });
});

// Recruiter: applications on own jobs. Admin: all.
export const listApplications = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query);
  const where = {};
  if (req.user.role === 'RECRUITER') where.job = { recruiter: { userId: req.user.id } };
  if (req.query.jobId) { assertUuid(String(req.query.jobId)); where.jobId = String(req.query.jobId); }
  if (req.query.status) where.status = String(req.query.status);
  if (req.query.q) where.candidate = { OR: [{ name: { contains: String(req.query.q), mode: 'insensitive' } }, { email: { contains: String(req.query.q), mode: 'insensitive' } }] };
  const [total, rows] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({ where, include: listInclude, orderBy: { appliedAt: 'desc' }, skip: pg.skip, take: pg.take }),
  ]);
  res.json({ data: rows, meta: pageMeta(pg, total) });
});

async function loadForActor(req) {
  assertUuid(req.params.id);
  const app = await prisma.application.findUnique({ where: { id: req.params.id }, include: detailInclude });
  if (!app) throw notFound('Application not found');
  const u = req.user;
  const ok = u.role === 'ADMIN' || app.candidateId === u.id || (u.role === 'RECRUITER' && app.job.recruiter.userId === u.id);
  if (!ok) throw forbidden('You do not have access to this application');
  return app;
}

export const getApplication = asyncHandler(async (req, res) => {
  const app = await loadForActor(req);
  res.json({ data: strip(app) });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const app = await loadForActor(req);
  if (req.user.role === 'CANDIDATE') throw forbidden();
  const { status: next, note } = req.body;
  const isAdmin = req.user.role === 'ADMIN';
  if (next === app.status) throw badRequest(`Application is already ${app.status}`);
  if (!canTransition(app.status, next)) {
    if (!isAdmin) throw badRequest(`Invalid status change: ${app.status} -> ${next}`, [{ field: 'status', message: 'Transition not allowed' }]);
    if (!note) throw badRequest('Administrator overrides require a note explaining the change', [{ field: 'note', message: 'Required for override' }]);
  }
  const updated = await prisma.$transaction(async (tx) => {
    // Optimistic guard against concurrent changes
    const r = await tx.application.updateMany({ where: { id: app.id, status: app.status }, data: { status: next } });
    if (r.count === 0) throw conflict('Application status changed concurrently. Reload and retry.');
    await tx.applicationStatusHistory.create({
      data: { applicationId: app.id, oldStatus: app.status, newStatus: next, changedBy: req.user.id, note: canTransition(app.status, next) ? note : `[ADMIN OVERRIDE] ${note}` },
    });
    return tx.application.findUnique({ where: { id: app.id }, include: detailInclude });
  });
  res.json({ data: strip(updated) });
});

export const withdraw = asyncHandler(async (req, res) => {
  const app = await loadForActor(req);
  if (app.candidateId !== req.user.id) throw forbidden('Only the applicant can withdraw an application');
  if (!canWithdraw(app.status)) throw badRequest(`Applications in ${app.status} status can no longer be withdrawn`);
  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.application.updateMany({ where: { id: app.id, status: app.status }, data: { status: 'WITHDRAWN' } });
    if (r.count === 0) throw conflict('Application status changed concurrently. Reload and retry.');
    await tx.applicationStatusHistory.create({
      data: { applicationId: app.id, oldStatus: app.status, newStatus: 'WITHDRAWN', changedBy: req.user.id, note: 'Withdrawn by candidate' },
    });
    return tx.application.findUnique({ where: { id: app.id }, include: detailInclude });
  });
  res.json({ data: strip(updated) });
});
