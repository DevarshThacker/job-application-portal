import { z } from 'zod';
import { badRequest } from '../utils/errors.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const r = schema.safeParse(req[source]);
  if (!r.success) {
    const details = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(badRequest('Validation failed', details));
  }
  if (source === 'query') req.validatedQuery = r.data; else req[source] = r.data;
  next();
};

const trimmed = (min, max, label) => z.string({ required_error: `${label} is required` }).trim().min(min, `${label} is required`).max(max, `${label} is too long`);
const optionalText = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

export const password = z.string().min(8, 'Password must be at least 8 characters').max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter').regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
  name: trimmed(2, 100, 'Name'),
  email: z.string().trim().toLowerCase().email('Valid email is required').max(254),
  password,
  role: z.enum(['CANDIDATE', 'RECRUITER']).default('CANDIDATE'),
  companyName: optionalText(150),
}).superRefine((v, ctx) => {
  if (v.role === 'RECRUITER' && !v.companyName) ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'Company name is required for recruiters' });
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'];

export const jobSchema = z.object({
  title: trimmed(3, 150, 'Title'),
  location: trimmed(2, 150, 'Location'),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  salaryRange: optionalText(100),
  description: trimmed(20, 10000, 'Description'),
  requirements: trimmed(10, 10000, 'Requirements'),
  companyName: z.string().trim().min(1).max(150).optional(),
});
export const jobUpdateSchema = jobSchema.partial().extend({ status: z.enum(['OPEN', 'CLOSED']).optional() })
  .refine((v) => Object.keys(v).length > 0, 'No fields provided');

export const jobListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(EMPLOYMENT_TYPES).optional(),
  location: z.string().trim().max(100).optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  mine: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const applySchema = z.object({
  jobId: z.string().uuid('Invalid job id'),
  resumeId: z.string().uuid('Please select a resume'),
  coverNote: optionalText(2000),
});

export const statusSchema = z.object({
  status: z.enum(['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN']),
  note: optionalText(500),
});

export const profileSchema = z.object({
  name: trimmed(2, 100, 'Name').optional(),
  phone: optionalText(30),
  location: optionalText(150),
  skills: optionalText(500),
  education: optionalText(500),
  bio: optionalText(2000),
  companyName: optionalText(150),
  companyDescription: optionalText(2000),
  website: z.string().trim().max(200).optional().nullable()
    .refine((v) => !v || /^https?:\/\//i.test(v), 'Website must start with http:// or https://')
    .transform((v) => v || null),
});

export const adminUserPatch = z.object({ isActive: z.boolean() });
