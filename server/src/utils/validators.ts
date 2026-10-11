import { z } from 'zod';
import {
  APP_STATUSES, EDUCATION_LEVELS, EMPLOYMENT, GOALS, OPP_CATEGORIES, OPP_MODES,
  RESOURCE_TYPES, SUPPORT_CATEGORIES,
} from '../config/constants';

/** http(s) only: blocks javascript:/data: URLs that could be rendered as links. */
export const httpUrl = z.string().trim().max(500).refine((v) => {
  try { return ['http:', 'https:'].includes(new URL(v).protocol); } catch { return false; }
}, 'Please enter a valid http(s) URL.');

export const optionalUrl = z.preprocess((v) => (v === '' || v === null ? undefined : v), httpUrl.optional());
export const optionalDate = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.date().optional(),
);
export const nullableDate = z.preprocess(
  (v) => (v === '' ? null : v),
  z.coerce.date().nullable().optional(),
);
export const nullableUrl = z.preprocess((v) => (v === '' ? null : v), httpUrl.nullable().optional());
export const tagList = (max = 50) =>
  z.array(z.string().trim().min(1).max(60)).max(max).transform((a) => [...new Set(a)]);

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  age: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().int().min(13).max(100).optional()),
  location: z.string().trim().max(100).optional(),
  education: z.enum(EDUCATION_LEVELS).optional(),
  employmentStatus: z.enum(EMPLOYMENT).optional(),
  skills: tagList().optional(),
  interests: tagList(20).optional(),
  goals: z.array(z.enum(GOALS)).max(GOALS.length).optional(),
  careerProfile: z.object({
    currentRole: z.string().trim().max(100).optional(),
    previousRole: z.string().trim().max(100).optional(),
    yearsOfExperience: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().min(0).max(60).optional()),
    careerBreakMonths: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().min(0).max(600).optional()),
    desiredCareer: z.string().trim().max(100).optional(),
  }).optional(),
});

export const opportunitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  organization: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  category: z.enum(OPP_CATEGORIES),
  location: z.string().trim().max(100).default('India'),
  mode: z.enum(OPP_MODES).default('onsite'),
  eligibility: z.object({
    summary: z.string().trim().max(2000).default(''),
    educationLevels: z.array(z.enum(EDUCATION_LEVELS)).default([]),
    minExperienceYears: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().min(0).max(60).optional()),
    maxExperienceYears: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().min(0).max(60).optional()),
    skills: tagList().default([]),
    locations: tagList().default([]),
  }).default({}),
  deadline: optionalDate,
  requiredDocuments: tagList().default([]),
  applicationUrl: optionalUrl,
  sourceUrl: optionalUrl,
  tags: tagList().default([]),
  verified: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const resourceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  categories: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
  description: z.string().trim().min(1).max(2000),
  location: z.string().trim().max(100).default('India'),
  phone: z.string().trim().max(40).optional(),
  website: optionalUrl,
  sourceUrl: optionalUrl,
  type: z.enum(RESOURCE_TYPES).default('ngo'),
  availability: z.string().trim().max(200).optional(),
  verified: z.boolean().default(false),
});

export const applicationSchema = z.object({
  opportunityId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  organization: z.string().trim().max(200).optional(),
  status: z.enum(APP_STATUSES).optional(),
  notes: z.string().max(3000).optional(),
  appliedDate: nullableDate,
  deadline: nullableDate,
  applicationUrl: nullableUrl,
});

export const supportAnalyzeSchema = z.object({
  description: z.string().trim().min(10, 'Please describe your situation in a little more detail.').max(3000),
  category: z.enum(SUPPORT_CATEGORIES).default('general'),
  location: z.string().trim().max(100).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
});

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
