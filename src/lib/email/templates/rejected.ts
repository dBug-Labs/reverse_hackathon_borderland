/**
 * Email template: REJECTED (payment not verified — re-submit)
 *
 * Data: teamId, teamName, reason, resubmitLink, contactEmail
 */

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

— Borderland · SRM DBUG Labs`;

  const html = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 32px; border-radius: 12px;">
  <h1 style="color: #ff6b6b; font-size: 24px; margin-bottom: 4px;">Payment Verification Failed</h1>
  <p style="color: #888; margin-top: 0;">Team <strong style="color: #fff;">${d.teamId}</strong> — ${d.teamName}</p>

  <div style="background: #2e1a1a; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ff6b6b;">
    <h3 style="color: #ff6b6b; margin-top: 0;">Reason</h3>
    <p style="margin: 0;">${d.reason}</p>
  </div>

  <p>Don't worry — you can submit a corrected UTR. Make sure you're using the <strong>12-digit UPI Transaction ID</strong> (not the T-number or order ID).</p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${d.resubmitLink}" style="display: inline-block; background: #ff6b6b; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Re-submit UTR →</a>
  </div>

  ${d.contactEmail ? `<p style="color: #888; font-size: 13px;">If you believe this is a mistake, contact us at <a href="mailto:${d.contactEmail}" style="color: #00bfff;">${d.contactEmail}</a>.</p>` : ''}

  <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
  <p style="color: #555; font-size: 12px; text-align: center;">Borderland · SRM DBUG Labs</p>
</div>`;

  return { subject, html, text };
}
