import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { User, toPublicUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import {
  REFRESH_COOKIE, refreshCookieOptions, sha256,
  signAccessToken, signRefreshToken, verifyRefreshToken,
} from '../utils/tokens';
import { sendPasswordResetEmail } from '../services/mailService';

const MAX_SESSIONS = 5;
const clearRefresh = (res: Response) => res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/[0-9]/, 'Password must include a number.');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(100),
  email: z.string().trim().toLowerCase().email('Please enter a valid email.'),
  password: passwordSchema,
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email.'),
  password: z.string().min(1, 'Please enter your password.'),
});
export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email.') });
export const resetSchema = z.object({ token: z.string().min(10), password: passwordSchema });

/** Issue a new access+refresh pair, persist the refresh hash, set the cookie. */
async function startSession(res: Response, userId: string, role: 'user' | 'admin', previousHash?: string) {
  const refresh = signRefreshToken(userId);
  const current = (await User.findById(userId).select('+refreshTokenHashes'))?.refreshTokenHashes ?? [];
  const hashes = current.filter((h) => h !== previousHash);
  hashes.push(sha256(refresh));
  await User.updateOne({ _id: userId }, { refreshTokenHashes: hashes.slice(-MAX_SESSIONS) });
  res.cookie(REFRESH_COOKIE, refresh, refreshCookieOptions());
  return signAccessToken(userId, role);
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists.');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  const accessToken = await startSession(res, String(user._id), user.role as 'user' | 'admin');
  res.status(201).json({ accessToken, user: toPublicUser(user) });
});

// Always run a compare so unknown emails aren't distinguishable by timing
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'Incorrect email or password.');
  const accessToken = await startSession(res, String(user._id), user.role as 'user' | 'admin');
  res.json({ accessToken, user: toPublicUser(user) });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AppError(401, 'Please sign in to continue.');
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefresh(res);
    throw new AppError(401, 'Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHashes');
  const hash = sha256(token);
  if (!user || !user.refreshTokenHashes.includes(hash)) {
    // Reuse of a rotated token => possible theft, revoke all sessions
    if (user) await User.updateOne({ _id: user._id }, { refreshTokenHashes: [] });
    clearRefresh(res);
    throw new AppError(401, 'Your session has expired. Please sign in again.');
  }
  const accessToken = await startSession(res, String(user._id), user.role as 'user' | 'admin', hash);
  res.json({ accessToken, user: toPublicUser(user) });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const { sub } = verifyRefreshToken(token);
      await User.updateOne({ _id: sub }, { $pull: { refreshTokenHashes: sha256(token) } });
    } catch { /* already invalid; just clear the cookie */ }
  }
  clearRefresh(res);
  res.json({ message: 'Signed out.' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError(401, 'Please sign in to continue.');
  res.json({ user: toPublicUser(user) });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { _id: user._id },
      { passwordResetTokenHash: sha256(token), passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000) },
    );
    try { await sendPasswordResetEmail(user.email, token); }
    catch (e) { console.error('Reset email failed:', (e as Error).message); }
  }
  // identical response whether or not the account exists
  res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    passwordResetTokenHash: sha256(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires +refreshTokenHashes');
  if (!user) throw new AppError(400, 'This reset link is invalid or has expired.');
  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokenHashes = []; // sign out everywhere
  await user.save();
  clearRefresh(res);
  res.json({ message: 'Password updated. Please sign in with your new password.' });
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Please enter your current password.'),
  newPassword: passwordSchema,
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('+passwordHash +refreshTokenHashes');
  if (!user || !(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
    throw new AppError(401, 'Your current password is incorrect.');
  }
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  user.refreshTokenHashes = [];
  await user.save();
  const accessToken = await startSession(res, String(user._id), user.role as 'user' | 'admin');
  res.json({ accessToken, message: 'Password updated. Other devices have been signed out.' });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await User.updateOne({ _id: req.user!.id }, { refreshTokenHashes: [] });
  clearRefresh(res);
  res.json({ message: 'Signed out of all devices.' });
});
