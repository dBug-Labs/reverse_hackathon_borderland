import { NextRequest, NextResponse } from 'next/server';
import { teamRegistrationSchema } from '@/validators/registration';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyTurnstileToken } from '@/lib/captcha';
import { createRegistration, getRegistration } from '@/services/registrationService';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // 1. Rate Limiting Check
    const rateCheck = checkRateLimit(ip, 'registration', {
      windowMs: 10 * 60 * 1000,
      max: 15,
    });
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          ok: false,
          code: 'RATE_LIMITED',
          message: 'Too many registration requests. Please wait a few minutes before trying again.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Honeypot Check (Bot trap: field should remain empty)
    if (body.website && body.website.trim().length > 0) {
      // Return fake success to confuse spam bots
      return NextResponse.json({
        ok: true,
        registrationId: 'DBG-000',
        message: 'Registration received',
      });
    }

    // 3. CAPTCHA / Turnstile Verification
    const captchaResult = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!captchaResult.success) {
      return NextResponse.json(
        {
          ok: false,
          code: 'CAPTCHA_FAILED',
          message: 'Security verification failed. Please complete the CAPTCHA.',
        },
        { status: 400 }
      );
    }

    // 4. Zod Schema Validation
    const parseResult = teamRegistrationSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      });

      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: parseResult.error.issues[0]?.message || 'Invalid registration data',
          fields: fieldErrors,
        },
        { status: 400 }
      );
    }

    // 5. Create Registration & Check Duplicates
    const result = await createRegistration(parseResult.data);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: result.fields ? 'DUPLICATE_ENTRY' : 'REGISTRATION_ERROR',
          message: result.message,
          fields: result.fields,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        registrationId: result.registrationId,
        teamName: result.teamName,
        fee: result.fee,
        upiId: result.upiId,
        payeeName: result.payeeName,
        status: result.status,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Registration API error:', err);
    return NextResponse.json(
      {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing registration.',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { ok: false, message: 'Registration ID is required' },
      { status: 400 }
    );
  }

  const reg = await getRegistration(id);
  if (!reg) {
    return NextResponse.json(
      { ok: false, message: 'Registration not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    registration: {
      registrationId: reg.registrationId,
      teamName: reg.teamName,
      teamSize: reg.teamSize,
      fullName: reg.fullName,
      status: reg.status,
      createdAt: reg.createdAt,
    },
  });
}
