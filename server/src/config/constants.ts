export const OPP_CATEGORIES = [
  'scholarship', 'internship', 'job', 'fellowship', 'returnship',
  'training', 'government', 'women_program', 'entrepreneurship',
] as const;
export const OPP_MODES = ['remote', 'onsite', 'hybrid'] as const;

export const SUPPORT_CATEGORIES = [
  'workplace', 'harassment', 'discrimination', 'domestic_abuse', 'cyber_harassment',
  'financial_abuse', 'education', 'general', 'other',
] as const;
export const RESOURCE_TYPES = ['helpline', 'government', 'ngo', 'legal', 'online_portal'] as const;
export const URGENCY = ['low', 'medium', 'high', 'emergency'] as const;

export const EDUCATION_LEVELS = ['High School', 'Diploma', 'Undergraduate', 'Postgraduate', 'Doctorate'] as const;
export const EMPLOYMENT = ['Student', 'Employed', 'Self-employed', 'Unemployed', 'Career break', 'Other'] as const;
export const GOALS = [
  'Find internship', 'Find job', 'Return to work', 'Learn skills',
  'Find scholarship', 'Start business', 'Find support/resources',
] as const;
export const INTERESTS = [
  'Technology', 'Business', 'Education', 'Healthcare', 'Finance',
  'Entrepreneurship', 'Design', 'Science', 'Arts & Media', 'Law & Policy', 'Social Impact',
] as const;

export const APP_STATUSES = [
  'interested', 'applied', 'in_progress', 'interview', 'shortlisted', 'completed', 'rejected',
] as const;
export const SAVED_TYPES = ['opportunity', 'resource', 'careerPlan', 'document', 'guidance'] as const;
export const PLAN_KINDS = ['skillgap', 'returntowork', 'business'] as const;
