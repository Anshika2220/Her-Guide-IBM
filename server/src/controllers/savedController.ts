import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { SAVED_TYPES } from '../config/constants';
import { CareerPlan } from '../models/CareerPlan';
import { DocumentAnalysis } from '../models/DocumentAnalysis';
import { Opportunity } from '../models/Opportunity';
import { SavedResource } from '../models/SavedResource';
import { SupportResource } from '../models/SupportResource';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const saveSchema = z.object({
  itemType: z.enum(SAVED_TYPES),
  itemId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  title: z.string().trim().max(200).optional(),
  snapshot: z.any().optional(),
});

const PLAN_LABEL: Record<string, string> = { skillgap: 'Skill-gap analysis', returntowork: 'Return-to-work plan', business: 'Startup plan' };

/** Turn SavedResource rows into display-ready items (only ever for the owner's rows). */
export async function hydrateSaved(rows: any[]) {
  const ids = (t: string) => rows.filter((r) => r.itemType === t && r.itemId).map((r) => r.itemId);
  const [opps, resources, plans, docs] = await Promise.all([
    Opportunity.find({ _id: { $in: ids('opportunity') } }).lean(),
    SupportResource.find({ _id: { $in: ids('resource') } }).lean(),
    CareerPlan.find({ _id: { $in: ids('careerPlan') } }).select('kind title createdAt').lean(),
    DocumentAnalysis.find({ _id: { $in: ids('document') } }).select('filename createdAt').lean(),
  ]);
  const by = (a: any[]) => new Map(a.map((x) => [String(x._id), x]));
  const O = by(opps), R = by(resources), P = by(plans), D = by(docs);
  const out: any[] = [];
  for (const r of rows) {
    const base = { id: String(r._id), itemType: r.itemType, itemId: r.itemId ? String(r.itemId) : null, savedAt: r.createdAt };
    const key = r.itemId ? String(r.itemId) : '';
    if (r.itemType === 'opportunity' && O.has(key)) {
      const o = O.get(key);
      out.push({ ...base, title: o.title, subtitle: `${o.organization} · ${o.category.replace('_', ' ')}`, link: `/opportunities?open=${key}` });
    } else if (r.itemType === 'resource' && R.has(key)) {
      const x = R.get(key);
      out.push({ ...base, title: x.name, subtitle: x.location, link: null, data: { phone: x.phone, website: x.website, description: x.description } });
    } else if (r.itemType === 'careerPlan' && P.has(key)) {
      const p = P.get(key);
      out.push({ ...base, title: p.title || PLAN_LABEL[p.kind], subtitle: PLAN_LABEL[p.kind], link: p.kind === 'business' ? `/biz?plan=${key}` : `/work?plan=${key}` });
    } else if (r.itemType === 'document' && D.has(key)) {
      out.push({ ...base, title: D.get(key).filename || 'Document analysis', subtitle: 'Document analysis', link: `/documents?open=${key}` });
    } else if (r.itemType === 'guidance') {
      out.push({ ...base, title: r.title || 'Support guidance', subtitle: 'Saved guidance', link: null, data: r.snapshot });
    }
  }
  return out;
}

export const listSaved = asyncHandler(async (req: Request, res: Response) => {
  const { type, q } = req.query as Record<string, string | undefined>;
  const filter: any = { userId: req.user!.id };
  if (type && (SAVED_TYPES as readonly string[]).includes(type)) filter.itemType = type;
  const rows = await SavedResource.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  let items = await hydrateSaved(rows);
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((i) => `${i.title} ${i.subtitle}`.toLowerCase().includes(needle));
  }
  res.json({ items });
});

export const saveItem = asyncHandler(async (req: Request, res: Response) => {
  const { itemType, itemId, title, snapshot } = req.body;
  const userId = req.user!.id;
  if (itemType === 'guidance') {
    if (!snapshot) throw new AppError(400, 'Nothing to save.');
    if (JSON.stringify(snapshot).length > 30_000) throw new AppError(400, 'That result is too large to save.');
    const doc = await SavedResource.create({ userId, itemType, title, snapshot });
    return res.status(201).json({ id: String(doc._id) });
  }
  if (!itemId) throw new AppError(400, 'Missing item.');
  // ownership/existence checks
  const exists =
    itemType === 'opportunity' ? await Opportunity.exists({ _id: itemId }) :
    itemType === 'resource' ? await SupportResource.exists({ _id: itemId }) :
    itemType === 'careerPlan' ? await CareerPlan.exists({ _id: itemId, userId }) :
    await DocumentAnalysis.exists({ _id: itemId, userId });
  if (!exists) throw new AppError(404, "We couldn't find that item.");
  const doc = await SavedResource.findOneAndUpdate(
    { userId, itemType, itemId },
    { $setOnInsert: { userId, itemType, itemId } },
    { upsert: true, new: true },
  );
  res.status(201).json({ id: String(doc!._id) });
});

export const unsaveById = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid identifier.');
  await SavedResource.deleteOne({ _id: req.params.id, userId: req.user!.id });
  res.json({ message: 'Removed from saved.' });
});
