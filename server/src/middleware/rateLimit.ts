import rateLimit from 'express-rate-limit';

const make = (windowMin: number, max: number, message: string) =>
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

export const authLimiter = make(15, 20, 'Too many attempts. Please try again in a few minutes.');
export const passwordResetLimiter = make(60, 5, 'Too many reset requests. Please try again later.');

// AI calls cost money: limit per signed-in user (falls back to a shared bucket if unauthenticated)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: { message: "You've reached the hourly limit for AI requests. Please try again later." },
});
