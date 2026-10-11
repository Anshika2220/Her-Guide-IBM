import { Request, Response } from 'express';
import { z } from 'zod';
import { SUPPORT_CATEGORIES } from '../config/constants';
import { SupportResource } from '../models/SupportResource';
import { User } from '../models/User';
import { asData, completeJSON, SAFETY_RULES } from '../services/aiService';
import { detectCrisis, EMERGENCY_MESSAGE } from '../services/crisis';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeDoc } from '../utils/profile';
import { escapeRegex } from '../utils/validators';

const guidanceSchema = z.object({
  possibleCategory: z.enum(SUPPORT_CATEGORIES).catch('other'),
  whatYouDescribed: z.string().default(''),
  nextSteps: z.array(z.string()).default([]),
  evidenceChecklist: z.array(z.string()).default([]),
  thingsToConsider: z.array(z.string()).default([]),
  immediateDanger: z.boolean().catch(false),
});

const SYSTEM = `You are HerGuide Support, a calm and compassionate assistant that helps women understand their options after difficult experiences (harassment, discrimination, abuse, workplace or education barriers).
You are given a person's description and must return JSON with:
- possibleCategory: one of ${SUPPORT_CATEGORIES.join(', ')} (a POSSIBLE category, not a legal finding)
- whatYouDescribed: 1-2 sentences, starting with "Your situation may relate to ..." that reflect back what they said, without legal conclusions
- nextSteps: 4-6 short, practical, safe next steps (e.g. documenting incidents, preserving messages, reviewing the organisation's grievance/complaints process, considering contacting a support organisation, seeking professional or legal advice)
- evidenceChecklist: 4-8 items of things worth keeping or noting (dates, messages, emails, witnesses, records)
- thingsToConsider: 2-4 gentle points (e.g. emotional support, trusted people, timelines to be aware of in general terms WITHOUT citing specific laws or section numbers)
- immediateDanger: true only if the description suggests the person or someone else may be in immediate physical danger or at risk of self-harm
Do NOT include any phone numbers, organization names, website links or law names; verified resources are attached separately by the platform.
${SAFETY_RULES}`;

export const analyzeSupport = asyncHandler(async (req: Request, res: Response) => {
  const { description, category, location, urgency } = req.body;
  const user = await User.findById(req.user!.id).lean();
  let emergency = urgency === 'emergency' || detectCrisis(description);

  let guidance: z.infer<typeof guidanceSchema> | null = null;
  try {
    guidance = await completeJSON(
      guidanceSchema,
      SYSTEM,
      `Selected category: ${category}\nUrgency (self-reported): ${urgency ?? 'not given'}\nLocation: ${location || user?.location || 'not given'}\n${asData('user_input', description)}`,
      1800,
    );
    if (guidance.immediateDanger) emergency = true;
  } catch (e) {
    if (!emergency) throw e; // in an emergency we still return help even if the AI is down
  }

  const cats = new Set<string>([category]);
  if (guidance) cats.add(guidance.possibleCategory);
  cats.add('general');
  if (emergency) cats.add('emergency');
  const found = await SupportResource.find({ categories: { $in: [...cats] } }).limit(40).lean();
  const place = (location || user?.location || '').toLowerCase();
  const rank = (r: any) =>
    (emergency && r.categories.includes('emergency') ? 100 : 0) +
    (r.categories.includes(category) ? 20 : 0) +
    (guidance && r.categories.includes(guidance.possibleCategory) ? 15 : 0) +
    (place && r.location.toLowerCase().includes(place) ? 10 : 0) +
    (r.verified ? 2 : 0);
  const resources = found.sort((a, b) => rank(b) - rank(a)).slice(0, 8).map(serializeDoc);

  res.json({
    emergency,
    emergencyMessage: emergency ? EMERGENCY_MESSAGE : undefined,
    guidance: guidance && {
      possibleCategory: guidance.possibleCategory,
      whatYouDescribed: guidance.whatYouDescribed,
      nextSteps: guidance.nextSteps,
      evidenceChecklist: guidance.evidenceChecklist,
      thingsToConsider: guidance.thingsToConsider,
    },
    resources,
    guidanceUnavailable: !guidance,
  });
});

export const listResources = asyncHandler(async (req: Request, res: Response) => {
  const { category, q, location } = req.query as Record<string, string | undefined>;
  const filter: any = {};
  if (category) filter.categories = category;
  if (location) filter.location = new RegExp(escapeRegex(location.slice(0, 80)), 'i');
  if (q) {
    const rx = new RegExp(escapeRegex(q.slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }
  const items = await SupportResource.find(filter).sort({ verified: -1, name: 1 }).limit(100).lean();
  res.json({ items: items.map(serializeDoc) });
});
