import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EDUCATION_LEVELS, OPP_CATEGORIES, OPP_MODES } from '../config/constants';
import { Application } from '../models/Application';
import { Opportunity } from '../models/Opportunity';
import { SavedResource } from '../models/SavedResource';
import { User } from '../models/User';
import { computeMatch, compactMatch, userToMatchUser } from '../services/matchingService';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeDoc } from '../utils/profile';
import { escapeRegex } from '../utils/validators';

const DAY = 86_400_000;

export const listOpportunities = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const userId = req.user!.id;
  const and: any[] = [{ active: true }];

  if (q.category && (OPP_CATEGORIES as readonly string[]).includes(q.category)) and.push({ category: q.category });
  if (q.mode && (OPP_MODES as readonly string[]).includes(q.mode)) and.push({ mode: q.mode });
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q.slice(0, 80)), 'i');
    and.push({ $or: [{ title: rx }, { organization: rx }, { description: rx }, { tags: rx }] });
  }
  if (q.location) {
    const rx = new RegExp(escapeRegex(q.location.slice(0, 80)), 'i');
    and.push({ $or: [{ location: rx }, { 'eligibility.locations': rx }, { mode: 'remote' }] });
  }
  if (q.education && (EDUCATION_LEVELS as readonly string[]).includes(q.education)) {
    and.push({ $or: [{ 'eligibility.educationLevels': q.education }, { 'eligibility.educationLevels': { $size: 0 } }] });
  }
  if (q.experience !== undefined && q.experience !== '' && !Number.isNaN(Number(q.experience))) {
    and.push({ $or: [{ 'eligibility.minExperienceYears': null }, { 'eligibility.minExperienceYears': { $lte: Number(q.experience) } }] });
  }
  const now = new Date();
  if (q.deadline === 'week') and.push({ deadline: { $gte: now, $lte: new Date(+now + 7 * DAY) } });
  else if (q.deadline === 'month') and.push({ deadline: { $gte: now, $lte: new Date(+now + 30 * DAY) } });
  else if (q.deadline !== 'all') and.push({ $or: [{ deadline: null }, { deadline: { $gte: now } }] });

  const [savedRows, apps, user] = await Promise.all([
    SavedResource.find({ userId, itemType: 'opportunity' }).select('itemId').lean(),
    Application.find({ userId, opportunityId: { $exists: true } }).select('opportunityId').lean(),
    User.findById(userId).lean(),
  ]);
  const savedSet = new Set(savedRows.map((r) => String(r.itemId)));
  const trackedSet = new Set(apps.map((a) => String(a.opportunityId)));
  if (q.saved === 'true') and.push({ _id: { $in: [...savedSet] } });

  const docs = await Opportunity.find({ $and: and }).limit(500).lean();
  const mu = userToMatchUser(user ?? {});
  let items = docs.map((o: any) => ({
    ...serializeDoc(o),
    match: compactMatch(computeMatch(mu, o)),
    saved: savedSet.has(String(o._id)),
    tracked: trackedSet.has(String(o._id)),
  }));

  const sort = q.sort ?? 'match';
  if (sort === 'deadline') items.sort((a: any, b: any) => (a.deadline ? +new Date(a.deadline) : Infinity) - (b.deadline ? +new Date(b.deadline) : Infinity));
  else if (sort === 'new') items.sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
  else items.sort((a: any, b: any) => b.match.score - a.match.score);

  const limit = Math.min(Math.max(parseInt(q.limit ?? '12', 10) || 12, 1), 50);
  const page = Math.max(parseInt(q.page ?? '1', 10) || 1, 1);
  const total = items.length;
  items = items.slice((page - 1) * limit, page * limit);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

export const getOpportunity = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid identifier.');
  const userId = req.user!.id;
  const [o, user, saved, app] = await Promise.all([
    Opportunity.findOne({ _id: req.params.id, active: true }).lean(),
    User.findById(userId).lean(),
    SavedResource.exists({ userId, itemType: 'opportunity', itemId: req.params.id }),
    Application.findOne({ userId, opportunityId: req.params.id }).select('_id status').lean(),
  ]);
  if (!o) throw new AppError(404, "We couldn't find that opportunity. It may have been removed.");
  res.json({
    opportunity: serializeDoc(o),
    match: computeMatch(userToMatchUser(user ?? {}), o as any),
    saved: !!saved,
    application: app ? { id: String(app._id), status: app.status } : null,
  });
});

export const saveOpportunity = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid identifier.');
  if (!(await Opportunity.exists({ _id: req.params.id }))) throw new AppError(404, "We couldn't find that opportunity.");
  const userId = req.user!.id;
  await SavedResource.findOneAndUpdate(
    { userId, itemType: 'opportunity', itemId: req.params.id },
    { $setOnInsert: { userId, itemType: 'opportunity', itemId: req.params.id } },
    { upsert: true },
  );
  res.status(201).json({ saved: true });
});

export const unsaveOpportunity = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid identifier.');
  await SavedResource.deleteOne({ userId: req.user!.id, itemType: 'opportunity', itemId: req.params.id });
  res.json({ saved: false });
});
