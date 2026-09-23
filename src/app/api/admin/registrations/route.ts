import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getDb } from '@/lib/db';
import type { Registration } from '@/lib/types';

/**
 * GET /api/admin/registrations — List all registrations with filters
 *
 * Query params: status, search, page, limit, sort, order
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const sortField = url.searchParams.get('sort') || 'createdAt';
    const sortOrder = url.searchParams.get('order') === 'asc' ? 1 : -1;
    const includeDeleted = url.searchParams.get('deleted') === 'true';

    const db = await getDb();
    const filter: any = {};

    if (!includeDeleted) {
      filter.deletedAt = { $exists: false };
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { teamId: { $regex: search, $options: 'i' } },
        { teamNameLower: { $regex: search.toLowerCase() } },
        { leaderEmail: { $regex: search.toLowerCase() } },
        { 'players.regNo': search.toUpperCase() },
        { leaderPhone: search },
      ];
    }

    const skip = (page - 1) * limit;

    const [registrations, total] = await Promise.all([
      db.collection<Registration>('registrations')
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('registrations').countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        registrations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/admin/registrations error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
