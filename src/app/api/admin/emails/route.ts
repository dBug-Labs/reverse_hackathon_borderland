import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { listEmailJobs } from '@/lib/services/email';
import type { EmailJobStatus } from '@/lib/types';

/**
 * GET /api/admin/emails — List email jobs
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as EmailJobStatus | null;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const result = await listEmailJobs({
      status: status || undefined,
      page,
      limit,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('GET /api/admin/emails error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
