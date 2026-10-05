/**
 * Submission rules shared by the team page, the API and the admin console.
 * No server imports: safe in client components.
 *
 * A submission is one public GitHub repo. Everything else (docs, deck, run
 * steps) lives inside the repo, in the layout from the participant guide.
 */

/** IST times of the overnight build. */
export const SUBMISSION_WINDOW = {
  opensAt: '2026-10-05T16:00:00+05:30', // Card Drop over, clock starts
  checkpointAt: '2026-10-05T23:30:00+05:30', // repo link + first docs pushed (extended from 10 PM, then 11 PM)
  docsFreezeAt: '2026-10-06T08:30:00+05:30', // docs/ scored as of this time; repo link locked
  codeFreezeAt: '2026-10-06T12:30:00+05:30', // code judged as of this time; everything locked
} as const;

export type SubmissionStage = 'NOT_OPEN' | 'OPEN' | 'DOCS_FROZEN' | 'CLOSED';

export function submissionStage(now = new Date()): SubmissionStage {
  const t = now.getTime();
  if (t < Date.parse(SUBMISSION_WINDOW.opensAt)) return 'NOT_OPEN';
  if (t < Date.parse(SUBMISSION_WINDOW.docsFreezeAt)) return 'OPEN';
  if (t < Date.parse(SUBMISSION_WINDOW.codeFreezeAt)) return 'DOCS_FROZEN';
  return 'CLOSED';
}

/** Files the repo must have. `any` lists accepted alternatives (first one is preferred). */
export const REQUIRED_FILES: Array<{ key: string; label: string; any: string[]; why: string }> = [
  { key: 'readme', label: 'README.md', any: ['README.md'], why: 'How to run the rebuild in 5 commands or fewer' },
  { key: 'submission', label: 'SUBMISSION.md', any: ['SUBMISSION.md'], why: 'Team, card, original repo and commit studied, improvements' },
  { key: 'deck', label: 'deck.pdf', any: ['deck.pdf', 'deck.pptx'], why: 'Your 5-slide deck in the repo root (export the PPT as PDF)' },
  { key: 'env', label: '.env.example', any: ['.env.example'], why: 'Every setting, no secrets' },
  { key: 'observations', label: 'docs/OBSERVATIONS.md', any: ['docs/OBSERVATIONS.md'], why: 'Claims about the original with file:line evidence' },
  { key: 'prd', label: 'docs/PRD.md', any: ['docs/PRD.md'], why: 'Problem, user, core flow, scope, acceptance criteria' },
  { key: 'architecture', label: 'docs/ARCHITECTURE.md', any: ['docs/ARCHITECTURE.md'], why: 'Components of your rebuild and how they talk' },
  { key: 'dataModel', label: 'docs/DATA_MODEL.md', any: ['docs/DATA_MODEL.md'], why: 'Entities, fields, constraints' },
  { key: 'api', label: 'docs/API.md', any: ['docs/API.md'], why: 'Every route: input, output, who may call it, errors' },
  { key: 'gaps', label: 'docs/GAPS.md', any: ['docs/GAPS.md'], why: 'What the original gets wrong, and your 2 improvements' },
  { key: 'agentLog', label: 'docs/AGENT_LOG.md', any: ['docs/AGENT_LOG.md'], why: 'Key prompts and what you corrected' },
];

/** Parse a GitHub repo URL. Accepts https://github.com/owner/repo with optional .git, trailing slash or /tree/... */
export function parseRepoUrl(input: string): { owner: string; repo: string; url: string } | null {
  const m = input
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:\/.*)?$/i);
  if (!m) return null;
  const [, owner, repo] = m;
  if (repo === '.' || repo === '..') return null;
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

/** Optional links must be plain http(s) URLs. */
export function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
