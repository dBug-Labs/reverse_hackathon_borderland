// Shapes of the JSON the admin / attendance APIs return.
// (Server types live in src/lib/types — these mirror them after JSON serialisation:
//  ObjectIds and Dates arrive as strings.)

export type RegistrationStatus =
  | 'PAYMENT_PENDING'
  | 'UNDER_REVIEW'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ReconcileResult = 'MATCHED' | 'AMOUNT_MISMATCH' | 'PROBABLE' | 'NOT_FOUND';

export interface PlayerDTO {
  slot: 1 | 2 | 3 | 4;
  isLeader: boolean;
  fullName: string;
  email: string;
  regNo: string;
  phone?: string;
  year?: string;
  department?: string;
}

export interface AttendanceEntryDTO {
  day: 1 | 2;
  markedAt: string;
  markedBy: string;
  playersPresent: number[];
}

export interface RegistrationDTO {
  _id: string;
  teamId: string;
  teamName: string;
  players: PlayerDTO[];
  leaderEmail: string;
  leaderPhone: string;
  status: RegistrationStatus;
  rejectCount: number;
  visa?: { issuedAt: string; status: 'VALID' | 'REVOKED' };
  attendance?: AttendanceEntryDTO[];
  verifiedAt?: string;
  verifiedBy?: string;
  cancelReason?: string;
  adminNotes?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  expiresAt?: string;
}

export interface PaymentDTO {
  _id: string;
  teamId: string;
  utr: string;
  amount: number;
  payerUpi?: string;
  paidAt?: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectReason?: string;
  reconcileResult?: ReconcileResult;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardStatsDTO {
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
  teamSizeMix: Record<string, number>;
  sourceCounts: Record<string, number>;
  attendanceDay1: number;
  attendanceDay2: number;
  oldestPending?: string;
  failedEmails: number;
}

export interface EmailJobDTO {
  _id: string;
  to: string | string[];
  cc?: string[];
  template: string;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  attempts: number;
  nextAttemptAt?: string;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
}

export interface AuditLogDTO {
  _id: string;
  actorName: string;
  scope: 'admin' | 'attendance';
  action: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}

export interface ReconcileReportDTO {
  matches: Array<{ teamId: string; utr: string; amount: number; result: ReconcileResult; details?: string }>;
  unclaimedRows: Array<{ utr: string; amount: number; date?: string; remarks?: string }>;
  counts: { matched: number; amountMismatch: number; probable: number; notFound: number; unclaimed: number };
}

export interface AttendanceTeamCardDTO {
  teamId: string;
  teamName: string;
  status: RegistrationStatus;
  players: Array<{ slot: number; fullName: string; regNo: string; isLeader: boolean }>;
  attendance: AttendanceEntryDTO[];
}
