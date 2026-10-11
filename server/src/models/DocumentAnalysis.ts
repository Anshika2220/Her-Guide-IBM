import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, maxlength: 200 },
    charCount: Number,
    truncated: Boolean,
    analysis: Schema.Types.Mixed,
  },
  { timestamps: true },
);

export const DocumentAnalysis = model('DocumentAnalysis', schema);
