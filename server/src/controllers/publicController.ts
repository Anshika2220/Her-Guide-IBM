import { Request, Response } from 'express';
import { SupportResource } from '../models/SupportResource';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeDoc } from '../utils/profile';

export const publicResources = asyncHandler(async (_req: Request, res: Response) => {
  const items = await SupportResource.find().sort({ verified: -1, name: 1 }).limit(12)
    .select('name categories description location phone website type verified').lean();
  res.json({ items: items.map(serializeDoc) });
});
