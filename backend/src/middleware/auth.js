import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/db.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { asyncHandler } from '../utils/http.js';

export const COOKIE_NAME = 'jp_token';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}
export const cookieOptions = () => ({
  httpOnly: true, secure: config.cookieSecure, sameSite: config.COOKIE_SAMESITE, path: '/', maxAge: 8 * 60 * 60 * 1000,
});

async function loadUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  let payload;
  try { payload = jwt.verify(token, config.JWT_SECRET); } catch { return null; }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) return null;
  return user;
}

export const authenticate = asyncHandler(async (req, _res, next) => {
  const user = await loadUser(req);
  if (!user) throw unauthorized();
  req.user = user;
  next();
});
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.user = await loadUser(req);
  next();
});
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};
