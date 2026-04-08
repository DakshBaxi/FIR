import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

// JWT blacklist helpers
export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  await redis.setex(`blacklist:${jti}`, ttlSeconds, '1');
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const result = await redis.get(`blacklist:${jti}`);
  return result !== null;
}
