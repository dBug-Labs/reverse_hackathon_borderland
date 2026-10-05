import type { PsCard, TrackMeta } from '@/lib/cardDrop/cards';
import { C, button, emailLayout, esc, label } from '../layout';

const LEVEL: Record<string, string> = { '7': 'Standard ×1.0', '8': 'Standard ×1.0', J: 'Hard ×1.1', Q: 'Hard ×1.1', K: 'Brutal ×1.2' };

/** After the Card Drop: the team's own problem statement, its submission link and the deadlines. */
export function renderBrief(opts: {
  teamId: string;
  teamName: string;
  card: PsCard;
  track: TrackMeta;
  solutionTitle?: string;
  risk?: string;
  submitLink: string;
  teamLink: string;
  guideUrl: string;
  playbookUrl: string;
}) {
  const { teamId, teamName, card, track, submitLink, teamLink, guideUrl, playbookUrl } = opts;
  const subject = `HACKBACK: your problem statement and how to submit (${teamId})`;
  const kts = card.killerTests.map((k) => `<li style="margin-bottom:4px;">${esc(k)}</li>`).join('');
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;font-weight:700;white-space:nowrap;">${k}</td><td style="padding:6px 0;vertical-align:top;">${v}</td></tr>`;
  const box = (inner: string, red = false) =>
    `<div style="margin-top:18px;padding:14px 16px;border-radius:8px;${red ? `border-left:3px solid ${C.red};background:#f6e3e1;` : 'background:#ebe0cb;'}font-size:14px;line-height:1.5;color:${C.ink};">${inner}</div>`;

  const lock = opts.solutionTitle
    ? `<p style="margin:8px 0 0;color:#4a423b;">Your solution: <strong>${esc(opts.solutionTitle)}</strong> · ${opts.risk === 'HIGH' ? 'High Risk' : 'Standard'}</p>`
    : '';

  const body = `
    <div style="text-align:center;padding:4px 0 6px;">
      ${label(`${teamId} · ${teamName}`)}
      <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin-top:10px;">${track.suit} ${esc(track.label)} · ${esc(card.name)} · ${LEVEL[card.rank] ?? card.rank}</div>
      <div style="font-family:${C.display};font-size:34px;line-height:1.05;text-transform:uppercase;color:${C.ink};margin-top:6px;">${esc(card.title)}</div>
      <p style="margin:8px 0 0;color:#4a423b;">Original: <a href="${esc(card.source.url)}" style="color:${C.red};">${esc(card.source.name)}</a> · ${esc(card.source.what)}</p>
      ${lock}
    </div>

    ${box(`<strong>The problem.</strong> ${esc(card.problem)}<br><br><strong>Build for:</strong> ${esc(card.brief)}<br><strong>The hard core:</strong> ${esc(card.core)}`)}
    ${box(`<strong>Killer Tests</strong> · your rebuild must pass these live on Day 2<ol style="margin:8px 0 0;padding-left:20px;">${kts}</ol>`, true)}
    ${box(`<strong>Your Differentiator (must have).</strong> Your rebuild needs at least one feature the original does not have at all: AI integration or any new idea that helps your user. Your 2 improvements = <strong>1 fix</strong> from your GAPS.md + <strong>1 Differentiator</strong>. Using AI? Keep the key in <code>.env</code>; the app must still run without it.`)}

    <div style="margin-top:22px;">
      ${label('What to do, and when')}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;font-size:14px;line-height:1.5;color:${C.ink};">
        ${row('After 4 PM', `Clone <a href="${esc(card.source.url)}" style="color:${C.red};">${esc(card.source.name)}</a>, run Playbook stages 0–8 on it, then create your own <strong>empty, public</strong> GitHub repo.`)}
        ${row('Then', 'Run stage 9 to write <code>docs/</code> (7 files). <strong>Push docs before any code.</strong>')}
        ${row('By 11:30 PM', '<strong>Submit your repo link</strong> with the button below. Missing it costs a Visa.')}
        ${row('Overnight', 'Build only from your docs: the 3 Killer Tests first, then your fix and your Differentiator. Add README.md, SUBMISSION.md, deck.pdf and .env.example.')}
        ${row('Tue 8:30 AM', '<strong>Docs freeze.</strong> docs/ is scored as of your last push before 8:30.')}
        ${row('Tue 12:30 PM', '<strong>Code freeze.</strong> The last push before 12:30 is judged.')}
      </table>
    </div>

    <div style="margin-top:22px;text-align:center;">
      ${button(submitLink, 'Submit your repo')}
      <p style="margin:12px 0 0;color:${C.muted};font-size:13px;">After saving, press <strong>Check again</strong> until every file shows ✓.<br>
      <a href="${teamLink}" style="color:${C.red};">Your team page</a> · <a href="${playbookUrl}" style="color:${C.red};">The Playbook</a> · <a href="${guideUrl}" style="color:${C.red};">Submission guide (PDF)</a></p>
    </div>`;

  const html = emailLayout({ preheader: `Your card: ${card.title}. Submit your repo link by 11:30 PM.`, bodyHtml: body });

  const text = `${teamId} · ${teamName}

YOUR CARD: ${card.title}
${track.suit} ${track.label} · ${card.name} · ${LEVEL[card.rank] ?? card.rank}
Original: ${card.source.name} (${card.source.what}) ${card.source.url}
${opts.solutionTitle ? `Your solution: ${opts.solutionTitle} · ${opts.risk === 'HIGH' ? 'High Risk' : 'Standard'}\n` : ''}
The problem: ${card.problem}
Build for: ${card.brief}
The hard core: ${card.core}

Killer Tests (must pass live on Day 2):
${card.killerTests.map((k, i) => `${i + 1}. ${k}`).join('\n')}

Your Differentiator (must have): at least one feature the original does not have at all, e.g. AI integration. Your 2 improvements = 1 fix from GAPS.md + 1 Differentiator. Using AI? Key in .env; the app must still run without it.

What to do, and when:
- After 4 PM: clone the original, run Playbook stages 0-8, create your own empty, public GitHub repo.
- Then: stage 9 writes docs/ (7 files). Push docs before any code.
- By 11:30 PM: submit your repo link (below). Missing it costs a Visa.
- Overnight: build from your docs only. Killer Tests first, then your fix and Differentiator. Add README.md, SUBMISSION.md, deck.pdf, .env.example.
- Tue 8:30 AM: docs freeze. Tue 12:30 PM: code freeze.

Submit your repo: ${submitLink}
Team page: ${teamLink}
Playbook: ${playbookUrl}
Submission guide: ${guideUrl}

HACKBACK · dBug Labs`;

  return { subject, html, text };
}
