# Borderland — Backend & Cloudflare Turnstile Setup Guide

> **Scope:** Everything you need to build, wire up, and deploy the server-side layer — MongoDB Atlas, all API routes, Cloudflare Turnstile, auth/sessions, email outbox, rate limiting, cron jobs, and environment variables.
> **Stack:** Next.js App Router (TypeScript) · MongoDB (official driver) · Nodemailer · Cloudflare Turnstile · `jose` · Zod · Vercel

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Project Structure — Backend Files](#2-project-structure--backend-files)
3. [MongoDB Atlas — Setup & Indexes](#3-mongodb-atlas--setup--indexes)
4. [Cloudflare Turnstile — Full Setup](#4-cloudflare-turnstile--full-setup)
5. [Session Auth — Passwords, JWTs & Cookies](#5-session-auth--passwords-jwts--cookies)
6. [Middleware Guard (`proxy.ts`)](#6-middleware-guard-proxysts)
7. [Rate Limiting](#7-rate-limiting)
8. [Zod Validation Schemas](#8-zod-validation-schemas)
9. [API Endpoints — Full Reference](#9-api-endpoints--full-reference)
10. [Service Layer](#10-service-layer)
11. [Email Outbox — Nodemailer + Gmail](#11-email-outbox--nodemailer--gmail)
12. [Magic Links](#12-magic-links)
13. [Team ID Generation (`DBG-XXX`)](#13-team-id-generation-dbg-xxx)
14. [Cron Jobs — GitHub Actions](#14-cron-jobs--github-actions)
15. [Startup Env Validation](#15-startup-env-validation)
16. [Error Codes & Response Shape](#16-error-codes--response-shape)
17. [Security Checklist](#17-security-checklist)
18. [Step-by-Step Build Order](#18-step-by-step-build-order)

---

## 1. Environment Variables

All secrets live **only in Vercel env vars**. Never put them in `NEXT_PUBLIC_*` (except the Turnstile site key, which must be public). Never paste real values into AI chats.

### Full Variable Reference

| Name | Secret? | What it is | Example |
|---|---|---|---|
| `MONGODB_URI` | 🔒 | Atlas connection string (SRV format) | `mongodb+srv://user:pass@cluster.mongodb.net/borderland?retryWrites=true&w=majority` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | Cloudflare Turnstile site key (goes into the browser widget) | `0x4AAAAAAA...` |
| `TURNSTILE_SECRET_KEY` | 🔒 | Cloudflare Turnstile secret (server-side siteverify) | `0x4AAAAAAA...` |
| `SMTP_USER` | 🔒 | The Gmail address used to send emails | `borderland@gmail.com` |
| `SMTP_APP_PASSWORD` | 🔒 | 16-char Gmail **App Password** (NOT your account password) | `abcd efgh ijkl mnop` |
| `MAIL_FROM` | — | Display name + address in the `From:` header | `Borderland · SRM DBUG Labs <borderland@gmail.com>` |
| `EMAIL_DAILY_CAP` | — | Max email recipients per day (personal = 450, Workspace = 1800) | `450` |
| `VISA_CC_MEMBERS` | — | `true` = Visa email CCs all team members, `false` = leader only | `true` |
| `ADMIN_NOTIFY_EMAIL` | — | Where the hourly "N payments waiting" digest goes | `club@srmist.edu.in` |
| `ADMIN_PASSWORD` | 🔒 | Password for `/admin`. **16+ random chars** | `Gx9#mPq2!vK7nZrY` |
| `ATTENDANCE_PASSWORD` | 🔒 | Password for `/attendance`. **Must differ** from `ADMIN_PASSWORD` | `hT5@wBn8$jL3cEuQ` |
| `SESSION_SECRET` | 🔒 | 32+ random chars — signs both `bnd_admin` and `bnd_attendance` JWTs | 32-char random hex |
| `LINK_SECRET` | 🔒 | 32+ random chars — signs magic links (resume, status, Visa) | 32-char random hex |
| `CRON_SECRET` | 🔒 | Bearer token protecting `/api/cron/*` routes | 32-char random hex |
| `ALLOWED_EMAIL_DOMAIN` | — | SRM email domain check (C1) | `srmist.edu.in` |
| `APP_URL` | — | Live URL (no trailing slash) — used in email links | `https://borderland.srmdbug.in` |

### Local Testing Keys (Turnstile)

For local dev/testing, use Cloudflare's official test keys so Turnstile always passes:

```env
# Always-pass test key pair (never use in production)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### Generate Secrets Easily

```bash
# SESSION_SECRET, LINK_SECRET, CRON_SECRET (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_PASSWORD / ATTENDANCE_PASSWORD (16 printable chars)
node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
```

### `.env.local` Template

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/borderland?retryWrites=true&w=majority

# Turnstile (use test keys locally)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# Email
SMTP_USER=your-gmail@gmail.com
SMTP_APP_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM=Borderland · SRM DBUG Labs <your-gmail@gmail.com>
EMAIL_DAILY_CAP=450
VISA_CC_MEMBERS=true
ADMIN_NOTIFY_EMAIL=admin@example.com

# Auth
ADMIN_PASSWORD=change-me-16chars-min
ATTENDANCE_PASSWORD=different-16chars-min
SESSION_SECRET=<64-hex-chars>
LINK_SECRET=<64-hex-chars>
CRON_SECRET=<64-hex-chars>

# Config
ALLOWED_EMAIL_DOMAIN=srmist.edu.in
APP_URL=http://localhost:3000
```

> **Rule:** Validate ALL env vars at startup — a missing/weak/equal password must crash the app with a clear message, not silently produce a broken state. See [§15](#15-startup-env-validation).

---

## 2. Project Structure — Backend Files

```
lib/
  db.ts                         # Cached MongoDB client singleton
  validation/
    playerSchema.ts             # Zod — single player block
    teamSchema.ts               # Zod — team of 2–4 players + superRefine
    paymentSchema.ts            # Zod — UTR, confirm, amount
    eventSchema.ts              # Zod — event settings
    envSchema.ts                # Zod — startup env check
  services/
    registration.ts             # createTeam, getTeam, cancelTeam
    payment.ts                  # submitUTR, approve, reject, undoReject
    email.ts                    # enqueueEmail, drainQueue
    audit.ts                    # logAction
    attendance.ts               # markAttendance, getTeamCard
    stats.ts                    # dashboardFacet, funnel
  security/
    turnstile.ts                # verifyTurnstileToken(token, action)
    rateLimit.ts                # checkRateLimit(key, max, windowSec)
    session.ts                  # signSession, verifySession, requireScope
    magicLink.ts                # signLink, verifyLink
  email/
    templates/
      registered.ts
      proofReceived.ts
      confirmed.ts
      rejected.ts
      reminder.ts
      yourLink.ts
      digest.ts
      eventReminder.ts
    sender.ts                   # Nodemailer transport + sendEmail()

app/
  api/
    event/route.ts
    registrations/
      route.ts                  # POST Step 1
      [teamId]/
        payment/route.ts        # POST Step 2
        status/route.ts         # GET status
    visa/[teamId]/route.ts      # GET Visa (PNG/PDF)
    registrations/resend-link/route.ts
    admin/
      login/route.ts
      logout/route.ts
      registrations/
        route.ts                # GET list, POST manual add
        [teamId]/
          route.ts              # GET, PATCH, DELETE
          approve/route.ts
          reject/route.ts
          undo-reject/route.ts
          cancel/route.ts
          restore/route.ts
          resend-email/route.ts
      registrations/bulk/route.ts
      reconcile/route.ts
      stats/route.ts
      attendance-report/route.ts
      export/route.ts
      emails/route.ts
      emails/[id]/retry/route.ts
      settings/route.ts
      audit/route.ts
    attendance/
      login/route.ts
      logout/route.ts
      teams/[teamId]/route.ts
      teams/[teamId]/mark/route.ts
      search/route.ts
      counter/route.ts
    cron/
      emails/route.ts           # retry queued emails
      expire/route.ts           # mark PAYMENT_PENDING → EXPIRED
      digest/route.ts           # hourly admin digest
      remind/route.ts           # 24h unpaid reminder

proxy.ts                        # Next.js middleware — area guards
scripts/
  createIndexes.ts
  seedEvent.ts
```

---

## 3. MongoDB Atlas — Setup & Indexes

### 3.1 Atlas Setup

1. Create a free **M0** cluster (or M10 for production) at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user with `readWrite` on the `borderland` database.
3. Whitelist `0.0.0.0/0` in Network Access (Vercel uses dynamic IPs) — or use Vercel's fixed IPs on a paid plan.
4. Copy the **SRV connection string** into `MONGODB_URI`.
5. Enable **Backups** (at least Continuous Backup on M10).

### 3.2 Cached MongoDB Client (`lib/db.ts`)

```typescript
// lib/db.ts
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = { maxPoolSize: 10 };

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const c = await clientPromise;
  return c.db('borderland');
}
```

> This pattern reuses one connection across Vercel serverless invocations, staying within Atlas M0's 500-connection limit.

### 3.3 Collections & Schema Summary

| Collection | One document = | Key fields |
|---|---|---|
| `events` | The event + all settings | `slug`, `name`, `venue`, `day1Date`, `day2Date`, `registrationOpensAt`, `registrationClosesAt`, `forceClosed`, `capacity`, `fee`, `teamSize { min:2, max:4 }`, `upiId`, `payeeName`, `teamIdPrefix` (`DBG`), FAQ, contact |
| `registrations` | One team | See §3.4 |
| `payments` | One UTR submission attempt | `registrationId`, `teamId`, `utr` (unique), `amount`, `payerUpi`, `paidAt`, status: `SUBMITTED/APPROVED/REJECTED`, `reviewedBy/At`, `rejectReason`, `reconcileResult`, `createdAt` |
| `emailJobs` | One email to send | `to`, `cc`, `template`, `registrationId`, `dedupeKey` (unique), status: `QUEUED/SENDING/SENT/FAILED`, `attempts`, `nextAttemptAt`, `lastError`, `messageId` |
| `auditLogs` | One admin/volunteer action | `actorName`, `scope` (`admin`/`attendance`), `action`, `targetId`, `before`, `after`, `ipHash`, `createdAt` |
| `rateLimits` | A counter per key per window | `key`, `count`, `expiresAt` (TTL index) |
| `abuseLogs` | A blocked request | `ipHash`, `endpoint`, `reason`, `createdAt` (TTL 30 days) |
| `metrics` | Daily counters | `date`, `landingViews`, `formStarts`, `emailsSent` |
| `reconcileBatches` | One uploaded CSV session | `uploadedBy`, `fileName`, `counts`, `columnMapping` — the CSV itself is never stored |

### 3.4 `registrations` Document Shape

```typescript
interface Registration {
  _id: ObjectId;
  teamId: string;          // "DBG-472"
  eventId: ObjectId;
  teamName: string;
  teamNameLower: string;   // for unique index + search
  players: Array<{
    slot: 1 | 2 | 3 | 4;
    isLeader: boolean;
    fullName: string;
    email: string;         // lowercased, @srmist.edu.in
    regNo: string;         // uppercased, e.g. RA2311003010123
    phone?: string;        // leader only
    year?: string;
    department?: string;
  }>;
  leaderEmail: string;     // denormalised for search + unique index
  leaderPhone: string;     // denormalised for unique index
  status: 'PAYMENT_PENDING' | 'UNDER_REVIEW' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  currentPaymentId?: ObjectId;
  rejectCount: number;
  visa?: {
    issuedAt: Date;
    status: 'VALID' | 'REVOKED';
  };
  attendance: Array<{
    day: 1 | 2;
    markedAt: Date;
    markedBy: string;      // volunteer name from session
    playersPresent: number[]; // slot numbers
  }>;
  verifiedAt?: Date;
  verifiedBy?: string;
  cancelReason?: string;
  adminNotes?: string;
  idempotencyKey?: string;
  ipHash?: string;
  userAgent?: string;
  consentAt: Date;
  source?: string;         // Instagram / WhatsApp / Friend / etc.
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  reminderSentAt?: Date;
  expiresAt: Date;
}
```

### 3.5 Indexes Script (`scripts/createIndexes.ts`)

```typescript
import { getDb } from '../lib/db';

async function createIndexes() {
  const db = await getDb();

  // ── registrations ──────────────────────────────────────────────
  const reg = db.collection('registrations');

  await reg.createIndex({ teamId: 1 }, { unique: true });

  await reg.createIndex(
    { eventId: 1, 'players.email': 1 },
    { unique: true, name: 'event_player_email_unique' }
  );

  await reg.createIndex(
    { eventId: 1, 'players.regNo': 1 },
    { unique: true, name: 'event_player_regNo_unique' }
  );

  await reg.createIndex(
    { eventId: 1, leaderPhone: 1 },
    { unique: true, name: 'event_leaderPhone_unique' }
  );

  await reg.createIndex(
    { eventId: 1, teamNameLower: 1 },
    { unique: true, name: 'event_teamName_unique' }
  );

  await reg.createIndex(
    { idempotencyKey: 1 },
    { unique: true, sparse: true, name: 'idempotencyKey_unique' }
  );

  await reg.createIndex({ status: 1, createdAt: -1 });
  await reg.createIndex({ eventId: 1, status: 1, createdAt: -1 });
  await reg.createIndex({ leaderEmail: 1 });
  await reg.createIndex({ expiresAt: 1 });

  // ── payments ───────────────────────────────────────────────────
  const pay = db.collection('payments');

  await pay.createIndex({ utr: 1 }, { unique: true, name: 'utr_unique' });
  await pay.createIndex({ status: 1, createdAt: -1 });
  await pay.createIndex({ registrationId: 1 });
  await pay.createIndex({ teamId: 1 });

  // ── emailJobs ──────────────────────────────────────────────────
  const ej = db.collection('emailJobs');

  await ej.createIndex(
    { dedupeKey: 1 },
    { unique: true, name: 'dedupeKey_unique' }
  );
  await ej.createIndex({ status: 1, nextAttemptAt: 1 });

  // ── rateLimits ─────────────────────────────────────────────────
  const rl = db.collection('rateLimits');

  await rl.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await rl.createIndex({ key: 1 }, { unique: true });

  // ── abuseLogs ──────────────────────────────────────────────────
  const al = db.collection('abuseLogs');

  await al.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

  // ── auditLogs ──────────────────────────────────────────────────
  await db.collection('auditLogs').createIndex({ createdAt: -1 });
  await db.collection('auditLogs').createIndex({ targetId: 1 });

  console.log('All indexes created');
  process.exit(0);
}

createIndexes().catch(console.error);
```

> **Warning:** The multikey unique index on `players.email` and `players.regNo` blocks the same value **across different documents** (different teams). It does NOT block duplicates **within the same player array** — that is Zod's job (`superRefine`).

---

## 4. Cloudflare Turnstile — Full Setup

### 4.1 Create the Widget (Cloudflare Dashboard)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile** → **Add widget**.
2. Widget name: `Borderland Registration`
3. Domains: add your production domain **and** `localhost` (for dev).
4. Widget type: **Managed** (invisible-by-default, challenge only when suspicious).
5. Copy the **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
6. Copy the **Secret Key** → `TURNSTILE_SECRET_KEY`.

### 4.2 Where to Put the Widget

Turnstile must appear on every public form that mutates data, and on both login forms:

| Page / Form | Action string |
|---|---|
| `/register` — Step 1 (team details) | `register` |
| `/register/pay/[teamId]` — Step 2 (UTR) | `payment` |
| `/register` — Resend link form | `resend` |
| `/admin/login` | `admin_login` |
| `/attendance/login` | `attendance_login` |

### 4.3 Widget Integration (React)

Install: `npm install @marsidev/react-turnstile`

```tsx
// components/TurnstileWidget.tsx
'use client';
import { Turnstile } from '@marsidev/react-turnstile';

interface Props {
  action: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ action, onToken, onExpire }: Props) {
  return (
    <Turnstile
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
      options={{ action, theme: 'dark' }}
      onSuccess={onToken}
      onExpire={onExpire}
      onError={() => {
        // Show: "Verification couldn't load — disable blockers or switch network."
      }}
    />
  );
}
```

**In your form:**

```tsx
const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
const turnstileRef = useRef<TurnstileInstance>(null);

// Keep submit disabled until we have a token
<button type="submit" disabled={!turnstileToken}>Continue</button>

// On failed submit: reset widget, keep form data
turnstileRef.current?.reset();
setTurnstileToken(null);
```

### 4.4 Server-Side Verification (`lib/security/turnstile.ts`)

```typescript
// lib/security/turnstile.ts

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  success: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  expectedAction: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!token) {
    return { ok: false, reason: 'No Turnstile token provided' };
  }

  let result: TurnstileResult;

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY!,
        response: token,
      }),
    });
    result = await res.json();
  } catch {
    // Cloudflare unreachable → fail safe
    return { ok: false, reason: 'Turnstile verification service unreachable' };
  }

  if (!result.success) {
    return { ok: false, reason: `Turnstile failed: ${result['error-codes']?.join(', ')}` };
  }

  // Check hostname (prevents token reuse across domains)
  const allowedHost = new URL(process.env.APP_URL!).hostname;
  if (result.hostname && result.hostname !== allowedHost && result.hostname !== 'localhost') {
    return { ok: false, reason: `Turnstile hostname mismatch: ${result.hostname}` };
  }

  // Check action matches what we expected
  if (result.action && result.action !== expectedAction) {
    return { ok: false, reason: `Turnstile action mismatch: expected ${expectedAction}, got ${result.action}` };
  }

  return { ok: true };
}
```

**Usage in a route handler:**

```typescript
// Inside POST /api/registrations
const turnstileCheck = await verifyTurnstileToken(body.turnstileToken, 'register');
if (!turnstileCheck.ok) {
  return NextResponse.json(
    { ok: false, code: 'CAPTCHA_FAILED', message: "Couldn't verify you're human. Please try again." },
    { status: 403 }
  );
}
```

### 4.5 Key Rules

- Tokens are **single-use** and expire after **5 minutes** — always reset the widget after any failed submit.
- If Cloudflare is unreachable → **reject** (fail safe). Tell the user to retry.
- `success: true` + right `hostname` + right `action` = valid. All three must pass.
- Never log or store the token itself.

---

## 5. Session Auth — Passwords, JWTs & Cookies

### 5.1 How It Works

```
POST /api/admin/login
  1. Rate limit (5/15min per IP for admin logins)
  2. Turnstile verify (action: "admin_login")
  3. timingSafeEqual(sha256(input), sha256(ADMIN_PASSWORD))
  4. Sign JWT → Set-Cookie bnd_admin (httpOnly, Secure, SameSite=Strict, 8h)
```

The JWT payload:
```typescript
interface SessionPayload {
  scope: 'admin' | 'attendance';
  name: string;          // volunteer/admin name typed at login — written to audit log
  pwv: string;           // first 8 hex chars of sha256(password) — invalidates on password change
  exp: number;           // 8h (admin) / 14h (attendance)
}
```

### 5.2 Session Utilities (`lib/security/session.ts`)

```typescript
// lib/security/session.ts
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const ADMIN_COOKIE = 'bnd_admin';
const ATTEND_COOKIE = 'bnd_attendance';

function pwv(password: string): string {
  return createHash('sha256').update(password).digest('hex').slice(0, 8);
}

export async function signSession(scope: 'admin' | 'attendance', name: string): Promise<string> {
  const password = scope === 'admin'
    ? process.env.ADMIN_PASSWORD!
    : process.env.ATTENDANCE_PASSWORD!;

  return new SignJWT({ scope, name, pwv: pwv(password) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(scope === 'admin' ? '8h' : '14h')
    .sign(SECRET);
}

export async function verifySession(
  token: string,
  expectedScope: 'admin' | 'attendance'
): Promise<{ name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const p = payload as any;

    if (p.scope !== expectedScope) return null;

    // Check password version — fails if the env password changed
    const currentPwv = pwv(
      expectedScope === 'admin'
        ? process.env.ADMIN_PASSWORD!
        : process.env.ATTENDANCE_PASSWORD!
    );
    if (p.pwv !== currentPwv) return null;

    return { name: p.name as string };
  } catch {
    return null;
  }
}

// requireScope — call this inside EVERY route handler (middleware alone is not trusted)
export async function requireScope(
  req: NextRequest,
  scope: 'admin' | 'attendance'
): Promise<{ name: string } | NextResponse> {
  const cookieName = scope === 'admin' ? ADMIN_COOKIE : ATTEND_COOKIE;
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const session = await verifySession(token, scope);
  if (!session) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  }

  return session; // { name: 'Riya' }
}

export function setSessionCookie(
  res: NextResponse,
  scope: 'admin' | 'attendance',
  token: string
) {
  const cookieName = scope === 'admin' ? ADMIN_COOKIE : ATTEND_COOKIE;
  const maxAge = scope === 'admin' ? 8 * 60 * 60 : 14 * 60 * 60;

  res.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
}
```

### 5.3 Login Route Handler (`/api/admin/login`)

```typescript
// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'crypto';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { signSession, setSessionCookie } from '@/lib/security/session';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const body = await req.json();

  // 1. Rate limit
  const limited = await checkRateLimit(`admin_login:${ip}`, 5, 15 * 60);
  if (limited) {
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again in 15 minutes.' },
      { status: 429 }
    );
  }

  // 2. Turnstile
  const ts = await verifyTurnstileToken(body.turnstileToken, 'admin_login');
  if (!ts.ok) {
    return NextResponse.json({ ok: false, code: 'CAPTCHA_FAILED', message: ts.reason }, { status: 403 });
  }

  // 3. Password check (constant-time)
  const inputHash = Buffer.from(createHash('sha256').update(body.password ?? '').digest());
  const envHash = Buffer.from(createHash('sha256').update(process.env.ADMIN_PASSWORD!).digest());

  if (inputHash.length !== envHash.length || !timingSafeEqual(inputHash, envHash)) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: 'Invalid password' },
      { status: 401 }
    );
  }

  // 4. Name required for audit log
  const name = String(body.name ?? '').trim();
  if (!name) {
    return NextResponse.json(
      { ok: false, code: 'VALIDATION_ERROR', message: 'Enter your name' },
      { status: 400 }
    );
  }

  // 5. Sign and set cookie
  const token = await signSession('admin', name);
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, 'admin', token);

  return res;
}
```

> **Attendance login** is identical — swap `'admin'` for `'attendance'`, `ADMIN_PASSWORD` for `ATTENDANCE_PASSWORD`, and Turnstile action `admin_login` for `attendance_login`.

---

## 6. Middleware Guard (`proxy.ts`)

> Check `node_modules/next/dist/docs/` before writing middleware to confirm the correct filename for your Next.js version (the AGENTS.md rule in this repo requires this).

```typescript
// proxy.ts  (or middleware.ts — verify against your Next.js version)
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

async function getScope(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as any).scope ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin area guard
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = req.cookies.get('bnd_admin')?.value;
    const scope = await getScope(token);

    if (scope !== 'admin') {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  // Attendance area guard
  if (pathname.startsWith('/attendance') && !pathname.startsWith('/attendance/login')) {
    const token = req.cookies.get('bnd_attendance')?.value;
    const scope = await getScope(token);

    if (scope !== 'attendance') {
      if (pathname.startsWith('/api/attendance')) {
        return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/attendance/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/attendance/:path*', '/api/attendance/:path*'],
};
```

> **Important:** Middleware is a convenience, not the security boundary. Every route handler **must also call** `requireScope('admin')` or `requireScope('attendance')` independently.

---

## 7. Rate Limiting

Rate limits use the `rateLimits` MongoDB collection with a TTL index — no Redis needed.

### 7.1 Implementation (`lib/security/rateLimit.ts`)

```typescript
// lib/security/rateLimit.ts
import { getDb } from '@/lib/db';
import { createHash } from 'crypto';

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Returns true if the limit is exceeded (caller should return 429).
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<boolean> {
  const db = await getDb();
  const col = db.collection('rateLimits');
  const expiresAt = new Date(Date.now() + windowSec * 1000);

  const result = await col.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  return (result?.count ?? 0) > max;
}
```

### 7.2 Limits Reference

| Route | Key pattern | Max | Window |
|---|---|---|---|
| `POST /api/registrations` Step 1 | `reg:<ipHash>` | 5 | 10 min |
| `POST /api/registrations` Step 1 daily | `reg_day:<ipHash>` | 20 | 24 h |
| `POST /api/registrations/[teamId]/payment` | `pay:<teamId>:<ipHash>` | 5 | 10 min |
| `POST /api/registrations/resend-link` | `resend:<email>` | 3 | 1 h |
| `POST /api/admin/login` | `admin_login:<ipHash>` | 5 | 15 min |
| `POST /api/attendance/login` | `attend_login:<ipHash>` | 5 | 15 min |

---

## 8. Zod Validation Schemas

All schemas live in `lib/validation/` and are imported by both React forms and API route handlers. The server **never** trusts the browser.

### 8.1 Player Schema

```typescript
// lib/validation/playerSchema.ts
import { z } from 'zod';

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'srmist.edu.in';

export const playerSchema = z.object({
  slot: z.number().int().min(1).max(4),
  isLeader: z.boolean(),
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter the full name (letters only)')
    .max(60)
    .regex(/^[a-zA-Z\s.'\\-]+$/, 'Enter the full name (letters only)'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Use your SRM email (@srmist.edu.in)')
    .refine(
      (e) => e.endsWith(`@${ALLOWED_DOMAIN}`),
      { message: `Use your SRM email (@${ALLOWED_DOMAIN})` }
    ),
  regNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^RA\d{13}$/, 'Enter your SRM register number, e.g. RA2311003010123'),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => v?.replace(/^(\+91|0)/, '').replace(/[\s-]/g, ''))
    .refine((v) => !v || /^[6-9]\d{9}$/.test(v), 'Enter a 10-digit Indian mobile number'),
  year: z.enum(['1', '2', '3', '4', '5', 'PG']).optional(),
  department: z.string().trim().max(60).optional(),
});
```

### 8.2 Team Schema (Step 1)

```typescript
// lib/validation/teamSchema.ts
import { z } from 'zod';
import { playerSchema } from './playerSchema';

export const teamSchema = z
  .object({
    teamName: z
      .string()
      .trim()
      .min(3, 'Team name must be at least 3 characters')
      .max(30, 'Team name must be at most 30 characters')
      .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Letters, numbers, spaces, - and _ only'),
    players: z.array(playerSchema).min(2, 'A team must have 2 to 4 players').max(4),
    source: z.enum(['Instagram', 'WhatsApp', 'Friend', 'Poster', 'Other']).optional(),
    consent: z.literal(true, {
      errorMap: () => ({ message: 'Accept the rules & refund policy to continue' }),
    }),
    website: z.string().max(0).optional(), // honeypot — must be empty
    _formOpenedAt: z.number().optional(),  // time-trap timestamp
    turnstileToken: z.string().min(1, 'Verification failed, please retry'),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((data, ctx) => {
    // Exactly one leader
    const leaders = data.players.filter((p) => p.isLeader);
    if (leaders.length !== 1) {
      ctx.addIssue({ code: 'custom', message: 'Exactly one player must be the leader', path: ['players'] });
    }

    // Leader must have phone
    const leader = data.players.find((p) => p.isLeader);
    if (leader && !leader.phone) {
      const idx = data.players.indexOf(leader);
      ctx.addIssue({
        code: 'custom',
        message: 'Leader must provide a WhatsApp number',
        path: [`players.${idx}.phone`],
      });
    }

    // No duplicate emails within the team
    const emails = data.players.map((p) => p.email);
    emails.forEach((email, i) => {
      const prev = emails.indexOf(email);
      if (prev !== -1 && prev < i) {
        ctx.addIssue({
          code: 'custom',
          message: `Player ${i + 1} has the same email as Player ${prev + 1}`,
          path: [`players.${i}.email`],
        });
      }
    });

    // No duplicate regNo within the team
    const regNos = data.players.map((p) => p.regNo);
    regNos.forEach((regNo, i) => {
      const prev = regNos.indexOf(regNo);
      if (prev !== -1 && prev < i) {
        ctx.addIssue({
          code: 'custom',
          message: `Player ${i + 1} has the same register number as Player ${prev + 1}`,
          path: [`players.${i}.regNo`],
        });
      }
    });
  });
```

### 8.3 Payment Schema (Step 2)

```typescript
// lib/validation/paymentSchema.ts
import { z } from 'zod';

export const paymentSchema = z
  .object({
    utr: z.string().regex(/^\d{12}$/, 'UTR must be the 12-digit number from your payment app'),
    confirmUtr: z.string().regex(/^\d{12}$/, 'UTR must be the 12-digit number from your payment app'),
    amount: z.number().positive(),
    payerUpi: z.string().trim().max(60).optional(),
    paidAt: z.string().datetime().optional(),
    turnstileToken: z.string().min(1, 'Verification failed, please retry'),
  })
  .refine((data) => data.utr === data.confirmUtr, {
    message: "UTRs don't match",
    path: ['confirmUtr'],
  });
```

---

## 9. API Endpoints — Full Reference

### Response Shape (all routes)

```typescript
// Success
{ ok: true, data: { ... } }

// Error
{ ok: false, code: string, message: string, fields?: Record<string, string> }
// "fields" uses paths like "players.2.regNo" so the form marks the right input
```

### 9.1 Public Endpoints

#### `GET /api/event`
Returns safe event data for the landing page. Cached via Next.js `revalidate`.

**Response:**
```typescript
{
  ok: true,
  data: {
    name: string;
    day1Date: string;
    day2Date: string;
    venue: string;
    fee: number;
    upiId: string;
    payeeName: string;
    registrationOpensAt: string;
    registrationClosesAt: string;
    capacity: number;
    confirmedCount: number;
    underReviewCount: number;
    state: 'UPCOMING' | 'OPEN' | 'ALMOST_FULL' | 'FULL' | 'CLOSED';
    seatsHint: 'plenty' | 'few' | 'none';
    teamSize: { min: 2; max: 4 };
    faq: Array<{ q: string; a: string }>;
  }
}
```

---

#### `POST /api/registrations` — Step 1

**Checks (in order):**
1. Rate limit: 5/10min + 20/day per IP → 429 `RATE_LIMITED`
2. Honeypot (`website` not empty) → fake 200, log to `abuseLogs`, save nothing
3. Time-trap (form submitted < 3 s after page load) → 400 `BOT_SUSPECTED`
4. Zod `teamSchema` → 400 `VALIDATION_ERROR` with field paths
5. Turnstile (action: `register`) → 403 `CAPTCHA_FAILED`
6. Event open + capacity not full → 409 `REGISTRATION_CLOSED` / `EVENT_FULL`
7. Idempotency-Key: if duplicate key → return first result
8. Generate Team ID `DBG-XXX` (retry up to 20 times on collision)
9. Insert registration (PAYMENT_PENDING) — map duplicate key errors to field paths
10. Enqueue `REGISTERED` email
11. Reply 201 with Team ID + resume token + UPI details

**Response `201`:**
```typescript
{
  ok: true,
  data: {
    teamId: 'DBG-472';
    resumeToken: string;
    upi: {
      id: string;
      payeeName: string;
      amount: number;
      note: string; // "DBG-472"
      qrString: string; // "upi://pay?pa=...&tn=DBG-472"
    };
  }
}
```

---

#### `POST /api/registrations/[teamId]/payment` — Step 2

**Checks:**
1. Magic token in `?t=...` → 401 `INVALID_LINK`
2. Rate limit: 5/10min per team → 429
3. Turnstile (action: `payment`) → 403
4. Zod `paymentSchema` → 400
5. Amount equals `event.fee` → 400 `AMOUNT_MISMATCH`
6. Registration status is `PAYMENT_PENDING` or `REJECTED` → else 409 `STALE_STATE`
7. **Atomic transaction:** insert `payments` doc + set registration to `UNDER_REVIEW`
8. Unique index on `utr` → 409 `UTR_ALREADY_USED`
9. Enqueue `PROOF_RECEIVED` email

**Response `200`:** `{ ok: true, data: { status: 'UNDER_REVIEW', statusLink: string } }`

---

#### `GET /api/registrations/[teamId]/status`
Requires magic token. Returns status, reject reason, whether UTR can be resubmitted, Visa link if confirmed.

---

#### `POST /api/registrations/resend-link`
Rate limited: 3/hour per email. Always returns the same message — never reveals whether the email exists.

---

#### `GET /api/visa/[teamId]?format=png|pdf`
Requires magic token. Registration must be `CONFIRMED`. Visa rendered on request — nothing stored.

---

### 9.2 Admin Endpoints (cookie `bnd_admin`, scope `admin`)

All routes call `requireScope('admin')` before any logic.

| Method | Endpoint | Does |
|---|---|---|
| POST | `/api/admin/login` | Password + name + Turnstile → `bnd_admin` cookie |
| POST | `/api/admin/logout` | Clears `bnd_admin` |
| GET | `/api/admin/registrations` | Paginated list with filters + search |
| POST | `/api/admin/registrations` | Manual team add |
| GET | `/api/admin/registrations/[teamId]` | Full team detail |
| PATCH | `/api/admin/registrations/[teamId]` | Edit players/team name (audited) |
| DELETE | `/api/admin/registrations/[teamId]` | Soft delete (audited) |
| POST | `/api/admin/registrations/[teamId]/approve` | UNDER_REVIEW → CONFIRMED (transactional) |
| POST | `/api/admin/registrations/[teamId]/reject` | UNDER_REVIEW → REJECTED (reason required) |
| POST | `/api/admin/registrations/[teamId]/undo-reject` | REJECTED → UNDER_REVIEW (audited) |
| POST | `/api/admin/registrations/[teamId]/cancel` | any → CANCELLED (audited) |
| POST | `/api/admin/registrations/[teamId]/restore` | Soft-deleted → restored |
| POST | `/api/admin/registrations/[teamId]/resend-email` | Re-send any email template |
| POST | `/api/admin/registrations/bulk` | Bulk approve / reject / remind / delete |
| POST | `/api/admin/reconcile` | Upload bank CSV → match report (CSV not stored) |
| GET | `/api/admin/stats` | Dashboard KPI numbers ($facet aggregation, cached 30s) |
| GET | `/api/admin/attendance-report` | Read-only Day 1 / Day 2 counts + no-shows |
| GET | `/api/admin/export` | Full CSV with PII (audited) |
| GET / POST | `/api/admin/emails` | Email outbox list / manual queue |
| POST | `/api/admin/emails/[id]/retry` | Force-retry a FAILED email job |
| GET / PUT | `/api/admin/settings` | Read / update event settings |
| GET | `/api/admin/audit` | Audit log (paginated) |

#### Approve — Transactional Pattern

```typescript
// lib/services/payment.ts — approvePayment
export async function approvePayment(teamId: string, actorName: string, ipHash: string) {
  const db = await getDb();
  const session = db.client.startSession();

  try {
    await session.withTransaction(async () => {
      const reg = await db.collection('registrations').findOneAndUpdate(
        { teamId, status: 'UNDER_REVIEW' },
        {
          $set: {
            status: 'CONFIRMED',
            verifiedAt: new Date(),
            verifiedBy: actorName,
            updatedAt: new Date(),
            'visa.issuedAt': new Date(),
            'visa.status': 'VALID',
          },
        },
        { session, returnDocument: 'after' }
      );

      if (!reg) throw new Error('STALE_STATE'); // already handled by another admin

      await db.collection('payments').updateOne(
        { _id: reg.currentPaymentId },
        { $set: { status: 'APPROVED', reviewedBy: actorName, reviewedAt: new Date() } },
        { session }
      );

      await db.collection('auditLogs').insertOne({
        actorName, scope: 'admin', action: 'APPROVE',
        targetId: teamId, ipHash, createdAt: new Date(),
      }, { session });
    });
  } finally {
    await session.endSession();
  }

  await enqueueEmail('CONFIRMED', teamId); // outside the transaction
}
```

---

### 9.3 Attendance Endpoints (cookie `bnd_attendance`, scope `attendance`)

All routes call `requireScope('attendance')`. Returns **only** the minimal team card — no emails, phones, or payment data.

| Method | Endpoint | Does |
|---|---|---|
| POST | `/api/attendance/login` | Password + volunteer name → `bnd_attendance` |
| POST | `/api/attendance/logout` | Clears `bnd_attendance` |
| GET | `/api/attendance/teams/[teamId]` | Team code → minimal team card |
| GET | `/api/attendance/search?q=` | Search by Team ID / phone / register no. (min 4 chars) |
| POST | `/api/attendance/teams/[teamId]/mark` | Mark attendance for a day |
| GET | `/api/attendance/counter?day=1\|2` | Live count of teams checked in |

**Team card shape (attendance API only):**
```typescript
{
  teamId: string;
  teamName: string;
  status: 'CONFIRMED' | 'PAYMENT_PENDING' | 'UNDER_REVIEW' | 'REJECTED' | 'CANCELLED';
  players: Array<{ slot: number; fullName: string; regNo: string; isLeader: boolean }>;
  attendance: Array<{ day: 1 | 2; markedAt: Date; markedBy: string; playersPresent: number[] }>;
  // NO: email, phone, payment data, UTR, admin notes
}
```

**Mark attendance request:**
```typescript
// POST /api/attendance/teams/[teamId]/mark
{ day: 1 | 2; playersPresent: number[] } // slot numbers e.g. [1, 2, 3]
```

If already marked for that day → return `ALREADY_MARKED` with existing data (late arrivals can be added).

---

### 9.4 Cron Endpoints (Bearer `CRON_SECRET`)

```typescript
// Standard cron route guard — put this at the top of every /api/cron/* handler
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // ... cron logic
}
```

| Route | Runs | Does |
|---|---|---|
| `GET /api/cron/emails` | Every 15 min | Retry QUEUED email jobs (with exponential backoff) |
| `GET /api/cron/expire` | Hourly | Mark `PAYMENT_PENDING` teams past `expiresAt` → `EXPIRED` |
| `GET /api/cron/digest` | Hourly | Send admin digest if new UTRs since last digest |
| `GET /api/cron/remind` | Hourly | Send 24 h unpaid reminder (one per team, tracks `reminderSentAt`) |

---

## 10. Service Layer

**Rule:** route handlers stay thin — parse, guard, call a service, return. All business logic goes in `lib/services/`.

| File | Exports |
|---|---|
| `registration.ts` | `createTeam`, `getTeam`, `getTeamCard`, `editTeam`, `softDeleteTeam`, `restoreTeam` |
| `payment.ts` | `submitUTR`, `approvePayment`, `rejectPayment`, `undoReject`, `cancelTeam` |
| `email.ts` | `enqueueEmail`, `drainQueue`, `retryJob`, `getDailyCount` |
| `audit.ts` | `logAction(actor, scope, action, targetId, before?, after?, ipHash)` |
| `attendance.ts` | `markAttendance`, `getCounter`, `searchTeams` |
| `stats.ts` | `getDashboardStats` — single `$facet` aggregation, cached 30 s |
| `reconcile.ts` | `parseCsv`, `matchTeams`, `saveBatch` |

---

## 11. Email Outbox — Nodemailer + Gmail

### 11.1 Gmail Setup

1. Enable **2-Step Verification** on the sending Google account.
2. **Manage account → Security → App Passwords** → Generate for "Mail".
3. Copy the 16-char string → `SMTP_APP_PASSWORD`.
4. Sending address → `SMTP_USER`.

> **Strongly prefer Google Workspace** — ~2,000 recipient-sends/day vs ~500 on personal. With Visa CC-ing 4 members, 500 teams ≈ 2,000 sends just for the Visa email.

### 11.2 Nodemailer Transport (`lib/email/sender.ts`)

```typescript
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_APP_PASSWORD!,
  },
});

export async function sendEmail(opts: {
  to: string | string[];
  cc?: string[];
  subject: string;
  html: string;
  text: string;
}): Promise<{ messageId: string }> {
  const info = await transport.sendMail({
    from: process.env.MAIL_FROM!,
    replyTo: process.env.ADMIN_NOTIFY_EMAIL,
    ...opts,
  });
  return { messageId: info.messageId };
}
```

### 11.3 Email Queue Flow

```
1. Service calls enqueueEmail('CONFIRMED', teamId)
2. Insert emailJobs document { status: 'QUEUED', dedupeKey: 'CONFIRMED:DBG-472:<paymentId>' }
   - dedupeKey unique index blocks double-queue on retries
3. after() (Next.js — runs after the route handler replies) picks up QUEUED jobs
4. Claim job: set status = 'SENDING' (prevents double-send if two instances race)
5. Check today's recipient count < EMAIL_DAILY_CAP
   - Over cap: set nextAttemptAt = tomorrow 00:01, status stays QUEUED
6. sendEmail() via Gmail SMTP
7. Success: status = 'SENT', messageId saved
8. Failure: attempts++; if attempts < 5, status = 'QUEUED' with backoff:
     1st retry: +1 min  |  2nd: +5 min  |  3rd: +30 min  |  4th: +2 h  |  5th: +6 h
   After 5 failures: status = 'FAILED' → visible in /admin/emails for manual retry
```

### 11.4 Email Templates Reference

| Template | Trigger | To | Must include |
|---|---|---|---|
| `REGISTERED` | Step 1 done | Leader | Amount, UPI ID, QR, "add Team ID in note", resume link, player list |
| `PROOF_RECEIVED` | Step 2 done | Leader | The UTR typed, expected review time, status link |
| `CONFIRMED` | Admin approves | Leader + CC members | Visa image + link + PDF, attendance QR, days/venue, "bring SRM ID card" |
| `REJECTED` | Admin rejects | Leader | Reason, re-submit link, contact |
| `REMINDER` | 24 h after Step 1, no UTR | Leader | Resume link, deadline |
| `YOUR_LINK` | Duplicate attempt / resend | Leader | Status + pay links |
| `DIGEST` | Hourly, if new UTRs | `ADMIN_NOTIFY_EMAIL` | Count + link to `/admin` |
| `EVENT_REMINDER` | Admin-triggered, 1 day before | All confirmed players | Venue, time, Visa link |

---

## 12. Magic Links

### 12.1 Implementation (`lib/security/magicLink.ts`)

```typescript
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.LINK_SECRET!);

type LinkType = 'pay' | 'status' | 'visa';

export async function signLink(
  teamId: string,
  type: LinkType,
  expiresAt: Date
): Promise<string> {
  const token = await new SignJWT({ teamId, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(SECRET);

  const path =
    type === 'pay' ? `register/pay/${teamId}` :
    type === 'status' ? `r/${teamId}` :
    `visa/${teamId}`;

  return `${process.env.APP_URL}/${path}?t=${token}`;
}

export async function verifyLink(
  token: string,
  expectedTeamId: string,
  expectedType: LinkType
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.teamId === expectedTeamId && payload.type === expectedType;
  } catch {
    return false;
  }
}
```

### 12.2 Link Expiry

| Link | Expiry |
|---|---|
| Pay link (resume Step 2 / re-submit after reject) | `registrationClosesAt + 2 days` |
| Status link | Event end date |
| Visa link | Event end date |

> The attendance QR is **not** a magic link — it's plain text `DBG-472`. Only the scanner inside the logged-in `/attendance` area acts on it.

---

## 13. Team ID Generation (`DBG-XXX`)

```typescript
// lib/services/registration.ts

import { getDb } from '@/lib/db';

const MAX_RETRIES = 20;

export async function generateUniqueTeamId(
  db: Awaited<ReturnType<typeof getDb>>,
  prefix = 'DBG'
): Promise<string> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    // Random 3-digit number: 100–999 (900 possible IDs)
    const num = 100 + Math.floor(Math.random() * 900);
    const teamId = `${prefix}-${num}`;

    // Check if taken — including soft-deleted (no reuse ever)
    const existing = await db
      .collection('registrations')
      .findOne({ teamId }, { projection: { _id: 1 } });

    if (!existing) return teamId;
  }

  throw new Error('INTERNAL: Could not generate a unique Team ID after 20 retries');
}
```

> With 900 possible IDs and capacity capped at 600, collision probability stays manageable. To support more than 900 teams, switch to 4 digits (`DBG-XXXX`, 9,000 IDs).

---

## 14. Cron Jobs — GitHub Actions

Vercel Hobby only allows daily crons. Use GitHub Actions to call cron endpoints every 15 minutes.

### 14.1 GitHub Actions Workflow

```yaml
# .github/workflows/cron.yml
name: Borderland Cron Jobs

on:
  schedule:
    - cron: '*/15 * * * *'  # every 15 min — email retry
    - cron: '0 * * * *'     # every hour — expire, digest, remind

jobs:
  cron-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Retry queued emails
        run: |
          curl -sf -X GET "${{ vars.APP_URL }}/api/cron/emails" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  cron-hourly:
    if: github.event.schedule == '0 * * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Expire unpaid teams
        run: |
          curl -sf -X GET "${{ vars.APP_URL }}/api/cron/expire" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

      - name: Send admin digest
        run: |
          curl -sf -X GET "${{ vars.APP_URL }}/api/cron/digest" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

      - name: Send unpaid reminders
        run: |
          curl -sf -X GET "${{ vars.APP_URL }}/api/cron/remind" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### 14.2 GitHub Secrets / Variables to Set

Go to repo → **Settings → Secrets and Variables → Actions**:

| Name | Type | Value |
|---|---|---|
| `CRON_SECRET` | Secret | Same as your Vercel `CRON_SECRET` env var |
| `APP_URL` | Variable | `https://borderland.srmdbug.in` |

---

## 15. Startup Env Validation

```typescript
// lib/validation/envSchema.ts
import { z } from 'zod';

const envSchema = z
  .object({
    MONGODB_URI: z.string().url('MONGODB_URI must be a valid URI'),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
    TURNSTILE_SECRET_KEY: z.string().min(1),
    SMTP_USER: z.string().email(),
    SMTP_APP_PASSWORD: z.string().min(10),
    MAIL_FROM: z.string().min(1),
    EMAIL_DAILY_CAP: z.coerce.number().min(1).max(2000),
    ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD must be at least 12 characters'),
    ATTENDANCE_PASSWORD: z.string().min(12, 'ATTENDANCE_PASSWORD must be at least 12 characters'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    LINK_SECRET: z.string().min(32, 'LINK_SECRET must be at least 32 characters'),
    CRON_SECRET: z.string().min(16),
    ALLOWED_EMAIL_DOMAIN: z.string().min(1),
    APP_URL: z.string().url(),
  })
  .superRefine((env, ctx) => {
    if (env.ADMIN_PASSWORD === env.ATTENDANCE_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        message: 'ADMIN_PASSWORD and ATTENDANCE_PASSWORD must be different',
        path: ['ATTENDANCE_PASSWORD'],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:\n', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
```

Import `env` (or just this module) from `lib/db.ts` or a top-level `instrumentation.ts` so it runs on every cold start.

---

## 16. Error Codes & Response Shape

### Error Code Reference

| Code | HTTP | User-facing message |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Shown under the specific field |
| `NOT_SRM_EMAIL` | 400 | "Use your SRM email (@srmist.edu.in)" |
| `INVALID_REG_NO` | 400 | "Enter a valid SRM register number" |
| `TEAM_SIZE` | 400 | "A team must have 2 to 4 players" |
| `DUPLICATE_IN_TEAM` | 400 | "Player 3 has the same email/register number as Player 1" |
| `PLAYER_ALREADY_REGISTERED` | 409 | "Player 2 is already in another team" |
| `DUPLICATE_PHONE` | 409 | "Already registered — we've emailed the status link" |
| `TEAM_NAME_TAKEN` | 409 | "That team name is taken" |
| `CAPTCHA_FAILED` | 403 | "Couldn't verify you're human. Please try again." |
| `RATE_LIMITED` | 429 | "Too many attempts. Try again in N minutes." |
| `REGISTRATION_CLOSED` | 409 | "Registrations are closed." |
| `EVENT_FULL` | 409 | "All seats are taken." |
| `INVALID_LINK` | 401 | "This link is invalid or expired. Request a new one." |
| `UTR_ALREADY_USED` | 409 | "This UTR is already linked to a registration." |
| `UTR_MISMATCH` | 400 | "The two UTRs don't match." |
| `AMOUNT_MISMATCH` | 400 | "Amount must be ₹{fee}." |
| `UNAUTHORIZED` | 401 | Redirect to the right login page |
| `STALE_STATE` | 409 | (admin) "Already handled — refresh." |
| `ALREADY_MARKED` | 409 | (attendance) "Already marked at 09:12 by Riya" |
| `INTERNAL` | 500 | "Something broke on our side. Your data is safe — try again." |
| `DB_UNAVAILABLE` | 503 | "Something broke on our side. Your data is safe — try again." |

> **Never** show raw MongoDB errors like `E11000 duplicate key`. Map index names to field paths and use the codes above.

---

## 17. Security Checklist

### Bot & Spam
- [x] Cloudflare Turnstile on every public mutating form + both login forms, with action verification
- [x] Honeypot field (`website`) — bots fill it; server returns fake 200, logs to `abuseLogs`, saves nothing
- [x] Time-trap — reject Step 1 if submitted < 3 s after page load
- [x] Rate limits per IP/team/email (MongoDB counters, TTL index)
- [x] SRM domain enforced by Zod **on the server** — browser validation can be bypassed

### Auth & Sessions
- [x] `timingSafeEqual` for password comparison (prevents timing attacks)
- [x] httpOnly + Secure + SameSite=Strict cookies
- [x] Two separate cookies, two separate scopes
- [x] Every route handler re-checks scope — middleware is not trusted alone
- [x] Password version (`pwv`) in JWT — changing env var immediately invalidates all sessions
- [x] Startup check: crash if passwords are missing, < 12 chars, or equal to each other

### Data Integrity
- [x] Unique MongoDB indexes for emails, register numbers, phone, team name, UTR (across all attempts ever)
- [x] Transactions for approve/reject (payment + registration updated atomically)
- [x] Idempotency key on Step 1 — double-click never creates two teams

### Privacy
- [x] No PII in logs — use `ipHash` (sha256) everywhere
- [x] Attendance API returns only: Team ID, team name, player names + register numbers — no emails, phones, payment data
- [x] `X-Robots-Tag: noindex` on `/admin/*` and `/attendance/*`; both in `robots.txt` disallow
- [x] Soft delete only — money is involved, audit trail must stay intact

### Secrets
- [x] All secrets in Vercel env vars only — nothing in source code or `NEXT_PUBLIC_*` (except site key)
- [x] Gmail App Password, not account password
- [x] `CRON_SECRET` protects cron endpoints

---

## 18. Step-by-Step Build Order

| # | What to build | Done when |
|---|---|---|
| 1 | `lib/db.ts` cached MongoDB client + `scripts/createIndexes.ts` + `scripts/seedEvent.ts` | Connects to Atlas; indexes exist; event doc seeded |
| 2 | `lib/validation/envSchema.ts` — startup env validation | Missing/weak/equal passwords crash with a clear message |
| 3 | `lib/validation/` — player, team, payment Zod schemas | Bad sample data rejected; in-team duplicates caught |
| 4 | `lib/security/turnstile.ts` | Test keys pass; bad token fails; Cloudflare-down fails-safe |
| 5 | `lib/security/rateLimit.ts` | 6th attempt in window returns `true` |
| 6 | `lib/security/session.ts` | Scope mismatch and expired token rejected |
| 7 | `lib/security/magicLink.ts` | Tampered token rejected; wrong type rejected |
| 8 | `POST /api/admin/login` + `POST /api/attendance/login` | Login works; wrong password → generic 401; 6th try → rate-limited |
| 9 | `proxy.ts` middleware — area guards | No cookie → redirect/401; wrong-scope cookie → 401 |
| 10 | `POST /api/registrations` (Step 1) | Good data → 201 + teamId; non-SRM email → 400; 5 players → 400; duplicate member → 409 with slot |
| 11 | `POST /api/registrations/[teamId]/payment` (Step 2) | Status → UNDER_REVIEW; reused UTR → 409 |
| 12 | `GET /api/registrations/[teamId]/status` | Magic link shows correct status |
| 13 | `lib/email/sender.ts` + templates + `enqueueEmail` + `drainQueue` | Real email arrives; CONFIRMED template has Visa link |
| 14 | `GET /api/cron/emails` — retry worker | Failures retry with backoff; after 5 fails → FAILED in outbox |
| 15 | `GET /api/event` + landing page data | Countdown, fee, open/full/closed state work |
| 16 | Admin: `GET /api/admin/registrations` + list | Paginated list; filters work |
| 17 | Admin: `approve` / `reject` / `undo-reject` | Approve sends Visa email; second approve → 409; audit logged |
| 18 | Admin: `GET /api/admin/stats` | Dashboard numbers match DB |
| 19 | Admin: `POST /api/admin/reconcile` — CSV upload + match | MATCHED / AMOUNT_MISMATCH / PROBABLE / NOT_FOUND correct |
| 20 | Admin: settings, export, email outbox | Fee change shows on landing; CSV has all columns |
| 21 | `GET /api/visa/[teamId]` — Visa rendered on request | Visa page + PNG/PDF download; QR decodes to `DBG-472` |
| 22 | Attendance: `GET/POST /api/attendance/*` + attendance area | Day 1/Day 2 separate; second scan warns; attendance cookie can't open `/admin` |
| 23 | Cron: expire, digest, remind | Unpaid teams expire after deadline + 2 days; reminder email arrives at 24 h |
| 24 | Deploy to Vercel; add real keys; GitHub Actions cron | Live; tested with real ₹1 payment on GPay + PhonePe + Paytm |

---

*This document is derived from [`Borderland_Final_Design.md`](./Borderland_Final_Design.md). All locked constraints (C1–C11) and design decisions from §0–§7 of that document apply throughout.*
