import { Router } from 'express';
import { analyzeSupport, listResources } from '../controllers/supportController';
import { requireAuth } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { supportAnalyzeSchema } from '../utils/validators';

const r = Router();
r.use(requireAuth);
r.post('/analyze', aiLimiter, validate(supportAnalyzeSchema), analyzeSupport);
r.get('/resources', listResources);
export default r;
