import { z } from 'zod';
import { playerSchema } from './player';

/**
 * Zod schemas for team registration.
 *
 * The flow is one pass: details → pay → submit UTR. Nothing is stored until
 * the final submit, so there are two schemas:
 *   - teamDetailsSchema:        Step 1 check (no captcha, nothing saved)
 *   - registrationSubmitSchema: final submit (details + UTR + Turnstile)
 *
 * Validates:
 * - Team name (3–30 chars; uniqueness is enforced by a DB index)
 * - 2–4 players with exactly one leader, who must have a phone number
 * - No duplicate emails or register numbers WITHIN the team
 *   (cross-team duplicates are caught by MongoDB unique indexes)
 * - Consent, honeypot, time-trap timestamp
 */

const teamFields = {
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
};

type TeamShape = {
  players: Array<{ isLeader: boolean; phone?: string; email: string; regNo: string }>;
};

function refineTeam(data: TeamShape, ctx: z.RefinementCtx) {
  // ── Exactly one leader ──────────────────────────────────────
  const leaders = data.players.filter((p) => p.isLeader);
  if (leaders.length !== 1) {
    ctx.addIssue({ code: 'custom', message: 'Exactly one player must be the leader', path: ['players'] });
  }

  // ── Leader must have a phone number ─────────────────────────
  const leader = data.players.find((p) => p.isLeader);
  if (leader && !leader.phone) {
    ctx.addIssue({
      code: 'custom',
      message: 'Leader must provide a WhatsApp number',
      path: ['players', data.players.indexOf(leader), 'phone'],
    });
  }

  // ── No duplicate emails / register numbers within the team ──
  for (const field of ['email', 'regNo'] as const) {
    const values = data.players.map((p) => p[field]);
    values.forEach((v, i) => {
      const first = values.indexOf(v);
      if (first !== i) {
        ctx.addIssue({
          code: 'custom',
          message: `Player ${i + 1} has the same ${field === 'email' ? 'email' : 'register number'} as Player ${first + 1}`,
          path: ['players', i, field],
        });
      }
    });
  }
}

/** Step 1 — team details only. Nothing is written for this. */
export const teamDetailsSchema = z.object(teamFields).superRefine(refineTeam);

/** Team details + Turnstile + idempotency (kept for callers that create a team directly). */
export const teamSchema = z
  .object({
    ...teamFields,
    turnstileToken: z.string().min(1, 'Verification failed, please retry'),
    idempotencyKey: z.string().uuid('Invalid idempotency key'),
  })
  .superRefine(refineTeam);

const utrField = z
  .string()
  .trim()
  .regex(/^\d{12}$/, 'UTR must be the 12-digit number from your payment app');

/** Final submit — details, payment proof, Turnstile. The team is saved only now. */
export const registrationSubmitSchema = z
  .object({
    ...teamFields,
    turnstileToken: z.string().min(1, 'Verification failed, please retry'),
    idempotencyKey: z.string().uuid('Invalid idempotency key'),
    // Team ID shown on the payment step; used if still free when the team is saved
    candidateTeamId: z
      .string()
      .regex(/^[A-Z]{2,5}-[1-9]\d{2}$/)
      .optional(),
    utr: utrField,
    confirmUtr: utrField,
    amount: z.number('Amount is required').positive('Amount must be positive'),
    payerUpi: z.string().trim().max(60, 'Payer info must be at most 60 characters').optional(),
  })
  .superRefine((data, ctx) => {
    refineTeam(data, ctx);
    if (data.utr !== data.confirmUtr) {
      ctx.addIssue({ code: 'custom', message: "UTRs don't match", path: ['confirmUtr'] });
    }
  });

export type TeamDetailsInput = z.infer<typeof teamDetailsSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type RegistrationSubmitInput = z.infer<typeof registrationSubmitSchema>;

export const teamServerSchema = teamSchema;
