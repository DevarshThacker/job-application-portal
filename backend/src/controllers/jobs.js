import { prisma } from '../config/db.js';
import { asyncHandler, parsePagination, pageMeta, assertUuid } from '../utils/http.js';
import { notFound, forbidden } from '../utils/errors.js';

const jobInclude = { recruiter: { select: { id: true, userId: true, companyName: true, website: true } }, _count: { select: { applications: true } } };

export const listJobs = asyncHandler(async (req, res) => {
  const { q, type, location, status, mine } = req.validatedQuery;
  const pg = parsePagination(req.query);
  const where = {};
  const user = req.user;
  if (mine === 'true') {
    if (!user || user.role !== 'RECRUITER') throw forbidden('Only recruiters can list their own jobs');
    where.recruiter = { userId: user.id };
    if (status) where.status = status;
  } else if (user?.role === 'ADMIN') {
    if (status) where.status = status;
  } else {
    where.status = 'OPEN';
  }
  if (type) where.employmentType = type;
  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (q) {
    where.OR = ['title', 'companyName', 'description', 'requirements'].map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
  }
  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({ where, include: jobInclude, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
  ]);
  res.json({ data: jobs, meta: pageMeta(pg, total) });
});

export const getJob = asyncHandler(async (req, res) => {
  assertUuid(req.params.id);
  const job = await prisma.job.findUnique({ where: { id: req.params.id }, include: jobInclude });
  if (!job) throw notFound('Job not found');
  const u = req.user;
  const isOwner = u && job.recruiter.userId === u.id;
  if (job.status === 'CLOSED' && !(isOwner || u?.role === 'ADMIN' || u?.role === 'CANDIDATE')) throw notFound('Job not found');
  let hasApplied = false;
  if (u?.role === 'CANDIDATE') {
    hasApplied = !!(await prisma.application.findUnique({ where: { candidateId_jobId: { candidateId: u.id, jobId: job.id } } }));
  }
  res.json({ data: { ...job, hasApplied } });
});

export const createJob = asyncHandler(async (req, res) => {
  const profile = await prisma.recruiterProfile.findUnique({ where: { userId: req.user.id } });
  if (!profile) throw forbidden('Recruiter profile missing');
  const { companyName, ...rest } = req.body;
  const job = await prisma.job.create({
    data: { ...rest, companyName: companyName || profile.companyName, recruiterId: profile.id },
    include: jobInclude,
  });
  res.status(201).json({ data: job });
});

async function ownedJob(req) {
  assertUuid(req.params.id);
  const job = await prisma.job.findUnique({ where: { id: req.params.id }, include: { recruiter: true } });
  if (!job) throw notFound('Job not found');
  if (req.user.role !== 'ADMIN' && job.recruiter.userId !== req.user.id) throw forbidden('You can only modify your own jobs');
  return job;
}

export const updateJob = asyncHandler(async (req, res) => {
  await ownedJob(req);
  const job = await prisma.job.update({ where: { id: req.params.id }, data: req.body, include: jobInclude });
  res.json({ data: job });
});

export const deleteJob = asyncHandler(async (req, res) => {
  await ownedJob(req);
  await prisma.job.delete({ where: { id: req.params.id } });
  res.json({ data: { message: 'Job deleted' } });
});
