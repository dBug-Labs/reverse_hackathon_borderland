/**
 * scripts/createIndexes.ts
 *
 * Run: npx tsx scripts/createIndexes.ts
 *
 * Creates all unique, compound, and TTL indexes for the borderland database.
 * Safe to re-run — createIndex is idempotent.
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

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db('borderland');
  console.log('Connected to MongoDB. Creating indexes...\n');

  // ── registrations ─────────────────────────────────────────────
  const reg = db.collection('registrations');

  // Plain unique indexes (no partial filter): soft-deleted teams keep their
  // entries so deleted spam still blocks the same email / reg no / phone.
  // Atlas also rejects `$exists: false` inside partialFilterExpression.

  await reg.createIndex({ teamId: 1 }, { unique: true, name: 'idx_teamId' });
  console.log('✅ registrations.teamId (unique)');

  await reg.createIndex({ teamNameLower: 1 }, {
    unique: true,
    name: 'idx_teamNameLower',
  });
  console.log('✅ registrations.teamNameLower (unique)');

  await reg.createIndex({ leaderEmail: 1 }, {
    unique: true,
    name: 'idx_leaderEmail',
  });
  console.log('✅ registrations.leaderEmail (unique)');

  await reg.createIndex({ leaderPhone: 1 }, {
    unique: true,
    name: 'idx_leaderPhone',
  });
  console.log('✅ registrations.leaderPhone (unique)');

  await reg.createIndex({ 'players.email': 1 }, {
    unique: true,
    name: 'idx_playersEmail',
  });
  console.log('✅ registrations.players.email (unique)');

  await reg.createIndex({ 'players.regNo': 1 }, {
    unique: true,
    name: 'idx_playersRegNo',
  });
  console.log('✅ registrations.players.regNo (unique)');

  await reg.createIndex({ idempotencyKey: 1 }, {
    unique: true,
    sparse: true,
    name: 'idx_idempotencyKey',
  });
  console.log('✅ registrations.idempotencyKey (unique, sparse)');

  await reg.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_created' });
  console.log('✅ registrations.status + createdAt');

  await reg.createIndex({ eventId: 1, status: 1 }, { name: 'idx_eventId_status' });
  console.log('✅ registrations.eventId + status');

  await reg.createIndex({ expiresAt: 1 }, { name: 'idx_expiresAt' });
  console.log('✅ registrations.expiresAt');

  // ── payments ──────────────────────────────────────────────────
  const pay = db.collection('payments');

  await pay.createIndex({ utr: 1 }, { unique: true, name: 'idx_utr' });
  console.log('✅ payments.utr (unique)');

  await pay.createIndex({ teamId: 1, createdAt: -1 }, { name: 'idx_teamId_created' });
  console.log('✅ payments.teamId + createdAt');

  await pay.createIndex({ registrationId: 1 }, { name: 'idx_registrationId' });
  console.log('✅ payments.registrationId');

  // ── emailJobs ─────────────────────────────────────────────────
  const email = db.collection('emailJobs');

  await email.createIndex({ dedupeKey: 1 }, { unique: true, name: 'idx_dedupeKey' });
  console.log('✅ emailJobs.dedupeKey (unique)');

  await email.createIndex({ status: 1, nextAttemptAt: 1 }, { name: 'idx_status_next' });
  console.log('✅ emailJobs.status + nextAttemptAt');

  await email.createIndex({ sentAt: 1 }, { name: 'idx_sentAt' });
  console.log('✅ emailJobs.sentAt');

  // ── rateLimits ────────────────────────────────────────────────
  const rl = db.collection('rateLimits');

  await rl.createIndex({ key: 1 }, { unique: true, name: 'idx_key' });
  console.log('✅ rateLimits.key (unique)');

  await rl.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'idx_ttl' });
  console.log('✅ rateLimits.expiresAt (TTL)');

  // ── abuseLogs ─────────────────────────────────────────────────
  const abuse = db.collection('abuseLogs');

  await abuse.createIndex({ createdAt: 1 }, {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    name: 'idx_ttl_30d',
  });
  console.log('✅ abuseLogs.createdAt (TTL 30d)');

  // ── auditLogs ─────────────────────────────────────────────────
  const audit = db.collection('auditLogs');

  await audit.createIndex({ createdAt: -1 }, { name: 'idx_created' });
  console.log('✅ auditLogs.createdAt');

  await audit.createIndex({ targetId: 1 }, { name: 'idx_targetId' });
  console.log('✅ auditLogs.targetId');

  // ── reconcileBatches ──────────────────────────────────────────
  const recon = db.collection('reconcileBatches');

  await recon.createIndex({ createdAt: -1 }, { name: 'idx_created' });
  console.log('✅ reconcileBatches.createdAt');

  console.log('\n🎉 All indexes created successfully!');
  await client.close();
}

createIndexes().catch((err) => {
  console.error('❌ Index creation failed:', err);
  process.exit(1);
});
