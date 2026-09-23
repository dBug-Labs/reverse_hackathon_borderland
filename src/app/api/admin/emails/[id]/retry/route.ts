import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { retryJob } from '@/lib/services/email';

/**
 * POST /api/admin/emails/[id]/retry — Retry a failed email
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const success = await retryJob(id);

    if (!success) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Email job not found or not in FAILED state' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`POST /api/admin/emails/${id}/retry error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
