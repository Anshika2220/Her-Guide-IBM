import { Router } from 'express';
import * as p from '../controllers/profileController';
import { getDashboard } from '../controllers/dashboardController';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { profileSchema } from '../utils/validators';

export const profileRoutes = Router();
profileRoutes.use(requireAuth);
profileRoutes.get('/', p.getProfile);
profileRoutes.put('/', validate(profileSchema), p.updateProfile);
profileRoutes.delete('/', authLimiter, validate(p.deleteAccountSchema), p.deleteAccount);

export const dashboardRoutes = Router();
dashboardRoutes.get('/', requireAuth, getDashboard);
