import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import os from 'node:os';
import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { prisma } from '../config/db.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema, jobSchema, jobUpdateSchema, jobListQuery, applySchema, statusSchema, profileSchema, adminUserPatch } from '../validators/index.js';
import * as auth from '../controllers/auth.js';
import * as jobs from '../controllers/jobs.js';
import * as apps from '../controllers/applications.js';
import * as resumes from '../controllers/resumes.js';
import * as dash from '../controllers/dashboard.js';
import * as admin from '../controllers/admin.js';
import * as profile from '../controllers/profile.js';

const r = Router();

// ---- monitoring
r.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));
r.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'up' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'down' });
  }
});

// Protected diagnostics (used to prove which server handled a request behind the ALB).
// Disabled (404) unless DIAG_TOKEN is configured; requires the X-Diag-Token header.
r.get('/diag', (req, res) => {
  const given = Buffer.from(String(req.get('x-diag-token') || ''));
  const want = Buffer.from(config.DIAG_TOKEN);
  const ok = config.DIAG_TOKEN && given.length === want.length && crypto.timingSafeEqual(given, want);
  if (!config.DIAG_TOKEN || !ok) return res.status(config.DIAG_TOKEN ? 403 : 404).json({ error: { code: config.DIAG_TOKEN ? 'FORBIDDEN' : 'NOT_FOUND', message: 'Not available' } });
  res.json({ hostname: os.hostname(), pid: process.pid, uptime: process.uptime(), env: config.NODE_ENV });
});

// ---- auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: config.AUTH_RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false,
  skip: () => config.isTest,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } }),
});
r.post('/auth/register', authLimiter, validate(registerSchema), auth.register);
r.post('/auth/login', authLimiter, validate(loginSchema), auth.login);
r.post('/auth/logout', auth.logout);
r.get('/auth/me', authenticate, auth.me);

// ---- profile
r.get('/profile', authenticate, profile.getProfile);
r.put('/profile', authenticate, validate(profileSchema), profile.updateProfile);

// ---- jobs
r.get('/jobs', optionalAuth, validate(jobListQuery, 'query'), jobs.listJobs);
r.get('/jobs/:id', optionalAuth, jobs.getJob);
r.post('/jobs', authenticate, requireRole('RECRUITER'), validate(jobSchema), jobs.createJob);
r.patch('/jobs/:id', authenticate, requireRole('RECRUITER', 'ADMIN'), validate(jobUpdateSchema), jobs.updateJob);
r.delete('/jobs/:id', authenticate, requireRole('RECRUITER', 'ADMIN'), jobs.deleteJob);

// ---- applications
r.post('/applications', authenticate, requireRole('CANDIDATE'), validate(applySchema), apps.apply);
r.get('/applications/my', authenticate, requireRole('CANDIDATE'), apps.myApplications);
r.get('/applications', authenticate, requireRole('RECRUITER', 'ADMIN'), apps.listApplications);
r.get('/applications/:id', authenticate, apps.getApplication);
r.patch('/applications/:id/status', authenticate, requireRole('RECRUITER', 'ADMIN'), validate(statusSchema), apps.updateStatus);
r.patch('/applications/:id/withdraw', authenticate, requireRole('CANDIDATE'), apps.withdraw);

// ---- resumes
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1 } });
r.post('/resumes', authenticate, requireRole('CANDIDATE'), upload.single('resume'), resumes.uploadResume);
r.get('/resumes/my', authenticate, requireRole('CANDIDATE'), resumes.myResumes);
r.delete('/resumes/:id', authenticate, requireRole('CANDIDATE'), resumes.deleteResume);
r.get('/resumes/:id/download', authenticate, resumes.downloadResume);

// ---- dashboards
r.get('/dashboard/candidate', authenticate, requireRole('CANDIDATE'), dash.candidate);
r.get('/dashboard/recruiter', authenticate, requireRole('RECRUITER'), dash.recruiter);
r.get('/dashboard/admin', authenticate, requireRole('ADMIN'), dash.admin);

// ---- admin
r.get('/admin/users', authenticate, requireRole('ADMIN'), admin.listUsers);
r.patch('/admin/users/:id', authenticate, requireRole('ADMIN'), validate(adminUserPatch), admin.updateUser);

export default r;
