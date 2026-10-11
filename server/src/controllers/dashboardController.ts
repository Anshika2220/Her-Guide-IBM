import { Request, Response } from 'express';
import { APP_STATUSES } from '../config/constants';
import { Application } from '../models/Application';
import { CareerPlan } from '../models/CareerPlan';
import { DocumentAnalysis } from '../models/DocumentAnalysis';
import { Opportunity } from '../models/Opportunity';
import { SavedResource } from '../models/SavedResource';
import { User } from '../models/User';
import { compactMatch, computeMatch, isOpen, userToMatchUser } from '../services/matchingService';
import { asyncHandler } from '../utils/asyncHandler';
import { completeness, serializeDoc } from '../utils/profile';
import { hydrateSaved } from './savedController';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user: any = await User.findById(userId).lean();

  const [pool, statusAgg, savedCount, savedRows, plan, lastApp, lastDoc] = await Promise.all([
    Opportunity.find({ active: true }).limit(300).lean(),
    Application.aggregate([{ $match: { userId: user._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    SavedResource.countDocuments({ userId }),
    SavedResource.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    CareerPlan.findOne({ userId, kind: { $in: ['skillgap', 'returntowork'] } }).sort({ createdAt: -1 }).select('title kind readiness createdAt').lean(),
    Application.findOne({ userId }).sort({ updatedAt: -1 }).select('title status updatedAt').lean(),
    DocumentAnalysis.findOne({ userId }).sort({ createdAt: -1 }).select('filename createdAt').lean(),
  ]);

  const mu = userToMatchUser(user);
  const hasSignal = !!(user.goals?.length || user.skills?.length || user.education);
  const recommended = hasSignal
    ? pool.filter((o: any) => isOpen(o.deadline))
        .map((o: any) => ({ ...serializeDoc(o), match: compactMatch(computeMatch(mu, o)) }))
        .sort((a: any, b: any) => b.match.score - a.match.score)
        .slice(0, 5)
    : [];

  const statusCounts: Record<string, number> = Object.fromEntries(APP_STATUSES.map((s) => [s, 0]));
  for (const r of statusAgg) statusCounts[r._id] = r.n;
  const applicationTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const activity = [
    plan && { type: 'career', title: (plan as any).title, at: (plan as any).createdAt, link: `/work?plan=${plan._id}` },
    lastApp && { type: 'tracker', title: `${(lastApp as any).title} (${(lastApp as any).status.replace('_', ' ')})`, at: (lastApp as any).updatedAt, link: '/tracker' },
    lastDoc && { type: 'document', title: (lastDoc as any).filename, at: (lastDoc as any).createdAt, link: `/documents?open=${lastDoc._id}` },
  ].filter(Boolean).sort((a: any, b: any) => +new Date(b.at) - +new Date(a.at));

  res.json({
    name: user.name,
    onboardingComplete: user.onboardingComplete,
    profileCompleteness: completeness(user),
    recommended,
    careerReadiness: plan ? { value: (plan as any).readiness ?? null, title: (plan as any).title, id: String(plan._id) } : null,
    stats: { applications: applicationTotal, saved: savedCount },
    statusCounts,
    recentSaved: await hydrateSaved(savedRows),
    recentActivity: activity,
    aiRecommendations: user.aiRecommendations ?? null,
  });
});
