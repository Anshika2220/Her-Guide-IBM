import { Router } from 'express';
import * as d from '../controllers/documentController';
import { requireAuth } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const r = Router();
r.use(requireAuth);
r.get('/', d.listDocuments);
r.post('/upload', aiLimiter, d.uploadMiddleware, d.uploadDocument);
r.post('/analyze', aiLimiter, validate(d.analyzeTextSchema), d.analyzeDocumentText);
r.get('/:id', d.getDocument);
r.delete('/:id', d.deleteDocument);
export default r;
