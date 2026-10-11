import { Router } from 'express';
import { aiChat, chatSchema, generateRecommendations } from '../controllers/aiController';
import { requireAuth } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const r = Router();
r.use(requireAuth);
r.post('/chat', aiLimiter, validate(chatSchema), aiChat);
r.post('/recommendations', aiLimiter, generateRecommendations);
export default r;
