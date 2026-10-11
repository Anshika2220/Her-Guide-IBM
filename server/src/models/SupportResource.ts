import { Schema, model } from 'mongoose';
import { RESOURCE_TYPES } from '../config/constants';

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    // A resource can serve several situations; 'emergency' marks resources shown in urgent cases
    categories: { type: [String], default: ['general'], index: true },
    description: { type: String, required: true, maxlength: 2000 },
    location: { type: String, default: 'India' },
    phone: { type: String, trim: true },
    website: String,
    type: { type: String, enum: RESOURCE_TYPES, default: 'ngo' },
    availability: String,
    sourceUrl: String,
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);
schema.index({ name: 'text', description: 'text' });

export const SupportResource = model('SupportResource', schema);
