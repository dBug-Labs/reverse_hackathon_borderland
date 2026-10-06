import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, hashIp } from '@/lib/security/rateLimit';
import { readShareLink } from '@/lib/services/codeReview';

/**
 * GET /api/cr/[code] — one team's clone commands and review prompt, from a 30-minute link a judge
 * made in the code review kit. No login, so the judge never signs in on a participant's laptop.
 * Rate limited so codes cannot be guessed.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const ip = hashIp(getClientIp(req.headers));
  if (await checkRateLimit(`cr_link:${ip}`, 30, 10 * 60)) {
    return NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Too many tries. Wait a few minutes.' }, { status: 429 });
  }
  const { code } = await params;
  if (!/^[A-Za-z0-9]{6}$/.test(code)) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'That link is not valid.' }, { status: 404 });
  try {
    const data = await readShareLink(code);
    if (!data) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'That link has expired or is not valid. Ask the judge for a new one.' }, { status: 404 });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('GET /api/cr error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
