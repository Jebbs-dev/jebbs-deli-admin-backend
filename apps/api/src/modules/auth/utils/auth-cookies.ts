import { Response } from 'express';
import { randomBytes } from 'node:crypto';

const ACCESS_TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function cookieOptions(maxAge: number, httpOnly = true) {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge,
    path: '/',
  };
}

export function setCsrfCookie(res: Response, token?: string) {
  const csrf = token ?? randomBytes(32).toString('hex');
  // Readable by JS for double-submit header
  res.cookie('csrf_token', csrf, cookieOptions(REFRESH_TOKEN_MAX_AGE_MS, false));
  return csrf;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  res.cookie('access_token', accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
  res.cookie(
    'refresh_token',
    refreshToken,
    cookieOptions(REFRESH_TOKEN_MAX_AGE_MS),
  );
  return setCsrfCookie(res);
}

export function clearAuthCookies(res: Response) {
  const isProduction = process.env.NODE_ENV === 'production';
  const base = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  };

  res.clearCookie('access_token', base);
  res.clearCookie('refresh_token', base);
  res.clearCookie('csrf_token', {
    ...base,
    httpOnly: false,
  });
}
