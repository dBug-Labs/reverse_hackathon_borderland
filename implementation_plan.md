# Backend Build — Borderland Event Registration Platform

Build every backend file from scratch: database layer, validation schemas, security utilities, all API routes, email system, middleware, and scripts.

## Context

- **Next.js 16.3.6** with App Router (TypeScript, Tailwind v4) — uses `src/` directory
- Middleware file must be `src/proxy.ts` (not `middleware.ts` — deprecated in Next 16)
- `after()` available from `next/server` for post-response tasks
- Existing frontend: landing page components already exist in `src/components/`
- All backend packages installed: `mongodb`, `zod`, `jose`, `nodemailer`, `qrcode`, `papaparse` + their types

## Proposed Changes

### Phase 1 — Foundation Layer

#### [NEW] `src/lib/env.ts`
Zod-based startup env validation. Crash on missing/weak/equal passwords.

#### [NEW] `src/lib/db.ts`
Cached MongoDB client singleton. Reuses one connection across serverless invocations.

#### [NEW] `src/lib/types/index.ts`
TypeScript interfaces for all DB documents: `Registration`, `Payment`, `EmailJob`, `AuditLog`, `RateLimit`, `AbuseLog`, `EventDoc`, `ReconcileBatch`, `Metric`.

---

### Phase 2 — Validation Schemas

#### [NEW] `src/lib/validation/player.ts`
Zod schema for a single player block (name, SRM email, register number, phone, year, department).

#### [NEW] `src/lib/validation/team.ts`
Zod schema for Step 1 (team of 2–4 players) with `superRefine` for in-team duplicate checks.

#### [NEW] `src/lib/validation/payment.ts`
Zod schema for Step 2 (UTR ×2, amount, payer, Turnstile token).

---

### Phase 3 — Security Utilities

#### [NEW] `src/lib/security/turnstile.ts`
Server-side Turnstile token verification with hostname + action checks.

#### [NEW] `src/lib/security/rateLimit.ts`
MongoDB-based rate limiting with TTL index. `checkRateLimit(key, max, windowSec)`.

#### [NEW] `src/lib/security/session.ts`
JWT session management with `jose` — `signSession`, `verifySession`, `requireScope`, `setSessionCookie`. Two separate scopes (admin/attendance).

#### [NEW] `src/lib/security/magicLink.ts`
Signed magic links for status/pay/visa pages.

---

### Phase 4 — Service Layer

#### [NEW] `src/lib/services/registration.ts`
`createTeam`, `getTeam`, `editTeam`, `softDeleteTeam`, `restoreTeam`, `generateUniqueTeamId`.

#### [NEW] `src/lib/services/payment.ts`
`submitUTR`, `approvePayment`, `rejectPayment`, `undoReject`, `cancelTeam`.

#### [NEW] `src/lib/services/email.ts`
Email outbox: `enqueueEmail`, `processQueue`, `retryJob`, `getDailyRecipientCount`.

#### [NEW] `src/lib/services/audit.ts`
`logAction(actorName, scope, action, targetId, before?, after?, ipHash)`.

#### [NEW] `src/lib/services/attendance.ts`
`markAttendance`, `getTeamCard`, `searchTeams`, `getCounter`.

#### [NEW] `src/lib/services/stats.ts`
`getDashboardStats` — single `$facet` aggregation, cached 30s.

#### [NEW] `src/lib/services/reconcile.ts`
`parseBankCsv`, `matchTeams`, `saveBatch`.

---

### Phase 5 — Email Templates & Sender

#### [NEW] `src/lib/email/sender.ts`
Nodemailer transport (Gmail SMTP 465 SSL).

#### [NEW] `src/lib/email/templates/registered.ts`
#### [NEW] `src/lib/email/templates/proofReceived.ts`
#### [NEW] `src/lib/email/templates/confirmed.ts`
#### [NEW] `src/lib/email/templates/rejected.ts`
#### [NEW] `src/lib/email/templates/reminder.ts`
#### [NEW] `src/lib/email/templates/yourLink.ts`
#### [NEW] `src/lib/email/templates/digest.ts`

Each template exports `{ subject, html, text }`.

---

### Phase 6 — Middleware

#### [NEW] `src/proxy.ts`
Area guards for `/admin/*` and `/attendance/*`. Checks JWT scope. Redirects pages or returns 401 for APIs.

---

### Phase 7 — API Routes (Public)

#### [NEW] `src/app/api/event/route.ts` — GET
#### [NEW] `src/app/api/registrations/route.ts` — POST Step 1
#### [NEW] `src/app/api/registrations/[teamId]/payment/route.ts` — POST Step 2
#### [NEW] `src/app/api/registrations/[teamId]/status/route.ts` — GET
#### [NEW] `src/app/api/registrations/resend-link/route.ts` — POST

---

### Phase 8 — API Routes (Admin)

#### [NEW] `src/app/api/admin/login/route.ts`
#### [NEW] `src/app/api/admin/logout/route.ts`
#### [NEW] `src/app/api/admin/registrations/route.ts` — GET list + POST manual add
#### [NEW] `src/app/api/admin/registrations/[teamId]/route.ts` — GET, PATCH, DELETE
#### [NEW] `src/app/api/admin/registrations/[teamId]/approve/route.ts`
#### [NEW] `src/app/api/admin/registrations/[teamId]/reject/route.ts`
#### [NEW] `src/app/api/admin/registrations/[teamId]/undo-reject/route.ts`
#### [NEW] `src/app/api/admin/registrations/[teamId]/cancel/route.ts`
#### [NEW] `src/app/api/admin/registrations/[teamId]/restore/route.ts`
#### [NEW] `src/app/api/admin/registrations/[teamId]/resend-email/route.ts`
#### [NEW] `src/app/api/admin/registrations/bulk/route.ts`
#### [NEW] `src/app/api/admin/reconcile/route.ts`
#### [NEW] `src/app/api/admin/stats/route.ts`
#### [NEW] `src/app/api/admin/attendance-report/route.ts`
#### [NEW] `src/app/api/admin/export/route.ts`
#### [NEW] `src/app/api/admin/emails/route.ts`
#### [NEW] `src/app/api/admin/emails/[id]/retry/route.ts`
#### [NEW] `src/app/api/admin/settings/route.ts`
#### [NEW] `src/app/api/admin/audit/route.ts`

---

### Phase 9 — API Routes (Attendance)

#### [NEW] `src/app/api/attendance/login/route.ts`
#### [NEW] `src/app/api/attendance/logout/route.ts`
#### [NEW] `src/app/api/attendance/teams/[teamId]/route.ts`
#### [NEW] `src/app/api/attendance/teams/[teamId]/mark/route.ts`
#### [NEW] `src/app/api/attendance/search/route.ts`
#### [NEW] `src/app/api/attendance/counter/route.ts`

---

### Phase 10 — Cron Routes

#### [NEW] `src/app/api/cron/emails/route.ts`
#### [NEW] `src/app/api/cron/expire/route.ts`
#### [NEW] `src/app/api/cron/digest/route.ts`
#### [NEW] `src/app/api/cron/remind/route.ts`

---

### Phase 11 — Scripts & Config

#### [NEW] `scripts/createIndexes.ts`
Creates all unique and TTL indexes.

#### [NEW] `scripts/seedEvent.ts`
Seeds the events collection with default event data.

#### [NEW] `.github/workflows/cron.yml`
GitHub Actions workflow calling cron endpoints every 15 min.

#### [MODIFY] `.env.example`
Full list of all env vars with descriptions.

---

## Verification Plan

### Build Check
- `npm run build` must pass without TypeScript errors.

### Manual Verification
- After adding `MONGODB_URI` and test Turnstile keys to `.env.local`, `npm run dev` should start without crashing.
- The env validation should catch missing/weak/equal passwords and crash with a clear message.
