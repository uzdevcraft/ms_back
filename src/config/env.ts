import { z } from 'zod';

const PLACEHOLDER_JWT_PATTERNS = [
  /^change-me/i,
  /^your[-_]?secret/i,
  /^test[-_]?secret/i,
  /^dev[-_]?secret/i,
];

function looksLikeLocalDatabase(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch {
    return false;
  }
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((u) => u.startsWith('postgresql://') || u.startsWith('postgres://'), {
        message: 'DATABASE_URL must be a PostgreSQL connection string',
      }),
    TELEGRAM_BOT_TOKEN: z.string().min(20, 'TELEGRAM_BOT_TOKEN looks invalid'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGINS: z
      .string()
      .optional()
      .transform((v) =>
        v
          ? v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      ),
    BOOTSTRAP_ADMIN_TELEGRAM_IDS: z
      .string()
      .optional()
      .transform((v) =>
        v
          ? v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      ),
    INTERNAL_API_KEY: z.string().optional(),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
    RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') {
      return;
    }

    if (looksLikeLocalDatabase(data.DATABASE_URL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message:
          'Production must not use localhost for DATABASE_URL. Use DigitalOcean Managed PostgreSQL.',
      });
    }

    const hasSsl =
      data.DATABASE_URL.includes('sslmode=') || data.DATABASE_URL.includes('ssl=true');
    if (!hasSsl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message:
          'Production DATABASE_URL must enable SSL (e.g. sslmode=require for DigitalOcean).',
      });
    }

    if (data.CORS_ORIGINS.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message: 'CORS_ORIGINS is required in production (comma-separated WebApp origins).',
      });
    }

    if (!process.env.TRUST_PROXY || !['true', '1'].includes(process.env.TRUST_PROXY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TRUST_PROXY'],
        message: 'TRUST_PROXY must be true in production when running behind Nginx.',
      });
    }

    if (!data.INTERNAL_API_KEY || data.INTERNAL_API_KEY.length < 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['INTERNAL_API_KEY'],
        message: 'INTERNAL_API_KEY is required in production (min 16 chars). Send as X-Internal-Api-Key header.',
      });
    }

    if (PLACEHOLDER_JWT_PATTERNS.some((re) => re.test(data.JWT_SECRET))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be a unique random string in production.',
      });
    }
  });

export type Env = z.infer<typeof envSchema> & {
  docsEnabled: boolean;
  trustProxy: boolean;
};

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(message)}`);
  }

  const nodeEnv = parsed.data.NODE_ENV;

  cached = {
    ...parsed.data,
    NODE_ENV: nodeEnv,
    docsEnabled:
      process.env.DOCS_ENABLED === 'true' ||
      process.env.DOCS_ENABLED === '1' ||
      nodeEnv === 'development',
    trustProxy:
      process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1',
  };
  return cached;
}
