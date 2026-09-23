import { NextRequest, NextResponse } from 'next/server';
import { paymentSubmissionSchema } from '@/validators/registration';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyTurnstileToken } from '@/lib/captcha';
import { submitPaymentProof } from '@/services/paymentService';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // 1. Rate Limiting Check
    const rateCheck = checkRateLimit(ip, 'payment', {
      windowMs: 10 * 60 * 1000,
      max: 10,
    });
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          ok: false,
          code: 'RATE_LIMITED',
          message: 'Too many payment submissions. Please wait a few moments.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Turnstile Verification
    const captchaResult = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!captchaResult.success) {
      return NextResponse.json(
        {
          ok: false,
          code: 'CAPTCHA_FAILED',
          message: 'Security verification failed.',
        },
        { status: 400 }
      );
    }

    // 3. Zod Validation
    const payload = { ...body, teamId };
    const parseResult = paymentSubmissionSchema.safeParse(payload);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        fieldErrors[issue.path.join('.')] = issue.message;
      });

      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: parseResult.error.issues[0]?.message || 'Invalid payment data',
          fields: fieldErrors,
        },
        { status: 400 }
      );
    }

    // 4. Submit Proof
    const result = await submitPaymentProof(parseResult.data);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: result.fields ? 'DUPLICATE_UTR' : 'PAYMENT_ERROR',
          message: result.message,
          fields: result.fields,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: result.status,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Payment API error:', err);
    return NextResponse.json(
      {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing payment.',
      },
      { status: 500 }
    );
  }
}
