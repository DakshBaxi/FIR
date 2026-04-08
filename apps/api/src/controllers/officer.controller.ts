import { Request, Response, NextFunction } from 'express';
import { CreateOfficerSchema, UpdateOfficerSchema } from '@fir/shared';
import * as officerService from '../services/officer.service';
import { createAuditLog, getClientIp } from '../middleware/audit.middleware';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = CreateOfficerSchema.parse(req.body);
    const officer = await officerService.createOfficer(req.officer!.stationId, req.officer!.role, input);

    await createAuditLog({
      officerId: req.officer!.sub,
      action: 'OFFICER_CREATED',
      resource: 'OFFICER',
      resourceId: officer.id,
      ipAddress: getClientIp(req),
      newValue: { badgeNumber: officer.badgeNumber, role: officer.role },
    });

    res.status(201).json({ success: true, data: officer });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await officerService.listOfficers(req.officer!.stationId, req.query as Record<string, string>);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const officer = await officerService.getOfficer(req.params.id, req.officer!.stationId);
    res.json({ success: true, data: officer });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = UpdateOfficerSchema.parse(req.body);
    const officer = await officerService.updateOfficer(
      req.params.id,
      req.officer!.stationId,
      req.officer!.role,
      input
    );

    await createAuditLog({
      officerId: req.officer!.sub,
      action: 'OFFICER_UPDATED',
      resource: 'OFFICER',
      resourceId: req.params.id,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, data: officer });
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const officer = await officerService.deactivateOfficer(
      req.params.id,
      req.officer!.stationId,
      req.officer!.sub,
      req.officer!.role
    );

    await createAuditLog({
      officerId: req.officer!.sub,
      action: 'OFFICER_DEACTIVATED',
      resource: 'OFFICER',
      resourceId: req.params.id,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, data: officer });
  } catch (err) {
    next(err);
  }
}
