import { Request, Response, NextFunction } from 'express';
import { CreateFirSchema, UpdateFirSchema, FinalizeFirSchema } from '@fir/shared';
import * as firService from '../services/fir.service';
import { createAuditLog, getClientIp } from '../middleware/audit.middleware';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler.middleware';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = CreateFirSchema.parse(req.body);
    const { sub: officerId, stationId } = req.officer!;

    // Fetch officer and station details for AI prompt
    const officer = await prisma.officer.findUnique({
      where: { id: officerId },
      select: { fullName: true, rank: true, badgeNumber: true },
    });
    const station = await prisma.policeStation.findUnique({
      where: { id: stationId },
      select: { stationName: true, stationCode: true, district: true, state: true },
    });

    if (!officer || !station) throw new AppError(404, 'Officer or station not found');

    const fir = await firService.createFirAndAnalyze(
      officerId, stationId, input, officer, station
    );

    await createAuditLog({
      officerId,
      action: 'FIR_CREATED',
      resource: 'FIR',
      resourceId: fir.id,
      ipAddress: getClientIp(req),
      newValue: { firId: fir.id, complainant: fir.complainantName },
    });

    res.status(201).json({ success: true, data: fir });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await firService.listFirs(
      req.officer!.stationId,
      req.query as Record<string, string>
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fir = await firService.getFir(req.params.id, req.officer!.stationId);
    res.json({ success: true, data: fir });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = UpdateFirSchema.parse(req.body);
    const fir = await firService.updateFir(
      req.params.id, req.officer!.sub, req.officer!.stationId, input
    );
    res.json({ success: true, data: fir });
  } catch (err) {
    next(err);
  }
}

export async function finalize(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = FinalizeFirSchema.parse(req.body);
    const fir = await firService.finalizeFir(
      req.params.id, req.officer!.sub, req.officer!.stationId, input
    );

    await createAuditLog({
      officerId: req.officer!.sub,
      action: 'FIR_FINALIZED',
      resource: 'FIR',
      resourceId: fir.id,
      ipAddress: getClientIp(req),
      newValue: { firNumber: fir.firNumber },
    });

    res.json({ success: true, data: fir });
  } catch (err) {
    next(err);
  }
}
