import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { User } from '../types';

const baseURL = `${(import.meta.env.VITE_API_URL as string | undefined) ?? ''}/api`;
export const api = axios.create({ baseURL, withCredentials: true });
const raw = axios.create({ baseURL, withCredentials: true }); // no interceptors: used only for refresh

// Access token lives in memory only (never localStorage). The refresh token is an httpOnly cookie.
let accessToken: string | null = null;
let onAuthLost: (() => void) | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const setAuthLostHandler = (fn: () => void) => { onAuthLost = fn; };

let refreshing: Promise<{ accessToken: string; user: User }> | null = null;
export function refreshSession() {
  refreshing ??= raw.post('/auth/refresh').then((r) => r.data).finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'];
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && cfg && !cfg._retry && !NO_RETRY.some((p) => cfg.url?.startsWith(p))) {
      cfg._retry = true;
      try {
        const data = await refreshSession();
        setAccessToken(data.accessToken);
        cfg.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(cfg);
      } catch {
        setAccessToken(null);
        onAuthLost?.();
      }
    }
    return Promise.reject(error);
  },
);

export function errMsg(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const err = e as AxiosError<{ message?: string }>;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK') return "We couldn't reach the server. Check your connection and try again.";
  return fallback;
}
