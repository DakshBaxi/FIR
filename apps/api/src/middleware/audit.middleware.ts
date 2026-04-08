import { prisma } from '../config/database';
import { JwtPayload } from './auth.middleware';

export async function createAuditLog(params: {
  officerId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        officerId: params.officerId ?? null,
        action: params.action,
        resource: params.resource ?? null,
        resourceId: params.resourceId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        oldValue: params.oldValue ? (params.oldValue as object) : undefined,
        newValue: params.newValue ? (params.newValue as object) : undefined,
      },
    });
  } catch {
    // Audit log failures must never break the main request
  }
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}
