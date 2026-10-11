export const EDUCATION = ['High School', 'Diploma', 'Undergraduate', 'Postgraduate', 'Doctorate'];
export const EMPLOYMENT = ['Student', 'Employed', 'Self-employed', 'Unemployed', 'Career break', 'Other'];
export const GOALS = ['Find internship', 'Find job', 'Return to work', 'Learn skills', 'Find scholarship', 'Start business', 'Find support/resources'];
export const INTERESTS = ['Technology', 'Business', 'Education', 'Healthcare', 'Finance', 'Entrepreneurship', 'Design', 'Science', 'Arts & Media', 'Law & Policy', 'Social Impact'];

export const OPP_CATEGORIES: Record<string, string> = {
  scholarship: 'Scholarship', internship: 'Internship', job: 'Job', fellowship: 'Fellowship', returnship: 'Returnship',
  training: 'Training', government: 'Government program', women_program: 'Women-focused program', entrepreneurship: 'Entrepreneurship',
};
export const SUPPORT_CATEGORIES: Record<string, string> = {
  workplace: 'Workplace concerns', harassment: 'Harassment', discrimination: 'Discrimination', domestic_abuse: 'Domestic abuse',
  cyber_harassment: 'Cyber harassment', financial_abuse: 'Financial abuse', education: 'Education-related barriers',
  general: 'General support', other: 'Other',
};
export const URGENCY = [
  { value: '', label: 'Not sure' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'emergency', label: 'Emergency / in danger' },
];
export const STATUSES: { value: string; label: string; tone: string }[] = [
  { value: 'interested', label: 'Interested', tone: 'bg-sky-400/10 text-sky-300 border-sky-400/20' },
  { value: 'applied', label: 'Applied', tone: 'bg-violet-400/10 text-violet-300 border-violet-400/20' },
  { value: 'in_progress', label: 'In progress', tone: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
  { value: 'interview', label: 'Interview', tone: 'bg-fuchsia-400/10 text-fuchsia-300 border-fuchsia-400/20' },
  { value: 'shortlisted', label: 'Shortlisted', tone: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
  { value: 'completed', label: 'Completed', tone: 'bg-teal-400/10 text-teal-300 border-teal-400/20' },
  { value: 'rejected', label: 'Rejected', tone: 'bg-zinc-400/10 text-zinc-400 border-zinc-400/20' },
];
export const statusLabel = (v: string) => STATUSES.find((s) => s.value === v)?.label ?? v;
export const MODES = ['remote', 'onsite', 'hybrid'];
export const DISCLAIMER =
  'HerGuide provides general informational guidance and does not replace professional legal, medical, or emergency assistance.';
export const CONTACT_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || '';
