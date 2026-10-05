/**
 * Code Detective question bank. SERVER ONLY: it holds the answers.
 *
 * Everything comes from the two Day 1 sessions (Session 1: reverse engineering
 * Espionage with the prompt pack; Session 2: thinking like a PM with FoundIt)
 * and from each team's own card.
 *
 *   ♠ Trace It         – drag the steps of a flow into order (one is your own card)
 *   ♥ Catch the Agent  – tap the file or line that fooled the agent, or call it
 *   ♦ Sort It          – drag each item into the bucket where it belongs
 *   ♣ All In           – bet your points, then one big trace
 *
 * Two sets (A and B) so groups that play one after the other do not see the same questions.
 */

import type { QKind, Round } from './types';

export const ROUNDS: Round[] = [
  { title: 'Trace It', subtitle: 'Drag the steps into the right order', suit: '♠' },
  { title: 'Catch the Agent', subtitle: 'The agent fell for a trap. Find it', suit: '♥' },
  { title: 'Sort It', subtitle: 'Drag each one where it belongs', suit: '♦' },
  { title: 'All In', subtitle: 'Bet your points on one last trace', suit: '♣' },
];

/** One challenge: what a team actually answers. */
export interface SubQ {
  kind: QKind;
  /** Short name on the dealt card, e.g. "Tag the claims". */
  title?: string;
  prompt: string;
  /** line: code or a file tree, one entry per line. */
  code?: string[];
  /** mcq: the options. */
  options?: string[];
  /** order / sort: the items, in the order they are shown (shuffled). */
  items?: string[];
  /** sort: the buckets. */
  buckets?: string[];
  /**
   * line / mcq: the right line(s) or option.
   * order: shown-item indices in the right order.
   * sort: the right bucket for each shown item.
   */
  answer: number[];
  explain: string;
  /** Word stamped on the right line at the reveal. */
  stamp?: string;
}

/** A question as stored in the game (answers included, never sent before the reveal). */
export interface GameQ extends SubQ {
  round: number;
  secs: number;
  allIn?: boolean;
  /** Dealt by card: every team gets the challenge for its own card (`_` if it has none). */
  perCard?: Record<string, SubQ>;
  /** Dealt at random: every team draws one challenge from this deck. */
  deck?: SubQ[];
}

/* ── ♠ Trace It ───────────────────────────────────────────────────────── */

type Trace = { prompt: string; steps: string[]; explain: string };

const TRACES: Record<string, Trace> = {
  espionage: {
    prompt: 'Session 1, Stage 5. Trace Espionage Round 1, from the player opening the test to the shortlist.',
    steps: [
      'Player opens /dashboard/round1',
      'Browser calls GET /api/round1/questions',
      'Server checks Round 1 is live and attendance is marked',
      'Server picks and saves 25 question IDs',
      'Player submits; the score is saved',
      'Admin shortlists the top N by round1Score',
    ],
    explain: 'The trace from Session 1: questions route → submit → admin shortlist, which sorts by round1Score.',
  },
  foundit: {
    prompt: 'Session 2. Put the FoundIt core flow in order.',
    steps: [
      'Finder posts the item with a hidden detail',
      'Finder gets a private manage link',
      'Owner searches the open items',
      'Owner claims with an answer about the hidden detail',
      'Finder approves one claim',
      'Finder marks the item returned',
    ],
    explain: 'The 5-step core flow from the FoundIt PRD: post → browse → claim → approve → returned.',
  },
  spine: {
    prompt: 'The Session 2 spine. Order every step, from the idea to the agent build.',
    steps: [
      'Idea',
      'Problem',
      'User',
      'One-line problem statement',
      'Core flow',
      'MVP scope',
      'PRD',
      'ARCHITECTURE · DATA_MODEL · API',
      'Agent build',
    ],
    explain: 'idea → problem → user → statement → core flow → MVP scope → PRD → tech docs → agent build.',
  },
  playbook: {
    prompt: 'The prompt pack. Put these Playbook stages in the order you ran them.',
    steps: ['Recon', 'Architecture', 'Routes and screens', 'Data model', 'Trace a feature', 'Gaps', 'Verify every claim', 'Write the docs'],
    explain: 'Stages 0, 2, 3, 4, 5, 7, 8 and 9: read it, map it, trace it, find the gaps, verify, then write.',
  },
};

/** Your own card's core flow (5 steps each). */
const CARD_FLOWS: Record<string, string[]> = {
  'box-office': [
    'Buyer picks a ticket tier',
    'Seat is held only if sold < capacity',
    'Buyer pays before the hold expires',
    'A ticket with a QR code is issued',
    'QR is scanned once at the gate',
  ],
  ledger: [
    'Shop raises a GST invoice',
    'Post: debit Receivable, credit Sales + CGST + SGST',
    'Customer pays the invoice',
    'Post: debit Bank, credit Receivable',
    'Trial balance: debits equal credits',
  ],
  meter: [
    'A usage event arrives with its own ID',
    'A duplicate event ID is dropped',
    'Usage is added to the customer’s meter',
    'Tiered price is applied to the month',
    'Invoice is raised, prorated for a plan change',
  ],
  'vault-room': [
    'Owner uploads a document and makes a share link',
    'Viewer opens the link and enters their email',
    'Server checks the email and the expiry',
    'Page shows with the viewer’s email as a watermark',
    'Time on each page is recorded',
  ],
  seal: [
    'Sender places signature fields on the PDF',
    'Student signs',
    'Faculty advisor signs',
    'HoD signs',
    'PDF is sealed with a hash; the audit log closes',
  ],
  clock: [
    'Host sets weekly hours in their time zone',
    'Engine turns hours into slots, minus buffers and days off',
    'Booker sees the slots in their own time zone',
    'Booker picks a slot',
    'Database accepts only one booking per slot',
  ],
  watchtower: [
    'Scheduler runs a check every minute',
    'A check fails',
    'More failures in a row confirm the downtime',
    'Incident opens and alerts go out',
    'Site recovers; the incident closes by itself',
  ],
  canvas: [
    'User opens a room link with the key after the #',
    'Strokes are encrypted on the device',
    'Server relays the encrypted update to the room',
    'Other clients decrypt and draw it',
    'A clash on one element settles by version, then a tie-break',
  ],
  herald: [
    'An event arrives: the timetable changed',
    'Workflow works out who must be told',
    'Each student’s channel preferences are checked',
    'A burst is held and grouped into one digest',
    'Message sent; a failure is retried with the same key',
  ],
  breach: [
    'User logs in through a parameterised query',
    'Server issues a session',
    'User adds items to their own basket',
    'Server checks the basket belongs to the caller',
    'Checkout recalculates the prices on the server',
  ],
  keyring: [
    'User types the master password',
    'A key is derived on the device with a slow KDF',
    'The item is encrypted on the device',
    'Server stores only the encrypted blob',
    'A teammate decrypts a shared item with their own key',
  ],
  sentinel: [
    'Server writes a log line for every login',
    'Parser reads the log line',
    'Scenario counts failures per IP over 60 seconds',
    'The 10th failure creates a ban decision',
    'Blocker drops the IP until the ban expires',
  ],
};

/** For a team without a card. */
const FALLBACK_FLOW = [
  'Browser sends the request',
  'Route handler receives it',
  'Server checks who is calling',
  'Database is read or written',
  'Server sends the response',
];

/* ── ♥ Catch the Agent ────────────────────────────────────────────────── */

type Tap = { title: string; prompt: string; code: string[]; answer: number[]; explain: string; stamp: string };
type Pick = { title: string; prompt: string; options: string[]; answer: number; explain: string };

const TAPS: Record<string, Tap> = {
  razorpay: {
    title: 'The fake payment',
    prompt: 'The agent says Espionage takes payments with Razorpay. It doesn’t. Tap the file that fooled it.',
    code: [
      'espionage-event/',
      '├─ src/app/            (11 pages, 37 routes)',
      '├─ src/lib/',
      '├─ src/models/         (8 models)',
      '├─ stitch_screens/',
      '├─ test-rp.js',
      '├─ save_and_clean.js',
      '├─ package.json',
      '└─ README.md',
    ],
    answer: [5],
    stamp: 'Trap',
    explain: 'test-rp.js is an old Playwright test that clicks “Proceed to Payment”. Nothing in src/ loads Razorpay. A file existing is not a feature existing.',
  },
  mockup: {
    title: 'The ghost page',
    prompt: 'Asked to “list every screen”, the agent adds an Enrollment page. Espionage has none. Tap the file it came from.',
    code: [
      'src/app/page.tsx',
      'src/app/login/page.tsx',
      'src/app/register/page.tsx',
      'src/app/dashboard/page.tsx',
      'src/app/dashboard/round1/page.tsx',
      'stitch_screens/landing.html',
      'stitch_screens/dashboard.html',
      'stitch_screens/enrollment.html',
    ],
    answer: [7],
    stamp: 'Trap',
    explain: 'stitch_screens/ holds static design mockups. Real pages are only src/app/**/page.tsx. Trap 1 from Session 1.',
  },
  observations: {
    title: 'Bad evidence',
    prompt: 'Your OBSERVATIONS.md. One claim breaks the rule. Tap its evidence line.',
    code: [
      '- Login session is stored in localStorage',
      '  Evidence: src/lib/auth.ts:15 [Confirmed]',
      '- Round 1 serves 25 questions per player',
      '  Evidence: src/app/api/round1/questions/route.ts:8 [Confirmed]',
      '- Admin auth is done in two different ways',
      '  Evidence: the agent said so [Confirmed]',
      '- Team model is left over from a paid version',
      '  Evidence: src/models/Team.ts:18 [Likely]',
    ],
    answer: [5],
    stamp: 'Caught',
    explain: '“The agent said so” is not evidence, and it can never be Confirmed. A claim needs a file:line you opened yourself.',
  },
  ownerCheck: {
    title: 'The login hole',
    prompt: 'The agent wrote this login route for your rebuild. Tap the line an attacker loves.',
    code: [
      "app.post('/login', async (req, res) => {",
      '  const { email, password } = req.body;',
      '  const hash = sha256(password);',
      '  const user = await db.get(',
      "    `SELECT * FROM users WHERE email = '${email}'",
      "     AND hash = '${hash}'`",
      '  );',
      '  if (!user) return res.status(401).end();',
      '  res.json({ token: sign(user.id) });',
      '});',
    ],
    answer: [4],
    stamp: 'Guilty',
    explain: 'The email is pasted straight into the SQL, so  \' OR 1=1--  logs anyone in. Use a parameterised query.',
  },
  flapping: {
    title: 'The 3 AM page',
    prompt: 'The agent wrote the uptime check for your rebuild. One 2-second blip paged everyone. Tap the line.',
    code: [
      'const FAILS_TO_ALERT = 3;',
      '',
      'async function onCheck(site, ok) {',
      '  if (ok) {',
      '    site.fails = 0;',
      '    return;',
      '  }',
      '  site.fails += 1;',
      '  if (site.fails >= 1) await openIncident(site);',
      '}',
    ],
    answer: [8],
    stamp: 'Guilty',
    explain: 'It alerts on the first failure. It should wait for FAILS_TO_ALERT failures in a row.',
  },
};

const PICKS: Record<string, Pick> = {
  readme: {
    title: 'README vs code',
    prompt: 'README.md:17 says every player gets the whole question bank. round1/questions/route.ts:8 serves 25. Who is right?',
    options: ['The README', 'The code', 'The agent', 'Both are right'],
    answer: 1,
    explain: 'Docs lie too. The code is the truth: each player gets 25 questions.',
  },
  arrow: {
    title: 'The phantom arrow',
    prompt: 'The agent’s ER diagram draws “Team has many Participants”. There are no Mongoose refs, only string ID arrays. That arrow is…',
    options: ['Confirmed: the agent drew it', 'A claim with no evidence: tag it, don’t trust it', 'Confirmed: Team has a participants field', 'A bug in Mermaid'],
    answer: 1,
    explain: 'A diagram arrow is a claim like any other. With no ref and no field, it is not proven. Trap 2 from Session 1.',
  },
};

/* ── ♦ Sort It ────────────────────────────────────────────────────────── */

type Sort = { prompt: string; buckets: string[]; items: Array<[string, number]>; explain: string };

const SORTS: Record<string, Sort> = {
  tags: {
    prompt: 'Tag each claim the way Session 1 taught you.',
    buckets: ['Confirmed', 'Likely', 'Guess'],
    items: [
      ['Session is in localStorage. I opened auth.ts:15 and saw it', 0],
      ['Round 1 gives 25 questions. I read route.ts:8', 0],
      ['Team model is old: only 2 admin routes use it', 1],
      ['Both admin routes I opened check the password', 1],
      ['The app takes payments. The agent said so', 2],
      ['OTPs probably go by SMS', 2],
    ],
    explain: 'Confirmed: you opened the file and saw it. Likely: strong signs, not checked line by line. Guess: no evidence yet.',
  },
  docs: {
    prompt: 'Stage 9. Which doc does each line belong in?',
    buckets: ['PRD', 'ARCHITECTURE', 'DATA_MODEL', 'API', 'GAPS'],
    items: [
      ['For SRM students who lose a bottle…, unlike WhatsApp groups', 0],
      ['Won’t (v1): chat, photo upload, AI matching', 0],
      ['Storage: one JSON file, data/db.json', 1],
      ['ITEM ||--o{ CLAIM', 2],
      ['POST /api/items/:id/claims · 409 if the item is not open', 3],
      ['Old items never expire; nothing removes them', 4],
    ],
    explain: 'PRD: who and why, scope. ARCHITECTURE: stack and storage. DATA_MODEL: entities. API: every endpoint. GAPS: what the product gets wrong.',
  },
  moscow: {
    prompt: 'MoSCoW for FoundIt v1, as Session 2 sorted it.',
    buckets: ['Must', 'Should', 'Could', 'Won’t'],
    items: [
      ['Post a found item with a hidden detail', 0],
      ['Claim with an answer', 0],
      ['Mark returned', 1],
      ['Filter by category', 1],
      ['Item expiry', 2],
      ['In-app chat', 3],
      ['AI photo matching', 3],
    ],
    explain: 'Must is the core flow. Should makes it better. Could is nice. Won’t is the line that saves your night.',
  },
  grid: {
    prompt: 'Impact × effort for FoundIt. Where does each one go?',
    buckets: ['Quick win', 'Big bet', 'Fill-in', 'Money pit'],
    items: [
      ['Search and category filter', 0],
      ['Hidden-detail check on claims', 0],
      ['Photo upload', 1],
      ['Email when a claim is approved', 1],
      ['Dark mode', 2],
      ['AI photo matching', 3],
      ['In-app chat', 3],
    ],
    explain: 'Build the quick wins, plan one big bet, skip the money pits.',
  },
  fourTests: {
    prompt: 'The four tests: hurts the user, has evidence, one-minute demo, fits one night. Pick or skip each FoundIt gap.',
    buckets: ['Pick for tonight', 'Skip'],
    items: [
      ['Old items never expire', 0],
      ['One person can claim an item many times', 0],
      ['No photo of the item', 1],
      ['No email when a claim is approved', 1],
      ['No dark mode', 1],
    ],
    explain: 'Only gaps that pass all four tests are picked. Photos need storage, email is hard to demo live, dark mode hurts nobody.',
  },
  strong: {
    prompt: 'Session 2’s good-vs-bad pairs. Strong or weak?',
    buckets: ['Strong', 'Weak'],
    items: [
      ['Given an open item, when anyone calls GET /api/items, then no secretDetail is returned', 0],
      ['Claiming should be secure and user-friendly', 1],
      ['POST /api/items/:id/claims · 201 { claimId } · 404 · 409', 0],
      ['/claim: claims an item', 1],
      ['Expire unclaimed items after 30 days, set in .env', 0],
      ['Make the UI better and add AI', 1],
    ],
    explain: 'Strong lines are testable and specific: a stranger’s agent can build from them.',
  },
};

/* ── Building a game's questions ──────────────────────────────────────── */

const SETS: Record<'A' | 'B', { trace: string; taps: string[]; picks: string[]; sorts: string[]; final: string }> = {
  A: { trace: 'espionage', taps: ['razorpay', 'observations', 'ownerCheck'], picks: ['readme'], sorts: ['tags', 'docs', 'moscow'], final: 'spine' },
  B: { trace: 'foundit', taps: ['mockup', 'flapping'], picks: ['arrow', 'readme'], sorts: ['grid', 'fourTests', 'strong'], final: 'playbook' },
};

const SORT_TITLES: Record<string, string> = {
  tags: 'Tag the claims',
  docs: 'Which doc?',
  moscow: 'MoSCoW',
  grid: 'Impact × effort',
  fourTests: 'The four tests',
  strong: 'Strong or weak',
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** A shuffle that never leaves a list in its original order. */
function perm(n: number, rand: () => number): number[] {
  for (let tries = 0; tries < 20; tries++) {
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    if (n < 2 || idx.some((v, i) => v !== i)) return idx;
  }
  return Array.from({ length: n }, (_, i) => n - 1 - i);
}

/** Shows the steps shuffled; the answer is the shown indices in the right order. */
function orderQ(steps: string[], rand: () => number) {
  const p = perm(steps.length, rand); // shown position k holds original step p[k]
  const items = p.map((i) => steps[i]);
  const answer = steps.map((_, orig) => p.indexOf(orig));
  return { items, answer };
}

function sortQ(s: Sort, rand: () => number) {
  const p = perm(s.items.length, rand);
  return { items: p.map((i) => s.items[i][0]), answer: p.map((i) => s.items[i][1]) };
}

export function buildQuestions(set: 'A' | 'B', seed: number): GameQ[] {
  const rand = rng(seed);
  const s = SETS[set];
  const qs: GameQ[] = [];

  // ♠ Trace It: one shared trace, then your own card.
  const t = TRACES[s.trace];
  qs.push({ kind: 'order', round: 0, title: 'Trace it', prompt: t.prompt, ...orderQ(t.steps, rand), explain: t.explain, secs: 45 });
  const perCard: Record<string, SubQ> = {};
  for (const [code, flow] of Object.entries(CARD_FLOWS)) {
    perCard[code] = { kind: 'order', title: 'Your own card', prompt: 'Your card. Trace its core flow, start to finish.', ...orderQ(flow, rand), explain: 'Your card’s core flow, the one your rebuild must get right.' };
  }
  perCard._ = { kind: 'order', title: 'A web request', prompt: 'Trace a request through any web app.', ...orderQ(FALLBACK_FLOW, rand), explain: 'Request → route → who is calling → database → response.' };
  qs.push({ kind: 'order', round: 0, prompt: 'Every team drew its own card', answer: [], explain: '', secs: 40, perCard });

  // ♥ Catch the Agent: two shared traps, then everyone draws one from the deck.
  const tap = (k: string): SubQ => ({ kind: 'line', title: TAPS[k].title, prompt: TAPS[k].prompt, code: TAPS[k].code, answer: TAPS[k].answer, explain: TAPS[k].explain, stamp: TAPS[k].stamp });
  const pick = (k: string): SubQ => {
    const q = PICKS[k];
    const p = perm(q.options.length, rand);
    return { kind: 'mcq', title: q.title, prompt: q.prompt, options: p.map((i) => q.options[i]), answer: [p.indexOf(q.answer)], explain: q.explain };
  };
  qs.push({ ...tap(s.taps[0]), round: 1, secs: 30 });
  qs.push({ ...pick(s.picks[0]), round: 1, secs: 20 });
  const catchDeck = [...Object.keys(TAPS).filter((k) => k !== s.taps[0]).map(tap), ...Object.keys(PICKS).filter((k) => k !== s.picks[0]).map(pick)];
  qs.push({ kind: 'line', round: 1, prompt: 'Every team drew a different trap', answer: [], explain: '', secs: 30, deck: catchDeck });

  // ♦ Sort It: one shared sort, then everyone draws one from the deck.
  const sort = (k: string): SubQ => ({ kind: 'sort', title: SORT_TITLES[k], prompt: SORTS[k].prompt, buckets: SORTS[k].buckets, ...sortQ(SORTS[k], rand), explain: SORTS[k].explain });
  qs.push({ ...sort(s.sorts[0]), round: 2, secs: 45 });
  qs.push({ kind: 'sort', round: 2, prompt: 'Every team drew a different card', answer: [], explain: '', secs: 45, deck: Object.keys(SORTS).filter((k) => k !== s.sorts[0]).map(sort) });

  // ♣ All In
  const f = TRACES[s.final];
  qs.push({ kind: 'order', round: 3, title: 'The big trace', prompt: f.prompt, ...orderQ(f.steps, rand), explain: f.explain, secs: 60, allIn: true });
  return qs;
}

/** The challenge a team actually gets for a question. */
export function subFor(q: GameQ, teamId: string, card?: string): SubQ {
  if (q.perCard) return q.perCard[card && q.perCard[card] ? card : '_'];
  if (q.deck?.length) {
    let h = 2166136261;
    for (const ch of `${teamId}|${q.prompt}|${q.round}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return q.deck[(h >>> 0) % q.deck.length];
  }
  return q;
}

/** How close an answer is, from 0 to 1. */
export function accuracy(q: { kind: QKind; answer: number[] }, choice: number | number[]): number {
  if (q.kind === 'line' || q.kind === 'mcq') return typeof choice === 'number' && q.answer.includes(choice) ? 1 : 0;
  if (!Array.isArray(choice) || choice.length !== q.answer.length) return 0;
  if (q.kind === 'sort') return choice.filter((b, i) => b === q.answer[i]).length / q.answer.length;
  // order: the longest run of steps already in the right sequence (LCS), over all steps
  const a = choice;
  const b = q.answer;
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length] / b.length;
}
