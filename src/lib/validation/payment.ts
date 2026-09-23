import { z } from 'zod';

/**
 * Zod schema for Step 2 — payment proof (UTR only, no screenshot).
 *
 * Validates:
 * - UTR is exactly 12 digits
 * - Confirm UTR matches the first
 * - Amount is a positive number (checked against event.fee on the server)
 * - Turnstile token present
 */

export const paymentSchema = z
  .object({
    utr: z
      .string()
      .trim()
      .regex(/^\d{12}$/, 'UTR must be the 12-digit number from your payment app'),

    confirmUtr: z
      .string()
      .trim()
      .regex(/^\d{12}$/, 'UTR must be the 12-digit number from your payment app'),

    amount: z
      .number('Amount is required')
      .positive('Amount must be positive'),

    payerUpi: z
      .string()
      .trim()
      .max(60, 'Payer info must be at most 60 characters')
      .optional(),

    paidAt: z.string().optional(), // ISO datetime string

    turnstileToken: z.string().min(1, 'Verification failed, please retry'),
  })
  .refine((data) => data.utr === data.confirmUtr, {
    message: "UTRs don't match",
    path: ['confirmUtr'],
  });

export type PaymentInput = z.infer<typeof paymentSchema>;
