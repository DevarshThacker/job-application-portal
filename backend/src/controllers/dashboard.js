import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';

const STATUSES = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'];
const toCounts = (groups) => Object.fromEntries(STATUSES.map((s) => [s, groups.find((g) => g.status === s)?._count._all ?? 0]));

export const candidate = asyncHandler(async (req, res) => {
  const where = { candidateId: req.user.id };
  const [groups, recent, resumes, openJobs] = await Promise.all([
    prisma.application.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.application.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 5, include: { job: { select: { id: true, title: true, companyName: true, location: true } } } }),
    prisma.resume.count({ where }),
    prisma.job.count({ where: { status: 'OPEN' } }),
  ]);
  const byStatus = toCounts(groups);
  res.json({ data: { totals: { applications: Object.values(byStatus).reduce((a, b) => a + b, 0), resumes, openJobs }, byStatus, recent } });
});

export const recruiter = asyncHandler(async (req, res) => {
  const jobWhere = { recruiter: { userId: req.user.id } };
  const appWhere = { job: jobWhere };
  const [openJobs, closedJobs, groups, recent, perJob] = await Promise.all([
    prisma.job.count({ where: { ...jobWhere, status: 'OPEN' } }),
    prisma.job.count({ where: { ...jobWhere, status: 'CLOSED' } }),
    prisma.application.groupBy({ by: ['status'], where: appWhere, _count: { _all: true } }),
    prisma.application.findMany({ where: appWhere, orderBy: { appliedAt: 'desc' }, take: 6, include: { candidate: { select: { id: true, name: true } }, job: { select: { id: true, title: true } } } }),
    prisma.job.findMany({ where: jobWhere, select: { id: true, title: true, status: true, _count: { select: { applications: true } } }, orderBy: { createdAt: 'desc' }, take: 8 }),
  ]);
  const byStatus = toCounts(groups);
  res.json({ data: { totals: { openJobs, closedJobs, applications: Object.values(byStatus).reduce((a, b) => a + b, 0) }, byStatus, recent, perJob: perJob.map((j) => ({ id: j.id, title: j.title, status: j.status, applications: j._count.applications })) } });
});

export const admin = asyncHandler(async (_req, res) => {
  const [users, recruiters, candidates, jobs, openJobs, applications, groups, byType] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { role: 'RECRUITER' } }), prisma.user.count({ where: { role: 'CANDIDATE' } }),
    prisma.job.count(), prisma.job.count({ where: { status: 'OPEN' } }), prisma.application.count(),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.job.groupBy({ by: ['employmentType'], _count: { _all: true } }),
  ]);
  res.json({ data: { totals: { users, recruiters, candidates, jobs, openJobs, applications }, byStatus: toCounts(groups), jobsByType: byType.map((b) => ({ type: b.employmentType, count: b._count._all })) } });
});
