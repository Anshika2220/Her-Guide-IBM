import { EDUCATION_LEVELS } from '../config/constants';

export interface MatchUser {
  education?: string | null;
  skills?: string[];
  interests?: string[];
  goals?: string[];
  location?: string | null;
  yearsOfExperience?: number | null;
}
export interface MatchOpp {
  category: string;
  location?: string | null;
  mode?: string | null;
  tags?: string[];
  eligibility?: {
    educationLevels?: string[];
    minExperienceYears?: number | null;
    maxExperienceYears?: number | null;
    skills?: string[];
    locations?: string[];
  } | null;
}

export interface MatchFactor {
  key: string;
  label: string;
  weight: number;
  status: 'match' | 'mismatch' | 'unknown';
  score: number | null; // 0..1, null when unknown
  reason: string;
}
export interface MatchResult {
  score: number;
  label: 'Strong match' | 'Good match' | 'Partial match' | 'Low match';
  confidence: 'high' | 'medium' | 'low';
  factors: MatchFactor[];
  matches: string[];
  mismatches: string[];
  unknowns: string[];
}

const CATEGORY_GOALS: Record<string, string[]> = {
  scholarship: ['Find scholarship'],
  internship: ['Find internship'],
  job: ['Find job'],
  fellowship: ['Find scholarship', 'Learn skills', 'Find job'],
  returnship: ['Return to work'],
  training: ['Learn skills'],
  entrepreneurship: ['Start business'],
  government: ['Find support/resources', 'Start business', 'Find scholarship'],
  women_program: ['Find support/resources', 'Learn skills', 'Start business'],
};
const NATIONWIDE = ['india', 'pan-india', 'pan india', 'all india', 'national', 'nationwide', 'anywhere'];

const norm = (s: string) => s.trim().toLowerCase();
const clean = (a?: string[] | null) => (a ?? []).map(norm).filter(Boolean);
const hits = (needles: string[], haystack: string[]) =>
  needles.filter((n) => haystack.some((h) => h === n || h.includes(n) || n.includes(h)));

/**
 * Deterministic, explainable matching. Each factor is scored from real profile/opportunity data.
 * Factors with missing data on either side are "unknown": they are excluded from the average
 * and they dampen the final score (x sqrt of data coverage), so incomplete information never produces a confident number.
 */
export function computeMatch(user: MatchUser, opp: MatchOpp): MatchResult {
  const el = opp.eligibility ?? {};
  const factors: MatchFactor[] = [];
  const add = (f: Omit<MatchFactor, 'score'> & { score?: number | null }) =>
    factors.push({ ...f, score: f.score ?? null });

  // 1. Goal
  const goals = user.goals ?? [];
  const wanted = CATEGORY_GOALS[opp.category] ?? [];
  if (!goals.length) add({ key: 'goal', label: 'Stated goal', weight: 0.25, status: 'unknown', reason: 'You have not selected any goals yet' });
  else if (goals.some((g) => wanted.includes(g))) add({ key: 'goal', label: 'Stated goal', weight: 0.25, status: 'match', score: 1, reason: `Fits your goal: ${goals.find((g) => wanted.includes(g))}` });
  else add({ key: 'goal', label: 'Stated goal', weight: 0.25, status: 'mismatch', score: 0, reason: 'Does not line up with the goals you selected' });

  // 2. Education
  const levels = el.educationLevels ?? [];
  if (!user.education) add({ key: 'education', label: 'Education', weight: 0.2, status: 'unknown', reason: 'Add your education level to check this' });
  else if (!levels.length) add({ key: 'education', label: 'Education', weight: 0.2, status: 'unknown', reason: 'No education requirement listed for this opportunity' });
  else if (levels.includes(user.education)) add({ key: 'education', label: 'Education', weight: 0.2, status: 'match', score: 1, reason: `Open to ${user.education} level` });
  else add({ key: 'education', label: 'Education', weight: 0.2, status: 'mismatch', score: 0, reason: `Listed for: ${levels.join(', ')}` });

  // 3. Skills
  const reqSkills = clean(el.skills);
  const userSkills = clean(user.skills);
  if (!reqSkills.length) add({ key: 'skills', label: 'Skills', weight: 0.2, status: 'unknown', reason: 'No specific skills listed' });
  else if (!userSkills.length) add({ key: 'skills', label: 'Skills', weight: 0.2, status: 'unknown', reason: 'Add your skills to check this' });
  else {
    const got = hits(reqSkills, userSkills);
    const ratio = got.length / reqSkills.length;
    if (ratio >= 0.5) add({ key: 'skills', label: 'Skills', weight: 0.2, status: 'match', score: ratio, reason: `Skills in common: ${got.join(', ')}` });
    else add({ key: 'skills', label: 'Skills', weight: 0.2, status: 'mismatch', score: ratio, reason: `Asks for ${reqSkills.join(', ')}; you share ${got.length ? got.join(', ') : 'none yet'}` });
  }

  // 4. Experience
  const min = el.minExperienceYears ?? null;
  const max = el.maxExperienceYears ?? null;
  const yrs = user.yearsOfExperience ?? null;
  if (min === null && max === null) add({ key: 'experience', label: 'Experience', weight: 0.15, status: 'unknown', reason: 'No experience requirement listed' });
  else if (yrs === null) add({ key: 'experience', label: 'Experience', weight: 0.15, status: 'unknown', reason: 'Add your years of experience to check this' });
  else if (min !== null && yrs < min) add({ key: 'experience', label: 'Experience', weight: 0.15, status: 'mismatch', score: Math.max(0, yrs / min), reason: `Requires ${min}+ years of experience` });
  else if (max !== null && yrs > max) add({ key: 'experience', label: 'Experience', weight: 0.15, status: 'mismatch', score: 0, reason: `Intended for up to ${max} years of experience` });
  else add({ key: 'experience', label: 'Experience', weight: 0.15, status: 'match', score: 1, reason: 'Your experience is within the listed range' });

  // 5. Location
  const locs = clean(el.locations).length ? clean(el.locations) : clean([opp.location ?? '']);
  if (opp.mode === 'remote') add({ key: 'location', label: 'Location', weight: 0.1, status: 'match', score: 1, reason: 'Remote opportunity' });
  else if (locs.some((l) => NATIONWIDE.includes(l))) add({ key: 'location', label: 'Location', weight: 0.1, status: 'match', score: 1, reason: 'Open across India' });
  else if (!user.location) add({ key: 'location', label: 'Location', weight: 0.1, status: 'unknown', reason: 'Add your location to check this' });
  else if (!locs.length) add({ key: 'location', label: 'Location', weight: 0.1, status: 'unknown', reason: 'No location listed' });
  else if (hits(locs, [norm(user.location)]).length) add({ key: 'location', label: 'Location', weight: 0.1, status: 'match', score: 1, reason: 'Location requirement appears satisfied' });
  else add({ key: 'location', label: 'Location', weight: 0.1, status: 'mismatch', score: 0, reason: `Based in ${locs.join(', ')}` });

  // 6. Interests
  const tags = clean(opp.tags);
  const interests = clean(user.interests);
  if (!tags.length || !interests.length) add({ key: 'interests', label: 'Interests', weight: 0.1, status: 'unknown', reason: tags.length ? 'Add interests to check this' : 'No topic tags listed' });
  else {
    const got = hits(interests, tags);
    if (got.length) add({ key: 'interests', label: 'Interests', weight: 0.1, status: 'match', score: Math.min(1, got.length / 2), reason: `Related to your interest in ${got.join(', ')}` });
    else add({ key: 'interests', label: 'Interests', weight: 0.1, status: 'mismatch', score: 0, reason: 'Topics differ from your listed interests' });
  }

  const known = factors.filter((f) => f.score !== null);
  const wKnown = known.reduce((s, f) => s + f.weight, 0);
  const wTotal = factors.reduce((s, f) => s + f.weight, 0);
  const base = wKnown ? known.reduce((s, f) => s + f.weight * (f.score as number), 0) / wKnown : 0;
  // dampen when information is missing: score is scaled by sqrt(coverage), so one known factor
  // out of six can never produce a high-looking number
  const score = wKnown ? Math.round(base * Math.sqrt(wKnown / wTotal) * 100) : 0;

  const coverage = wKnown / wTotal;
  return {
    score,
    label: score >= 80 ? 'Strong match' : score >= 60 ? 'Good match' : score >= 40 ? 'Partial match' : 'Low match',
    confidence: coverage >= 0.75 ? 'high' : coverage >= 0.45 ? 'medium' : 'low',
    factors,
    matches: factors.filter((f) => f.status === 'match').map((f) => f.reason),
    mismatches: factors.filter((f) => f.status === 'mismatch').map((f) => f.reason),
    unknowns: factors.filter((f) => f.status === 'unknown').map((f) => f.reason),
  };
}

export const compactMatch = (m: MatchResult) => ({ score: m.score, label: m.label, confidence: m.confidence });

export function userToMatchUser(u: any, overrides: Partial<MatchUser> = {}): MatchUser {
  return {
    education: u.education,
    skills: u.skills,
    interests: u.interests,
    goals: u.goals,
    location: u.location,
    yearsOfExperience: u.careerProfile?.yearsOfExperience ?? null,
    ...overrides,
  };
}

export const isOpen = (deadline?: Date | null) => !deadline || new Date(deadline).getTime() >= Date.now();
export { EDUCATION_LEVELS };
