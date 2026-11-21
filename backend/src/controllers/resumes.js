import path from 'node:path';
import crypto from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { prisma } from '../config/db.js';
import { getStorage } from '../storage/index.js';
import { asyncHandler, assertUuid } from '../utils/http.js';
import { badRequest, forbidden, notFound, conflict } from '../utils/errors.js';

const ALLOWED = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

// Verify real content (magic bytes), not the filename or client-sent mimetype.
async function detectType(buf) {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  const ft = await fileTypeFromBuffer(buf);
  if (ft && ALLOWED[ft.mime]) return ft.mime;
  return null;
}

const safeName = (n) => path.basename(n).replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'resume';

export const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('A resume file is required (field name "resume")');
  const mime = await detectType(req.file.buffer);
  if (!mime) throw badRequest('Unsupported file. Only PDF and DOCX files are allowed.');
  const ext = ALLOWED[mime];
  const storageKey = `resumes/${req.user.id}/${crypto.randomUUID()}.${ext}`;
  await getStorage().put(storageKey, req.file.buffer, mime);
  const resume = await prisma.resume.create({
    data: { candidateId: req.user.id, fileName: safeName(req.file.originalname), storageKey, contentType: mime, fileSize: req.file.size },
  });
  const { storageKey: _k, ...out } = resume;  
  res.status(201).json({ data: out });
});

export const myResumes = asyncHandler(async (req, res) => {
  const rows = await prisma.resume.findMany({
    where: { candidateId: req.user.id }, orderBy: { uploadedAt: 'desc' },
    select: { id: true, fileName: true, contentType: true, fileSize: true, uploadedAt: true, _count: { select: { applications: true } } },
  });
  res.json({ data: rows });
});

export const deleteResume = asyncHandler(async (req, res) => {
  assertUuid(req.params.id);
  const r = await prisma.resume.findUnique({ where: { id: req.params.id }, include: { _count: { select: { applications: true } } } });
  if (!r || r.candidateId !== req.user.id) throw notFound('Resume not found');
  if (r._count.applications > 0) throw conflict('This resume is attached to an application and cannot be deleted');
  await prisma.resume.delete({ where: { id: r.id } });
  await getStorage().delete(r.storageKey);
  res.json({ data: { message: 'Resume deleted' } });
});

export const downloadResume = asyncHandler(async (req, res) => {
  assertUuid(req.params.id);
  const r = await prisma.resume.findUnique({ where: { id: req.params.id } });
  if (!r) throw notFound('Resume not found');
  const u = req.user;
  let allowed = u.role === 'ADMIN' || r.candidateId === u.id;
  if (!allowed && u.role === 'RECRUITER') {
    const link = await prisma.application.findFirst({ where: { resumeId: r.id, job: { recruiter: { userId: u.id } } }, select: { id: true } });
    allowed = !!link;
  }
  if (!allowed) throw forbidden('You are not allowed to access this resume');
  const buf = await getStorage().get(r.storageKey);
  res.set({
    'Content-Type': r.contentType,
    'Content-Length': String(buf.length),
    'Content-Disposition': `attachment; filename="${r.fileName.replace(/"/g, '')}"`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  res.send(buf);
});
