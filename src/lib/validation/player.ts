import { z } from 'zod';
import { DEFAULT_EMAIL_DOMAIN, isSrmEmail, srmEmailMessage } from './email';

/**
 * Zod schema for a single player in the team.
 *
 * Used by both the React form (client) and API route handlers (server).
 * The server NEVER trusts the browser — this schema runs on both sides.
 */

const DEFAULT_DOMAIN = DEFAULT_EMAIL_DOMAIN;

export function createPlayerSchema(allowedDomain: string = DEFAULT_DOMAIN) {
  return z.object({
    slot: z.number().int().min(1).max(4),
    isLeader: z.boolean(),

    fullName: z
      .string()
      .trim()
      .min(2, 'Enter the full name (letters only)')
      .max(60, 'Name must be at most 60 characters')
      .regex(/^[a-zA-Z\s.'\-]+$/, 'Enter the full name (letters only)')
      .transform((v) => v.replace(/\s{2,}/g, ' ')), // collapse double spaces

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Enter a valid email address')
      .refine((e) => isSrmEmail(e, allowedDomain), { message: srmEmailMessage(allowedDomain) }),

    regNo: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^RA\d{13}$/, 'Enter your SRM register number, e.g. RA2311003010123'),

    phone: z
      .string()
      .trim()
      .optional()
      .transform((v) => {
        if (!v) return undefined;
        const cleaned = v.replace(/^(\+91|0)/, '').replace(/[\s\-]/g, '');
        return cleaned || undefined;
      })
      .refine(
        (v) => !v || /^[6-9]\d{9}$/.test(v),
        { message: 'Enter a 10-digit Indian mobile number' }
      ),

    year: z
      .string()
      .optional()
      .transform((v) => (v === '' ? undefined : v))
      .pipe(z.enum(['1', '2', '3', '4', '5', 'PG']).optional()),

    department: z
      .string()
      .trim()
      .max(60, 'Department must be at most 60 characters')
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
  });
}

/** Default player schema using the env domain or fallback. */
export const playerSchema = createPlayerSchema(
  typeof process !== 'undefined'
    ? process.env.ALLOWED_EMAIL_DOMAIN || DEFAULT_DOMAIN
    : DEFAULT_DOMAIN
);

export type PlayerInput = z.infer<typeof playerSchema>;
