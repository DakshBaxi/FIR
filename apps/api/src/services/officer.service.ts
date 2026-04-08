import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler.middleware';
import { CreateOfficerInput, OfficerRole, ROLE_HIERARCHY, UpdateOfficerInput } from '@fir/shared';
import { parsePagination, paginationToSkipTake } from '../utils/pagination';

function assertManageableRole(actorRole: OfficerRole, targetRole: OfficerRole) {
  if (ROLE_HIERARCHY[actorRole] <= ROLE_HIERARCHY[targetRole]) {
    throw new AppError(403, 'You can only manage officers below your own role');
  }
}

export async function createOfficer(stationId: string, actorRole: OfficerRole, input: CreateOfficerInput) {
  const existing = await prisma.officer.findUnique({ where: { badgeNumber: input.badgeNumber } });
  if (existing) throw new AppError(409, `Badge number '${input.badgeNumber}' is already registered`);
  assertManageableRole(actorRole, input.role);

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  return prisma.officer.create({
    data: {
      stationId,
      badgeNumber: input.badgeNumber,
      fullName: input.fullName,
      rank: input.rank,
      role: input.role,
      phone: input.phone,
      email: input.email,
      passwordHash,
    },
    select: {
      id: true, badgeNumber: true, fullName: true, rank: true,
      role: true, phone: true, email: true, isActive: true, createdAt: true,
    },
  });
}

export async function listOfficers(stationId: string, query: { page?: string; limit?: string }) {
  const pagination = parsePagination(query);
  const skipTake = paginationToSkipTake(pagination);

  const [items, total] = await Promise.all([
    prisma.officer.findMany({
      where: { stationId },
      ...skipTake,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, badgeNumber: true, fullName: true, rank: true,
        role: true, phone: true, email: true, isActive: true,
        lastLoginAt: true, createdAt: true,
      },
    }),
    prisma.officer.count({ where: { stationId } }),
  ]);

  return {
    items,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

export async function getOfficer(officerId: string, stationId: string) {
  const officer = await prisma.officer.findFirst({
    where: { id: officerId, stationId },
    select: {
      id: true, badgeNumber: true, fullName: true, rank: true,
      role: true, phone: true, email: true, isActive: true,
      lastLoginAt: true, createdAt: true,
    },
  });
  if (!officer) throw new AppError(404, 'Officer not found');
  return officer;
}

export async function updateOfficer(
  officerId: string,
  stationId: string,
  actorRole: OfficerRole,
  input: UpdateOfficerInput
) {
  const officer = await prisma.officer.findFirst({ where: { id: officerId, stationId } });
  if (!officer) throw new AppError(404, 'Officer not found');
  assertManageableRole(actorRole, officer.role as OfficerRole);
  if (input.role) assertManageableRole(actorRole, input.role);

  return prisma.officer.update({
    where: { id: officerId },
    data: { ...input, updatedAt: new Date() },
    select: {
      id: true, badgeNumber: true, fullName: true, rank: true,
      role: true, phone: true, email: true, isActive: true,
    },
  });
}

export async function deactivateOfficer(
  officerId: string,
  stationId: string,
  actorId: string,
  actorRole: OfficerRole
) {
  const officer = await prisma.officer.findFirst({ where: { id: officerId, stationId } });
  if (!officer) throw new AppError(404, 'Officer not found');
  if (officer.id === actorId) throw new AppError(400, 'You cannot deactivate your own account');
  assertManageableRole(actorRole, officer.role as OfficerRole);

  return prisma.officer.update({
    where: { id: officerId },
    data: { isActive: false },
    select: { id: true, badgeNumber: true, isActive: true },
  });
}
