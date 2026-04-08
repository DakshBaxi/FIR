import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { redis, blacklistToken } from '../config/redis';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler.middleware';
import { hashToken, generateTokenId } from '../utils/crypto';
import { JwtPayload } from '../middleware/auth.middleware';
import { OfficerRole } from '@fir/shared';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

export async function loginOfficer(badgeNumber: string, password: string, ipAddress?: string) {
  const officer = await prisma.officer.findUnique({
    where: { badgeNumber },
    include: { station: true },
  });

  if (!officer) throw new AppError(401, 'Invalid badge number or password');
  if (!officer.isActive) throw new AppError(403, 'Account is deactivated. Contact your station admin.');

  // Check lockout
  if (officer.lockedUntil && officer.lockedUntil > new Date()) {
    const remainingMins = Math.ceil((officer.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(423, `Account locked. Try again in ${remainingMins} minute(s).`);
  }

  const passwordValid = await bcrypt.compare(password, officer.passwordHash);

  if (!passwordValid) {
    const newFailedAttempts = officer.failedAttempts + 1;
    const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.officer.update({
      where: { id: officer.id },
      data: {
        failedAttempts: newFailedAttempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : undefined,
      },
    });

    if (shouldLock) {
      throw new AppError(423, `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`);
    }

    throw new AppError(401, 'Invalid badge number or password');
  }

  // Reset failed attempts on successful login
  await prisma.officer.update({
    where: { id: officer.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const accessJti = generateTokenId();
  const refreshJti = generateTokenId();

  const accessToken = jwt.sign(
    {
      sub: officer.id,
      stationId: officer.stationId,
      role: officer.role as OfficerRole,
      jti: accessJti,
    } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { sub: officer.id, jti: refreshJti },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  // Store hashed refresh token in DB
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      officerId: officer.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt,
      ipAddress: ipAddress ?? null,
    },
  });

  return {
    accessToken,
    refreshToken,
    officer: {
      id: officer.id,
      badgeNumber: officer.badgeNumber,
      fullName: officer.fullName,
      rank: officer.rank,
      role: officer.role,
      stationId: officer.stationId,
      stationName: officer.station.stationName,
      stationCode: officer.station.stationCode,
    },
  };
}

export async function refreshAccessToken(rawRefreshToken: string) {
  let payload: { sub: string; jti: string };
  try {
    payload = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as { sub: string; jti: string };
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token is invalid or expired');
  }

  const officer = await prisma.officer.findUnique({
    where: { id: payload.sub },
    include: { station: true },
  });
  if (!officer || !officer.isActive) throw new AppError(401, 'Officer account not found');

  const accessJti = generateTokenId();
  const accessToken = jwt.sign(
    {
      sub: officer.id,
      stationId: officer.stationId,
      role: officer.role as OfficerRole,
      jti: accessJti,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  return {
    accessToken,
    officer: {
      id: officer.id,
      badgeNumber: officer.badgeNumber,
      fullName: officer.fullName,
      rank: officer.rank,
      role: officer.role,
      stationId: officer.stationId,
      stationName: officer.station.stationName,
      stationCode: officer.station.stationCode,
    },
  };
}

export async function logoutOfficer(jti: string, exp: number, rawRefreshToken?: string) {
  // Blacklist the access token until its natural expiry
  const ttl = Math.max(0, exp - Math.floor(Date.now() / 1000));
  await blacklistToken(jti, ttl);

  // Revoke the refresh token
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }
}
