import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  AI_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  PDF_STORAGE_PATH: z.string().default('./storage/pdfs'),
});

function validateEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof EnvSchema>;
