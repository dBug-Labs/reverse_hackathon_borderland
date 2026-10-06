/**
 * Code review after the 12:30 code freeze: one judging prompt per card.
 * A judge clones the team's repo at the frozen commit, opens it in an AI coding agent
 * and pastes the prompt. The agent reads the code and returns a scorecard out of 100.
 */

import { CARDS, TRACKS, type PsCard } from '@/lib/cardDrop/cards';
import { SUBMISSION_WINDOW } from '@/lib/submission/config';

// Server-only in practice: the API builds the prompts, so they never ship in the public bundle.

export interface KtGuide {
  /** What a correct implementation looks like. */
  look: string;
  /** What breaks it. */
  red: string;
}

export interface CardGuide {
  /** What the core flow must cover (section A). */
  core: string[];
  /** One per Killer Test, in the card's order. */
  kt: [KtGuide, KtGuide, KtGuide];
  /** Card-specific things to check in engineering (section E). */
  eng: string;
}

export const GUIDES: Record<string, CardGuide> = {
  'box-office': {
    core: [
      'Events with ticket tiers, each with its own capacity and price',
      'Checkout that places a hold on seats, then turns into a ticket once paid (a mock payment is fine if it is labelled as one)',
      'Promo codes validated on the server (expiry, usage limit)',
      'Refunds or cancellations that give the seat back',
      'A QR ticket and a check-in screen or API',
    ],
    kt: [
      {
        look: 'An atomic conditional write: UPDATE … SET sold = sold + 1 WHERE sold < capacity (checking rows affected), findOneAndUpdate with a $lt guard, SELECT … FOR UPDATE inside a transaction, or a unique constraint per seat.',
        red: 'Read-then-write in app code (if remaining > 0 then save), a lock held in a JS/Python variable or in-process mutex, or a capacity check only in the frontend.',
      },
      {
        look: 'Holds stored with an expiresAt that count against capacity while active, and are released by a TTL index, a scheduled job, or by ignoring expired holds when availability is computed. The hold window comes from .env so it can be tested in a minute.',
        red: 'setTimeout in server memory (lost on restart or on another instance), holds that never count against capacity, or a hold time hard-coded to 10+ minutes.',
      },
      {
        look: 'Check-in is one atomic state change (UPDATE … WHERE checked_in_at IS NULL, or a unique check-in record per ticket). The QR holds an unguessable token or an HMAC-signed payload.',
        red: 'Check then update as two separate steps, or a QR that is just a sequential ticket/order ID anyone can forge.',
      },
    ],
    eng: 'Prices, promo discounts and payment status are decided on the server, never trusted from the client. Money stored in paise or a decimal type, not floats.',
  },
  ledger: {
    core: [
      'A chart of accounts (assets, liabilities, income, expenses, equity)',
      'Invoices that post journal entries: Accounts Receivable Dr, Sales Cr, CGST Payable Cr, SGST Payable Cr',
      'Payments that post Bank/Cash Dr, Accounts Receivable Cr',
      'Voiding an invoice',
      'Reports built from the journal: trial balance, and ideally P&L and balance sheet',
    ],
    kt: [
      {
        look: 'All lines of one transaction written in a single DB transaction, with a server-side check that total debits equal total credits before it commits. Amounts in paise (integers) or a decimal type.',
        red: 'Float arithmetic on money, journal lines written in separate non-transactional calls, or balance only checked in the UI.',
      },
      {
        look: 'Voiding creates reversing entries linked to the original (or marks the entries void and every report excludes them the same way). Nothing is hard-deleted.',
        red: 'Deleting journal rows, editing the original amounts in place, or a void that leaves the related payment entries dangling.',
      },
      {
        look: 'The trial balance is computed from journal lines, not from cached running totals that can drift. Ideally a test or script that runs many random operations and asserts the totals match. CGST + SGST adds up exactly to the total GST after rounding.',
        red: 'Account balances kept as separate counters updated outside the transaction, or rounding each half of the GST split so the paise do not add up.',
      },
    ],
    eng: 'GST split handled correctly (intra-state CGST + SGST; IGST for inter-state is a bonus). Journal entries are immutable once posted.',
  },
  meter: {
    core: [
      'An ingest API for usage events (ideally batched), each event with a unique ID',
      'Meters that aggregate usage per customer per billing period',
      'Plans with tiered pricing per 1,000 tokens, in rupees',
      'Invoice generation for a period',
      'Plan changes in the middle of a period',
    ],
    kt: [
      {
        look: 'An idempotency key or event ID with a unique index, and an insert that ignores or upserts duplicates at the database level.',
        red: 'Deduplication with an in-memory Set, or a check-then-insert with no unique constraint behind it.',
      },
      {
        look: 'Proration by the fraction of the period on each plan (days or seconds), with usage before the switch priced on the old plan and after it on the new one. Tested with fixed dates.',
        red: 'Charging the new plan for the whole month, or using the current date inside the calculation so it cannot be tested.',
      },
      {
        look: 'One clear tier model (graduated or volume), stated in the docs and implemented the same way. Tier boundaries tested. Money in paise or decimal, with a stated rounding rule for partial thousands.',
        red: 'Float money, boundaries that are off by one, or graduated tiers in the docs but volume tiers in the code.',
      },
    ],
    eng: 'Ingest validates customer, meter and timestamp. Late events and events for a closed period are handled deliberately.',
  },
  'vault-room': {
    core: [
      'Upload a document and create share links',
      'Email check before viewing (verified, not just typed in)',
      'Link expiry and a no-download mode',
      'A watermark with the viewer’s email',
      'Analytics: who viewed which page and for how long',
    ],
    kt: [
      {
        look: 'Expiry checked on the server on every request for the document or its pages, returning 403/410. The file itself is never at a public URL.',
        red: 'Expiry checked only on the landing page or in the frontend, while the file sits at a direct public URL (public folder, open bucket) anyone can reuse.',
      },
      {
        look: 'The viewer’s email is verified (OTP or magic link) and the watermark is drawn per viewer on the server (stamped into the pages or images), taken from the session, not from the client.',
        red: 'An unverified email field, a CSS overlay that can be removed in devtools with the clean file still downloadable, or watermark text sent from the client.',
      },
      {
        look: 'Per-page view events with start and end (or heartbeats) that handle page changes and hidden tabs (visibilitychange), stored per viewer per page on the server, with sane bounds.',
        red: 'Only a total time per document, a single timestamp per page with no end, or durations computed in the browser and stored without any limit.',
      },
    ],
    eng: 'No-download mode is enforced on the server (no direct file route), not only by hiding a button. Link IDs are unguessable.',
  },
  seal: {
    core: [
      'Upload a PDF and place signature fields on pages (page and position stored)',
      'Signers in a fixed order: student, then faculty advisor, then HoD',
      'Signing (drawn or typed) and the final PDF with signatures merged in',
      'Sealing the completed PDF',
      'An audit trail of views and signatures',
    ],
    kt: [
      {
        look: 'Each signer has their own token; the server refuses a signature when an earlier signer has not finished (status per recipient plus a signing order).',
        red: 'Order enforced only by hiding the button in the UI, or every signer’s link active from the start.',
      },
      {
        look: 'A SHA-256 hash of the final PDF stored when it is sealed (or a real PDF digital signature, PKCS#7), plus a verify step that recomputes it and reports a mismatch.',
        red: 'A hash computed but never checked, or stored where it can be edited together with the file.',
      },
      {
        look: 'Append-only events (sent, viewed, signed, completed) with timestamp, actor and ideally IP and user agent, shown in the app or added to the PDF as a certificate page.',
        red: 'Only “signed” events (views missing), timestamps from the client, or log rows that an API can edit or delete.',
      },
    ],
    eng: 'Signer tokens are unguessable and single-purpose. Uploaded files are checked to be PDFs.',
  },
  clock: {
    core: [
      'Host availability (weekly hours) stored with an IANA time zone',
      'A slot engine that applies buffers and date overrides (days off)',
      'Booking a slot, and cancelling one',
      'Slots shown in the booker’s own time zone',
      'Works for 200 students booking office hours and lab slots',
    ],
    kt: [
      {
        look: 'Availability stored in the host’s IANA zone (Asia/Kolkata), slots computed in UTC and shown in the booker’s zone (America/Los_Angeles) with a real tz library (date-fns-tz, Luxon, dayjs tz, Temporal), DST-aware.',
        red: 'Fixed offsets such as +05:30 hard-coded, server local time, or times stored as local strings without a zone.',
      },
      {
        look: 'Before and after buffers applied both when slots are generated and when a booking is validated on the server.',
        red: 'Buffers applied only in the UI, so a direct API call can book into the buffer.',
      },
      {
        look: 'A unique constraint on (host, start time), a Postgres exclusion constraint on overlapping ranges, or an overlap check inside a transaction with a lock.',
        red: 'Check-then-insert with no constraint, which lets two simultaneous requests both succeed.',
      },
    ],
    eng: 'All times stored in UTC. Booking inputs validated (slot really free, inside working hours, not in the past).',
  },
  watchtower: {
    core: [
      'Monitors with a URL, an interval and a timeout',
      'A real scheduler that runs the checks and stores every result',
      'Incidents opened on confirmed downtime and closed on recovery',
      'Alerts (email, webhook, or in-app)',
      'A public status page with uptime',
    ],
    kt: [
      {
        look: 'An incident opens only after N failures in a row (or failures confirmed by retries or from several locations), with N configurable.',
        red: 'Alerting on the first failure, or a counter that does not reset when a check succeeds.',
      },
      {
        look: 'The incident closes after M successful checks, at most one open incident per monitor (enforced in the data), and a recovery alert is sent.',
        red: 'Incidents closed by hand only, or a new incident opened on every failed check.',
      },
      {
        look: 'Uptime computed from stored check results over a stated window (successful checks / total checks, or time-weighted downtime), with no-data periods handled.',
        red: 'A hard-coded or random uptime number, or uptime counted from incidents instead of checks.',
      },
    ],
    eng: 'Checks have timeouts and run outside the request path (a worker, cron or queue). One slow site cannot block the others.',
  },
  canvas: {
    core: [
      'A drawing canvas with shapes or strokes stored as elements',
      'Rooms that several users join by link',
      'Real-time sync of changes between users',
      'Live cursors',
      'End-to-end encrypted rooms',
    ],
    kt: [
      {
        look: 'WebSocket, WebRTC or SSE pushes each change (throttled) to everyone in the room.',
        red: 'Polling every few seconds, or saving to the database and waiting for others to refetch.',
      },
      {
        look: 'A deterministic merge rule: a version plus a random tie-breaker per element (as Excalidraw does), Lamport clocks, or a CRDT (Yjs, Automerge), so both clients end in the same state.',
        red: 'Applying updates in arrival order on each client with no version field, which lets two clients end up different.',
      },
      {
        look: 'The key is generated in the browser and kept in the URL fragment (#key=…), which browsers never send to the server. The server only relays and stores ciphertext (AES-GCM via WebCrypto).',
        red: 'The key in the query string, in the database or in server logs, or the server decrypting or storing plaintext elements.',
      },
    ],
    eng: 'Room messages are validated and size-limited. Broadcasts go only to members of that room.',
  },
  herald: {
    core: [
      'Events that trigger a workflow (in-app and email)',
      'Per-student channel preferences',
      'Digests that group bursts of events',
      'Retries for failed sends',
      'An in-app inbox',
    ],
    kt: [
      {
        look: 'Events grouped per user by a digest key in a time window (configurable, e.g. from .env), and flushed by a scheduled job or delayed queue job into one message.',
        red: 'A digest held in setTimeout in server memory, or grouping done only in the UI.',
      },
      {
        look: 'Preferences per user per channel, checked on the server when each message is sent. In-app is still delivered when email is muted.',
        red: 'Preferences only hide items in the UI, or muting email blocks every channel.',
      },
      {
        look: 'Retries with backoff through a queue, and an idempotency key per (notification, channel) with a delivery record, so a retry cannot send twice.',
        red: 'A retry loop that resends after a partial success, or no record of what was already delivered.',
      },
    ],
    eng: 'Built for 30,000 students: sends are queued and batched, not a for-loop of awaits inside a request handler.',
  },
  breach: {
    core: [
      'A vulnerability report of the original Juice Shop (login, basket, checkout) with evidence',
      'Secure login with hashed passwords and sessions or JWTs',
      'A basket that belongs to the logged-in user',
      'Checkout with prices taken from the database',
      'Search and product reviews',
    ],
    kt: [
      {
        look: 'Parameterised queries or an ORM in login, search and every other query; passwords hashed with bcrypt or argon2.',
        red: 'String concatenation or template strings building SQL anywhere, or MD5/SHA-1 password hashes (what the original uses).',
      },
      {
        look: 'Basket routes take the user from the verified session or JWT and check ownership on the server for every read and write. JWTs verified with a strong secret and a fixed algorithm.',
        red: 'Basket or user ID taken from the URL or body without an ownership check, or JWTs decoded but not verified.',
      },
      {
        look: 'Output escaped by default (no innerHTML, dangerouslySetInnerHTML, v-html or bypassSecurityTrust on user input), stored reviews sanitised, ideally a Content-Security-Policy header.',
        red: 'Any user text rendered as HTML, or sanitising only on input in the browser.',
      },
    ],
    eng: 'Checkout totals computed on the server; quantities validated (no negative or huge numbers, a classic Juice Shop hole). Rate limit on login. Only test locally: never attack a live system.',
  },
  keyring: {
    core: [
      'A master password that never leaves the device',
      'Vault items encrypted and decrypted in the browser',
      'Sharing an item with a teammate, and revoking it',
      'Two-factor login (TOTP)',
      'Built for a student club’s shared social media and cloud logins',
    ],
    kt: [
      {
        look: 'Items encrypted on the client (WebCrypto AES-GCM or libsodium) before upload; the server stores only ciphertext and IVs.',
        red: 'Encryption done on the server, a key stored on the server, or base64 treated as encryption.',
      },
      {
        look: 'The key is derived from the master password with PBKDF2 (high iteration count) or Argon2 and a per-user salt. The server receives only a separate derived auth hash, never the master password. A wrong password fails to decrypt (AES-GCM tag error).',
        red: 'The master password sent to or stored on the server, or the same hash used both to log in and as the encryption key.',
      },
      {
        look: 'Each item has its own key, wrapped for each teammate (their public key or an org key). Revoking deletes that wrapped key on the server at once, and ideally rotates the item key.',
        red: 'Revoke only hides the item in the UI, or the teammate’s client keeps a decrypted copy that keeps working.',
      },
    ],
    eng: 'TOTP verified on the server with a rate limit. No secret ever logged. Session tokens expire.',
  },
  sentinel: {
    core: [
      'Reading server logs (tailing a file or receiving lines through an API)',
      'Parsing failed-login lines into events (IP, time, user)',
      'Scenarios that detect brute force',
      'Ban decisions with an expiry',
      'A blocker (middleware, proxy rule or firewall) that enforces bans',
    ],
    kt: [
      {
        look: 'A sliding window or leaky bucket per IP (as CrowdSec does) that bans after 10 failures within 60 seconds, with the threshold and window configurable.',
        red: 'A counter that never expires, a fixed bucket that resets on the minute boundary, or counting successful logins too.',
      },
      {
        look: 'Counting and bans keyed by IP (and maybe username), with successful logins not counted, so other users are unaffected. Ideally an allowlist.',
        red: 'A global counter, or blocking the whole login route for everyone.',
      },
      {
        look: 'Each ban stores expiresAt, and the blocker checks it on every request (or a precise TTL removes it), so it lifts on time.',
        red: 'A cleanup job that runs only every hour, or bans kept only in process memory.',
      },
    ],
    eng: 'The log parser handles malformed lines. The client IP comes from a trusted proxy header only, so it cannot be spoofed.',
  },
};

const IST = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

export interface PromptTeam {
  teamId: string;
  teamName: string;
  repoUrl?: string | null;
  /** The last commit before the code freeze, if the freeze snapshot was taken. */
  sha?: string | null;
}

/** Shell commands to put the repo at the judged commit. */
export function setupCommands(t?: PromptTeam): string {
  const repo = t?.repoUrl || '<repo URL>';
  const dir = t ? t.teamId.toLowerCase() : 'team';
  const checkout = t?.sha ? `git checkout ${t.sha}` : `git checkout $(git rev-list -n 1 --before="${SUBMISSION_WINDOW.codeFreezeAt}" HEAD)`;
  return `git clone ${repo} ${dir}\ncd ${dir}\n${checkout}`;
}

export function buildPrompt(card: PsCard, t?: PromptTeam): string {
  const g = GUIDES[card.code];
  const tr = TRACKS[card.track];
  const team = t ? `${t.teamName} (${t.teamId})` : '<team name and ID>';
  const repo = t?.repoUrl || '<repo URL>';
  const commit = t?.sha ? `commit ${t.sha}` : `the last commit before the code freeze (${IST(SUBMISSION_WINDOW.codeFreezeAt)} IST)`;

  return `You are a senior software engineer judging a hackathon rebuild. This is a read-only review.
- Do not create, change or delete any file in this repo. Do not commit or push.
- You may run git commands that only read, and you may install and run the project's own tests if that takes under 3 minutes. Do not call external services.
- Every point you give or take away needs evidence as path:line. If you cannot find something, write "not found". Never guess.
- Judge only the code in this commit, not what the README or slides promise.

## Context
HACKBACK is a reverse hackathon. Each team studied a real open-source product, wrote docs/ (PRD, ARCHITECTURE, DATA_MODEL, API, GAPS), then rebuilt its core from an empty repo using only their own docs.
- Team: ${team}
- Repo: ${repo}, judged at ${commit}
- Card: ${card.title} ("${card.name}", ${tr.suit} ${tr.label} track, rank ${card.rank})
- Original they studied: ${card.source.name} (${card.source.url}), ${card.source.what.charAt(0).toLowerCase()}${card.source.what.slice(1)}. They must NOT have copied its code.
- Problem: ${card.problem}
- The user (Rebuild Brief): ${card.brief}
- Core to rebuild: ${card.core}

## Step 0: Confirm what you are judging
Run and report:
  git log -1 --format="%H %cI"
  git log --reverse --format="%h %cI %s" | head -5
  git log --reverse --format="%h %cI" -- docs | head -1
  git log --reverse --format="%h %cI" -- . ":(exclude)docs" ":(exclude)*.md" | head -1
  git log --all --format="%h %cI %s" --since="${SUBMISSION_WINDOW.codeFreezeAt}"

## Step 1: Map what they built
Read README.md, SUBMISSION.md and docs/ (PRD, API, DATA_MODEL, GAPS), then the source code. List each feature that works end to end (UI or API → logic → storage), with path:line. Mark anything mocked, hard-coded, stubbed or left as TODO.

## Step 2: Score out of 100

A. Core flow (30). How much of this works end to end:
${g.core.map((c) => `  - ${c}`).join('\n')}
  30 = all of it works · 20 = the main flow works, some parts missing · 10 = fragments that do not connect · 0 = nothing runs.

B. Killer Tests (30, 10 each). For each test: 10 = handled correctly on the server and proven (a test in the repo, or a command you ran) · 6 = correct logic in the code but no proof · 3 = attempted but with a hole (name it) · 0 = missing or wrong.
${card.killerTests
  .map(
    (k, i) => `  ${i + 1}. "${k}"
     Look for: ${g.kt[i].look}
     Red flags: ${g.kt[i].red}`
  )
  .join('\n')}

C. Two improvements (20, 10 each). Find the two improvements the team promised in docs/GAPS.md (or SUBMISSION.md). For each: 10 = fully built and wired in · 5 = partly built · 0 = not built. If they do not name exactly two, score the two strongest improvements over ${card.source.name} you can find, and say so.

D. Built from their own docs (10). Compare the code with the PRD acceptance criteria, the routes in API.md and the entities and constraints in DATA_MODEL.md. 10 = matches closely · 5 = drifts in places · 0 = the docs and the code are unrelated.

E. Engineering (10). Input validation, permission checks on every route, error handling, no committed secrets (.env.example only), README steps that would really run. For this card also: ${g.eng}

## Step 3: Flags (no points; the Game Masters decide)
- Clean-room: commits before ${IST(SUBMISSION_WINDOW.opensAt)} IST, source code committed before any docs/, pushes after ${IST(SUBMISSION_WINDOW.codeFreezeAt)} IST, or code that looks copied from ${card.source.name} (its licence headers, comments, distinctive identifiers or file layout).
- Committed secrets: API keys, passwords, a real .env.
- Fake: features that return hard-coded or mock data while the UI or docs claim they work.

## Output, exactly in this format
### ${t ? t.teamId : '<team ID>'} · ${card.title}
Commit: <sha> · <date> · Clean-room: OK / see flags

| Section | Score | Why (path:line) |
|---|---|---|
| A. Core flow | x/30 | |
| B. Killer Tests | x/30 | |
| C. Two improvements | x/20 | |
| D. Built from their docs | x/10 | |
| E. Engineering | x/10 | |
| Total | x/100 | |

Killer Tests:
1. READY / PARTIAL / MISSING · x/10 · evidence
2. …
3. …

Improvements:
1. <name> · x/10 · evidence
2. <name> · x/10 · evidence

Flags: none, or one line each with evidence.

3 questions for the judges to ask this team in their Defence, aimed at the weakest spots you found.

The very last line, exactly:
SCORE core=<0-30> kt=<0-30> imp=<0-20> docs=<0-10> eng=<0-10> total=<0-100>`;
}
