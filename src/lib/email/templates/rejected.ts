/**
 * Email template: REJECTED (payment not verified — re-submit)
 *
 * Data: teamId, teamName, reason, resubmitLink, contactEmail
 */
import { C, button, emailLayout, esc, label } from '../layout';

export function render(data: Record<string, unknown>) {
  const d = data as {
    teamId: string;
    teamName: string;
    reason: string;
    resubmitLink: string;
    contactEmail?: string;
  };

  const subject = `Action needed — we couldn't verify your payment (${d.teamId})`;

  const text = `Team ${d.teamId} — ${d.teamName}

We couldn't verify your payment. Here's what happened:

Reason: ${d.reason}

You can submit a corrected UTR using this link:
${d.resubmitLink}

If you believe this is a mistake, contact us${d.contactEmail ? ` at ${d.contactEmail}` : ''}.

— HACKBACK · dBug Labs`;

  const body = `
    <div style="text-align:center;padding:4px 0 6px;">
      ${label('Payment not verified')}
      <div style="font-family:${C.display};font-size:38px;line-height:1.05;text-transform:uppercase;color:${C.ink};margin-top:6px;">We couldn&rsquo;t match your payment</div>
      <p style="margin:12px 0 0;color:#4a423b;">Team <strong>${esc(d.teamId)}</strong> &middot; ${esc(d.teamName)}</p>
    </div>
    <div style="margin:18px 0;padding:14px 16px;border-left:4px solid ${C.red};background:#fbf6ec;border-radius:6px;">
      ${label('Reason')}
      <div style="margin-top:4px;color:${C.ink};">${esc(d.reason)}</div>
    </div>
    <p style="color:#4a423b;">No need to register again &mdash; just send the correct <strong>12-digit UPI transaction ID</strong> (not the T-number or order ID) using the button below.</p>
    <div style="text-align:center;margin:22px 0 10px;">${button(d.resubmitLink, 'Re-submit your UTR')}</div>
    ${d.contactEmail ? `<p style="margin:10px 0 0;font-size:13px;color:${C.muted};text-align:center;">Think this is a mistake? Write to <a href="mailto:${esc(d.contactEmail)}" style="color:${C.red};">${esc(d.contactEmail)}</a>.</p>` : ''}`;
  const html = emailLayout({ preheader: `Action needed for ${d.teamId}: we couldn't verify your payment.`, bodyHtml: body });

  return { subject, html, text };
}
