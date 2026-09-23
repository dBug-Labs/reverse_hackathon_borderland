/**
 * scripts/seedEvent.ts
 *
 * Run: npx tsx scripts/seedEvent.ts
 *
 * Upserts the default event document into the `events` collection.
 * Edit the values below to match your actual event.
 */

import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Auto-load .env.local, then .env, if MONGODB_URI isn't already exported
if (!process.env.MONGODB_URI) {
  for (const envFile of ['.env.local', '.env']) {
    const envPath = resolve(process.cwd(), envFile);
    if (!existsSync(envPath)) continue;
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Add it to .env / .env.local or export it.');
  process.exit(1);
}

async function seedEvent() {
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db('borderland');
  console.log('Connected to MongoDB. Seeding event...\n');

  const event = {
    slug: 'borderland-2026',
    name: 'Borderland',
    tagline: 'SRM\'s Ultimate Reverse Hackathon',
    venue: 'TP2 712',
    day1Date: new Date('2026-10-05T09:00:00+05:30'),
    day2Date: new Date('2026-10-06T09:00:00+05:30'),
    registrationOpensAt: new Date('2026-09-23T00:00:00+05:30'),
    registrationClosesAt: new Date('2026-10-03T23:59:59+05:30'),
    forceClosed: false,
    capacity: 120,
    fee: 199,
    teamSize: { min: 2, max: 4 },
    upiId: 'shauryaaojha@oksbi',
    payeeName: 'DBUG Labs',
    teamIdPrefix: 'DBG',
    faq: [
      { q: 'What is a Reverse Hackathon?', a: 'Each team gets a finished product without being told what problem it solves, and works out what it does, who it is for, what is missing, and how to make it better.' },
      { q: 'How many players per team?', a: '2 to 4 players. One is the leader.' },
      { q: 'What should I bring?', a: 'Your laptop, SRM ID card, and a charger.' },
      { q: 'Is the fee refundable?', a: 'No refunds once payment is confirmed.' },
    ],
    contact: {
      email: 'dbuglabsevents@gmail.com',
      phone: '+91 94312 97519',
      instagram: '@dbuglabs',
    },
    rulesUrl: '/rules',
    refundPolicy: 'No refunds once payment is confirmed. If the event is cancelled by the organizers, full refunds will be issued.',
    privacyPolicy: 'Your data is used only for event management and communication. We do not share your data with third parties.',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('events').updateOne(
    { slug: 'borderland-2026' },
    { $set: event },
    { upsert: true }
  );

  if (result.upsertedCount) {
    console.log('✅ Event created!');
  } else {
    console.log('✅ Event updated!');
  }

  console.log('\nEvent details:');
  console.log(`  Name: ${event.name}`);
  console.log(`  Venue: ${event.venue}`);
  console.log(`  Dates: ${event.day1Date.toLocaleDateString()} – ${event.day2Date.toLocaleDateString()}`);
  console.log(`  Registration: ${event.registrationOpensAt.toLocaleDateString()} – ${event.registrationClosesAt.toLocaleDateString()}`);
  console.log(`  Capacity: ${event.capacity} teams`);
  console.log(`  Fee: ₹${event.fee}`);
  console.log(`  UPI: ${event.upiId}`);

  await client.close();
}

seedEvent().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
