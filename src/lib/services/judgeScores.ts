import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { getJudging } from '@/lib/services/judging';
import { cleanScore, totalOf, type JudgeScore, type ScoreInput, type ScoresView } from '@/lib/judging/scoring';

/**
 * Judges' score sheets for the final judging. One document per (team, judge); the team's
 * final judging score is the average of its judges. The teams come from the panel draw.
 */

type Fail = { ok: false; code: string; message: string };
const fail = (code: string, message: string): Fail => ({ ok: false, code, message });

interface ScoreDoc extends ScoreInput {
  _id?: ObjectId;
  eventId: ObjectId;
  teamId: string;
  judge: string;
  /** Lower-cased judge name: one sheet per judge, whatever the capitals. */
  judgeKey: string;
  total: number;
  updatedAt: Date;
}

interface MetaDoc {
  eventId: ObjectId;
  locked: boolean;
  lockedBy?: string;
  updatedAt: Date;
}

async function cols() {
  const db = await getDb();
  return { scores: db.collection<ScoreDoc>('judge_scores'), meta: db.collection<MetaDoc>('judge_scores_meta') };
}

async function isLocked(eventId: ObjectId) {
  const { meta } = await cols();
  return !!(await meta.findOne({ eventId }))?.locked;
}

export async function getScores(eventId: ObjectId): Promise<ScoresView> {
  const { scores } = await cols();
  const [j, docs, locked] = await Promise.all([getJudging(eventId), scores.find({ eventId }).toArray(), isLocked(eventId)]);
  return {
    locked,
    panels: j.panels.map((p) => ({ suit: p.suit, name: p.name, judges: p.judges, track: p.track, tracks: p.tracks })),
    teams: j.slots.map((s) => ({ teamId: s.teamId, teamName: s.teamName, track: s.track, card: s.card, panel: s.panel, order: s.order, state: s.state })),
    scores: docs.map(
      (d): JudgeScore => ({
        teamId: d.teamId,
        judge: d.judge,
        kt: d.kt,
        improvements: d.improvements,
        brief: d.brief,
        defence: d.defence,
        twist: d.twist,
        demo: d.demo,
        notes: d.notes,
        total: d.total,
        updatedAt: d.updatedAt.getTime(),
      })
    ),
  };
}

export interface ScoresInput extends Partial<ScoreInput> {
  action: 'save' | 'delete' | 'lock';
  teamId?: string;
  judge?: string;
  on?: boolean;
}

export async function scoresAction(eventId: ObjectId, input: ScoresInput, actor: string): Promise<{ ok: true; view: ScoresView } | Fail> {
  const { scores, meta } = await cols();
  if (input.action === 'lock') {
    await meta.updateOne({ eventId }, { $set: { locked: !!input.on, lockedBy: actor, updatedAt: new Date() } }, { upsert: true });
    return { ok: true, view: await getScores(eventId) };
  }
  if (await isLocked(eventId)) return fail('LOCKED', 'Scores are locked. Unlock them on this page to change a score.');
  const judge = (input.judge || '').trim().slice(0, 60);
  if (!judge) return fail('VALIDATION', 'Enter your name as the judge first.');
  const teamId = (input.teamId || '').trim();
  const j = await getJudging(eventId);
  if (!j.slots.some((s) => s.teamId === teamId)) return fail('VALIDATION', 'That team is not on a judging panel.');
  const key = { eventId, teamId, judgeKey: judge.toLowerCase() };

  if (input.action === 'delete') {
    await scores.deleteOne(key);
    return { ok: true, view: await getScores(eventId) };
  }
  if (input.action !== 'save') return fail('VALIDATION', 'Unknown action.');
  const s = cleanScore(input);
  await scores.updateOne(key, { $set: { ...s, judge, total: totalOf(s), updatedAt: new Date() } }, { upsert: true });
  return { ok: true, view: await getScores(eventId) };
}
