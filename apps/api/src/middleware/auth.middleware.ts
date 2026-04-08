import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { isTokenBlacklisted } from '../config/redis';
import { AppError } from './errorHandler.middleware';
import { OfficerRole } from '@fir/shared';

export interface JwtPayload {
  sub: string;       // officer id
  stationId: string;
  role: OfficerRole;
  jti: string;       // unique token id (for blacklisting)
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      officer?: JwtPayload;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    // Check Redis blacklist (handles logout/revocation)
    const blacklisted = await isTokenBlacklisted(payload.jti);
    if (blacklisted) {
      throw new AppError(401, 'Token has been revoked');
    }

    req.officer = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    if (err instanceof jwt.JsonWebTokenError) return next(new AppError(401, 'Invalid token'));
    if (err instanceof jwt.TokenExpiredError) return next(new AppError(401, 'Token expired'));
    next(err);
  }
}
