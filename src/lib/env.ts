import { z } from 'zod';

/**
 * Startup environment variable validation.
 *
 * Imported once at cold-start (via lib/db.ts or instrumentation.ts).
 * A missing, weak, or equal password crashes the process with a clear message
 * instead of producing a silently broken state.
 */

const envSchema = z
  .object({
    // ── Database ───────────────────────────────────────────────
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    // ── Turnstile ──────────────────────────────────────────────
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY is required'),
    TURNSTILE_SECRET_KEY: z.string().min(1, 'TURNSTILE_SECRET_KEY is required'),

    // ── Email (Gmail SMTP) ─────────────────────────────────────
    SMTP_USER: z.string().email('SMTP_USER must be a valid email'),
    SMTP_APP_PASSWORD: z.string().min(10, 'SMTP_APP_PASSWORD is too short'),
    MAIL_FROM: z.string().min(1, 'MAIL_FROM is required'),
    EMAIL_DAILY_CAP: z.coerce.number().int().min(1).max(5000).default(450),
    VISA_CC_MEMBERS: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),

    // ── Auth ───────────────────────────────────────────────────
    ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD must be at least 12 characters'),
    ATTENDANCE_PASSWORD: z.string().min(12, 'ATTENDANCE_PASSWORD must be at least 12 characters'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    LINK_SECRET: z.string().min(32, 'LINK_SECRET must be at least 32 characters'),
    CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),

    // ── Config ─────────────────────────────────────────────────
    ALLOWED_EMAIL_DOMAIN: z.string().min(1).default('srmist.edu.in'),
    APP_URL: z.string().url('APP_URL must be a valid URL'),
  })
  .superRefine((env, ctx) => {
    if (env.ADMIN_PASSWORD === env.ATTENDANCE_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        message: 'ADMIN_PASSWORD and ATTENDANCE_PASSWORD must be different',
        path: ['ATTENDANCE_PASSWORD'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables.
 *
 * Lazily parsed on first access so that the module can be imported
 * without immediately crashing during build (Next.js compiles server
 * modules at build time but env vars are only available at runtime).
 */
let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      '\n❌ Invalid environment variables:\n',
      parsed.error.flatten().fieldErrors,
      '\n'
    );
    throw new Error('Invalid environment variables — see log above');
  }

  _env = parsed.data;
  return _env;
}
