import { REQUIRED_FILES, SUBMISSION_WINDOW } from '@/lib/submission/config';
import type { RepoCheck, RepoSnapshot } from '@/lib/types';

/**
 * Read-only GitHub checks for team repos (public REST API).
 *
 * GITHUB_TOKEN is optional but strongly advised on Vercel: without it GitHub
 * allows 60 requests an hour per IP, and Vercel's IPs are shared. A
 * fine-grained token with no permissions (public repos only) is enough.
 */

const API = 'https://api.github.com';

type GhResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

async function gh<T>(path: string): Promise<GhResult<T>> {
  const token = process.env.GITHUB_TOKEN;
  try {
    const res = await fetch(`${API}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'hackback-portal',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    if (res.status === 404) return { ok: false, status: 404, message: 'Repo not found. Is the link right, and is the repo public?' };
    if (res.status === 409) return { ok: false, status: 409, message: 'The repo is empty. Push your first commit.' };
    if (res.status === 403 || res.status === 429) {
      return { ok: false, status: res.status, message: 'GitHub is rate-limiting us. Try the check again in a minute.' };
    }
    return { ok: false, status: res.status, message: `GitHub answered ${res.status}.` };
  } catch {
    return { ok: false, status: 0, message: 'Could not reach GitHub. Try again.' };
  }
}

interface GhRepo {
  private: boolean;
  fork: boolean;
  parent?: { full_name: string };
  default_branch: string;
  pushed_at: string;
  created_at: string;
}
interface GhCommit {
  sha: string;
  commit: { committer: { date: string } };
}
interface GhTree {
  tree: Array<{ path: string; type: string }>;
  truncated: boolean;
}

const enc = (s: string) => encodeURIComponent(s);

/** Repo health check: reachable, public, not a fork, created after the clock started, required files present. */
export async function checkRepo(owner: string, repo: string): Promise<RepoCheck> {
  const at = new Date();
  const base = `/repos/${enc(owner)}/${enc(repo)}`;

  const r = await gh<GhRepo>(base);
  if (!r.ok) return { at, ok: false, error: (r as { message: string }).message };
  const info = r.data;

  const warnings: string[] = [];
  if (info.private) warnings.push('The repo is private. Make it public so it can be read and scored.');
  if (info.fork) {
    warnings.push(
      `This repo is a fork${info.parent ? ` of ${info.parent.full_name}` : ''}. The rebuild must start from a new, empty repo.`
    );
  }
  if (Date.parse(info.created_at) < Date.parse(SUBMISSION_WINDOW.opensAt)) {
    warnings.push('The repo was created before 4 PM Monday. The clean-room rule needs a repo created after the Card Drop.');
  }

  const c = await gh<GhCommit>(`${base}/commits/${enc(info.default_branch)}`);
  if (!c.ok) {
    return {
      at, ok: false, error: (c as { message: string }).message, public: !info.private, defaultBranch: info.default_branch,
      pushedAt: info.pushed_at, createdAt: info.created_at, warnings,
    };
  }

  const t = await gh<GhTree>(`${base}/git/trees/${c.data.sha}?recursive=1`);
  const files: Record<string, string | null> = {};
  if (t.ok) {
    const paths = new Map(t.data.tree.filter((e) => e.type === 'blob').map((e) => [e.path.toLowerCase(), e.path]));
    for (const f of REQUIRED_FILES) {
      const hit = f.any.map((p) => paths.get(p.toLowerCase())).find(Boolean);
      files[f.key] = hit ?? null;
    }
    if (t.data.truncated) warnings.push('The repo is very large; the file check may be incomplete. Keep node_modules and build output out of git.');
    if ([...paths.keys()].some((p) => p.startsWith('node_modules/'))) warnings.push('node_modules is committed. Add it to .gitignore.');
    if ([...paths.keys()].some((p) => p === '.env' || p.endsWith('/.env'))) warnings.push('A .env file is committed. Remove it and rotate any keys in it.');
  } else {
    warnings.push((t as { message: string }).message);
  }

  const allFiles = t.ok && REQUIRED_FILES.every((f) => files[f.key]);
  return {
    at,
    ok: Boolean(allFiles && !info.private),
    public: !info.private,
    fork: info.fork ? info.parent?.full_name ?? 'unknown' : undefined,
    defaultBranch: info.default_branch,
    headSha: c.data.sha,
    headAt: c.data.commit.committer.date,
    pushedAt: info.pushed_at,
    createdAt: info.created_at,
    files,
    warnings,
  };
}

/** Freeze snapshot: current head, last push, and the last commit dated at or before the freeze. */
export async function snapshotRepo(owner: string, repo: string, freezeAt: string, by: string): Promise<RepoSnapshot> {
  const at = new Date();
  const base = `/repos/${enc(owner)}/${enc(repo)}`;
  const r = await gh<GhRepo>(base);
  if (!r.ok) return { at, by, freezeAt, error: (r as { message: string }).message };

  const branch = enc(r.data.default_branch);
  const [head, before] = await Promise.all([
    gh<GhCommit>(`${base}/commits/${branch}`),
    gh<GhCommit[]>(`${base}/commits?sha=${branch}&until=${enc(new Date(freezeAt).toISOString())}&per_page=1`),
  ]);
  return {
    at,
    by,
    freezeAt,
    headSha: head.ok ? head.data.sha : undefined,
    pushedAt: r.data.pushed_at,
    beforeFreezeSha: before.ok ? before.data[0]?.sha : undefined,
    pushedAfterFreeze: Date.parse(r.data.pushed_at) > Date.parse(freezeAt),
    error: head.ok ? undefined : (head as { message: string }).message,
  };
}
