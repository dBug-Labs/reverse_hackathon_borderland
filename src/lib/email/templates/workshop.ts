import { C, button, emailLayout, label } from '../layout';

/** Day 1 workshop submission link. The link pre-fills the team ID. */
export function renderWorkshop(team: { teamId: string; teamName: string }, base: string) {
  const link = `${base}/workshop?team=${team.teamId}`;
  const subject = `HACKBACK: submit your workshop work (${team.teamId})`;
  const body = `
    <div style="text-align:center;padding:4px 0 6px;">
      ${label(`${team.teamId} · ${team.teamName}`)}
      <div style="font-family:${C.display};font-size:36px;line-height:1.05;text-transform:uppercase;color:${C.ink};margin-top:6px;">Submit your workshop work</div>
      <p style="margin:12px 0 0;color:#4a423b;">Push today’s workshop work to a <strong>public GitHub repo</strong>, then submit the link. You only need your <strong>team ID</strong> and the <strong>GitHub link</strong>.</p>
    </div>
    <div style="margin-top:22px;text-align:center;">
      ${button(link, 'Submit workshop link')}
      <p style="margin:12px 0 0;color:${C.muted};font-size:13px;">Your team ID: <strong>${team.teamId}</strong>. One link per team; submitting again replaces it.</p>
    </div>`;
  const html = emailLayout({ preheader: `Team ID ${team.teamId} + your GitHub link. That's all.`, bodyHtml: body });
  const text = `${team.teamId} · ${team.teamName}

Push today's workshop work to a public GitHub repo, then submit the link here (team ID + GitHub link only):
${link}

Your team ID: ${team.teamId}. One link per team; submitting again replaces it.

HACKBACK · dBug Labs`;
  return { subject, html, text };
}
