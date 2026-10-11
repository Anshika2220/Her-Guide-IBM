import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Application } from '../models/Application';
import { CareerPlan } from '../models/CareerPlan';
import { Opportunity } from '../models/Opportunity';
import { User } from '../models/User';
import { asData, chat, completeJSON, SAFETY_RULES } from '../services/aiService';
import { detectCrisis, EMERGENCY_MESSAGE } from '../services/crisis';
import { compactMatch, computeMatch, isOpen, userToMatchUser } from '../services/matchingService';
import { asyncHandler } from '../utils/asyncHandler';

const PAGES = ['dashboard', 'support', 'opportunities', 'work', 'biz', 'documents', 'tracker', 'other'] as const;
export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Please type a question.').max(1500),
  page: z.enum(PAGES).default('other'),
  contextId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  context: z.string().max(3000).optional(), // e.g. the guidance currently on screen (never stored)
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) })).max(8).default([]),
});

const profileSummary = (u: any) => JSON.stringify({
  education: u.education, employment: u.employmentStatus, location: u.location, skills: u.skills,
  interests: u.interests, goals: u.goals, yearsOfExperience: u.careerProfile?.yearsOfExperience,
  previousRole: u.careerProfile?.previousRole, desiredCareer: u.careerProfile?.desiredCareer,
});

export const aiChat = asyncHandler(async (req: Request, res: Response) => {
  const { message, page, contextId, context, history } = req.body;
  const userId = req.user!.id;
  const user: any = await User.findById(userId).lean();
  const facts: string[] = [`User profile: ${profileSummary(user ?? {})}`];

  if (page === 'opportunities' && contextId) {
    const o: any = await Opportunity.findById(contextId).lean();
    if (o) {
      const m = computeMatch(userToMatchUser(user ?? {}), o);
      facts.push(`Opportunity being viewed: ${JSON.stringify({
        title: o.title, organization: o.organization, category: o.category, description: o.description,
        eligibility: o.eligibility, deadline: o.deadline, requiredDocuments: o.requiredDocuments, verified: o.verified,
      })}`);
      facts.push(`Computed match (from rules, not AI): score ${m.score}% (${m.label}, confidence ${m.confidence}); matches: ${m.matches.join('; ') || 'none'}; mismatches: ${m.mismatches.join('; ') || 'none'}; unknown: ${m.unknowns.join('; ') || 'none'}`);
    }
  } else if ((page === 'work' || page === 'biz') && contextId && mongoose.isValidObjectId(contextId)) {
    const p: any = await CareerPlan.findOne({ _id: contextId, userId }).lean();
    if (p) facts.push(`Current plan (${p.kind}): ${JSON.stringify({ input: p.input, result: p.result }).slice(0, 5000)}`);
  } else if (page === 'work') {
    const p: any = await CareerPlan.findOne({ userId, kind: { $in: ['skillgap', 'returntowork'] } }).sort({ createdAt: -1 }).lean();
    if (p) facts.push(`Latest career plan: ${JSON.stringify({ input: p.input, result: p.result }).slice(0, 5000)}`);
  } else if (page === 'tracker') {
    const apps = await Application.find({ userId }).sort({ updatedAt: -1 }).limit(15).select('title status deadline').lean();
    facts.push(`Tracked applications: ${JSON.stringify(apps)}`);
  }
  if (context) facts.push(`On-screen context (user-visible content): ${context}`);

  const system = `You are the HerGuide assistant inside the "${page}" page of a platform that helps women find support resources, career pathways, opportunities and entrepreneurship resources (India-first).
You answer using ONLY the facts below plus general, widely-known guidance. Keep answers short (under 180 words), practical and kind. Use short paragraphs or a few bullets.
If the user asks for a specific organisation, phone number, scheme, deadline or eligibility rule that is not in the facts below, say you don't have verified information and point them to the relevant HerGuide page or the official source.
When explaining a match, use the computed match details; never claim certainty about eligibility.
${SAFETY_RULES}

Facts:
${facts.join('\n')}`;

  const emergency = detectCrisis(message);
  const reply = await chat(system, [
    ...history,
    { role: 'user', content: `${asData('user_input', message)}` },
  ], 700);
  res.json({ reply, emergency, emergencyMessage: emergency ? EMERGENCY_MESSAGE : undefined });
});

const recSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string(),
    detail: z.string(),
    path: z.enum(['/support', '/opportunities', '/work', '/biz', '/documents', '/tracker', '/profile']).catch('/profile'),
  })).max(5).default([]),
});

export const generateRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user: any = await User.findById(userId);
  const pool: any[] = await Opportunity.find({ active: true }).limit(300).lean();
  const mu = userToMatchUser(user);
  const top = pool.filter((o) => isOpen(o.deadline))
    .map((o) => ({ title: o.title, category: o.category, match: compactMatch(computeMatch(mu, o)) }))
    .sort((a, b) => b.match.score - a.match.score).slice(0, 5);
  const plan: any = await CareerPlan.findOne({ userId, kind: { $in: ['skillgap', 'returntowork'] } }).sort({ createdAt: -1 }).select('result readiness').lean();
  const appCount = await Application.countDocuments({ userId });

  const out = await completeJSON(
    recSchema,
    `You write 3-5 short, personalised next-step recommendations for a user of HerGuide.
Each: {title (max 8 words), detail (1-2 sentences), path} where path is one of /support /opportunities /work /biz /documents /tracker /profile.
Base them ONLY on the facts provided (profile gaps, top matched opportunity titles, missing skills, tracker activity). Do not invent opportunities, schemes or deadlines. If the profile is sparse, recommend completing it.
${SAFETY_RULES}`,
    asData('user_input', JSON.stringify({
      profile: profileSummary(user), topMatches: top, trackedApplications: appCount,
      missingSkills: plan?.result?.missingSkills?.slice(0, 5), readiness: plan?.readiness,
    })),
    900,
  );
  user.aiRecommendations = { items: out.recommendations, generatedAt: new Date() };
  user.markModified('aiRecommendations');
  await user.save();
  res.json(user.aiRecommendations);
});
