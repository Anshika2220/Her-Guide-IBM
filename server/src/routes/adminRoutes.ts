import { Router } from 'express';
import * as a from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { opportunitySchema, resourceSchema } from '../utils/validators';

const r = Router();
r.use(requireAuth, requireRole('admin'));
r.get('/stats', a.stats);
r.get('/categories', a.categories);
r.get('/users', a.listUsers);

r.get('/opportunities', a.opportunities.list);
r.post('/opportunities', validate(opportunitySchema), a.opportunities.create);
r.put('/opportunities/:id', validate(opportunitySchema), a.opportunities.update);
r.delete('/opportunities/:id', a.opportunities.remove);

r.get('/resources', a.resources.list);
r.post('/resources', validate(resourceSchema), a.resources.create);
r.put('/resources/:id', validate(resourceSchema), a.resources.update);
r.delete('/resources/:id', a.resources.remove);
export default r;
