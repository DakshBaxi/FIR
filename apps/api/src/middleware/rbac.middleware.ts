import { Request, Response, NextFunction } from 'express';
import { OfficerRole, hasMinRole } from '@fir/shared';
import { AppError } from './errorHandler.middleware';

export function requireRole(minRole: OfficerRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.officer) {
      return next(new AppError(401, 'Authentication required'));
    }
    if (!hasMinRole(req.officer.role, minRole)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}
