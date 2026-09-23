import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getDb } from '@/lib/db';

/**
 * GET /api/admin/audit — Paginated audit log
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const action = url.searchParams.get('action');
    const targetId = url.searchParams.get('targetId');

    const db = await getDb();
    const filter: any = {};
    if (action) filter.action = action;
    if (targetId) filter.targetId = targetId;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      db.collection('auditLogs')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('auditLogs').countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('GET /api/admin/audit error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
