import { Request, Response } from 'express';
import { z } from 'zod';
import { CareerPlan } from '../models/CareerPlan';
import { Opportunity } from '../models/Opportunity';
import { User } from '../models/User';
import { asData, completeJSON, SAFETY_RULES } from '../services/aiService';
import { compactMatch, computeMatch, isOpen, userToMatchUser } from '../services/matchingService';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeDoc } from '../utils/profile';
import { tagList } from '../utils/validators';

export const bizSchema = z.object({
  idea: z.string().trim().min(10, 'Please describe your business idea in a sentence or two.').max(1500),
  location: z.string().trim().max(100).optional(),
  fundingNeed: z.string().trim().max(60).optional(),
  stage: z.enum(['idea', 'validation', 'launched', 'growing']).default('idea'),
  skills: tagList().default([]),
});

const BASE = ['Business planning', 'Registration research', 'Funding research', 'Training', 'Market research', 'Mentorship'];
const out = z.object({
  summary: z.string().default(''),
  checklist: z.array(z.object({ title: z.string(), items: z.array(z.string()).default([]) })).default([]),
  questionsToResearch: z.array(z.string()).default([]),
  risksToConsider: z.array(z.string()).default([]),
});

export const analyzeBiz = asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;
  const userId = req.user!.id;
  const user: any = await User.findById(userId).lean();

  const result = await completeJSON(
    out,
    `You are HerBiz, a practical startup guide for women entrepreneurs in India.
Return JSON with:
- summary: 2-3 sentences describing where the user is and the most useful next focus
- checklist: one object per title in this exact list: ${BASE.join(' | ')}; each has 3-5 concrete "items" tailored to the idea and stage
- questionsToResearch: 4-6 questions the user should research or verify (e.g. which registration type fits, which financing options exist)
- risksToConsider: 2-4 honest risks or assumptions to test
Do NOT name specific government schemes, banks, loan products, grants, interest rates or eligibility rules; the platform attaches database-backed resources separately. Do not promise outcomes.
${SAFETY_RULES}`,
    asData('user_input', JSON.stringify(b)),
    2500,
  );
  // ensure the six standard checklist groups always exist
  const byTitle = new Map(result.checklist.map((c) => [c.title.toLowerCase(), c]));
  result.checklist = BASE.map((t) => byTitle.get(t.toLowerCase()) ?? { title: t, items: [] });

  const mu = userToMatchUser(user ?? {}, {
    goals: [...new Set([...(user?.goals ?? []), 'Start business'])],
    interests: [...new Set([...(user?.interests ?? []), 'Entrepreneurship'])],
    skills: [...new Set([...(user?.skills ?? []), ...b.skills])],
    location: b.location || user?.location,
  });
  const pool: any[] = await Opportunity.find({
    active: true, category: { $in: ['entrepreneurship', 'government', 'training', 'women_program'] },
  }).limit(200).lean();
  const resources = pool
    .filter((o) => isOpen(o.deadline))
    .map((o) => ({ ...serializeDoc(o), match: compactMatch(computeMatch(mu, o)) }))
    .sort((a, c) => c.match.score - a.match.score)
    .slice(0, 6);

  const plan = await CareerPlan.create({ userId, kind: 'business', title: `Startup plan: ${b.idea.slice(0, 50)}`, input: b, result });
  res.status(201).json({ plan: serializeDoc(plan.toObject()), resources });
});
