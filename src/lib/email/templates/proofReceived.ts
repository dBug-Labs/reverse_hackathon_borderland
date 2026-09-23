/**
 * Email template: PROOF_RECEIVED — sent the moment a team submits its
 * details + UTR. "We've received your submission; payment is being verified."
 *
 * Data: teamId, teamName, utr, amount?, players?, statusLink
 */
import { C, button, emailLayout, esc, label, playersTable } from '../layout';

export function render(data: Record<string, unknown>) {
  const d = data as {
    teamId: string;
    teamName: string;
    utr: string;
    amount?: number;
    players?: Array<{ fullName: string; regNo: string; isLeader: boolean }>;
    statusLink: string;
  };

  const subject = `We've received your submission — HACKBACK (${d.teamId})`;

  const text = `We've received your submission, ${d.teamName}!

Team ID: ${d.teamId}
UTR: ${d.utr}${d.amount ? `\nAmount: Rs ${d.amount}` : ''}

Your payment is now being verified against our bank statement. As soon as it's verified we'll email you your Entry Visa — no need to do anything else.

If the UTR above is wrong, reply to this email right away.

Check your status: ${d.statusLink}

HACKBACK · 5 & 6 October · TP2 712, SRM IST
dBug Labs`;

  const body = `
    <div style="text-align:center;padding:4px 0 8px;">
      ${label('Submission received')}
      <div style="font-family:${C.display};font-size:40px;line-height:1.05;text-transform:uppercase;color:${C.ink};margin-top:6px;">We&rsquo;ve got you, ${esc(d.teamName)}</div>
      <p style="margin:14px 0 0;color:#4a423b;">Your registration and payment proof are in. We&rsquo;re now <strong>verifying your payment</strong> against our bank statement &mdash; once it&rsquo;s confirmed we&rsquo;ll email your <strong>Entry Visa</strong>. Nothing else to do.</p>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;border-top:1px solid #d9ccb2;border-bottom:1px solid #d9ccb2;">
      <tr>
        <td style="padding:16px 0;">
          ${label('Team ID')}
          <div style="font-family:${C.display};font-size:44px;line-height:1;color:${C.ink};">${esc(d.teamId)}</div>
        </td>
        <td align="right" style="padding:16px 0;font-family:${C.body};font-size:13px;color:${C.muted};">
          UTR<br><span style="font-size:16px;font-weight:700;color:${C.ink};letter-spacing:1px;">${esc(d.utr)}</span>
          ${d.amount ? `<br>Amount <span style="font-weight:700;color:${C.ink};">&#8377;${esc(d.amount)}</span>` : ''}
        </td>
      </tr>
    </table>

    ${d.players && d.players.length ? `<div style="margin:14px 0 4px;">${label('Your team')}</div>${playersTable(d.players)}` : ''}

    <p style="margin:18px 0 0;font-size:13px;color:${C.muted};">Typed the UTR wrong? Reply to this email straight away so we can fix it.</p>

    <div style="text-align:center;margin:22px 0 10px;">${button(d.statusLink, 'Check your status')}</div>`;

  return { subject, html: emailLayout({ preheader: `Payment for ${d.teamId} is being verified.`, bodyHtml: body }), text };
}
