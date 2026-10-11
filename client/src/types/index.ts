export interface User {
  id: string; name: string; email: string; role: 'user' | 'admin';
  age?: number; location?: string; education?: string; employmentStatus?: string;
  skills: string[]; interests: string[]; goals: string[];
  careerProfile?: { currentRole?: string; previousRole?: string; yearsOfExperience?: number; careerBreakMonths?: number; desiredCareer?: string };
  onboardingComplete: boolean; createdAt: string;
}
export interface MatchSummary { score: number; label: string; confidence: 'high' | 'medium' | 'low' }
export interface MatchFactor { key: string; label: string; status: 'match' | 'mismatch' | 'unknown'; reason: string }
export interface MatchDetail extends MatchSummary { factors: MatchFactor[]; matches: string[]; mismatches: string[]; unknowns: string[] }
export interface Opportunity {
  id: string; title: string; organization: string; description: string; category: string;
  location?: string; mode?: string; deadline?: string | null; applicationUrl?: string; sourceUrl?: string;
  requiredDocuments: string[]; tags: string[]; verified?: boolean; createdAt: string; updatedAt: string;
  eligibility?: { summary?: string; educationLevels?: string[]; minExperienceYears?: number; maxExperienceYears?: number; skills?: string[]; locations?: string[] };
  match?: MatchSummary; saved?: boolean; tracked?: boolean;
}
export interface SupportResource {
  id: string; name: string; categories: string[]; description: string; location: string;
  phone?: string; website?: string; type: string; availability?: string; verified?: boolean; sourceUrl?: string;
}
export interface Application {
  id: string; opportunityId?: string; title: string; organization?: string; status: string; notes?: string;
  appliedDate?: string; deadline?: string; applicationUrl?: string; history: { status: string; at: string }[];
  createdAt: string; updatedAt: string;
}
export interface SavedItem {
  id: string; itemType: 'opportunity' | 'resource' | 'careerPlan' | 'document' | 'guidance';
  itemId: string | null; title: string; subtitle: string; link: string | null; savedAt: string; data?: any;
}
export interface PlanSummary { id: string; kind: string; title: string; readiness?: number; createdAt: string }
export interface CareerResult {
  summary: string; existingSkills: string[];
  missingSkills: { skill: string; priority: 'high' | 'medium' | 'low'; why: string }[];
  roadmap: { week: number; title: string; focus: string[]; outcome?: string }[];
  portfolioIdeas: string[]; interviewPrep: string[]; opportunityTypes: string[]; skillsToRefresh: string[]; careerOptions: string[];
}
export interface BizResult {
  summary: string; checklist: { title: string; items: string[] }[]; questionsToResearch: string[]; risksToConsider: string[];
}
export interface Plan<R = any> extends PlanSummary { input: any; result: R; checked: string[] }
export interface DocAnalysis {
  summary: string; purpose: string; eligibility: string[]; requiredDocuments: string[]; importantDates: string[];
  applicationSteps: string[]; importantConditions: string[]; questionsToVerify: string[];
}
export interface DocItem { id: string; filename: string; createdAt: string; truncated?: boolean; analysis?: DocAnalysis }
