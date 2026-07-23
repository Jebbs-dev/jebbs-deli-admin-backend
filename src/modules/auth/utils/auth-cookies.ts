import { Response } from 'express';

const ACCESS_TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function cookieOptions(maxAge: number) {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    // Cross-site cookies need none in production.
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    maxAge,
    path: '/',
  };
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
}
