import { Router } from 'express';
import { publicResources } from '../controllers/publicController';

const r = Router();
r.get('/resources', publicResources);
export default r;
