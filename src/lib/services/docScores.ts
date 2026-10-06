import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';

/**
 * Docs scores (the Deduction, out of 150): accuracy 60 · completeness 50 · gaps and improvements 40.
 * Scored by AI reviewers against each team's docs at the 8:30 AM docs freeze, then imported here.
 * Admins can correct any part; the reviewer's numbers stay in `ai` for reference.
 */

export interface DocParts {
  accuracy: number;
  completeness: number;
  gaps: number;
}

export interface DocScore extends DocParts {
  teamId: string;
  teamName: string;
  card: string;
  repo: string | null;
  commit: string | null;
  commitDate: string | null;
  total: number;
  claims: { checked: number; right: number; half: number; wrong: number };
  breakdown: Record<string, number>;
  docTest: string;
  strongest: string;
  weakest: string;
  flags: string[];
  notes: string[];
  /** The reviewer's own numbers before any admin edit. */
  ai: DocParts;
  editedBy?: string;
  editNote?: string;
  updatedAt: number;
}

interface DocScoreDoc extends Omit<DocScore, 'updatedAt'> {
  eventId: ObjectId;
  updatedAt: Date;
}

export const DOC_MAX: DocParts = { accuracy: 60, completeness: 50, gaps: 40 };

const col = async () => (await getDb()).collection<DocScoreDoc>('docScores');

export async function getDocScores(eventId: ObjectId): Promise<DocScore[]> {
  const docs = await (await col()).find({ eventId }).toArray();
  return docs
    .map(({ _id, eventId: _e, updatedAt, ...d }) => {
      void _id;
      void _e;
      return { ...d, updatedAt: updatedAt.getTime() };
    })
    .sort((a, b) => b.total - a.total || b.accuracy - a.accuracy);
}

/** Import (or re-import) one team's reviewed score. */
export async function importDocScore(eventId: ObjectId, s: Omit<DocScore, 'updatedAt' | 'total' | 'ai'>) {
  const parts = { accuracy: s.accuracy, completeness: s.completeness, gaps: s.gaps };
  await (await col()).updateOne(
    { eventId, teamId: s.teamId },
    { $set: { ...s, total: parts.accuracy + parts.completeness + parts.gaps, ai: parts, updatedAt: new Date() }, $unset: { editedBy: '', editNote: '' } },
    { upsert: true }
  );
}

/** An admin corrects a team's score. */
export async function editDocScore(eventId: ObjectId, input: { teamId?: string; note?: string } & Partial<DocParts>, actor: string) {
  const c = await col();
  const cur = await c.findOne({ eventId, teamId: String(input.teamId || '') });
  if (!cur) return { ok: false as const, code: 'NOT_FOUND', message: 'No docs score for that team.' };
  const clamp = (k: keyof DocParts) => {
    const n = Math.round(Number(input[k] ?? cur[k]) * 2) / 2;
    return Number.isFinite(n) ? Math.max(0, Math.min(DOC_MAX[k], n)) : cur[k];
  };
  const parts = { accuracy: clamp('accuracy'), completeness: clamp('completeness'), gaps: clamp('gaps') };
  await c.updateOne(
    { _id: cur._id },
    { $set: { ...parts, total: parts.accuracy + parts.completeness + parts.gaps, editedBy: actor, editNote: String(input.note || '').slice(0, 500), updatedAt: new Date() } }
  );
  return { ok: true as const };
}
