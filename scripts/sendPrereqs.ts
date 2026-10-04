/**
 * scripts/sendPrereqs.ts
 *
 * Mails every CONFIRMED team the player prerequisites: one email per team,
 * to all its players, with the team's own status link and the PDF guide
 * (event-plan/HACKBACK-Prerequisites.pdf) attached.
 *
 * Dry run by default: prints the recipients and writes a preview HTML.
 *
 *   npx tsx scripts/sendPrereqs.ts                      # dry run
 *   npx tsx scripts/sendPrereqs.ts --test you@gmail.com # one real mail (first team) to you only
 *   npx tsx scripts/sendPrereqs.ts --send               # send to every team not yet mailed
 *   npx tsx scripts/sendPrereqs.ts --send --only DBG-472
 *
 * Database: MONGODB_DB (default "borderland"). .env.local may point at the
 * test database, so for the real send run with MONGODB_DB=borderland.
 * Sent teams are recorded in `prereqMails`, so a re-run never mails a team twice.
 */

import { MongoClient } from 'mongodb';
import { SignJWT } from 'jose';
import nodemailer from 'nodemailer';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(process.cwd(), envFile);
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const SEND = flag('--send');
const TEST_TO = value('--test');
const ONLY = value('--only');
const LEADERS_ONLY = flag('--leaders-only'); // mail only the team leader, no CC
const DB_NAME = process.env.MONGODB_DB || 'borderland';
// Links must point at the live site, not the local APP_URL.
const BASE = (value('--base') || 'https://dbuglabshackback.vercel.app').replace(/\/$/, '');
process.env.APP_URL = BASE;
const PDF_PATH = resolve(process.cwd(), 'event-plan/HACKBACK-Prerequisites.pdf');

type Team = {
  teamId: string;
  teamName: string;
  players: Array<{ fullName: string; email: string; isLeader?: boolean }>;
};

async function render(team: Team, statusLink: string) {
  const { C, button, whatsappButton, emailLayout, esc, label } = await import('../src/lib/email/layout');
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL || process.env.WHATSAPP_COMMUNITY_URL || '';
  const subject = `HACKBACK: set up your laptop before Monday (${team.teamId})`;

  const steps = [
    ['Accounts', 'GitHub for every member, and a personal Google account (Gmail) for the Antigravity IDE.'],
    ['Install', 'Git, Node.js 22 or newer, Chrome and VS Code.'],
    ['Antigravity IDE', 'Download the Google Antigravity IDE from <a href="https://antigravity.google">https://antigravity.google</a>, install it and sign in. Every member uses their own account.'],
    ['Clone', '<code style="font-family:Consolas,monospace;font-size:12px;word-break:break-all;">git clone --depth 1 https://github.com/dBug-Labs/espionage-event<br>git clone --depth 1 https://github.com/panshak/accountill</code>'],
    ['First question', 'Open espionage-event in the Antigravity IDE and ask the agent: “What does this project do, and what is its tech stack?”'],
  ];

  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 10px 6px 0;vertical-align:top;font-weight:700;white-space:nowrap;">${k}</td><td style="padding:6px 0;vertical-align:top;">${v}</td></tr>`;

  const body = `
    <div style="text-align:center;padding:4px 0 6px;">
      ${label(`${team.teamId} · ${team.teamName}`)}
      <div style="font-family:${C.display};font-size:36px;line-height:1.05;text-transform:uppercase;color:${C.ink};margin-top:6px;">Get ready for Monday</div>
      <p style="margin:12px 0 0;color:#4a423b;">HACKBACK starts on <strong>Monday 5 October, 9:00 AM at TP2 712</strong>. The workshop is hands-on, so every laptop must be set up before you arrive. It takes about 45 minutes.</p>
    </div>

    <div style="margin-top:20px;">
      ${label('Before Sunday 11 PM · every member')}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;font-size:14px;line-height:1.5;color:${C.ink};">
        ${steps.map(([k, v], i) => row(`${i + 1}. ${k}`, v)).join('')}
        ${row('6. Setup proof', '<strong>One member replies to this email</strong> with one screenshot of step 5 (the repo open and the agent’s answer).')}
      </table>
      <p style="margin:10px 0 0;color:${C.muted};font-size:13px;">The attached PDF has every step, the full timings, the submission rules and an FAQ. Please read page 4 before Monday.</p>
    </div>

    <div style="margin-top:22px;text-align:center;">
      ${label('Your team page · keep this link')}
      <p style="margin:8px 0 14px;color:#4a423b;">At 3 PM on Monday you rank your problem statements here, and you submit your work here overnight.</p>
      ${button(statusLink, 'Open team page')}
    </div>

    <div style="margin-top:22px;">
      ${label('Timings (updated)')}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;font-size:14px;line-height:1.5;color:${C.ink};">
        ${row('Mon 5 Oct', '9:00 AM arrival → 4:00 PM. Workshop, then the Card Drop at 3 PM.')}
        ${row('Overnight', 'From home. 10 PM checkpoint; docs freeze at 8:30 AM.')}
        ${row('Tue 6 Oct', '9:30 AM check-in → about 3:20 PM. Code freeze at 12:30, then judging and results.')}
        ${row('Bring', 'College ID, laptop + charger, and the Entry Visa email (its QR is your check-in).')}
      </table>
    </div>

    <div style="margin-top:22px;padding:14px 16px;border-left:3px solid ${C.red};background:#ebe0cb;font-size:14px;line-height:1.5;color:${C.ink};">
      <strong>How your work is scored:</strong> an AI reviewer (Claude) scores every team’s repo and docs against the same rubric, and Game Masters check every score. Your repo must follow the layout in the PDF.
    </div>

    ${whatsappUrl ? `<div style="margin-top:22px;text-align:center;">${whatsappButton(whatsappUrl)}</div>` : ''}
  `;

  const html = emailLayout({ preheader: 'Set up your laptop before Sunday 11 PM. Full guide attached.', bodyHtml: body });

  const text = `${team.teamId} · ${team.teamName}

HACKBACK starts on Monday 5 October, 9:00 AM at TP2 712. The workshop is hands-on, so every laptop must be set up before you arrive (about 45 minutes).

Before Sunday 11 PM, every member:
1. Accounts: GitHub for every member, and a personal Google account (Gmail) for the Antigravity IDE.
2. Install Git, Node.js 22 or newer, Chrome and VS Code.
3. Download the Google Antigravity IDE from https://antigravity.google, install it and sign in. Every member uses their own account.
4. Clone:
   git clone --depth 1 https://github.com/dBug-Labs/espionage-event
   git clone --depth 1 https://github.com/panshak/accountill
5. Open espionage-event in the Antigravity IDE and ask the agent: "What does this project do, and what is its tech stack?"
6. One member replies to this email with one screenshot of step 5.

The attached PDF has every step, the full timings, the submission rules and an FAQ. Please read page 4 before Monday.

Your team page (keep this link; you pick your problem statements here at 3 PM Monday):
${statusLink}

Timings (updated):
- Mon 5 Oct: 9:00 AM arrival to 4:00 PM. Card Drop at 3 PM.
- Overnight from home: 10 PM checkpoint, docs freeze 8:30 AM.
- Tue 6 Oct: 9:30 AM check-in to about 3:20 PM. Code freeze 12:30.
- Bring: college ID, laptop + charger, the Entry Visa email (its QR is your check-in).

How your work is scored: an AI reviewer (Claude) scores every team's repo and docs against the same rubric, and Game Masters check every score.
${whatsappUrl ? `\nWhatsApp community: ${whatsappUrl}\n` : ''}
HACKBACK · dBug Labs`;

  return { subject, html, text };
}

async function main() {
  for (const k of ['MONGODB_URI', 'LINK_SECRET', 'SMTP_USER', 'SMTP_APP_PASSWORD', 'MAIL_FROM']) {
    if (!process.env[k]) throw new Error(`${k} is not set.`);
  }
  if (!existsSync(PDF_PATH)) throw new Error(`Missing ${PDF_PATH}. Render the guide first.`);

  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  try {
    const db = client.db(DB_NAME);
    const event = await db.collection('events').findOne({});
    if (!event) throw new Error(`No event in database "${DB_NAME}".`);

    const filter: Record<string, unknown> = { eventId: event._id, status: 'CONFIRMED', deletedAt: { $exists: false } };
    if (ONLY) filter.teamId = ONLY;
    const teams = (await db
      .collection('registrations')
      .find(filter, { projection: { teamId: 1, teamName: 1, players: 1 } })
      .sort({ teamId: 1 })
      .toArray()) as unknown as Team[];

    const sentLog = db.collection('prereqMails');
    const already = new Set((await sentLog.find({ eventId: event._id }).toArray()).map((d) => d.teamId));

    const secret = new TextEncoder().encode(process.env.LINK_SECRET);
    const exp = Math.floor(new Date(event.day2Date ?? Date.now() + 7 * 864e5).getTime() / 1000) + 2 * 86400;
    const statusLink = async (teamId: string) =>
      `${BASE}/r/${teamId}?t=${await new SignJWT({ teamId, type: 'status' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(exp).sign(secret)}`;

    const mode = (SEND ? 'SEND' : TEST_TO ? `TEST → ${TEST_TO}` : 'DRY RUN') + (LEADERS_ONLY ? ' · leaders only' : '');
    console.log(`\nDatabase: ${DB_NAME} · Mode: ${mode} · Links: ${BASE}`);
    console.log(`${teams.length} confirmed team(s), ${teams.filter((t) => already.has(t.teamId)).length} already mailed.\n`);
    if (!teams.length) return;

    const pdf = readFileSync(PDF_PATH);
    const attachments = [{ filename: 'HACKBACK-Prerequisites.pdf', content: pdf, contentType: 'application/pdf' }];
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_APP_PASSWORD },
    });

    if (!SEND) {
      const t = teams[0];
      const link = await statusLink(t.teamId);
      const mail = await render(t, link);
      const preview = resolve(process.cwd(), 'event-plan/prereq-mail-preview.html'); // holds a live link: gitignored
      writeFileSync(preview, mail.html);
      for (const team of teams) {
        const emails = team.players.map((p) => p.email).filter(Boolean);
        const leader = team.players.find((p) => p.isLeader)?.email || emails[0];
        console.log(`${already.has(team.teamId) ? '✓ sent ' : '  '}${team.teamId.padEnd(8)} ${team.teamName.padEnd(22)} ${LEADERS_ONLY ? leader : emails.join(', ')}`);
      }
      console.log(`\nSubject: ${mail.subject}`);
      console.log(`Preview: ${preview}`);
      console.log(`Check this link opens the team page on the live site before sending:\n${link}\n`);
      if (TEST_TO) {
        await transport.sendMail({ from: process.env.MAIL_FROM, to: TEST_TO, subject: `[TEST] ${mail.subject}`, html: mail.html, text: mail.text, attachments });
        console.log(`Test mail sent to ${TEST_TO}.`);
      } else {
        console.log('Nothing sent. Use --test <email> for a test mail, or --send to mail every team.');
      }
      return;
    }

    let sent = 0;
    for (const team of teams) {
      if (already.has(team.teamId)) continue;
      const emails = team.players.map((p) => p.email).filter(Boolean);
      if (!emails.length) {
        console.log(`  skip ${team.teamId}: no emails`);
        continue;
      }
      const leader = team.players.find((p) => p.isLeader)?.email || emails[0];
      const mail = await render(team, await statusLink(team.teamId));
      try {
        const info = await transport.sendMail({
          from: process.env.MAIL_FROM,
          to: leader,
          cc: LEADERS_ONLY ? undefined : emails.filter((e) => e !== leader),
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          attachments,
        });
        await sentLog.insertOne({ eventId: event._id, teamId: team.teamId, to: LEADERS_ONLY ? [leader] : emails, messageId: info.messageId, sentAt: new Date() });
        sent++;
        console.log(`✓ ${team.teamId.padEnd(8)} ${LEADERS_ONLY ? leader : `${emails.length} recipient(s)`}`);
      } catch (err) {
        console.log(`✗ ${team.teamId.padEnd(8)} ${(err as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    console.log(`\nSent ${sent} mail(s). Re-run with --send to retry any failures.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
