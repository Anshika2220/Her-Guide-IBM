import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { CareerPlan } from '../models/CareerPlan';
import { Opportunity } from '../models/Opportunity';
import { User } from '../models/User';
import { asData, completeJSON, SAFETY_RULES } from '../services/aiService';
import { compactMatch, computeMatch, isOpen, userToMatchUser } from '../services/matchingService';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeDoc } from '../utils/profile';
import { tagList } from '../utils/validators';

const num = (max: number) => z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().min(0).max(max).optional());

export const analyzeSchema = z.object({
  mode: z.enum(['skillgap', 'returntowork']).default('skillgap'),
  previousRole: z.string().trim().max(100).optional(),
  desiredRole: z.string().trim().min(2, 'Please enter the role you want to move toward.').max(100),
  yearsOfExperience: num(60),
  skills: tagList().default([]),
  breakMonths: num(600),
  breakReason: z.string().trim().max(100).optional(),
  weeks: z.coerce.number().refine((n) => [4, 6, 8, 12].includes(n), 'Choose 4, 6, 8 or 12 weeks.').default(6),
});

const planSchema = z.object({
  summary: z.string().default(''),
  existingSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.object({
    skill: z.string(),
    priority: z.enum(['high', 'medium', 'low']).catch('medium'),
    why: z.string().default(''),
  })).default([]),
  roadmap: z.array(z.object({
    week: z.coerce.number(), title: z.string(),
    focus: z.array(z.string()).default([]), outcome: z.string().optional(),
  })).default([]),
  portfolioIdeas: z.array(z.string()).default([]),
  interviewPrep: z.array(z.string()).default([]),
  opportunityTypes: z.array(z.string()).default([]),
  skillsToRefresh: z.array(z.string()).default([]),
  careerOptions: z.array(z.string()).default([]),
});

const SYSTEM = `You are HerWork, a supportive career coach for women (students, working professionals, and women returning after a career break). Never shame or pity anyone for a career break.
Return JSON with:
- summary: 2-3 encouraging, honest sentences
- existingSkills: ONLY skills from the user's list that are relevant to the desired role
- missingSkills: 4-8 objects {skill, priority: high|medium|low, why} that the user should add for the desired role
- roadmap: one object per week for exactly the requested number of weeks: {week (1..N), title, focus: [2-4 short items], outcome}
- portfolioIdeas: 3-5 concrete project ideas
- interviewPrep: 4-6 preparation points
- opportunityTypes: 3-5 kinds of roles/programs to look for (generic types, NOT specific named programs or companies)
- skillsToRefresh: skills from the user's background worth refreshing (empty array if none)
- careerOptions: 2-4 adjacent roles worth considering
Do not include URLs, course names, company names, scheme names or salary figures.
${SAFETY_RULES}`;

export const analyzeCareer = asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;
  const userId = req.user!.id;
  const user: any = await User.findById(userId);
  if (!user) throw new AppError(401, 'Please sign in to continue.');

  const result = await completeJSON(
    planSchema,
    SYSTEM,
    `Mode: ${b.mode === 'returntowork' ? 'Return to work after a career break' : 'Skill-gap analysis'}\nNumber of weeks: ${b.weeks}\n` +
      asData('user_input', JSON.stringify({
        previousRole: b.previousRole, desiredRole: b.desiredRole, yearsOfExperience: b.yearsOfExperience,
        skills: b.skills, careerBreakMonths: b.breakMonths, breakReason: b.breakReason,
      })),
    3500,
  );

  // Don't let the model "invent" skills the user never listed
  const have = new Set((b.skills as string[]).map((s) => s.toLowerCase()));
  result.existingSkills = result.existingSkills.filter((s) => have.has(s.toLowerCase()));
  const total = result.existingSkills.length + result.missingSkills.length;
  const readiness = total ? Math.round((result.existingSkills.length / total) * 100) : null;

  // Keep the user's profile in sync with what they just told us
  user.careerProfile = {
    ...(user.careerProfile?.toObject?.() ?? {}),
    previousRole: b.previousRole ?? user.careerProfile?.previousRole,
    desiredCareer: b.desiredRole,
    yearsOfExperience: b.yearsOfExperience ?? user.careerProfile?.yearsOfExperience,
    careerBreakMonths: b.breakMonths ?? user.careerProfile?.careerBreakMonths,
  };
  user.skills = [...new Set([...(user.skills ?? []), ...b.skills])].slice(0, 50);
  await user.save();

  // Real opportunities from the database, ranked by the deterministic matcher
  const goals = [...new Set([...(user.goals ?? []), b.mode === 'returntowork' ? 'Return to work' : 'Find job', 'Learn skills'])];
  const mu = userToMatchUser(user, { goals, skills: user.skills });
  const pool: any[] = await Opportunity.find({
    active: true, category: { $in: ['job', 'internship', 'returnship', 'training', 'fellowship', 'women_program'] },
  }).limit(300).lean();
  const opportunities = pool
    .filter((o) => isOpen(o.deadline))
    .map((o) => ({ ...serializeDoc(o), match: compactMatch(computeMatch(mu, o)) }))
    .sort((a, b2) => b2.match.score - a.match.score)
    .slice(0, 5);

  const plan = await CareerPlan.create({
    userId, kind: b.mode, readiness: readiness ?? undefined,
    title: `${b.mode === 'returntowork' ? 'Return to work' : 'Skill gap'}: ${b.desiredRole}`,
    input: b, result,
  });
  res.status(201).json({ plan: { ...serializeDoc(plan.toObject()) }, opportunities });
});

export const getCareerProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const [user, plans] = await Promise.all([
    User.findById(userId).lean(),
    CareerPlan.find({ userId, kind: { $in: ['skillgap', 'returntowork'] } }).sort({ createdAt: -1 }).limit(20).select('kind title readiness createdAt').lean(),
  ]);
  res.json({ careerProfile: user?.careerProfile ?? {}, skills: user?.skills ?? [], plans: plans.map(serializeDoc) });
});

export const listPlans = asyncHandler(async (req: Request, res: Response) => {
  const kind = req.query.kind as string | undefined;
  const filter: any = { userId: req.user!.id };
  if (kind) filter.kind = kind;
  const plans = await CareerPlan.find(filter).sort({ createdAt: -1 }).limit(30).select('kind title readiness createdAt').lean();
  res.json({ items: plans.map(serializeDoc) });
});

export const getPlan = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid identifier.');
  const plan = await CareerPlan.findOne({ _id: req.params.id, userId: req.user!.id }).lean();
  if (!plan) throw new AppError(404, "We couldn't find that plan.");
  res.json({ plan: serializeDoc(plan) });
});

export const checkedSchema = z.object({ checked: z.array(z.string().max(120)).max(200) });
export const updateChecked = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid identifier.');
  const r = await CareerPlan.updateOne({ _id: req.params.id, userId: req.user!.id }, { checked: req.body.checked });
  if (!r.matchedCount) throw new AppError(404, "We couldn't find that plan.");
  res.json({ ok: true });
});

export const deletePlan = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid identifier.');
  await CareerPlan.deleteOne({ _id: req.params.id, userId: req.user!.id });
  res.json({ message: 'Plan deleted.' });
});

// ---- Career gap explanation assistant ----
export const gapSchema = z.object({
  previousRole: z.string().trim().max(100).optional(),
  desiredRole: z.string().trim().max(100).optional(),
  breakMonths: num(600),
  reason: z.string().trim().max(100).optional(),
  tone: z.enum(['confident', 'warm', 'concise']).default('confident'),
});
const gapOut = z.object({
  resumeLine: z.string().default(''),
  shortAnswer: z.string().default(''),
  fullAnswer: z.string().default(''),
  tips: z.array(z.string()).default([]),
});
export const gapExplanation = asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;
  const out = await completeJSON(
    gapOut,
    `You help women explain a career break professionally and truthfully. Never shame, never apologise, never invent details (employers, courses, achievements). Only use what the user provides; if the reason is unknown, stay neutral ("took a planned career break").
Return JSON: resumeLine (one line for a resume), shortAnswer (2 sentences for an interview), fullAnswer (a 4-6 sentence interview answer that ends by pivoting to readiness and the desired role), tips (3 brief tips).\n${SAFETY_RULES}`,
    `Tone: ${b.tone}\n${asData('user_input', JSON.stringify(b))}`,
    1200,
  );
  res.json(out);
});
