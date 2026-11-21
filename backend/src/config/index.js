import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  S3_BUCKET: z.string().optional().default(''),
  S3_KEY_PREFIX: z.string().optional().default(''),
  AWS_REGION: z.string().default('us-east-1'),
  LOG_LEVEL: z.string().default('info'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(30),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  DIAG_TOKEN: z.string().optional().default(''),
  MAX_UPLOAD_BYTES: z.coerce.number().default(5 * 1024 * 1024),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
   
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
const env = parsed.data;
if (env.NODE_ENV === 'production' && env.JWT_SECRET.startsWith('change-me')) {
   
  console.error('Refusing to start in production with the example JWT_SECRET');
  process.exit(1);
}
if (env.STORAGE_DRIVER === 's3' && !env.S3_BUCKET) {
   
  console.error('S3_BUCKET is required when STORAGE_DRIVER=s3');
  process.exit(1);
}

export const config = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  cookieSecure: env.COOKIE_SECURE === 'true',
  corsOrigins: env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
};
