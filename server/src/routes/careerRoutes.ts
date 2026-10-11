import { Router } from 'express';
import { analyzeBiz, bizSchema } from '../controllers/bizController';
import * as c from '../controllers/careerController';
import { requireAuth } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

export const careerRoutes = Router();
careerRoutes.use(requireAuth);
careerRoutes.get('/profile', c.getCareerProfile);
careerRoutes.post('/analyze', aiLimiter, validate(c.analyzeSchema), c.analyzeCareer);
careerRoutes.post('/gap-explanation', aiLimiter, validate(c.gapSchema), c.gapExplanation);
careerRoutes.get('/plans', c.listPlans);
careerRoutes.get('/plans/:id', c.getPlan);
careerRoutes.patch('/plans/:id/checked', validate(c.checkedSchema), c.updateChecked);
careerRoutes.delete('/plans/:id', c.deletePlan);

export const bizRoutes = Router();
bizRoutes.use(requireAuth);
bizRoutes.post('/analyze', aiLimiter, validate(bizSchema), analyzeBiz);
