import { getDb } from '@/lib/db';
import type { ReconcileResult, ReconcileBatch } from '@/lib/types';

/**
 * Bank statement reconciliation service.
 *
 * Parses a bank CSV, extracts UTRs, and matches them against
 * UNDER_REVIEW registrations. The CSV itself is never stored (C6).
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface CsvRow {
  utr: string;
  amount: number;
  date?: string;
  remarks?: string;
}

export interface MatchResult {
  teamId: string;
  utr: string;
  amount: number;
  result: ReconcileResult;
  details?: string;
}

export interface ReconcileReport {
  matches: MatchResult[];
  unclaimedRows: CsvRow[];
  counts: {
    matched: number;
    amountMismatch: number;
    probable: number;
    notFound: number;
    unclaimed: number;
  };
}

// ── Parse CSV text ──────────────────────────────────────────────────────────

/**
 * Extract 12-digit UTR numbers from a cell value.
 * Banks often embed UTRs in text like "UPI/417612345678/..." or "Ref 417612345678".
 */
function extractUtrs(value: string): string[] {
  const matches = value.match(/\d{12}/g);
  return matches || [];
}

/**
 * Parse CSV rows with given column mapping.
 */
export function parseBankCsv(
  rows: Record<string, string>[],
  mapping: {
    utrColumn: string;
    amountColumn: string;
    dateColumn?: string;
    remarksColumn?: string;
  }
): CsvRow[] {
  const results: CsvRow[] = [];

  for (const row of rows) {
    const utrRaw = row[mapping.utrColumn] || '';
    const amountRaw = row[mapping.amountColumn] || '';
    const dateRaw = mapping.dateColumn ? row[mapping.dateColumn] || '' : undefined;
    const remarksRaw = mapping.remarksColumn ? row[mapping.remarksColumn] || '' : undefined;

    // Extract UTRs from the UTR cell
    const utrs = extractUtrs(utrRaw);

    // Also look in remarks for UTRs
    if (remarksRaw) {
      const remarksUtrs = extractUtrs(remarksRaw);
      for (const u of remarksUtrs) {
        if (!utrs.includes(u)) utrs.push(u);
      }
    }

    // Parse amount (remove commas, currency symbols)
    const amount = parseFloat(amountRaw.replace(/[^0-9.]/g, '')) || 0;

    for (const utr of utrs) {
      results.push({
        utr,
        amount,
        date: dateRaw,
        remarks: remarksRaw,
      });
    }
  }

  return results;
}

// ── Match against DB ────────────────────────────────────────────────────────

export async function matchTeams(
  csvRows: CsvRow[],
  fee: number
): Promise<ReconcileReport> {
  const db = await getDb();

  // Get all UNDER_REVIEW registrations with their payment info
  const underReview = await db.collection('registrations')
    .aggregate([
      { $match: { status: 'UNDER_REVIEW', deletedAt: { $exists: false } } },
      {
        $lookup: {
          from: 'payments',
          localField: 'currentPaymentId',
          foreignField: '_id',
          as: 'payment',
        },
      },
      { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
    ])
    .toArray();

  // Build a map of submitted UTRs → team info
  const utrToTeam = new Map<string, { teamId: string; amount: number; paymentId: any }>();
  for (const reg of underReview) {
    if (reg.payment?.utr) {
      utrToTeam.set(reg.payment.utr, {
        teamId: reg.teamId,
        amount: reg.payment.amount,
        paymentId: reg.payment._id,
      });
    }
  }

  // Build a set of all UTRs found in the CSV
  const csvUtrSet = new Set(csvRows.map((r) => r.utr));

  // Build a map of CSV UTRs → rows for amount checking
  const csvUtrToRow = new Map<string, CsvRow>();
  for (const row of csvRows) {
    csvUtrToRow.set(row.utr, row);
  }

  // Check for Team IDs in remarks (for PROBABLE matches)
  const remarksTeamIds = new Map<string, CsvRow>();
  for (const row of csvRows) {
    if (row.remarks) {
      // Look for DBG-XXX patterns in remarks
      const teamIdMatch = row.remarks.match(/DBG-\d{3}/gi);
      if (teamIdMatch) {
        for (const tid of teamIdMatch) {
          remarksTeamIds.set(tid.toUpperCase(), row);
        }
      }
    }
  }

  const matches: MatchResult[] = [];
  const matchedCsvUtrs = new Set<string>();

  for (const reg of underReview) {
    const submittedUtr = reg.payment?.utr;
    if (!submittedUtr) continue;

    const csvRow = csvUtrToRow.get(submittedUtr);

    if (csvRow) {
      matchedCsvUtrs.add(submittedUtr);

      if (Math.abs(csvRow.amount - fee) < 0.01) {
        // Perfect match — UTR found, amount matches
        matches.push({
          teamId: reg.teamId,
          utr: submittedUtr,
          amount: csvRow.amount,
          result: 'MATCHED',
        });

        // Save reconcile result on payment
        await db.collection('payments').updateOne(
          { _id: reg.payment._id },
          { $set: { reconcileResult: 'MATCHED' as ReconcileResult } }
        );
      } else {
        // UTR found but amount differs
        matches.push({
          teamId: reg.teamId,
          utr: submittedUtr,
          amount: csvRow.amount,
          result: 'AMOUNT_MISMATCH',
          details: `Expected ₹${fee}, found ₹${csvRow.amount}`,
        });

        await db.collection('payments').updateOne(
          { _id: reg.payment._id },
          { $set: { reconcileResult: 'AMOUNT_MISMATCH' as ReconcileResult } }
        );
      }
    } else {
      // UTR not in CSV — check if Team ID appears in remarks
      const remarkRow = remarksTeamIds.get(reg.teamId);
      if (remarkRow) {
        matches.push({
          teamId: reg.teamId,
          utr: submittedUtr,
          amount: remarkRow.amount,
          result: 'PROBABLE',
          details: `Team ID found in bank remarks but UTR differs`,
        });

        await db.collection('payments').updateOne(
          { _id: reg.payment._id },
          { $set: { reconcileResult: 'PROBABLE' as ReconcileResult } }
        );
      } else {
        // Not found at all
        matches.push({
          teamId: reg.teamId,
          utr: submittedUtr,
          amount: reg.payment.amount,
          result: 'NOT_FOUND',
        });

        await db.collection('payments').updateOne(
          { _id: reg.payment._id },
          { $set: { reconcileResult: 'NOT_FOUND' as ReconcileResult } }
        );
      }
    }
  }

  // Unclaimed CSV rows — paid but never submitted UTR
  const unclaimedRows = csvRows.filter(
    (r) => !matchedCsvUtrs.has(r.utr) && r.amount > 0
  );

  const counts = {
    matched: matches.filter((m) => m.result === 'MATCHED').length,
    amountMismatch: matches.filter((m) => m.result === 'AMOUNT_MISMATCH').length,
    probable: matches.filter((m) => m.result === 'PROBABLE').length,
    notFound: matches.filter((m) => m.result === 'NOT_FOUND').length,
    unclaimed: unclaimedRows.length,
  };

  return { matches, unclaimedRows, counts };
}

// ── Save batch ──────────────────────────────────────────────────────────────

export async function saveBatch(
  uploadedBy: string,
  fileName: string,
  columnMapping: ReconcileBatch['columnMapping'],
  counts: ReconcileBatch['counts']
): Promise<void> {
  const db = await getDb();
  await db.collection('reconcileBatches').insertOne({
    uploadedBy,
    fileName,
    columnMapping,
    counts,
    createdAt: new Date(),
  });
}
