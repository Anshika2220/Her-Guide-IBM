import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { Role, verifyAccessToken } from '../utils/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: { id: string; role: Role } }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError(401, 'Please sign in to continue.'));
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'Your session has expired. Please sign in again.'));
  }
}

export const requireRole = (role: Role) => (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== role) return next(new AppError(403, "You don't have permission to do that."));
  next();
};
