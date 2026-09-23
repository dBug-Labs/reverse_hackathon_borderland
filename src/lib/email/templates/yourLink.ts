/**
 * Email template: YOUR_LINK (duplicate attempt / resend link)
 *
 * Data: teamId, teamName, statusLink, payLink
 */

export function render(data: Record<string, unknown>) {
  const d = data as {
    teamId: string;
    teamName: string;
    statusLink: string;
    payLink?: string;
  };

  const subject = `Your Borderland registration link (${d.teamId})`;

  const text = `Team ${d.teamId} — ${d.teamName}

Here are your registration links:

Check status: ${d.statusLink}
${d.payLink ? `Complete payment: ${d.payLink}` : ''}

— Borderland · SRM DBUG Labs`;

  const html = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 32px; border-radius: 12px;">
  <h1 style="color: #00bfff; font-size: 24px; margin-bottom: 4px;">Your Registration Links</h1>
  <p style="color: #888; margin-top: 0;">Team <strong style="color: #fff;">${d.teamId}</strong> — ${d.teamName}</p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${d.statusLink}" style="display: inline-block; background: #00bfff; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 12px;">Check Status →</a>
    ${d.payLink ? `<br><br><a href="${d.payLink}" style="display: inline-block; background: #00ff88; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Complete Payment →</a>` : ''}
  </div>

  <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
  <p style="color: #555; font-size: 12px; text-align: center;">Borderland · SRM DBUG Labs</p>
</div>`;

  return { subject, html, text };
}
