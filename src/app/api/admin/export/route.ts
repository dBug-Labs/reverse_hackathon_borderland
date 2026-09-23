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

function sanitizeCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // CSV formula injection protection: prefix ' if starts with =, +, -, @, tab, newline
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'` + str;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

    const rows = registrations.map((r) => {
      const leader = r.players.find((p) => p.isLeader) || r.players[0];
      const others = r.players.filter((p) => !p.isLeader);

      return [
        sanitizeCell(r.teamId),
        sanitizeCell(r.teamName),
        sanitizeCell(r.status),
        sanitizeCell(r.players.length),
        sanitizeCell(leader?.fullName),
        sanitizeCell(leader?.email),
        sanitizeCell(leader?.phone),
        sanitizeCell(leader?.regNo),
        sanitizeCell(others[0]?.fullName), sanitizeCell(others[0]?.email), sanitizeCell(others[0]?.regNo),
        sanitizeCell(others[1]?.fullName), sanitizeCell(others[1]?.email), sanitizeCell(others[1]?.regNo),
        sanitizeCell(others[2]?.fullName), sanitizeCell(others[2]?.email), sanitizeCell(others[2]?.regNo),
        sanitizeCell(r.source),
        sanitizeCell(r.createdAt?.toISOString()),
        sanitizeCell(r.updatedAt?.toISOString()),
        sanitizeCell(r.adminNotes),
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
