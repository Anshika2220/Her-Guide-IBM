import { Schema, model } from 'mongoose';
import { PLAN_KINDS } from '../config/constants';

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: PLAN_KINDS, required: true },
    title: String,
    input: Schema.Types.Mixed,
    result: Schema.Types.Mixed,
    readiness: Number, // computed server-side from skill lists, not AI-asserted
    checked: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const CareerPlan = model('CareerPlan', schema);
