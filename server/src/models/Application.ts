import { Schema, model } from 'mongoose';
import { APP_STATUSES } from '../config/constants';

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity' },
    // snapshot fields so custom entries work and records survive opportunity deletion
    title: { type: String, required: true, trim: true, maxlength: 200 },
    organization: { type: String, trim: true, maxlength: 200, default: '' },
    status: { type: String, enum: APP_STATUSES, default: 'interested' },
    notes: { type: String, maxlength: 3000, default: '' },
    appliedDate: Date,
    deadline: Date,
    applicationUrl: String,
    history: [{ _id: false, status: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true },
);
schema.index({ userId: 1, opportunityId: 1 }, { unique: true, partialFilterExpression: { opportunityId: { $exists: true } } });

export const Application = model('Application', schema);
