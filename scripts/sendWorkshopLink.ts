/**
 * scripts/sendWorkshopLink.ts
 *
 * Mails the Day 1 workshop submission link to every team marked present on Day 1
 * (morning or post-lunch check-in). One email per team: leader in To, the rest in CC.
 * The link pre-fills the team ID: /workshop?team=DBG-123
 *
 *   npx tsx scripts/sendWorkshopLink.ts                      # dry run: list recipients
 *   npx tsx scripts/sendWorkshopLink.ts --test you@gmail.com # one real mail (first team) to you only
 *   npx tsx scripts/sendWorkshopLink.ts --send               # send to every present team not yet mailed
 *
 * Sent teams are recorded in `workshopMails`, so a re-run (e.g. after more check-ins) only mails new teams.
 */

import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';
import { readFileSync, existsSync } from 'fs';
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
const value = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const SEND = args.includes('--send');
const TEST_TO = value('--test');
const DB_NAME = process.env.MONGODB_DB || 'borderland';
const BASE = 'https://dbuglabshackback.vercel.app';

type Team = { teamId: string; teamName: string; players: Array<{ fullName: string; email: string; isLeader?: boolean }> };

async function render(team: Team) {
  const { renderWorkshop } = await import('../src/lib/email/templates/workshop');
  return renderWorkshop(team, BASE);
}

async function main() {
  for (const k of ['MONGODB_URI', 'SMTP_USER', 'SMTP_APP_PASSWORD', 'MAIL_FROM']) {
    if (!process.env[k]) throw new Error(`${k} is not set.`);
  }
  const client = await new MongoClient(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 20000 }).connect();
  try {
    const db = client.db(DB_NAME);
    const event = await db.collection('events').findOne({});
    if (!event) throw new Error(`No event in database "${DB_NAME}".`);

    const teams = (await db
      .collection('registrations')
      .find(
        { eventId: event._id, status: 'CONFIRMED', deletedAt: { $exists: false }, 'attendance.day': { $in: [1, 3] } },
        { projection: { teamId: 1, teamName: 1, players: 1 } }
      )
      .sort({ teamId: 1 })
      .toArray()) as unknown as Team[];
    const confirmed = await db.collection('registrations').countDocuments({ eventId: event._id, status: 'CONFIRMED', deletedAt: { $exists: false } });

    const sentLog = db.collection('workshopMails');
    const already = new Set((await sentLog.find({ eventId: event._id }).toArray()).map((d) => d.teamId));

    console.log(`\nDatabase: ${DB_NAME} · Mode: ${SEND ? 'SEND' : TEST_TO ? `TEST → ${TEST_TO}` : 'DRY RUN'}`);
    console.log(`${teams.length} present team(s) of ${confirmed} confirmed, ${teams.filter((t) => already.has(t.teamId)).length} already mailed.\n`);
    if (!teams.length) return;

    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_APP_PASSWORD },
    });

    if (!SEND) {
      for (const t of teams) console.log(`${already.has(t.teamId) ? '✓ sent ' : '  '}${t.teamId.padEnd(8)} ${t.teamName.padEnd(22)} ${t.players.map((p) => p.email).join(', ')}`);
      if (TEST_TO) {
        const mail = await render(teams[0]);
        await transport.sendMail({ from: process.env.MAIL_FROM, to: TEST_TO, subject: `[TEST] ${mail.subject}`, html: mail.html, text: mail.text });
        console.log(`\nTest mail sent to ${TEST_TO}.`);
      } else console.log('\nNothing sent. Use --test <email> or --send.');
      return;
    }

    let sent = 0;
    for (const team of teams) {
      if (already.has(team.teamId)) continue;
      const emails = team.players.map((p) => p.email).filter(Boolean);
      if (!emails.length) continue;
      const leader = team.players.find((p) => p.isLeader)?.email || emails[0];
      const mail = await render(team);
      try {
        const info = await transport.sendMail({
          from: process.env.MAIL_FROM,
          to: leader,
          cc: emails.filter((e) => e !== leader),
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        await sentLog.insertOne({ eventId: event._id, teamId: team.teamId, to: emails, messageId: info.messageId, sentAt: new Date() });
        sent++;
        console.log(`✓ ${team.teamId.padEnd(8)} ${emails.length} recipient(s)`);
      } catch (err) {
        console.log(`✗ ${team.teamId.padEnd(8)} ${(err as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    console.log(`\nSent ${sent} mail(s).`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
