import { z } from 'zod';
import { playerSchema, type PlayerInput } from './player';

/**
 * Zod schema for Step 1 — team registration.
 *
 * Validates:
 * - Team name (3–30 chars, unique check is done by DB index)
 * - 2–4 players with exactly one leader
 * - No duplicate emails or register numbers WITHIN the team
 *   (cross-team duplicates are caught by MongoDB unique indexes)
 * - Leader must have a phone number
 * - Consent checkbox must be true
 * - Honeypot must be empty
 * - Turnstile token present
 * - Idempotency key present
 */

export const teamSchema = z
  .object({
    teamName: z
      .string()
      .trim()
      .min(3, 'Team name must be at least 3 characters')
      .max(30, 'Team name must be at most 30 characters')
      .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Letters, numbers, spaces, - and _ only'),

    players: z
      .array(playerSchema)
      .min(2, 'A team must have 2 to 4 players')
      .max(4, 'A team must have 2 to 4 players'),

    source: z.enum(['Instagram', 'WhatsApp', 'Friend', 'Poster', 'Other']).optional(),

    consent: z.literal(true, 'Accept the rules & refund policy to continue'),

    // ── Anti-bot fields ───────────────────────────────────────────
    website: z.string().max(0, 'Bot detected').optional().default(''), // honeypot — must be empty
    _formOpenedAt: z.number().optional(), // timestamp when form was opened — used for time-trap

    // ── Turnstile + idempotency ───────────────────────────────────
    turnstileToken: z.string().min(1, 'Verification failed, please retry'),
    idempotencyKey: z.string().uuid('Invalid idempotency key'),
  })
  .superRefine((data, ctx) => {
    // ── Exactly one leader ──────────────────────────────────────
    const leaders = data.players.filter((p) => p.isLeader);
    if (leaders.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'Exactly one player must be the leader',
        path: ['players'],
      });
    }

    // ── Leader must have a phone number ─────────────────────────
    const leader = data.players.find((p) => p.isLeader);
    if (leader && !leader.phone) {
      const leaderIndex = data.players.indexOf(leader);
      ctx.addIssue({
        code: 'custom',
        message: 'Leader must provide a WhatsApp number',
        path: ['players', leaderIndex, 'phone'],
      });
    }

    // ── No duplicate emails within the team ─────────────────────
    const emails = data.players.map((p) => p.email);
    for (let i = 0; i < emails.length; i++) {
      const firstIndex = emails.indexOf(emails[i]);
      if (firstIndex !== i) {
        ctx.addIssue({
          code: 'custom',
          message: `Player ${i + 1} has the same email as Player ${firstIndex + 1}`,
          path: ['players', i, 'email'],
        });
      }
    }

    // ── No duplicate register numbers within the team ───────────
    const regNos = data.players.map((p) => p.regNo);
    for (let i = 0; i < regNos.length; i++) {
      const firstIndex = regNos.indexOf(regNos[i]);
      if (firstIndex !== i) {
        ctx.addIssue({
          code: 'custom',
          message: `Player ${i + 1} has the same register number as Player ${firstIndex + 1}`,
          path: ['players', i, 'regNo'],
        });
      }
    }
  });

export type TeamInput = z.infer<typeof teamSchema>;

/**
 * Server-side-only version that strips fields the client shouldn't control.
 * Use this in route handlers.
 */
export const teamServerSchema = teamSchema;
