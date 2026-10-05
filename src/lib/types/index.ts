import { ObjectId } from 'mongodb';

// ── Registration status state machine ──────────────────────────────────────
export type RegistrationStatus =
  | 'PAYMENT_PENDING'
  | 'UNDER_REVIEW'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

// ── Payment attempt status ─────────────────────────────────────────────────
export type PaymentStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

// ── Visa status ────────────────────────────────────────────────────────────
export type VisaStatus = 'VALID' | 'REVOKED';

// ── Reconcile match result ─────────────────────────────────────────────────
export type ReconcileResult =
  | 'MATCHED'
  | 'AMOUNT_MISMATCH'
  | 'PROBABLE'
  | 'NOT_FOUND';

// ── Email job status ───────────────────────────────────────────────────────
export type EmailJobStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';

// ── Email template names ───────────────────────────────────────────────────
export type EmailTemplate =
  | 'REGISTERED'
  | 'PROOF_RECEIVED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'REMINDER'
  | 'YOUR_LINK'
  | 'EMAIL_OTP'
  | 'EVENT_REMINDER';

// ── Session scopes ─────────────────────────────────────────────────────────
export type SessionScope = 'admin' | 'attendance';

// ── Magic link types ───────────────────────────────────────────────────────
export type LinkType = 'pay' | 'status' | 'visa';

// ── Player (embedded in registration) ──────────────────────────────────────
export interface Player {
  slot: 1 | 2 | 3 | 4;
  isLeader: boolean;
  fullName: string;
  email: string; // lowercased, @srmist.edu.in
  regNo: string; // uppercased, e.g. RA2311003010123
  phone?: string; // leader only (required), optional for members
  year?: string;
  department?: string;
}

// ── Attendance entry (embedded in registration) ────────────────────────────
export interface AttendanceEntry {
  day: 1 | 2 | 3 | 4; // 3 = Day 1 after lunch, 4 = Day 2 after lunch, see src/lib/attendanceSessions.ts
  markedAt: Date;
  markedBy: string; // volunteer name from session
  playersPresent: number[]; // slot numbers
}

// ── Visa info (embedded in registration) ───────────────────────────────────
export interface VisaInfo {
  issuedAt: Date;
  status: VisaStatus;
}

// ── Registration document ──────────────────────────────────────────────────
export interface Registration {
  _id: ObjectId;
  teamId: string; // "DBG-472"
  eventId: ObjectId;
  teamName: string;
  teamNameLower: string; // lowercased for unique index + search
  players: Player[];
  leaderEmail: string; // denormalised for search + unique index
  leaderPhone: string; // denormalised for unique index
  status: RegistrationStatus;
  currentPaymentId?: ObjectId;
  rejectCount: number;
  visa?: VisaInfo;
  attendance: AttendanceEntry[];
  verifiedAt?: Date;
  verifiedBy?: string;
  cancelReason?: string;
  adminNotes?: string;
  idempotencyKey?: string;
  ipHash?: string;
  userAgent?: string;
  consentAt: Date;
  source?: string; // Instagram / WhatsApp / Friend / Poster / Other
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  reminderSentAt?: Date;
  expiresAt: Date;
}

// ── Payment document ───────────────────────────────────────────────────────
export interface Payment {
  _id: ObjectId;
  registrationId: ObjectId;
  teamId: string;
  utr: string; // 12 digits, unique across all attempts ever
  amount: number;
  payerUpi?: string;
  paidAt?: Date;
  status: PaymentStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectReason?: string;
  reconcileResult?: ReconcileResult;
  createdAt: Date;
}

// ── Email job document ─────────────────────────────────────────────────────
export interface EmailJob {
  _id: ObjectId;
  to: string | string[];
  cc?: string[];
  template: EmailTemplate;
  templateData: Record<string, unknown>;
  registrationId?: ObjectId;
  dedupeKey: string; // e.g. "CONFIRMED:DBG-472:<paymentId>"
  status: EmailJobStatus;
  attempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  messageId?: string;
  createdAt: Date;
  sentAt?: Date;
}

// ── Audit log document ─────────────────────────────────────────────────────
export interface AuditLog {
  _id: ObjectId;
  actorName: string;
  scope: SessionScope;
  action: string;
  targetId: string; // usually teamId
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipHash: string;
  createdAt: Date;
}

// ── Rate limit document ────────────────────────────────────────────────────
export interface RateLimitDoc {
  _id: ObjectId;
  key: string;
  count: number;
  expiresAt: Date;
}

// ── Abuse log document ─────────────────────────────────────────────────────
export interface AbuseLog {
  _id: ObjectId;
  ipHash: string;
  endpoint: string;
  reason: string; // captcha / honeypot / rate / timetrap
  createdAt: Date;
}

// ── Event document ─────────────────────────────────────────────────────────
export interface EventDoc {
  _id: ObjectId;
  slug: string;
  name: string;
  tagline?: string;
  venue: string;
  day1Date: Date;
  day2Date: Date;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  forceClosed: boolean;
  capacity: number;
  fee: number;
  teamSize: { min: number; max: number };
  upiId: string;
  payeeName: string;
  teamIdPrefix: string; // "DBG"
  faq: Array<{ q: string; a: string }>;
  contact: {
    email?: string;
    phone?: string;
    instagram?: string;
  };
  rulesUrl?: string;
  refundPolicy?: string;
  privacyPolicy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Event state (computed, not stored) ─────────────────────────────────────
export type EventState = 'UPCOMING' | 'OPEN' | 'ALMOST_FULL' | 'FULL' | 'CLOSED';
export type SeatsHint = 'plenty' | 'few' | 'none';

// ── Reconcile batch document ───────────────────────────────────────────────
export interface ReconcileBatch {
  _id: ObjectId;
  uploadedBy: string;
  fileName: string;
  columnMapping: {
    utrColumn: string;
    amountColumn: string;
    dateColumn?: string;
    remarksColumn?: string;
  };
  counts: {
    matched: number;
    amountMismatch: number;
    probable: number;
    notFound: number;
    unclaimed: number;
  };
  createdAt: Date;
}

// ── Metric document ────────────────────────────────────────────────────────
export interface Metric {
  _id: ObjectId;
  date: string; // YYYY-MM-DD
  landingViews: number;
  formStarts: number;
  emailsSent: number;
}

// ── Card Drop (PS draft) ───────────────────────────────────────────────────
export type CardDropPhase = 'PREFS_OPEN' | 'DRAWN' | 'LOCKED';
export type RiskCard = 'STANDARD' | 'HIGH';

export interface CardAssignment {
  teamId: string;
  teamName: string;
  pick: number; // 1-based draft position
  card: string; // card code, see src/lib/cardDrop/cards.ts
  via: 0 | 1 | 2 | 3; // which choice it was; 0 = auto-assigned
  title?: string; // solution title (60 chars max)
  risk?: RiskCard;
  lockedAt?: Date;
  movedBy?: string; // set when an admin moved or swapped the team
}

export interface CardDropDoc {
  _id: ObjectId;
  eventId: ObjectId;
  phase: CardDropPhase;
  seed: string; // secret hex seed; revealed only after the draw
  seedHash: string; // sha256(seed), shown before the draw
  openedAt: Date;
  openedBy: string;
  cap?: number;
  presentOnly?: boolean;
  order?: string[]; // team IDs in pick order
  assignments?: CardAssignment[];
  drawnAt?: Date;
  drawnBy?: string;
  lockedAt?: Date;
  lockedBy?: string;
  updatedAt: Date;
}

export interface CardPref {
  _id: ObjectId;
  eventId: ObjectId;
  teamId: string;
  choices: string[]; // 1–3 card codes, best first
  submittedAt: Date;
  submittedBy: string; // 'team' or the admin's name
}

// ── Submissions (one GitHub repo per team) ─────────────────────────────────
export interface RepoCheck {
  at: Date;
  ok: boolean; // repo reachable, public, and every required file present
  error?: string; // set when GitHub could not be read
  public?: boolean;
  fork?: string; // full name of the parent repo when it is a fork
  defaultBranch?: string;
  headSha?: string;
  headAt?: string; // committer date of the head commit
  pushedAt?: string; // GitHub's last push time (server side)
  createdAt?: string; // GitHub's repo creation time
  files?: Record<string, string | null>; // REQUIRED_FILES key -> path found, or null
  warnings?: string[];
}

export interface RepoSnapshot {
  at: Date; // when the snapshot was taken
  by: string;
  freezeAt: string; // the freeze time it is for
  headSha?: string;
  pushedAt?: string;
  beforeFreezeSha?: string; // last commit dated at or before the freeze
  pushedAfterFreeze?: boolean;
  error?: string;
}

export interface SubmissionDoc {
  _id: ObjectId;
  eventId: ObjectId;
  teamId: string;
  repoUrl: string; // https://github.com/owner/repo
  owner: string;
  repo: string;
  demoVideoUrl?: string;
  liveUrl?: string;
  declaredAt: Date; // clean-room declaration accepted
  check?: RepoCheck;
  snapshots?: { docs?: RepoSnapshot; code?: RepoSnapshot };
  history: Array<{ at: Date; by: string; repoUrl: string }>;
  createdAt: Date;
  updatedAt: Date;
}

// ── API response shapes ────────────────────────────────────────────────────
export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ── Session payload (JWT) ──────────────────────────────────────────────────
export interface SessionPayload {
  scope: SessionScope;
  name: string;
  pwv: string; // first 8 hex chars of sha256(password)
  iat: number;
  exp: number;
}

// ── Magic link payload (JWT) ───────────────────────────────────────────────
export interface MagicLinkPayload {
  teamId: string;
  type: LinkType;
  iat: number;
  exp: number;
}
