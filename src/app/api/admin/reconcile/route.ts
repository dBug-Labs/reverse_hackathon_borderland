import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { hashIp, getClientIp } from '@/lib/security/rateLimit';
import { parseBankCsv, matchTeams, saveBatch } from '@/lib/services/reconcile';
import { getActiveEvent } from '@/lib/services/registration';
import { logAction } from '@/lib/services/audit';
import Papa from 'papaparse';

/**
 * POST /api/admin/reconcile — Upload bank CSV for UTR matching
 *
 * Accepts: { csvText, mapping, fileName }
 * The CSV is parsed in memory and never stored (C6).
 */

export async function POST(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  const ipHashed = hashIp(getClientIp(req.headers));

  try {
    const body = await req.json();
    const { csvText, mapping, fileName } = body;

    if (!csvText || !mapping?.utrColumn || !mapping?.amountColumn) {
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'CSV text and column mapping are required' },
        { status: 400 }
      );
    }

    // Parse CSV
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: 'CSV_PARSE_ERROR',
          message: `CSV parse error on row ${parseResult.errors[0].row}: ${parseResult.errors[0].message}`,
        },
        { status: 400 }
      );
    }

    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'No event configured' },
        { status: 404 }
      );
    }

    // Extract and match
    const csvRows = parseBankCsv(parseResult.data as Record<string, string>[], mapping);
    const report = await matchTeams(csvRows, event.fee);

    // Save batch record
    await saveBatch(auth.name, fileName || 'upload.csv', mapping, report.counts);

    await logAction(auth.name, 'admin', 'RECONCILE', 'bulk', ipHashed, undefined, {
      counts: report.counts,
    });

    return NextResponse.json({ ok: true, data: report });
  } catch (error) {
    console.error('POST /api/admin/reconcile error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
