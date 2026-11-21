import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { asyncHandler, publicUser } from '../utils/http.js';
import { conflict, unauthorized, forbidden } from '../utils/errors.js';
import { signToken, cookieOptions, COOKIE_NAME } from '../middleware/auth.js';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', 10);

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, companyName } = req.body;
  if (await prisma.user.findUnique({ where: { email } })) throw conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name, email, passwordHash, role,
      ...(role === 'CANDIDATE' ? { candidateProfile: { create: {} } } : { recruiterProfile: { create: { companyName } } }),
    },
  });
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  res.status(201).json({ data: { user: publicUser(user) } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  // Constant-ish time compare whether or not the user exists
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Invalid email or password');
  if (!user.isActive) throw forbidden('This account has been deactivated');
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  res.json({ data: { user: publicUser(user) } });
});

export const logout = (_req, res) => {
  const { maxAge, ...opts } = cookieOptions(); // eslint-disable-line no-unused-vars
  res.clearCookie(COOKIE_NAME, opts);
  res.json({ data: { message: 'Logged out' } });
};

export const me = asyncHandler(async (req, res) => {
  res.json({ data: { user: publicUser(req.user) } });
});
