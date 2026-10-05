import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getClientIp, hashIp } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/services/audit';
import { mailBriefs } from '@/lib/services/briefMail';
import { getActiveEvent } from '@/lib/services/registration';

/**
 * POST /api/admin/brief-mail — { dryRun?: boolean }
 * Mails every team its card, submission link and deadlines (teams not yet mailed only).
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event configured' }, { status: 404 });
    const result = await mailBriefs(event._id, { dryRun: !!body.dryRun });
    if ('error' in result) return NextResponse.json({ ok: false, code: 'NOT_DRAWN', message: result.error }, { status: 409 });
    if (!body.dryRun) {
      const r = result as { sent: string[]; failed: unknown[] };
      await logAction(auth.name, 'admin', 'BRIEF_MAIL', 'card-drop', hashIp(getClientIp(req.headers)), undefined, { sent: r.sent.length, failed: r.failed.length });
    }
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('POST /api/admin/brief-mail error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
