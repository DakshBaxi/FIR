import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler.middleware';
import { CreateStationInput, UpdateStationInput, OfficerRole } from '@fir/shared';

export async function createStation(input: CreateStationInput) {
  const existingCode = await prisma.policeStation.findUnique({ where: { stationCode: input.stationCode } });
  if (existingCode) throw new AppError(409, `Station code '${input.stationCode}' is already registered`);

  if (input.email) {
    const existingEmail = await prisma.policeStation.findUnique({ where: { email: input.email } });
    if (existingEmail) throw new AppError(409, 'Station email already registered');
  }

  const existingBadge = await prisma.officer.findUnique({ where: { badgeNumber: input.adminBadgeNumber } });
  if (existingBadge) throw new AppError(409, `Badge number '${input.adminBadgeNumber}' is already registered`);

  const passwordHash = await bcrypt.hash(input.adminPassword, env.BCRYPT_ROUNDS);

  const station = await prisma.policeStation.create({
    data: {
      stationName: input.stationName,
      stationCode: input.stationCode.toUpperCase(),
      district: input.district,
      state: input.state,
      address: input.address,
      phone: input.phone,
      email: input.email,
      jurisdiction: input.jurisdiction,
      latitude: input.latitude,
      longitude: input.longitude,
      officers: {
        create: {
          badgeNumber: input.adminBadgeNumber,
          fullName: input.adminOfficerName,
          rank: input.adminRank,
          role: OfficerRole.STATION_ADMIN,
          phone: input.adminPhone,
          email: input.adminEmail,
          passwordHash,
        },
      },
    },
    include: { officers: { select: { id: true, badgeNumber: true, fullName: true, role: true } } },
  });

  return station;
}

export async function getStation(stationId: string) {
  const station = await prisma.policeStation.findUnique({
    where: { id: stationId },
    include: {
      _count: { select: { officers: true, firs: true } },
    },
  });
  if (!station) throw new AppError(404, 'Station not found');
  return station;
}

export async function updateStation(stationId: string, input: UpdateStationInput) {
  const station = await prisma.policeStation.findUnique({ where: { id: stationId } });
  if (!station) throw new AppError(404, 'Station not found');

  return prisma.policeStation.update({
    where: { id: stationId },
    data: { ...input, updatedAt: new Date() },
  });
}
