import { Schema, model } from 'mongoose';
import { OPP_CATEGORIES, OPP_MODES } from '../config/constants';

const schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    organization: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    category: { type: String, enum: OPP_CATEGORIES, required: true, index: true },
    location: { type: String, trim: true, default: 'India' },
    mode: { type: String, enum: OPP_MODES, default: 'onsite' },
    eligibility: {
      summary: { type: String, default: '' },
      educationLevels: { type: [String], default: [] },
      minExperienceYears: Number,
      maxExperienceYears: Number,
      skills: { type: [String], default: [] },
      locations: { type: [String], default: [] },
    },
    deadline: Date,
    requiredDocuments: { type: [String], default: [] },
    applicationUrl: String,
    tags: { type: [String], default: [] },
    sourceUrl: String,
    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
schema.index({ title: 'text', organization: 'text', description: 'text', tags: 'text' });

export const Opportunity = model('Opportunity', schema);
