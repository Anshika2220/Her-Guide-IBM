import { Schema, model } from 'mongoose';

const careerProfileSchema = new Schema(
  {
    currentRole: String,
    previousRole: String,
    yearsOfExperience: { type: Number, min: 0, max: 60 },
    careerBreakMonths: { type: Number, min: 0 },
    desiredCareer: String,
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // Profile (filled during onboarding, Phase 4)
    age: { type: Number, min: 13, max: 100 },
    location: { type: String, trim: true },
    education: { type: String, trim: true },
    employmentStatus: { type: String, trim: true },
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    goals: { type: [String], default: [] },
    careerProfile: { type: careerProfileSchema, default: {} },
    onboardingComplete: { type: Boolean, default: false },
    aiRecommendations: { type: Schema.Types.Mixed },

    // Auth internals (never returned to clients)
    refreshTokenHashes: { type: [String], default: [], select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export const User = model('User', userSchema);

export const toPublicUser = (u: any) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  age: u.age,
  location: u.location,
  education: u.education,
  employmentStatus: u.employmentStatus,
  skills: u.skills,
  interests: u.interests,
  goals: u.goals,
  careerProfile: u.careerProfile,
  onboardingComplete: u.onboardingComplete,
  aiRecommendations: u.aiRecommendations,
  createdAt: u.createdAt,
});
