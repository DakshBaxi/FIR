import { Request, Response, NextFunction } from 'express';
import { CreateStationSchema, UpdateStationSchema } from '@fir/shared';
import * as stationService from '../services/station.service';
import { createAuditLog, getClientIp } from '../middleware/audit.middleware';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = CreateStationSchema.parse(req.body);
    const station = await stationService.createStation(input);

    await createAuditLog({
      action: 'STATION_REGISTERED',
      resource: 'STATION',
      resourceId: station.id,
      ipAddress: getClientIp(req),
      newValue: { stationCode: station.stationCode, stationName: station.stationName },
    });

    res.status(201).json({ success: true, data: station });
  } catch (err) {
    next(err);
  }
}

export async function getMyStation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const station = await stationService.getStation(req.officer!.stationId);
    res.json({ success: true, data: station });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = UpdateStationSchema.parse(req.body);
    const station = await stationService.updateStation(req.officer!.stationId, input);

    await createAuditLog({
      officerId: req.officer!.sub,
      action: 'STATION_UPDATED',
      resource: 'STATION',
      resourceId: station.id,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, data: station });
  } catch (err) {
    next(err);
  }
}
