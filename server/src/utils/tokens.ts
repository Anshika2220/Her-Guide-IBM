import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { CookieOptions } from 'express';
import { env, isProd } from '../config/env';

export type Role = 'user' | 'admin';
export interface AccessPayload { sub: string; role: Role }
export interface RefreshPayload { sub: string; jti: string }

export const REFRESH_COOKIE = 'hg_refresh';

export const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role } satisfies AccessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string): string {
  const jti = crypto.randomUUID();
  return jwt.sign({ sub: userId, jti } satisfies RefreshPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` as jwt.SignOptions['expiresIn'],
  });
}

export const verifyAccessToken = (t: string) => jwt.verify(t, env.JWT_ACCESS_SECRET) as AccessPayload;
export const verifyRefreshToken = (t: string) => jwt.verify(t, env.JWT_REFRESH_SECRET) as RefreshPayload;

export const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax', // 'none' needed if client and API are on different sites in prod
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
});
