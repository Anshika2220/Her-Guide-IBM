import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { isProd } from '../config/env';

export const notFound = (_req: Request, _res: Response, next: NextFunction) =>
  next(new AppError(404, 'That endpoint does not exist.'));

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier.' });
  }
  console.error(isProd ? err?.message : err); // never log request bodies (passwords)
  res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
}
