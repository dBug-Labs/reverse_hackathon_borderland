/**
 * scripts/seedTestDb.ts
 *
 * Builds a throwaway test database (default: borderland_test) with fake
 * confirmed teams, so the Card Drop can be rehearsed without touching real
 * teams. Copies the event document from the live database (read-only).
 *
 * Run:  npx tsx scripts/seedTestDb.ts [teamCount]
 * Then: set MONGODB_DB=borderland_test in .env.local and restart `npm run dev`.
 *
 * Re-running wipes and rebuilds the test database. It refuses to write to "borderland".
 */

import { MongoClient, ObjectId } from 'mongodb';
import { SignJWT } from 'jose';
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

const LIVE_DB = 'borderland';
const TEST_DB = process.env.MONGODB_TEST_DB || 'borderland_test';
const COUNT = Math.min(60, Math.max(2, Number(process.argv[2]) || 25));
const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000';

const TEAM_NAMES = [
  'Null Pointers', 'Stack Smashers', 'Race Conditions', 'Off By One', 'Heisenbugs', 'Segfault Society',
  'Merge Conflicts', 'Dead Locks', 'Byte Me', 'Ctrl Alt Elite', 'Kernel Panic', 'Bit Flippers',
  'The Rubber Ducks', 'Infinite Loopers', 'Cache Me Outside', 'Syntax Terror', 'Root Access', 'Hash Browns',
  'Zero Days', 'Git Pushers', 'Lambda Legion', 'Async Awaiters', 'Packet Sniffers', 'Binary Bandits',
  'Code Blooded', 'The Debuggers', 'Overflowers', 'Fork Bombers', 'Query Queens', 'Docker Dwellers',
];

async function main() {
  if (TEST_DB === LIVE_DB) throw new Error(`Refusing to seed the live database "${LIVE_DB}".`);
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  if (!process.env.LINK_SECRET) throw new Error('LINK_SECRET is not set (needed to sign portal links).');

  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  try {
    const live = client.db(LIVE_DB);
    const db = client.db(TEST_DB);

    const event = await live.collection('events').findOne({});
    if (!event) throw new Error('No event in the live database to copy.');

    for (const c of ['events', 'registrations', 'payments', 'cardDrop', 'cardPrefs', 'emailJobs', 'auditLogs', 'rateLimits']) {
      await db.collection(c).deleteMany({});
    }
    await db.collection('events').insertOne(event);

    const used = new Set<number>();
    const now = new Date();
    const teams = Array.from({ length: COUNT }, (_, i) => {
      let n: number;
      do n = 100 + Math.floor(Math.random() * 900);
      while (used.has(n));
      used.add(n);
      const teamId = `DBG-${n}`;
      const teamName = TEAM_NAMES[i % TEAM_NAMES.length] + (i >= TEAM_NAMES.length ? ` ${Math.floor(i / TEAM_NAMES.length) + 1}` : '');
      const size = 2 + (i % 3);
      const players = Array.from({ length: size }, (_, s) => ({
        slot: s + 1,
        isLeader: s === 0,
        fullName: `Test Player ${String(i + 1).padStart(2, '0')}${'ABCD'[s]}`,
        email: `p${s + 1}.${teamId.toLowerCase()}@example.com`,
        regNo: `RA99${String(i + 1).padStart(5, '0')}${String(s + 1).padStart(6, '0')}`,
        phone: s === 0 ? `90000${String(i + 1).padStart(5, '0')}` : undefined,
        year: String(1 + (i % 3)),
      }));
      // Most teams checked in on Day 1, a few absent, to rehearse "checked-in only".
      const present = i % 8 !== 7;
      return {
        _id: new ObjectId(),
        teamId,
        eventId: event._id,
        teamName,
        teamNameLower: teamName.toLowerCase(),
        players,
        leaderEmail: players[0].email,
        leaderPhone: players[0].phone,
        status: 'CONFIRMED',
        rejectCount: 0,
        visa: { issuedAt: now, status: 'VALID' },
        attendance: present ? [{ day: 1, markedAt: now, markedBy: 'seed', playersPresent: players.map((p) => p.slot) }] : [],
        verifiedAt: now,
        verifiedBy: 'seed',
        consentAt: now,
        source: 'TEST',
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + 30 * 864e5),
      };
    });
    await db.collection('registrations').insertMany(teams);

    await db.collection('registrations').createIndex({ teamId: 1 }, { unique: true });
    await db.collection('cardDrop').createIndex({ eventId: 1 }, { unique: true });
    await db.collection('cardPrefs').createIndex({ eventId: 1, teamId: 1 }, { unique: true });

    const secret = new TextEncoder().encode(process.env.LINK_SECRET);
    const exp = Math.floor(new Date(event.day2Date ?? now.getTime() + 7 * 864e5).getTime() / 1000) + 2 * 86400;
    console.log(`\nSeeded "${TEST_DB}": ${COUNT} confirmed teams (${teams.filter((t) => t.attendance.length).length} checked in on Day 1).\n`);
    console.log('Team portal links (open one, pick 3 cards when the Card Drop is open):\n');
    for (const t of teams.sort((a, b) => a.teamId.localeCompare(b.teamId))) {
      const token = await new SignJWT({ teamId: t.teamId, type: 'status' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(exp).sign(secret);
      console.log(`${t.teamId.padEnd(8)} ${t.teamName.padEnd(20)} ${BASE_URL}/r/${t.teamId}?t=${token}`);
    }
    console.log(`\nNext: put MONGODB_DB=${TEST_DB} in .env.local and restart the dev server.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
