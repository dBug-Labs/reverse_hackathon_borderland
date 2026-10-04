/**
 * The 9 problem-statement cards for the Card Drop.
 *
 * Shared by the server (draw, validation) and the client (stage, team portal),
 * so this file must stay free of server-only imports.
 */

export type TrackId = 'vault' | 'institution' | 'grid' | 'cyber';
export type CardRank = '7' | '8' | 'J' | 'Q' | 'K';

export interface TrackMeta {
  id: TrackId;
  /** Plain name that says what the track is about. */
  label: string;
  /** Borderland name, shown as a subtitle. */
  name: string;
  suit: '♦' | '♥' | '♠' | '♣';
  red: boolean;
  tagline: string;
  /** One sentence for players: what kind of products are in this track. */
  explain: string;
}

export interface PsCard {
  code: string;
  /** Plain title: what you build. */
  title: string;
  /** Borderland codename. */
  name: string;
  track: TrackId;
  rank: CardRank;
  source: { name: string; url: string; what: string };
  /** The problem statement: the situation and what to build, in 2–3 sentences. */
  problem: string;
  core: string;
  killerTests: [string, string, string];
  brief: string;
}

export const TRACKS: Record<TrackId, TrackMeta> = {
  vault: {
    id: 'vault',
    label: 'FinTech',
    name: 'The Vault',
    suit: '♦',
    red: true,
    tagline: 'Money that must add up',
    explain: 'Products that handle money: tickets, accounts, billing. One wrong number and someone loses cash.',
  },
  institution: {
    id: 'institution',
    label: 'Workflow & Trust',
    name: 'The Institution',
    suit: '♥',
    red: true,
    tagline: 'Approvals, documents, schedules',
    explain: 'Tools an organisation runs on: sharing documents, signing them, booking time. They must be secure and fair.',
  },
  grid: {
    id: 'grid',
    label: 'Real-time & Infra',
    name: 'The Grid',
    suit: '♠',
    red: false,
    tagline: 'Systems that must not break',
    explain: 'Systems that run underneath other products: monitoring, live sync, notifications. They must work under load.',
  },
  cyber: {
    id: 'cyber',
    label: 'Cyber Security',
    name: 'The Firewall',
    suit: '♣',
    red: false,
    tagline: 'Attack it, then defend it',
    explain: 'Find how a product can be attacked, then rebuild it so the attacks fail. The track our cyber security partners care about most.',
  },
};

export const TRACK_ORDER: TrackId[] = ['vault', 'institution', 'grid', 'cyber'];

export const CARDS: PsCard[] = [
  {
    code: 'box-office',
    title: 'Rush-proof Event Ticketing',
    name: 'The Box Office',
    track: 'vault',
    rank: '8',
    source: { name: 'Hi.Events', url: 'https://github.com/HiEventsDev/Hi.Events', what: 'Event ticketing platform' },
    problem: 'Fest passes go live at 6 PM and 5,000 students hit Buy at the same second. Build a ticketing system that never oversells, frees seats from unpaid checkouts, and lets each pass into the venue exactly once.',
    core: 'Ticket tiers, capacity, checkout holds, promo codes, refunds and QR check-in.',
    killerTests: [
      'Two buyers grab the last ticket at the same moment: exactly one gets it.',
      'An unpaid checkout hold expires and frees the seat.',
      'The same QR code cannot be checked in twice.',
    ],
    brief: 'A college fest releasing 5,000 passes at 6 PM, in a Tatkal-style rush.',
  },
  {
    code: 'ledger',
    title: 'GST-ready Accounting Ledger',
    name: 'The Ledger',
    track: 'vault',
    rank: 'Q',
    source: { name: 'Bigcapital', url: 'https://github.com/bigcapitalhq/bigcapital', what: 'Double-entry accounting' },
    problem: 'A wholesale shop raises GST invoices and records payments every day, and its books must always balance. Build a double-entry ledger where every invoice and payment posts the right entries, voids reverse cleanly, and reports add up.',
    core: 'Double-entry bookkeeping: invoice, payment, journal entries and financial reports.',
    killerTests: [
      'Every transaction balances: total debits equal total credits.',
      'Voiding an invoice reverses its journal entries.',
      'The trial balance still balances after 20 random operations.',
    ],
    brief: 'A wholesale shop that needs GST invoices with the CGST and SGST split.',
  },
  {
    code: 'meter',
    title: 'Usage-based Billing Engine',
    name: 'The Meter',
    track: 'vault',
    rank: 'K',
    source: { name: 'Flexprice', url: 'https://github.com/flexprice/flexprice', what: 'Usage-based billing' },
    problem: 'An AI API startup charges customers per 1,000 tokens, cheaper at higher volume. Build a billing engine that takes in usage events, never counts one twice, prices them in tiers, and handles plan changes mid-month.',
    core: 'Usage events into meters, tiered pricing, and invoices with proration.',
    killerTests: [
      'A duplicate usage event is counted only once.',
      'A plan upgrade in the middle of the month is prorated correctly.',
      'Tiered pricing matches the same calculation done by hand.',
    ],
    brief: 'An Indian AI API startup billing in rupees per 1,000 tokens.',
  },
  {
    code: 'vault-room',
    title: 'Secure Document Sharing',
    name: 'The Vault Room',
    track: 'institution',
    rank: '7',
    source: { name: 'Papermark', url: 'https://github.com/papermark/papermark', what: 'Secure document sharing' },
    problem: 'The placement cell shares confidential job descriptions that must not leak. Build share links with an email check, expiry, no-download mode and a viewer watermark, plus analytics on who read which page and for how long.',
    core: 'Secure links with email check, expiry, download block, watermark and per-page view analytics.',
    killerTests: [
      'An expired link is blocked.',
      "The watermark shows the viewer's email.",
      'Time spent on each page is recorded accurately.',
    ],
    brief: 'A placement cell sharing confidential job descriptions with students.',
  },
  {
    code: 'seal',
    title: 'Digital Signature Workflow',
    name: 'The Seal',
    track: 'institution',
    rank: 'J',
    source: { name: 'Documenso', url: 'https://github.com/documenso/documenso', what: 'E-signature platform' },
    problem: 'An OD letter must be signed by the student, the faculty advisor and the HoD, in that order. Build a signing workflow that places signature fields on a PDF, enforces the order, seals the final file and keeps a tamper-proof audit trail.',
    core: 'Place fields on a PDF, collect signatures in order, seal the PDF and keep an audit trail.',
    killerTests: [
      'Signer 2 cannot sign before signer 1.',
      'A PDF edited after signing is detected.',
      'The audit log shows every view and signature with its time.',
    ],
    brief: 'OD and permission letters signed by the student, then the faculty advisor, then the HoD.',
  },
  {
    code: 'clock',
    title: 'Smart Slot Booking',
    name: 'The Clock',
    track: 'institution',
    rank: 'K',
    source: { name: 'Cal.com', url: 'https://github.com/calcom/cal.com', what: 'Scheduling infrastructure' },
    problem: '200 students need to book faculty office hours and lab slots without clashes. Build a scheduling engine that works out free slots across time zones, with buffers and day-off overrides, and never lets two people book the same slot.',
    core: 'The availability engine: time zones, buffers, date overrides and booking.',
    killerTests: [
      'A host in IST and a booker in PST both see the correct slots.',
      'Buffer time between bookings is respected.',
      'Two bookings for the same slot: exactly one succeeds.',
    ],
    brief: 'Faculty office hours and lab slots for 200 students.',
  },
  {
    code: 'watchtower',
    title: 'Uptime Monitor & Status Page',
    name: 'The Watchtower',
    track: 'grid',
    rank: '8',
    source: { name: 'OpenStatus', url: 'https://github.com/openstatusHQ/openstatus', what: 'Uptime monitoring and status pages' },
    problem: 'On registration day the university portal goes down and nobody knows until students complain. Build a monitor that checks sites on a schedule, confirms real downtime before alerting, opens and closes incidents, and shows a public status page.',
    core: 'A check scheduler that confirms downtime, opens incidents, and drives a status page and alerts.',
    killerTests: [
      'A flapping site does not spam alerts: it needs several failures in a row.',
      'An incident resolves itself when the site recovers.',
      'The uptime percentage is correct.',
    ],
    brief: 'Monitoring the university portal and the fest website on registration day.',
  },
  {
    code: 'canvas',
    title: 'Live Collaborative Whiteboard',
    name: 'The Canvas',
    track: 'grid',
    rank: 'J',
    source: { name: 'Excalidraw', url: 'https://github.com/excalidraw/excalidraw', what: 'Collaborative whiteboard' },
    problem: 'A 60-student lecture needs one whiteboard everyone can draw on live. Build a real-time canvas with instant sync, consistent handling of conflicting edits, live cursors, and rooms the server itself cannot read.',
    core: 'Real-time multiplayer sync, conflict resolution, live cursors and end-to-end encrypted rooms.',
    killerTests: [
      'Two users drawing at once see each other in under a second.',
      'A conflicting edit to the same element settles the same way for both users.',
      "The server cannot read the room's content.",
    ],
    brief: 'A live classroom whiteboard for a 60-student lecture.',
  },
  {
    code: 'herald',
    title: 'Campus Notification Engine',
    name: 'The Herald',
    track: 'grid',
    rank: 'K',
    source: { name: 'Novu', url: 'https://github.com/novuhq/novu', what: 'Notification infrastructure' },
    problem: 'An exam timetable change must reach 30,000 students fast, without spamming them. Build a notification engine that turns events into in-app and email messages, respects each student’s preferences, groups bursts into digests and retries failures without duplicates.',
    core: 'Event to workflow (in-app and email), user preferences, digests and retries.',
    killerTests: [
      'Ten events within five minutes arrive as a single digest.',
      'A user who muted email receives in-app notifications only.',
      'A failed send is retried without creating duplicates.',
    ],
    brief: 'University notices, such as exam timetable changes, sent to 30,000 students.',
  },
  {
    code: 'breach',
    title: 'Hack-proof Web Store',
    name: 'The Breach',
    track: 'cyber',
    rank: '8',
    source: { name: 'OWASP Juice Shop', url: 'https://github.com/juice-shop/juice-shop', what: 'Web shop built insecure on purpose' },
    problem: 'OWASP Juice Shop is an online store built full of security holes on purpose. Tear it down, document every vulnerability in its login, basket and checkout, then rebuild that core so the same attacks fail, for a fest merch store taking real payments.',
    core: 'A secure login, basket and checkout, plus a vulnerability report of the original.',
    killerTests: [
      "A SQL-injection login (' OR 1=1--) logs nobody in.",
      "User A cannot read or change User B's basket by editing an ID in the request.",
      'A script typed into search or a review is shown as text and never runs.',
    ],
    brief: 'The fest merch store, taking real payments from students.',
  },
  {
    code: 'keyring',
    title: 'Zero-knowledge Password Vault',
    name: 'The Keyring',
    track: 'cyber',
    rank: 'Q',
    source: { name: 'Vaultwarden', url: 'https://github.com/dani-garcia/vaultwarden', what: 'Bitwarden-compatible password server' },
    problem: 'A club keeps every shared login (Instagram, domain, cloud) in one spreadsheet. Build a password vault where secrets are encrypted on the user’s device, so even the server cannot read them, with sharing to teammates and two-factor login.',
    core: 'Client-side encryption, a master password that never leaves the device, item sharing and 2FA.',
    killerTests: [
      'A dump of the server database shows no readable password.',
      'A wrong master password cannot decrypt the vault.',
      'Revoking a shared item removes the teammate’s access at once.',
    ],
    brief: 'A student club sharing its social media and cloud logins safely.',
  },
  {
    code: 'sentinel',
    title: 'Intrusion Detection & Auto-ban',
    name: 'The Sentinel',
    track: 'cyber',
    rank: 'K',
    source: { name: 'CrowdSec', url: 'https://github.com/crowdsecurity/crowdsec', what: 'Open-source intrusion detection and prevention' },
    problem: 'The college portal is hit by bots guessing passwords during result week. Build a system that reads server logs, detects attack patterns like brute-force logins, bans the attacking IPs automatically and lifts the ban when it expires.',
    core: 'Log parsing, attack scenarios, ban decisions, and a blocker that enforces them.',
    killerTests: [
      '10 failed logins from one IP within a minute get that IP banned.',
      'A normal user logging in at the same time is not affected.',
      'The ban is lifted exactly when it expires.',
    ],
    brief: 'The university portal under bot attack during result week.',
  },
];

export const CARD_BY_CODE: Record<string, PsCard> = Object.fromEntries(CARDS.map((c) => [c.code, c]));

/** Numeric value of a rank, used to find the "nearest" card. */
export const RANK_VALUE: Record<CardRank, number> = { '7': 7, '8': 8, J: 11, Q: 12, K: 13 };

/** Score multiplier by rank: 7–8 ×1.0, J–Q ×1.1, K ×1.2. */
export function rankMultiplier(rank: CardRank): number {
  if (rank === 'K') return 1.2;
  if (rank === 'J' || rank === 'Q') return 1.1;
  return 1;
}

export function rankLabel(rank: CardRank): string {
  if (rank === '7' || rank === '8') return 'Standard';
  if (rank === 'K') return 'Brutal';
  return 'Hard';
}

/** Seats per card: at least 3, more if there are more teams than 9 × 3. */
export function capFor(teamCount: number): number {
  return Math.max(3, Math.ceil(teamCount / CARDS.length));
}
