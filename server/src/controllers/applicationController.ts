import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Application } from '../models/Application';
import { Opportunity } from '../models/Opportunity';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeDoc } from '../utils/profile';

const checkId = (id: string) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'Invalid identifier.');
};

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const items = await Application.find({ userId: req.user!.id }).sort({ updatedAt: -1 }).lean();
  res.json({ items: items.map(serializeDoc) });
});

export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;
  const userId = req.user!.id;
  const data: any = { userId, status: b.status ?? 'interested', notes: b.notes ?? '' };

  if (b.opportunityId) {
    const o: any = await Opportunity.findById(b.opportunityId).lean();
    if (!o) throw new AppError(404, "We couldn't find that opportunity.");
    if (await Application.exists({ userId, opportunityId: o._id })) {
      throw new AppError(409, 'This opportunity is already in your tracker.');
    }
    Object.assign(data, {
      opportunityId: o._id, title: o.title, organization: o.organization,
      deadline: o.deadline, applicationUrl: o.applicationUrl,
    });
  } else {
    if (!b.title) throw new AppError(400, 'Please give this entry a title.');
    data.title = b.title;
    data.organization = b.organization ?? '';
  }
  for (const k of ['deadline', 'applicationUrl', 'appliedDate']) if (b[k]) data[k] = b[k];
  if (data.status === 'applied' && !data.appliedDate) data.appliedDate = new Date();
  data.history = [{ status: data.status, at: new Date() }];
  const doc = await Application.create(data);
  res.status(201).json({ item: serializeDoc(doc.toObject()) });
});

export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  checkId(req.params.id);
  const app: any = await Application.findOne({ _id: req.params.id, userId: req.user!.id });
  if (!app) throw new AppError(404, "We couldn't find that tracker entry.");
  const b = req.body;
  if (b.title !== undefined) app.title = b.title;
  if (b.organization !== undefined) app.organization = b.organization;
  if (b.notes !== undefined) app.notes = b.notes;
  for (const k of ['appliedDate', 'deadline', 'applicationUrl']) {
    if (b[k] === null) app.set(k, undefined);
    else if (b[k] !== undefined) app[k] = b[k];
  }
  if (b.status && b.status !== app.status) {
    app.status = b.status;
    app.history.push({ status: b.status, at: new Date() });
    if (b.status === 'applied' && !app.appliedDate) app.appliedDate = new Date();
  }
  await app.save();
  res.json({ item: serializeDoc(app.toObject()) });
});

export const deleteApplication = asyncHandler(async (req: Request, res: Response) => {
  checkId(req.params.id);
  const r = await Application.deleteOne({ _id: req.params.id, userId: req.user!.id });
  if (!r.deletedCount) throw new AppError(404, "We couldn't find that tracker entry.");
  res.json({ message: 'Removed from your tracker.' });
});
