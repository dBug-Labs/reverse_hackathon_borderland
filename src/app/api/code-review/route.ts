import { NextRequest, NextResponse } from 'next/server';
import { requireCodeReview } from '@/lib/security/codeReview';
import { getActiveEvent } from '@/lib/services/registration';
import { codeReviewView, createShareLink, fetchRepoReport, saveCodeScore } from '@/lib/services/codeReview';

/**
 * GET  /api/code-review — teams with their card, repo and judged commit, plus saved scores
 * POST /api/code-review — { teamId, parts, notes, report } saves a team's code score · { teamId, remove: true }
 *                         { action: 'link', teamId } a 30-minute no-login link for the participant's laptop
 *                         { action: 'fetch', teamId } the CODE_REVIEW.md the agent pushed to their repo
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
    const body = await req.json().catch(() => ({}));
    if (body.action === 'link' || body.action === 'fetch') {
      const r = body.action === 'link' ? await createShareLink(ev._id, String(body.teamId || ''), auth.name) : await fetchRepoReport(ev._id, String(body.teamId || ''));
      if (!r.ok) return NextResponse.json(r, { status: 404 });
      return NextResponse.json({ ok: true, data: r });
    }
    const res = await saveCodeScore(ev._id, body, auth.name);
    if (!res.ok) return NextResponse.json(res, { status: 400 });
    return NextResponse.json({ ok: true, data: await codeReviewView(ev._id, auth.name) });
  } catch (error) {
    console.error('POST /api/code-review error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
