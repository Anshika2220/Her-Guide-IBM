import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { z } from 'zod';
import { User, toPublicUser } from '../models/User';
import { Application } from '../models/Application';
import { CareerPlan } from '../models/CareerPlan';
import { DocumentAnalysis } from '../models/DocumentAnalysis';
import { SavedResource } from '../models/SavedResource';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { completeness, isOnboarded } from '../utils/profile';
import { REFRESH_COOKIE } from '../utils/tokens';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const u = await User.findById(req.user!.id);
  if (!u) throw new AppError(401, 'Please sign in to continue.');
  res.json({ user: toPublicUser(u), completeness: completeness(u) });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const u: any = await User.findById(req.user!.id);
  if (!u) throw new AppError(401, 'Please sign in to continue.');
  const b = req.body;
  for (const k of ['name', 'age', 'location', 'education', 'employmentStatus', 'skills', 'interests', 'goals']) {
    if (b[k] !== undefined) u[k] = b[k];
  }
  if (b.careerProfile) {
    u.careerProfile = { ...(u.careerProfile?.toObject?.() ?? u.careerProfile ?? {}), ...b.careerProfile };
  }
  u.onboardingComplete = isOnboarded(u);
  await u.save();
  res.json({ user: toPublicUser(u), completeness: completeness(u) });
});

export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Please enter your password to confirm.') });

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const u = await User.findById(req.user!.id).select('+passwordHash');
  if (!u || !(await bcrypt.compare(req.body.password, u.passwordHash))) {
    throw new AppError(401, 'That password is incorrect.');
  }
  const userId = u._id;
  await Promise.all([
    Application.deleteMany({ userId }), CareerPlan.deleteMany({ userId }),
    DocumentAnalysis.deleteMany({ userId }), SavedResource.deleteMany({ userId }),
    User.deleteOne({ _id: userId }),
  ]);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ message: 'Your account and all associated data have been deleted.' });
});
