import { badRequest } from './errors.js';

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function parsePagination(query, defaults = { limit: 10, max: 50 }) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(defaults.max, Math.max(1, parseInt(query.limit, 10) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
export const pageMeta = ({ page, limit }, total) => ({
  page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertUuid(id, label = 'id') {
  if (!UUID.test(id)) throw badRequest(`Invalid ${label}`);
}
export const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt,
});
