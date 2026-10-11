import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { OPP_CATEGORIES, SUPPORT_CATEGORIES, RESOURCE_TYPES } from '../config/constants';
import { Application } from '../models/Application';
import { Opportunity } from '../models/Opportunity';
import { SupportResource } from '../models/SupportResource';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeDoc } from '../utils/profile';
import { escapeRegex } from '../utils/validators';

function crud(Model: any, searchFields: string[], optionalKeys: string[]) {
  const checkId = (id: string) => {
    if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'Invalid identifier.');
  };
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const q = req.query.q as string | undefined;
      const filter: any = {};
      if (q) { const rx = new RegExp(escapeRegex(q.slice(0, 80)), 'i'); filter.$or = searchFields.map((f) => ({ [f]: rx })); }
      const items = await Model.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
      res.json({ items: items.map(serializeDoc) });
    }),
    create: asyncHandler(async (req: Request, res: Response) => {
      const doc = await Model.create(req.body);
      res.status(201).json({ item: serializeDoc(doc.toObject()) });
    }),
    update: asyncHandler(async (req: Request, res: Response) => {
      checkId(req.params.id);
      const unset: Record<string, 1> = {};
      for (const k of optionalKeys) if (req.body[k] === undefined) unset[k] = 1;
      const doc = await Model.findByIdAndUpdate(
        req.params.id,
        Object.keys(unset).length ? { $set: req.body, $unset: unset } : { $set: req.body },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) throw new AppError(404, 'Not found.');
      res.json({ item: serializeDoc(doc) });
    }),
    remove: asyncHandler(async (req: Request, res: Response) => {
      checkId(req.params.id);
      await Model.deleteOne({ _id: req.params.id });
      res.json({ message: 'Deleted.' });
    }),
  };
}

export const opportunities = crud(Opportunity, ['title', 'organization', 'category'], ['deadline', 'applicationUrl', 'sourceUrl']);
export const resources = crud(SupportResource, ['name', 'description'], ['phone', 'website', 'sourceUrl', 'availability']);

/** High-level only: no profile data, skills, goals, documents or applications are exposed. */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const filter: any = {};
  if (q) { const rx = new RegExp(escapeRegex(q.slice(0, 80)), 'i'); filter.$or = [{ name: rx }, { email: rx }]; }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).select('name email role onboardingComplete createdAt').lean();
  res.json({ items: users.map(serializeDoc) });
});

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const [users, opps, resCount, apps] = await Promise.all([
    User.countDocuments(), Opportunity.countDocuments(), SupportResource.countDocuments(), Application.countDocuments(),
  ]);
  res.json({ users, opportunities: opps, resources: resCount, applications: apps });
});

/** Categories are fixed enums in code (they drive matching + AI prompts), so this is read-only. */
export const categories = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ opportunityCategories: OPP_CATEGORIES, supportCategories: [...SUPPORT_CATEGORIES, 'emergency'], resourceTypes: RESOURCE_TYPES });
});
