'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Lock, RefreshCw, Shuffle, Sparkles } from 'lucide-react';
import { api, post } from '@/components/portal/api';
import { Banner, Button, LoadingBlock, Modal, PageTitle, Panel, StatTile, cx, inputCls } from '@/components/portal/ui';
import { CardFace, viaLabel } from '@/components/carddrop/PlayingCard';
import { CARDS, CARD_BY_CODE, TRACKS, TRACK_ORDER } from '@/lib/cardDrop/cards';
import type { AdminViewDTO } from '@/components/carddrop/types';

const PHASES = [
  { id: 'CLOSED', label: 'Closed' },
  { id: 'PREFS_OPEN', label: 'Teams choosing' },
  { id: 'DRAWN', label: 'Drawn' },
  { id: 'LOCKED', label: 'Locked' },
] as const;

type Dialog =
  | { kind: 'prefs'; teamId: string }
  | { kind: 'move'; teamId: string }
  | { kind: 'swap'; teamId: string }
  | { kind: 'draw' }
  | { kind: 'lock' }
  | { kind: 'reset' }
  | null;

export default function CardDropConsole() {
  const [view, setView] = useState<AdminViewDTO | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(async () => {
    const res = await api<AdminViewDTO>('/api/admin/card-drop', {}, 'admin');
    if (res.ok && res.data) setView(res.data);
    else setError(res.message || 'Could not load the Card Drop.');
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [load]);

  async function act(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setError('');
    const res = await post<AdminViewDTO>('/api/admin/card-drop', body, 'admin');
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message || 'That did not work.');
      return false;
    }
    setView(res.data);
    setNotice(ok);
    setDialog(null);
    return true;
  }

  const byTeam = useMemo(() => Object.fromEntries((view?.assignments ?? []).map((a) => [a.teamId, a])), [view]);

  if (!view) return error ? <Banner>{error}</Banner> : <LoadingBlock label="Loading the Card Drop…" />;

  const phaseIdx = PHASES.findIndex((p) => p.id === view.phase);
  const chosen = view.teams.filter((t) => t.choices.length).length;
  const present = view.teams.filter((t) => t.presentDay1).length;
  const drawn = view.phase === 'DRAWN' || view.phase === 'LOCKED';
  const locked = view.assignments.filter((a) => a.title).length;
  const rows = drawn ? [...view.teams].sort((a, b) => (byTeam[a.teamId]?.pick ?? 999) - (byTeam[b.teamId]?.pick ?? 999)) : view.teams;

  return (
    <div className="space-y-6">
      <PageTitle
        kicker="♣ Card Drop"
        title="The Card Drop"
        subtitle="Teams rank the 12 PS cards, then a sealed random draw gives each team a card. Run the draw on the projector stage."
        actions={
          <a href="/admin/stage" target="_blank" rel="noreferrer">
            <Button variant="primary">
              <ExternalLink className="h-4 w-4" /> Open projector stage
            </Button>
          </a>
        }
      />

      {error && <Banner onClose={() => setError('')}>{error}</Banner>}
      {notice && (
        <Banner tone="success" onClose={() => setNotice('')}>
          {notice}
        </Banner>
      )}

      {/* Phase stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {PHASES.map((p, i) => (
          <React.Fragment key={p.id}>
            <span
              className={cx(
                'rounded-full border px-4 py-1.5 font-label text-sm font-semibold',
                i === phaseIdx
                  ? 'border-[var(--paper)] bg-[var(--paper)] text-[var(--ink)]'
                  : i < phaseIdx
                  ? 'border-neutral-700 text-neutral-300'
                  : 'border-neutral-800 text-neutral-600'
              )}
            >
              {p.label}
            </span>
            {i < PHASES.length - 1 && <span className="text-neutral-700">→</span>}
          </React.Fragment>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          {view.phase === 'CLOSED' && (
            <Button variant="primary" loading={busy} onClick={() => act({ action: 'open' }, 'Card Drop opened. Teams can now choose.')}>
              <Sparkles className="h-4 w-4" /> Open the Card Drop
            </Button>
          )}
          {view.phase === 'PREFS_OPEN' && (
            <Button variant="primary" onClick={() => setDialog({ kind: 'draw' })}>
              <Shuffle className="h-4 w-4" /> Run the draw here
            </Button>
          )}
          {view.phase === 'DRAWN' && (
            <Button variant="success" onClick={() => setDialog({ kind: 'lock' })}>
              <Lock className="h-4 w-4" /> Lock the Card Drop
            </Button>
          )}
          {view.phase !== 'CLOSED' && (
            <Button variant="danger" onClick={() => setDialog({ kind: 'reset' })}>
              <RefreshCw className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Confirmed teams" value={view.teams.length} sub={`${present} checked in on Day 1`} />
        <StatTile label="Teams that chose" value={`${chosen}/${view.teams.length}`} sub={view.phase === 'PREFS_OPEN' ? 'live' : undefined} />
        <StatTile label="Seats per card" value={view.cap} sub={`${view.cap * CARDS.length} seats in total`} />
        <StatTile label="Titles locked" value={drawn ? `${locked}/${view.assignments.length}` : '—'} />
      </div>

      {view.seedHash && (
        <Panel className="font-mono text-xs text-neutral-400">
          <div>
            <span className="text-neutral-500">Seal (sha256 of the seed): </span>
            <span className="break-all text-neutral-200">{view.seedHash}</span>
          </div>
          {view.seed && (
            <div className="mt-1">
              <span className="text-neutral-500">Seed (revealed after the draw): </span>
              <span className="break-all text-neutral-200">{view.seed}</span>
            </div>
          )}
          {view.drawnAt && (
            <div className="mt-1 text-neutral-500">
              Drawn by {view.drawnBy} at {new Date(view.drawnAt).toLocaleTimeString('en-IN')} ·{' '}
              {view.presentOnly ? 'checked-in teams only' : 'all confirmed teams'}
            </div>
          )}
        </Panel>
      )}

      {/* Seats per card */}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {TRACK_ORDER.map((t) => (
          <Panel key={t}>
            <div className="mb-3 font-caps text-xs uppercase tracking-[0.3em] text-neutral-400">
              <span className={TRACKS[t].red ? 'text-[#ff5a5a]' : 'text-neutral-100'}>{TRACKS[t].suit}</span> {TRACKS[t].label} · {TRACKS[t].name}
            </div>
            <div className="space-y-2.5">
              {CARDS.filter((c) => c.track === t).map((c) => {
                const holders = view.assignments.filter((a) => a.card === c.code);
                const wanted = view.teams.filter((x) => x.choices[0] === c.code).length;
                return (
                  <div key={c.code} className="flex items-center gap-3">
                    <div className="w-10 shrink-0">
                      <CardFace card={c} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-label text-[15px] font-semibold text-white">{c.title}</div>
                      <div className="font-label text-xs text-neutral-500">
                        {drawn ? holders.map((h) => h.teamId).join(', ') || 'no teams' : `${wanted} first choice${wanted === 1 ? '' : 's'}`}
                      </div>
                    </div>
                    {drawn && (
                      <span className="font-label text-sm font-semibold text-neutral-300">
                        {holders.length}/{view.cap}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>

      {/* Teams */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-[#0d0d10]">
        <table className="w-full min-w-[860px] font-label text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
              {drawn && <th className="px-4 py-3">Pick</th>}
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Day 1</th>
              <th className="px-4 py-3">Choices</th>
              {drawn && <th className="px-4 py-3">Card</th>}
              {drawn && <th className="px-4 py-3">Title · risk</th>}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const a = byTeam[t.teamId];
              return (
                <tr key={t.teamId} className="border-b border-neutral-800/70 last:border-0">
                  {drawn && <td className="px-4 py-3 font-poster text-lg text-[#ff6b6b]">{a ? String(a.pick).padStart(2, '0') : '—'}</td>}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{t.teamId}</div>
                    <div className="text-xs text-neutral-500">{t.teamName}</div>
                  </td>
                  <td className="px-4 py-3">{t.presentDay1 ? <span className="text-emerald-400">In</span> : <span className="text-neutral-600">—</span>}</td>
                  <td className="px-4 py-3">
                    {t.choices.length ? (
                      <div className="flex flex-wrap gap-1">
                        {t.choices.map((c, i) => (
                          <span key={c} className="rounded-md border border-neutral-700 px-1.5 py-0.5 text-xs text-neutral-300">
                            {i + 1}. {CARD_BY_CODE[c]?.title}
                          </span>
                        ))}
                        {t.prefsBy && t.prefsBy !== 'team' && <span className="text-xs text-amber-400">by {t.prefsBy}</span>}
                      </div>
                    ) : (
                      <span className="text-neutral-600">Not chosen</span>
                    )}
                  </td>
                  {drawn && (
                    <td className="px-4 py-3">
                      {a ? (
                        <>
                          <div className="font-semibold text-white">{CARD_BY_CODE[a.card]?.title}</div>
                          <div className="text-xs text-neutral-500">
                            {viaLabel(a.via)}
                            {a.movedBy && <span className="text-amber-400"> · moved by {a.movedBy}</span>}
                          </div>
                        </>
                      ) : (
                        <span className="text-neutral-600">Not in draw</span>
                      )}
                    </td>
                  )}
                  {drawn && (
                    <td className="px-4 py-3">
                      {a?.title ? (
                        <>
                          <div className="text-neutral-200">{a.title}</div>
                          <div className={cx('text-xs', a.risk === 'HIGH' ? 'text-[#ff6b6b]' : 'text-neutral-500')}>
                            {a.risk === 'HIGH' ? 'High Risk' : 'Standard'}
                          </div>
                        </>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {view.phase === 'PREFS_OPEN' && (
                        <Button size="sm" onClick={() => setDialog({ kind: 'prefs', teamId: t.teamId })}>
                          Set choices
                        </Button>
                      )}
                      {view.phase === 'DRAWN' && a && (
                        <>
                          <Button size="sm" onClick={() => setDialog({ kind: 'move', teamId: t.teamId })}>
                            Move
                          </Button>
                          <Button size="sm" onClick={() => setDialog({ kind: 'swap', teamId: t.teamId })}>
                            Swap
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                  No confirmed teams yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PrefsDialog
        open={dialog?.kind === 'prefs'}
        team={dialog?.kind === 'prefs' ? view.teams.find((t) => t.teamId === dialog.teamId) : undefined}
        busy={busy}
        onClose={() => setDialog(null)}
        onSave={(teamId, choices) => act({ action: 'prefs', teamId, choices }, `Choices saved for ${teamId}.`)}
      />
      <MoveDialog
        open={dialog?.kind === 'move'}
        teamId={dialog?.kind === 'move' ? dialog.teamId : ''}
        view={view}
        busy={busy}
        onClose={() => setDialog(null)}
        onSave={(teamId, card) => act({ action: 'move', teamId, card }, `${teamId} moved.`)}
      />
      <SwapDialog
        open={dialog?.kind === 'swap'}
        teamId={dialog?.kind === 'swap' ? dialog.teamId : ''}
        view={view}
        busy={busy}
        onClose={() => setDialog(null)}
        onSave={(teamA, teamB) => act({ action: 'swap', teamA, teamB }, `${teamA} and ${teamB} swapped cards.`)}
      />
      <DrawDialog
        open={dialog?.kind === 'draw'}
        present={present}
        total={view.teams.length}
        busy={busy}
        onClose={() => setDialog(null)}
        onDraw={(presentOnly) => act({ action: 'draw', presentOnly }, 'The draw is done. Replay it on the projector stage.')}
      />
      <Modal
        open={dialog?.kind === 'lock'}
        title="Lock the Card Drop"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="success" loading={busy} onClick={() => act({ action: 'lock' }, 'Card Drop locked.')}>
              Lock it
            </Button>
          </>
        }
      >
        <p>
          {locked} of {view.assignments.length} teams have submitted a title. After locking, teams can no longer change their title or
          Difficulty Card, and no team can be moved or swapped.
        </p>
      </Modal>
      <ResetDialog open={dialog?.kind === 'reset'} busy={busy} onClose={() => setDialog(null)} onReset={() => act({ action: 'reset', confirm: 'RESET' }, 'Card Drop reset.')} />
    </div>
  );
}

function CardSelect({ value, onChange, exclude = [], label }: { value: string; onChange: (v: string) => void; exclude?: string[]; label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls()}>
        <option value="">—</option>
        {CARDS.filter((c) => !exclude.includes(c.code) || c.code === value).map((c) => (
          <option key={c.code} value={c.code}>
            {TRACKS[c.track].suit} {c.title} ({c.rank})
          </option>
        ))}
      </select>
    </label>
  );
}

function PrefsDialog({
  open,
  team,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  team?: AdminViewDTO['teams'][number];
  busy: boolean;
  onClose: () => void;
  onSave: (teamId: string, choices: string[]) => void;
}) {
  const [c, setC] = useState<string[]>(['', '', '']);
  // Keyed on the values, not the object: the page polls every 8 s and a new `team`
  // object would reset what the volunteer is typing.
  const teamKey = team ? `${team.teamId}:${team.choices.join()}` : '';
  useEffect(() => {
    if (team) setC([team.choices[0] ?? '', team.choices[1] ?? '', team.choices[2] ?? '']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey]);
  if (!team) return null;
  const set = (i: number, v: string) => setC((x) => x.map((y, j) => (j === i ? v : y)));
  const picked = c.filter(Boolean);
  return (
    <Modal
      open={open}
      title={`Choices · ${team.teamId}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!picked.length} onClick={() => onSave(team.teamId, picked)}>
            Save choices
          </Button>
        </>
      }
    >
      <p>For a team that cannot open its own link. Their choices are saved under your name.</p>
      {[0, 1, 2].map((i) => (
        <CardSelect key={i} label={`Choice ${i + 1}`} value={c[i]} onChange={(v) => set(i, v)} exclude={c.filter((_, j) => j !== i)} />
      ))}
    </Modal>
  );
}

function MoveDialog({
  open,
  teamId,
  view,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  teamId: string;
  view: AdminViewDTO;
  busy: boolean;
  onClose: () => void;
  onSave: (teamId: string, card: string) => void;
}) {
  const [card, setCard] = useState('');
  useEffect(() => setCard(''), [teamId]);
  const full = CARDS.filter((c) => view.assignments.filter((a) => a.card === c.code).length >= view.cap).map((c) => c.code);
  return (
    <Modal
      open={open}
      title={`Move ${teamId}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!card} onClick={() => onSave(teamId, card)}>
            Move team
          </Button>
        </>
      }
    >
      <p>Full cards are hidden. To move onto a full card, swap with a team on it instead.</p>
      <CardSelect label="New card" value={card} onChange={setCard} exclude={full} />
    </Modal>
  );
}

function SwapDialog({
  open,
  teamId,
  view,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  teamId: string;
  view: AdminViewDTO;
  busy: boolean;
  onClose: () => void;
  onSave: (a: string, b: string) => void;
}) {
  const [other, setOther] = useState('');
  useEffect(() => setOther(''), [teamId]);
  const mine = view.assignments.find((a) => a.teamId === teamId);
  const options = view.assignments.filter((a) => a.teamId !== teamId && a.card !== mine?.card);
  return (
    <Modal
      open={open}
      title={`Swap ${teamId}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!other} onClick={() => onSave(teamId, other)}>
            Swap cards
          </Button>
        </>
      }
    >
      <p>Only when both teams agree in person. {teamId} holds {CARD_BY_CODE[mine?.card ?? '']?.title}.</p>
      <select value={other} onChange={(e) => setOther(e.target.value)} className={inputCls()}>
        <option value="">Choose a team</option>
        {options.map((a) => (
          <option key={a.teamId} value={a.teamId}>
            {a.teamId} · {a.teamName} · {CARD_BY_CODE[a.card]?.title}
          </option>
        ))}
      </select>
    </Modal>
  );
}

function DrawDialog({
  open,
  present,
  total,
  busy,
  onClose,
  onDraw,
}: {
  open: boolean;
  present: number;
  total: number;
  busy: boolean;
  onClose: () => void;
  onDraw: (presentOnly: boolean) => void;
}) {
  const [presentOnly, setPresentOnly] = useState(present > 0);
  useEffect(() => setPresentOnly(present > 0), [present]);
  return (
    <Modal
      open={open}
      title="Run the draw"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={() => onDraw(presentOnly)}>
            Draw now
          </Button>
        </>
      }
    >
      <p>
        The draw usually runs live from the projector stage. Running it here does the same thing; the stage can still replay it. It
        can only be done once.
      </p>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={presentOnly} onChange={(e) => setPresentOnly(e.target.checked)} className="accent-[#b3202a]" />
        Only teams checked in on Day 1 ({present} of {total})
      </label>
    </Modal>
  );
}

function ResetDialog({ open, busy, onClose, onReset }: { open: boolean; busy: boolean; onClose: () => void; onReset: () => void }) {
  const [text, setText] = useState('');
  useEffect(() => setText(''), [open]);
  return (
    <Modal
      open={open}
      title="Reset the Card Drop"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} disabled={text !== 'RESET'} onClick={onReset}>
            Reset everything
          </Button>
        </>
      }
    >
      <p>This deletes the draw and every team&apos;s choices. Use it only after a rehearsal. Type RESET to confirm.</p>
      <input value={text} onChange={(e) => setText(e.target.value)} className={inputCls()} placeholder="RESET" />
    </Modal>
  );
}
