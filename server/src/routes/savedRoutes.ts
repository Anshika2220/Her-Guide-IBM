import { Router } from 'express';
import * as s from '../controllers/savedController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const r = Router();
r.use(requireAuth);
r.get('/', s.listSaved);
r.post('/', validate(s.saveSchema), s.saveItem);
r.delete('/:id', s.unsaveById);
export default r;
