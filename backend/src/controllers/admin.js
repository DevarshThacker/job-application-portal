import { prisma } from '../config/db.js';
import { asyncHandler, parsePagination, pageMeta, assertUuid, publicUser } from '../utils/http.js';
import { notFound, badRequest } from '../utils/errors.js';

export const listUsers = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query);
  const where = {};
  if (['CANDIDATE', 'RECRUITER', 'ADMIN'].includes(req.query.role)) where.role = req.query.role;
  if (req.query.q) where.OR = [{ name: { contains: String(req.query.q), mode: 'insensitive' } }, { email: { contains: String(req.query.q), mode: 'insensitive' } }];
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take, include: { recruiterProfile: { select: { companyName: true } } } }),
  ]);
  res.json({ data: rows.map((u) => ({ ...publicUser(u), companyName: u.recruiterProfile?.companyName ?? null })), meta: pageMeta(pg, total) });
});

export const updateUser = asyncHandler(async (req, res) => {
  assertUuid(req.params.id);
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw notFound('User not found');
  if (target.id === req.user.id) throw badRequest('You cannot change your own access');
  const user = await prisma.user.update({ where: { id: target.id }, data: { isActive: req.body.isActive } });
  res.json({ data: publicUser(user) });
});
