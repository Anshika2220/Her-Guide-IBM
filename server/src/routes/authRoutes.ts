import { Router } from 'express';
import * as c from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

const r = Router();
r.post('/register', authLimiter, validate(c.registerSchema), c.register);
r.post('/login', authLimiter, validate(c.loginSchema), c.login);
r.post('/refresh', c.refresh);
r.post('/logout', c.logout);
r.get('/me', requireAuth, c.me);
r.post('/forgot-password', passwordResetLimiter, validate(c.forgotSchema), c.forgotPassword);
r.post('/reset-password', passwordResetLimiter, validate(c.resetSchema), c.resetPassword);
r.post('/change-password', requireAuth, authLimiter, validate(c.changePasswordSchema), c.changePassword);
r.post('/logout-all', requireAuth, c.logoutAll);
export default r;
