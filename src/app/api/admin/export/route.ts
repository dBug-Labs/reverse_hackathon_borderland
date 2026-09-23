import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getDb } from '@/lib/db';
import type { Registration } from '@/lib/types';

/**
 * GET /api/admin/export — CSV export of registrations
 *
 * Returns a CSV with all registration data (no PII restrictions — admin only).
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    const db = await getDb();
    const filter: any = { deletedAt: { $exists: false } };
    if (status) filter.status = status;

    const registrations = await db
      .collection<Registration>('registrations')
      .find(filter)
      .sort({ createdAt: 1 })
      .toArray();

    // Build CSV
    const headers = [
      'Team ID', 'Team Name', 'Status', 'Player Count',
      'Leader Name', 'Leader Email', 'Leader Phone', 'Leader RegNo',
      'Player 2 Name', 'Player 2 Email', 'Player 2 RegNo',
      'Player 3 Name', 'Player 3 Email', 'Player 3 RegNo',
      'Player 4 Name', 'Player 4 Email', 'Player 4 RegNo',
      'Source', 'Created At', 'Updated At',
      'Admin Notes',
    ];

    const rows = registrations.map((r) => {
      const leader = r.players.find((p) => p.isLeader) || r.players[0];
      const others = r.players.filter((p) => !p.isLeader);

      return [
        r.teamId,
        `"${(r.teamName || '').replace(/"/g, '""')}"`,
        r.status,
        r.players.length,
        leader?.fullName || '',
        leader?.email || '',
        leader?.phone || '',
        leader?.regNo || '',
        others[0]?.fullName || '', others[0]?.email || '', others[0]?.regNo || '',
        others[1]?.fullName || '', others[1]?.email || '', others[1]?.regNo || '',
        others[2]?.fullName || '', others[2]?.email || '', others[2]?.regNo || '',
        r.source || '',
        r.createdAt?.toISOString() || '',
        r.updatedAt?.toISOString() || '',
        `"${(r.adminNotes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="borderland_registrations_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/export error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
