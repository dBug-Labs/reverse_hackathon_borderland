/**
 * Email template: DIGEST (hourly admin notification)
 *
 * Data: pendingCount, adminUrl
 */

export function render(data: Record<string, unknown>) {
  const d = data as {
    pendingCount: number;
    adminUrl: string;
  };

  const subject = `${d.pendingCount} payment${d.pendingCount === 1 ? '' : 's'} waiting for verification`;

  const text = `${d.pendingCount} payment${d.pendingCount === 1 ? '' : 's'} waiting for verification.

Review them: ${d.adminUrl}

— Borderland Admin`;

  const html = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; color: #333; padding: 24px; border-radius: 8px;">
  <h2 style="margin-top: 0;">🔔 ${d.pendingCount} payment${d.pendingCount === 1 ? '' : 's'} waiting</h2>
  <p>New UTR submissions are pending verification.</p>
  <a href="${d.adminUrl}" style="display: inline-block; background: #0066ff; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Open Admin Panel →</a>
  <p style="color: #999; font-size: 12px; margin-top: 24px;">Borderland Admin Digest</p>
</div>`;

  return { subject, html, text };
}
