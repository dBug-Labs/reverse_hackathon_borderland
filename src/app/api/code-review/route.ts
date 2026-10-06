import { NextRequest, NextResponse } from 'next/server';
import { requireCodeReview } from '@/lib/security/codeReview';
import { getActiveEvent } from '@/lib/services/registration';
import { codeReviewView, saveCodeScore } from '@/lib/services/codeReview';

/**
 * GET  /api/code-review — teams with their card, repo and judged commit, plus saved scores
 * POST /api/code-review — { teamId, parts, notes, report } saves a team's code score · { teamId, remove: true }
 */

export async function GET(req: NextRequest) {
  const auth = await requireCodeReview(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    return NextResponse.json({ ok: true, data: await codeReviewView(ev._id, auth.name) });
  } catch (error) {
    console.error('GET /api/code-review error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCodeReview(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    const res = await saveCodeScore(ev._id, await req.json().catch(() => ({})), auth.name);
    if (!res.ok) return NextResponse.json(res, { status: 400 });
    return NextResponse.json({ ok: true, data: await codeReviewView(ev._id, auth.name) });
  } catch (error) {
    console.error('POST /api/code-review error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
