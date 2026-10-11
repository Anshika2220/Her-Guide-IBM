import { Router } from 'express';
import * as a from '../controllers/applicationController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { applicationSchema } from '../utils/validators';

const r = Router();
r.use(requireAuth);
r.get('/', a.listApplications);
r.post('/', validate(applicationSchema), a.createApplication);
r.put('/:id', validate(applicationSchema), a.updateApplication);
r.delete('/:id', a.deleteApplication);
export default r;
