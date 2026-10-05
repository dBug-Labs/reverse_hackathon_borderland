/**
 * Code Detective question bank. SERVER ONLY: it holds the answers.
 *
 * Four rounds:
 *   ♠ Spot the Bug  – a snippet modelled on a card's hard core; tap the guilty line.
 *   ♥ Your Card     – every team gets a question about its own card.
 *   ♦ Whose Code?   – name the open-source product from a clue.
 *   ♣ All In        – teams bet part of their points, then one hard bug.
 *
 * Two sets (A and B) so groups that play one after the other do not see the same questions.
 */

import type { QKind, Round } from './types';

export const ROUNDS: Round[] = [
  { title: 'Spot the Bug', subtitle: 'Tap the guilty line', suit: '♠' },
  { title: 'Your Card', subtitle: 'A question about your own problem statement', suit: '♥' },
  { title: 'Whose Code?', subtitle: 'Name the open-source product', suit: '♦' },
  { title: 'All In', subtitle: 'Bet your points on one last bug', suit: '♣' },
];

export interface CardQ {
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
}

/** A question as stored in the game (answers included, never sent before the reveal). */
export interface GameQ {
  kind: QKind;
  round: number;
  prompt: string;
  code?: string[];
  lang?: string;
  options?: string[];
  answer: number[];
  explain: string;
  secs: number;
  allIn?: boolean;
  /** About this card (Spot the Bug), for the screen. */
  card?: string;
  /** Card round: the question for each card (plus `_` for teams without one). */
  perCard?: Record<string, CardQ>;
}

type Bug = { card: string; prompt: string; code: string[]; answer: number[]; explain: string };

/* ── ♠ Spot the Bug ───────────────────────────────────────────────────── */

const BUGS: Record<string, Bug> = {
  ledger: {
    card: 'ledger',
    prompt: 'A ₹1,000 sale inside Tamil Nadu. The trial balance is now off by exactly ₹180. Tap the line that breaks double entry.',
    code: [
      'function postInvoice(inv) {',
      '  const gst = inv.amount * 0.18;',
      '  const total = inv.amount + gst;',
      '  return [',
      "    { acct: 'Receivable',   debit: total },",
      "    { acct: 'Sales',        credit: inv.amount },",
      "    { acct: 'CGST Payable', credit: gst / 2 },",
      "    { acct: 'SGST Payable', credit: gst / 2 },",
      "    { acct: 'IGST Payable', credit: gst },",
      '  ];',
      '}',
    ],
    answer: [8],
    explain: 'A sale inside one state splits GST into CGST + SGST. The extra IGST line credits ₹180 more than was debited, so debits no longer equal credits.',
  },
  watchtower: {
    card: 'watchtower',
    prompt: 'One 2-second blip at 3 AM paged the whole team. Tap the line that ignores the flapping rule.',
    code: [
      'const FAILS_TO_ALERT = 3;',
      '',
      'async function onCheck(site, ok) {',
      '  if (ok) {',
      '    site.fails = 0;',
      '    if (site.incident) await resolve(site);',
      '    return;',
      '  }',
      '  site.fails += 1;',
      '  if (site.fails >= 1) await openIncident(site);',
      '}',
    ],
    answer: [9],
    explain: 'It opens an incident on the very first failure. It should wait for FAILS_TO_ALERT (3) failures in a row.',
  },
  breach: {
    card: 'breach',
    prompt: "Typing  ' OR 1=1--  as the email logged an attacker in as admin. Tap the guilty line.",
    code: [
      "app.post('/login', async (req, res) => {",
      '  const { email, password } = req.body;',
      '  const hash = sha256(password);',
      '  const user = await db.get(',
      '    `SELECT * FROM users',
      "     WHERE email = '${email}' AND hash = '${hash}'`",
      '  );',
      '  if (!user) return res.status(401).end();',
      '  res.json({ token: sign(user.id) });',
      '});',
    ],
    answer: [5],
    explain: 'User input is pasted straight into the SQL. A parameterised query (WHERE email = ? AND hash = ?) keeps it as data.',
  },
  seal: {
    card: 'seal',
    prompt: 'The HoD signed the OD letter before the faculty advisor did. Tap the line.',
    code: [
      'function canSign(doc, email) {',
      '  const me = doc.signers.find(s => s.email === email);',
      '  if (!me || me.signedAt) return false;',
      '  const before = doc.signers.filter(',
      '    s => s.order < me.order',
      '  );',
      '  return before.some(s => s.signedAt);',
      '}',
    ],
    answer: [6],
    explain: '`some` lets the HoD sign as soon as anyone before them has signed. It must be `every`: all earlier signers first.',
  },
  herald: {
    card: 'herald',
    prompt: 'The mail server timed out, and 30,000 students got the same exam notice three times. Tap the line.',
    code: [
      'async function deliver(job) {',
      '  for (let attempt = 1; attempt <= 3; attempt++) {',
      '    try {',
      '      await mail.send(job.to, job.body, {',
      '        idempotencyKey: crypto.randomUUID(),',
      '      });',
      '      return;',
      '    } catch {',
      '      await sleep(2 ** attempt * 1000);',
      '    }',
      '  }',
      '}',
    ],
    answer: [4],
    explain: 'A new key on every try means the provider cannot tell a retry from a new mail. Use one key per job, like job.id.',
  },
  boxoffice: {
    card: 'box-office',
    prompt: 'The update is atomic, yet 5,001 passes were sold for 5,000 seats. Tap the line.',
    code: [
      'const CAPACITY = 5000;',
      '',
      'async function hold(tierId, userId) {',
      '  const res = await db.tiers.updateOne(',
      '    { id: tierId, sold: { $lte: CAPACITY } },',
      '    { $inc: { sold: 1 } }',
      '  );',
      '  if (res.modifiedCount === 0) throw new SoldOut();',
      '  return db.holds.insertOne({',
      '    tierId, userId, expiresAt: Date.now() + 600_000,',
      '  });',
      '}',
    ],
    answer: [4],
    explain: '`$lte` still matches when sold is already 5,000, so seat 5,001 goes through. It must be `$lt`: sold < CAPACITY.',
  },
  meter: {
    card: 'meter',
    prompt: 'The client retried one request and the customer was billed twice for it. Tap the line.',
    code: [
      'async function ingest(event) {',
      '  await db.usage.insertOne({',
      '    _id: crypto.randomUUID(),',
      '    customer: event.customer,',
      '    tokens: event.tokens,',
      '    at: event.timestamp,',
      '  });',
      '}',
    ],
    answer: [2],
    explain: "A fresh random ID makes every retry look new. Key the row on the event's own ID, so the duplicate insert fails.",
  },
  clock: {
    card: 'clock',
    prompt: "Students in Chennai see the professor's first slot at 2:30 PM instead of 9:00 AM. Tap the line.",
    code: [
      "// host.tz = 'Asia/Kolkata', office hours 09:00–17:00",
      'function firstSlot(host, date) {',
      '  const d = new Date(`${date}T00:00:00Z`);',
      '  d.setUTCHours(host.startHour);',
      '  return d;',
      '}',
    ],
    answer: [3],
    explain: "09:00 UTC is 14:30 IST. Build the time in the host's time zone (Asia/Kolkata), then convert it to UTC.",
  },
  vaultroom: {
    card: 'vault-room',
    prompt: 'A confidential JD leaked on Telegram. The watermark named the placement officer, not the student who leaked it. Tap the line.',
    code: [
      'function renderPage(page, link, viewer) {',
      '  return withWatermark(page, {',
      '    text: link.ownerEmail,',
      '    opacity: 0.15,',
      '    angle: -30,',
      '  });',
      '}',
    ],
    answer: [2],
    explain: "The watermark must carry the viewer's email (viewer.email), so a leaked screenshot points to whoever viewed it.",
  },
  keyring: {
    card: 'keyring',
    prompt: 'A dump of the server database helped crack every vault. Tap the line that leaks.',
    code: [
      'async function saveItem(user, item, master) {',
      '  const key = await deriveKey(master, user.salt);',
      '  const blob = await encrypt(key, JSON.stringify(item));',
      "  await api.post('/items', {",
      '    blob,',
      '    name: item.name,',
      '    hint: master.slice(0, 3),',
      '  });',
      '}',
    ],
    answer: [6],
    explain: 'The first 3 letters of the master password went to the server. In a zero-knowledge vault the master password never leaves the device.',
  },
  canvas: {
    card: 'canvas',
    prompt: 'Two students edited the same box at the same version. Their screens now disagree forever. Tap the line.',
    code: [
      'function merge(local, remote) {',
      '  if (remote.version > local.version) return remote;',
      '  if (remote.version < local.version) return local;',
      '  return Math.random() < 0.5 ? local : remote;',
      '}',
    ],
    answer: [3],
    explain: "On a tie each client flips its own coin, so they can pick different winners. Use a rule both sides compute the same way, like Excalidraw's versionNonce.",
  },
  sentinel: {
    card: 'sentinel',
    prompt: 'A 4-hour ban on a brute-forcing bot lifted after 14 seconds. Tap the line.',
    code: [
      'function ban(ip, hours) {',
      '  bans.set(ip, { at: Date.now(), hours });',
      '}',
      '',
      'function isBanned(ip) {',
      '  const b = bans.get(ip);',
      '  if (!b) return false;',
      '  return Date.now() < b.at + b.hours * 3600;',
      '}',
    ],
    answer: [7],
    explain: 'Date.now() counts milliseconds, but hours × 3600 is seconds: 4 hours became 14.4 seconds. Use hours * 3600 * 1000.',
  },
};

/* ── ♥ Your Card: two questions per card ──────────────────────────────── */

const CARD_QS: Record<string, [CardQ, CardQ]> = {
  'box-office': [
    {
      prompt: 'Two buyers press Buy on the last pass in the same millisecond. What guarantees exactly one gets it?',
      options: [
        'One atomic, conditional database update: take a seat only if one is left',
        'Check the stock in the browser before calling the API',
        'Retry the request when it fails',
        'Cache the stock count on the client',
      ],
      answer: 0,
      explain: 'Only the database can decide between two simultaneous buyers. A conditional update (sold < capacity) lets exactly one through.',
    },
    {
      prompt: 'A buyer starts checkout and never pays. What should free the seat?',
      options: [
        'An admin deletes it by hand',
        'The hold expires after a fixed time and the seat goes back on sale',
        'It stays reserved until the event',
        'The next buyer overwrites it',
      ],
      answer: 1,
      explain: 'A checkout hold has an expiry (say 10 minutes). When it passes, the seat returns to stock automatically.',
    },
  ],
  ledger: [
    {
      prompt: 'An intra-state sale of ₹1,000 + 18% GST. How much is credited to CGST Payable?',
      options: ['₹180', '₹90', '₹18', '₹0, it is IGST'],
      answer: 1,
      explain: 'Inside one state, the 18% splits into 9% CGST and 9% SGST: ₹90 each.',
    },
    {
      prompt: 'How do you void an invoice that is already posted?',
      options: [
        'Delete its journal entries',
        'Edit the amounts to zero',
        'Post a reversing entry that swaps its debits and credits',
        'Hide the invoice from reports',
      ],
      answer: 2,
      explain: 'Posted entries are never deleted. A reversing entry cancels them and keeps the audit trail.',
    },
  ],
  meter: [
    {
      prompt: 'Graduated pricing: the first 10K tokens cost ₹1 per 1K, every token after that ₹0.50 per 1K. A customer uses 30K tokens. The bill?',
      options: ['₹15', '₹20', '₹25', '₹30'],
      answer: 1,
      explain: '10K × ₹1/1K = ₹10, plus 20K × ₹0.50/1K = ₹10. Total ₹20.',
    },
    {
      prompt: 'The same usage event arrives twice because the client retried. What stops double billing?',
      options: [
        'Rounding totals down',
        'Billing only at month end',
        'Rate-limiting the client',
        'Deduplicating on a unique event ID (an idempotency key)',
      ],
      answer: 3,
      explain: 'Each event carries its own ID. A unique index on it makes the second copy a no-op.',
    },
  ],
  'vault-room': [
    {
      prompt: "Where must a share link's expiry be enforced?",
      options: [
        'In the email that sends the link',
        'With a countdown in the browser',
        'On the server, on every request for the document',
        'In the PDF metadata',
      ],
      answer: 2,
      explain: 'Anything in the browser can be skipped. The server must refuse the document once the link has expired.',
    },
    {
      prompt: "Why put the viewer's email in the watermark?",
      options: [
        'So a leaked screenshot can be traced to the person who leaked it',
        'It looks professional',
        'It blocks downloads',
        'It makes the PDF smaller',
      ],
      answer: 0,
      explain: 'The watermark does not stop a screenshot, but it names who took it. That is what deters leaks.',
    },
  ],
  seal: [
    {
      prompt: 'How do you detect a PDF that was edited after it was signed?',
      options: [
        'Compare the file names',
        'Check that the file size did not change',
        'Store a cryptographic hash or signature of the sealed file and check it again',
        'Ask the signer',
      ],
      answer: 2,
      explain: 'Any change to the bytes changes the hash, so the seal no longer verifies.',
    },
    {
      prompt: 'Signing order: student, then faculty advisor, then HoD. When may the HoD sign?',
      options: [
        'Any time',
        'Once the student has signed',
        'Before the advisor, if it is urgent',
        'Only after both the student and the advisor have signed',
      ],
      answer: 3,
      explain: 'Every earlier signer must have signed first. That is the whole point of the workflow.',
    },
  ],
  clock: [
    {
      prompt: 'A host in IST is free at 9:00 AM. What time is that for a booker at UTC−8?',
      options: ['9:00 AM the same day', '7:30 PM the previous day', '3:30 AM the same day', '10:30 PM the previous day'],
      answer: 1,
      explain: '9:00 IST is 03:30 UTC. At UTC−8 that is 19:30 the day before.',
    },
    {
      prompt: 'Two students book the same 3 PM slot at the same moment. What makes exactly one succeed?',
      options: [
        'Disabling the button after one click',
        'Refreshing the page first',
        'A unique constraint (or lock) on host + start time in the database',
        'Showing the slots in random order',
      ],
      answer: 2,
      explain: 'Only the database sees both requests. A unique constraint rejects the second booking.',
    },
  ],
  watchtower: [
    {
      prompt: 'A site was down for 432 minutes in a 30-day month (43,200 minutes). Its uptime?',
      options: ['99.9%', '99%', '98%', '95.7%'],
      answer: 1,
      explain: '432 / 43,200 = 1% down, so 99% up.',
    },
    {
      prompt: 'Why wait for several failed checks in a row before alerting?',
      options: [
        'To ignore one-off blips (flapping) and alert only on real downtime',
        'HTTP always needs three tries',
        'To save server costs',
        'To slow down attackers',
      ],
      answer: 0,
      explain: 'Networks blip. Confirming with consecutive failures keeps alerts meaningful.',
    },
  ],
  canvas: [
    {
      prompt: 'Two users change the same shape at the same version. How must the tie be broken?',
      options: [
        'Randomly, on each device',
        'Whoever has the faster network wins',
        'Ask the users',
        'By a rule both devices compute the same way, like the lower random nonce',
      ],
      answer: 3,
      explain: 'Both sides must reach the same answer on their own, or their boards drift apart.',
    },
    {
      prompt: 'How can the server relay a room it cannot read?',
      options: [
        'HTTPS is enough',
        'Encrypt on the clients, with the key after the # in the link, which browsers never send to the server',
        'Hash the drawings',
        'Keep the drawings in cookies',
      ],
      answer: 1,
      explain: 'The URL fragment stays in the browser. The server only ever sees encrypted bytes.',
    },
  ],
  herald: [
    {
      prompt: 'Ten events in five minutes should arrive as one digest. What does the engine need?',
      options: [
        'A faster email server',
        'To drop nine of them',
        'A window that collects a user’s events for a while, then sends them once',
        'To send all ten at once',
      ],
      answer: 2,
      explain: 'A digest step holds events per user for a set time, then sends one summary.',
    },
    {
      prompt: 'A student has muted email. A new notice arrives. What do they get?',
      options: ['Nothing at all', 'Email only', 'Both, preferences are only a hint', 'The in-app notification only'],
      answer: 3,
      explain: 'Preferences are per channel: email is muted, in-app still goes out.',
    },
  ],
  breach: [
    {
      prompt: 'Which fix stops SQL injection in the login?',
      options: ['Hiding the error message', 'Parameterised queries (prepared statements)', 'Rate limiting', 'HTTPS'],
      answer: 1,
      explain: 'Parameters keep input as data, never as SQL. The rest do not stop the injection.',
    },
    {
      prompt: "User A changes /api/basket/7 to /api/basket/8 and sees User B's basket. What is this bug called?",
      options: ['Cross-site scripting (XSS)', 'CSRF', 'IDOR: broken access control', 'SQL injection'],
      answer: 2,
      explain: 'An Insecure Direct Object Reference: the server never checks that basket 8 belongs to the caller.',
    },
  ],
  keyring: [
    {
      prompt: 'In a zero-knowledge vault, what does the server store?',
      options: [
        'Encrypted blobs it cannot decrypt',
        'The master password',
        'Plain passwords behind a firewall',
        'A reversible hash of each password',
      ],
      answer: 0,
      explain: 'Encryption happens on the device. The server holds ciphertext only.',
    },
    {
      prompt: 'Why derive the key from the master password with a slow function like PBKDF2 or Argon2?',
      options: [
        'To save storage',
        'To compress the vault',
        'To make guessing the master password very expensive',
        'Because 2FA needs it',
      ],
      answer: 2,
      explain: 'Each guess costs real time, so brute-forcing a stolen vault becomes impractical.',
    },
  ],
  sentinel: [
    {
      prompt: 'What window should "10 failed logins within a minute" use?',
      options: [
        'A sliding window over the last 60 seconds, per IP',
        'The calendar minute (12:00:00 to 12:00:59)',
        'Everything since the server started',
        'Per username only, ignoring the IP',
      ],
      answer: 0,
      explain: 'A calendar minute lets a bot split 18 tries across two minutes. A sliding window catches it.',
    },
    {
      prompt: 'The hostel network puts 200 students behind one public IP. What is the risk of banning by IP?',
      options: [
        'None',
        'IPv4 addresses cannot be banned',
        'Banning that IP locks out every innocent student behind it',
        'The firewall ignores shared IPs',
      ],
      answer: 2,
      explain: 'Shared IPs need care: shorter bans, IP + username rules, or an allowlist, so real users keep working.',
    },
  ],
};

const FALLBACK_Q: [CardQ, CardQ] = [
  {
    prompt: 'What is an idempotency key for?',
    options: [
      'Encrypting a request',
      'Making a retried request take effect only once',
      'Speeding up the database',
      'Logging a user in',
    ],
    answer: 1,
    explain: 'The server remembers the key, so a retry with the same key does nothing new.',
  },
  {
    prompt: 'Two requests read a value, both add 1, both write it back. What is this bug called?',
    options: ['A memory leak', 'A race condition (lost update)', 'A deadlock', 'An off-by-one error'],
    answer: 1,
    explain: 'Both writes start from the same old value, so one update is lost.',
  },
];

/* ── ♦ Whose Code? ────────────────────────────────────────────────────── */

type Who = { prompt: string; options: string[]; answer: number; explain: string; code?: string[] };

const WHO: Record<'A' | 'B', Who[]> = {
  A: [
    {
      prompt: 'A Rust server that speaks the Bitwarden API. Its vault routes live in src/api/core/ciphers.rs. Whose code?',
      options: ['Vaultwarden', 'CrowdSec', 'Flexprice', 'Novu'],
      answer: 0,
      explain: 'Vaultwarden: the Bitwarden-compatible server, written in Rust. The Keyring card.',
    },
    {
      prompt: 'A Laravel (PHP) backend with a React frontend that sells tickets with promo codes and QR check-in. Whose code?',
      options: ['Cal.com', 'Hi.Events', 'Papermark', 'Bigcapital'],
      answer: 1,
      explain: 'Hi.Events: event ticketing on Laravel. The Box Office card.',
    },
    {
      prompt: 'Written in Go. Parsers read the logs, scenarios spot attacks, decisions are enforced by bouncers. Whose code?',
      options: ['OpenStatus', 'OWASP Juice Shop', 'CrowdSec', 'Excalidraw'],
      answer: 2,
      explain: 'CrowdSec: parsers, scenarios, decisions and bouncers are its own words. The Sentinel card.',
    },
  ],
  B: [
    {
      prompt: 'The room key sits after the # in the share link, so the server never sees it. Whose code?',
      options: ['Papermark', 'Documenso', 'Novu', 'Excalidraw'],
      answer: 3,
      explain: 'Excalidraw: end-to-end encrypted rooms with the key in the URL fragment. The Canvas card.',
    },
    {
      prompt: 'A shop built insecure on purpose, with a hidden Score Board of hacking challenges. Whose code?',
      options: ['OWASP Juice Shop', 'Vaultwarden', 'Hi.Events', 'Bigcapital'],
      answer: 0,
      explain: 'OWASP Juice Shop. The Breach card.',
    },
    {
      prompt: 'A Next.js and Prisma monorepo built around event types and availability. Whose code?',
      options: ['Documenso', 'Cal.com', 'Papermark', 'OpenStatus'],
      answer: 1,
      explain: 'Cal.com: scheduling infrastructure. Event types and availability are its core. The Clock card.',
    },
  ],
};

/* ── Building a game's questions ──────────────────────────────────────── */

const SETS: Record<'A' | 'B', { bugs: string[]; final: string }> = {
  A: { bugs: ['ledger', 'watchtower', 'breach', 'seal', 'herald'], final: 'boxoffice' },
  B: { bugs: ['meter', 'clock', 'vaultroom', 'keyring', 'canvas'], final: 'sentinel' },
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Shuffle options, keeping track of where the answer went. */
function shuffled(options: string[], answer: number, rand: () => number) {
  const idx = options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { options: idx.map((i) => options[i]), answer: idx.indexOf(answer) };
}

export function buildQuestions(set: 'A' | 'B', seed: number): GameQ[] {
  const rand = rng(seed);
  const s = SETS[set];
  const bug = (key: string, round: number, extra: Partial<GameQ> = {}): GameQ => {
    const b = BUGS[key];
    return { kind: 'line', round, prompt: b.prompt, code: b.code, lang: 'js', answer: b.answer, explain: b.explain, secs: 40, card: b.card, ...extra };
  };
  const qs: GameQ[] = s.bugs.map((k) => bug(k, 0));

  for (const slot of [0, 1] as const) {
    const perCard: Record<string, CardQ> = {};
    for (const [code, pair] of Object.entries(CARD_QS)) {
      const q = pair[slot];
      perCard[code] = { ...q, ...shuffled(q.options, q.answer, rand) };
    }
    const fb = FALLBACK_Q[slot];
    perCard._ = { ...fb, ...shuffled(fb.options, fb.answer, rand) };
    qs.push({ kind: 'card', round: 1, prompt: 'Your card', answer: [], explain: '', secs: 30, perCard });
  }

  for (const w of WHO[set]) {
    const sh = shuffled(w.options, w.answer, rand);
    qs.push({ kind: 'mcq', round: 2, prompt: w.prompt, options: sh.options, answer: [sh.answer], explain: w.explain, secs: 20 });
  }

  qs.push(bug(s.final, 3, { allIn: true, secs: 45 }));
  return qs;
}
