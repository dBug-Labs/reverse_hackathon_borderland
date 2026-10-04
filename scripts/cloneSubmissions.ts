/**
 * scripts/cloneSubmissions.ts
 *
 * Clones every submitted repo at its freeze commit, for scoring. Nothing is
 * written to the teams' repos: the hidden test file and the scoring agent run
 * on these local copies only.
 *
 *   npx tsx scripts/cloneSubmissions.ts --at docs [--out ../hackback-scoring] [--only DBG-472]
 *   npx tsx scripts/cloneSubmissions.ts --at code
 *
 * --at docs  uses the 8:30 snapshot, --at code the 12:30 snapshot (take them in
 * the admin console first). Without a snapshot it falls back to the current head.
 * Writes <out>/<at>/<teamId>/ and <out>/<at>/manifest.json.
 */

import { MongoClient } from 'mongodb';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
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
const AT = value('--at');
const OUT = resolve(value('--out') || '../hackback-scoring');
const ONLY = value('--only');
const DB_NAME = process.env.MONGODB_DB || 'borderland';

const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

async function main() {
  if (AT !== 'docs' && AT !== 'code') throw new Error('Pass --at docs or --at code.');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');

  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  try {
    const db = client.db(DB_NAME);
    const event = await db.collection('events').findOne({});
    if (!event) throw new Error(`No event in "${DB_NAME}".`);
    const drop = await db.collection('cardDrop').findOne({ eventId: event._id });
    const cards = new Map((drop?.assignments ?? []).map((a: { teamId: string }) => [a.teamId, a]));
    const subs = await db
      .collection('submissions')
      .find({ eventId: event._id, ...(ONLY ? { teamId: ONLY } : {}) })
      .sort({ teamId: 1 })
      .toArray();

    const dir = resolve(OUT, AT);
    mkdirSync(dir, { recursive: true });
    console.log(`\nDatabase: ${DB_NAME} · ${subs.length} submission(s) · ${AT} freeze → ${dir}\n`);

    const manifest = [];
    for (const s of subs) {
      const snap = s.snapshots?.[AT];
      const target: string | undefined = snap?.beforeFreezeSha || snap?.headSha;
      const dest = resolve(dir, s.teamId);
      const entry: Record<string, unknown> = {
        teamId: s.teamId,
        repoUrl: s.repoUrl,
        card: (cards.get(s.teamId) as { card?: string } | undefined)?.card ?? null,
        title: (cards.get(s.teamId) as { title?: string } | undefined)?.title ?? null,
        snapshot: snap ?? null,
      };
      try {
        if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
        execFileSync('git', ['clone', '--quiet', `${s.repoUrl}.git`, dest], { stdio: ['ignore', 'pipe', 'pipe'] });
        if (target) git(dest, 'checkout', '--quiet', target);
        entry.sha = git(dest, 'rev-parse', 'HEAD');
        entry.fallbackToHead = !target;
        console.log(`✓ ${s.teamId.padEnd(8)} ${String(entry.sha).slice(0, 7)}${target ? '' : '  (no snapshot: current head)'}`);
      } catch (err) {
        entry.error = (err as Error).message.split('\n')[0];
        console.log(`✗ ${s.teamId.padEnd(8)} ${entry.error}`);
      }
      manifest.push(entry);
    }
    writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`\nManifest: ${resolve(dir, 'manifest.json')}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
