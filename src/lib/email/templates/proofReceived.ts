/**
 * Email template: PROOF_RECEIVED (UTR submitted — under review)
 *
 * Data: teamId, teamName, utr, statusLink
 */

export function render(data: Record<string, unknown>) {
  const d = data as {
    teamId: string;
    teamName: string;
    utr: string;
    statusLink: string;
  };

  const subject = `UTR received — under review (${d.teamId})`;

  const text = `Team ${d.teamId} — ${d.teamName}

We've received your payment proof. Your UTR: ${d.utr}

Our team will verify this against the bank statement. This usually takes less than 12 hours.

Check your status: ${d.statusLink}

If the UTR above looks wrong, contact us immediately.

— Borderland · SRM DBUG Labs`;

  const html = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 32px; border-radius: 12px;">
  <h1 style="color: #00bfff; font-size: 24px; margin-bottom: 4px;">Payment Proof Received</h1>
  <p style="color: #888; margin-top: 0;">Team <strong style="color: #fff;">${d.teamId}</strong> — ${d.teamName}</p>

  <div style="background: #1a1a2e; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>Your UTR:</strong> <code style="background: #333; padding: 4px 12px; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">${d.utr}</code></p>
    <p style="color: #ffcc00;">⚠️ If this looks wrong, contact us immediately.</p>
  </div>

  <p>Our team will verify this against the bank statement. This usually takes <strong>less than 12 hours</strong>.</p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${d.statusLink}" style="display: inline-block; background: #00bfff; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Check Status →</a>
  </div>

  <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
  <p style="color: #555; font-size: 12px; text-align: center;">Borderland · SRM DBUG Labs</p>
</div>`;

  return { subject, html, text };
}
