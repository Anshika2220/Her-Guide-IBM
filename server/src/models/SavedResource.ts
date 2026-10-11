import { Schema, model } from 'mongoose';
import { SAVED_TYPES } from '../config/constants';

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: { type: String, enum: SAVED_TYPES, required: true },
    itemId: { type: Schema.Types.ObjectId }, // absent for 'guidance' snapshots
    title: String,
    snapshot: Schema.Types.Mixed, // only used for support guidance the user explicitly saves
  },
  { timestamps: true },
);
schema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true, partialFilterExpression: { itemId: { $exists: true } } });

export const SavedResource = model('SavedResource', schema);
