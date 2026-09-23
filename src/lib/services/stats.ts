import { getDb } from '@/lib/db';

/**
 * Dashboard statistics — single $facet aggregation, cached ~30s.
 *
 * All registration KPIs come from one query to avoid hammering the DB.
 */

export interface DashboardStats {
  totalTeams: number;
  totalPlayers: number;
  statusCounts: Record<string, number>;
  confirmedTeams: number;
  underReviewTeams: number;
  paymentPendingTeams: number;
  rejectedTeams: number;
  cancelledTeams: number;
  expiredTeams: number;
  revenueConfirmed: number;
  revenuePending: number;
  capacityUsed: number;
  capacity: number;
  teamSizeMix: Record<number, number>;
  sourceCounts: Record<string, number>;
  attendanceDay1: number;
  attendanceDay2: number;
  oldestPending?: Date;
  failedEmails: number;
}

let cachedStats: { data: DashboardStats; at: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

export async function getDashboardStats(fee: number, capacity: number): Promise<DashboardStats> {
  const now = Date.now();
  if (cachedStats && now - cachedStats.at < CACHE_TTL_MS) {
    return cachedStats.data;
  }

  const db = await getDb();

  const pipeline = [
    {
      $match: { deletedAt: { $exists: false } },
    },
    {
      $facet: {
        statusCounts: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        totalPlayers: [
          { $project: { playerCount: { $size: '$players' } } },
          { $group: { _id: null, total: { $sum: '$playerCount' } } },
        ],
        teamSizeMix: [
          { $project: { size: { $size: '$players' } } },
          { $group: { _id: '$size', count: { $sum: 1 } } },
        ],
        sourceCounts: [
          { $match: { source: { $exists: true, $ne: null } } },
          { $group: { _id: '$source', count: { $sum: 1 } } },
        ],
        attendanceDay1: [
          { $match: { 'attendance.day': 1 } },
          { $count: 'count' },
        ],
        attendanceDay2: [
          { $match: { 'attendance.day': 2 } },
          { $count: 'count' },
        ],
        oldestPending: [
          { $match: { status: 'UNDER_REVIEW' } },
          { $sort: { createdAt: 1 } },
          { $limit: 1 },
          { $project: { createdAt: 1 } },
        ],
      },
    },
  ];

  const [result] = await db.collection('registrations').aggregate(pipeline).toArray();

  // Count failed emails separately
  const failedEmails = await db.collection('emailJobs').countDocuments({ status: 'FAILED' });

  // Parse facet results
  const statusMap: Record<string, number> = {};
  for (const s of result.statusCounts || []) {
    statusMap[s._id] = s.count;
  }

  const teamSizeMap: Record<number, number> = {};
  for (const t of result.teamSizeMix || []) {
    teamSizeMap[t._id] = t.count;
  }

  const sourceMap: Record<string, number> = {};
  for (const s of result.sourceCounts || []) {
    sourceMap[s._id] = s.count;
  }

  const totalTeams = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const confirmed = statusMap['CONFIRMED'] || 0;
  const underReview = statusMap['UNDER_REVIEW'] || 0;

  const stats: DashboardStats = {
    totalTeams,
    totalPlayers: result.totalPlayers?.[0]?.total ?? 0,
    statusCounts: statusMap,
    confirmedTeams: confirmed,
    underReviewTeams: underReview,
    paymentPendingTeams: statusMap['PAYMENT_PENDING'] || 0,
    rejectedTeams: statusMap['REJECTED'] || 0,
    cancelledTeams: statusMap['CANCELLED'] || 0,
    expiredTeams: statusMap['EXPIRED'] || 0,
    revenueConfirmed: confirmed * fee,
    revenuePending: underReview * fee,
    capacityUsed: confirmed + underReview,
    capacity,
    teamSizeMix: teamSizeMap,
    sourceCounts: sourceMap,
    attendanceDay1: result.attendanceDay1?.[0]?.count ?? 0,
    attendanceDay2: result.attendanceDay2?.[0]?.count ?? 0,
    oldestPending: result.oldestPending?.[0]?.createdAt,
    failedEmails,
  };

  cachedStats = { data: stats, at: now };
  return stats;
}
