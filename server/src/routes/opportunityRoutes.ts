import { Router } from 'express';
import * as o from '../controllers/opportunityController';
import { requireAuth } from '../middleware/auth';

const r = Router();
r.use(requireAuth);
r.get('/', o.listOpportunities);
r.get('/:id', o.getOpportunity);
r.post('/:id/save', o.saveOpportunity);
r.delete('/:id/save', o.unsaveOpportunity);
export default r;
