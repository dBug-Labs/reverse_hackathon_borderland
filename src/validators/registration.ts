import { z } from 'zod';

export const SRM_EMAIL_REGEX = /^[a-z0-9._%+-]+@srmist\.edu\.in$/i;
export const SRM_REGNO_REGEX = /^RA\d{13}$/i;
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
export const UTR_REGEX = /^\d{12}$/;

// Helper sanitizers
export const sanitizePhone = (val: string): string => {
  return val.replace(/\+91|\s|-/g, '').trim();
};

export const sanitizeRegNo = (val: string): string => {
  return val.trim().toUpperCase();
};

export const sanitizeEmail = (val: string): string => {
  return val.trim().toLowerCase();
};

export const playerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, hyphens, and dots'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SRM_EMAIL_REGEX, 'Must be a valid SRM email (@srmist.edu.in)'),
  regNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(SRM_REGNO_REGEX, 'Must be a valid SRM register number (e.g. RA2311003010123)'),
  phone: z
    .string()
    .transform(sanitizePhone)
    .optional()
    .or(z.literal('')),
  year: z.enum(['1', '2', '3', '4', '5', 'PG']).default('2'),
  department: z.string().trim().max(60).optional().default('CSE'),
  college: z.string().trim().max(100).optional().default('SRM Institute of Science and Technology'),
});

export const teamRegistrationSchema = z
  .object({
    teamName: z
      .string()
      .trim()
      .min(3, 'Team name must be at least 3 characters')
      .max(30, 'Team name must be at most 30 characters')
      .regex(/^[a-zA-Z0-9\s_-]+$/, 'Team name can only contain letters, numbers, spaces, and -_'),
    teamSize: z.coerce.number().int().min(2, 'Team must have at least 2 players').max(4, 'Team cannot exceed 4 players'),
    players: z.array(playerSchema).min(2).max(4),
    consent: z.literal(true, {
      message: 'You must accept the protocol rules and refund policy',
    }),
    website: z.string().max(0, 'Spam detected').optional().or(z.literal('')), // Honeypot field
    turnstileToken: z.string().optional(),
    hearAbout: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Validate teamSize matches players.length
    if (data.players.length !== data.teamSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['teamSize'],
        message: `Expected ${data.teamSize} players but found ${data.players.length}`,
      });
    }

    // 2. Leader phone is strictly required
    const leaderPhone = data.players[0]?.phone;
    if (!leaderPhone || !INDIAN_PHONE_REGEX.test(leaderPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['players', 0, 'phone'],
        message: 'Team leader must provide a valid 10-digit Indian WhatsApp mobile number',
      });
    }

    // 3. Optional members phone if provided must be valid
    for (let i = 1; i < data.players.length; i++) {
      const pPhone = data.players[i]?.phone;
      if (pPhone && pPhone.length > 0 && !INDIAN_PHONE_REGEX.test(pPhone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['players', i, 'phone'],
          message: 'Member phone must be a valid 10-digit Indian mobile number',
        });
      }
    }

    // 4. In-team duplicate checks: emails & register numbers
    const seenEmails = new Map<string, number>();
    const seenRegNos = new Map<string, number>();

    data.players.forEach((player, idx) => {
      const email = sanitizeEmail(player.email);
      const regNo = sanitizeRegNo(player.regNo);

      if (seenEmails.has(email)) {
        const firstIdx = seenEmails.get(email)! + 1;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['players', idx, 'email'],
          message: `Player ${idx + 1} has the same email as Player ${firstIdx}`,
        });
      } else {
        seenEmails.set(email, idx);
      }

      if (seenRegNos.has(regNo)) {
        const firstIdx = seenRegNos.get(regNo)! + 1;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['players', idx, 'regNo'],
          message: `Player ${idx + 1} has the same register number as Player ${firstIdx}`,
        });
      } else {
        seenRegNos.set(regNo, idx);
      }
    });
  });

export const paymentSubmissionSchema = z
  .object({
    teamId: z.string().min(1, 'Team ID is required'),
    utr: z
      .string()
      .trim()
      .regex(UTR_REGEX, 'UTR must be exactly 12 digits from your payment app'),
    confirmUtr: z
      .string()
      .trim()
      .regex(UTR_REGEX, 'Confirmation UTR must be exactly 12 digits'),
    amount: z.coerce.number().positive('Amount must be positive'),
    payerName: z.string().trim().max(60).optional(),
    screenshotUrl: z.string().optional(),
    turnstileToken: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.utr !== data.confirmUtr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmUtr'],
        message: 'The two UTR entries do not match. Please double-check.',
      });
    }
  });

export type PlayerInput = z.infer<typeof playerSchema>;
export type TeamRegistrationInput = z.infer<typeof teamRegistrationSchema>;
export type PaymentSubmissionInput = z.infer<typeof paymentSubmissionSchema>;
