import { Request, Response, NextFunction } from 'express';
import { LoginSchema } from '@fir/shared';
import * as authService from '../services/auth.service';
import { createAuditLog, getClientIp } from '../middleware/audit.middleware';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler.middleware';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { badgeNumber, password } = LoginSchema.parse(req.body);
    const ip = getClientIp(req);

    const result = await authService.loginOfficer(badgeNumber, password, ip);

    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);

    await createAuditLog({
      officerId: result.officer.id,
      action: 'LOGIN',
      resource: 'OFFICER',
      resourceId: result.officer.id,
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        officer: result.officer,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawRefreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;
    if (!rawRefreshToken) throw new AppError(401, 'No refresh token');

    const result = await authService.refreshAccessToken(rawRefreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.officer) throw new AppError(401, 'Not authenticated');

    const rawRefreshToken = req.cookies[REFRESH_COOKIE] as string | undefined;
    await authService.logoutOfficer(req.officer.jti, req.officer.exp, rawRefreshToken);

    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });

    await createAuditLog({
      officerId: req.officer.sub,
      action: 'LOGOUT',
      resource: 'OFFICER',
      resourceId: req.officer.sub,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
}

export function me(req: Request, res: Response): void {
  res.json({ success: true, data: req.officer });
}
