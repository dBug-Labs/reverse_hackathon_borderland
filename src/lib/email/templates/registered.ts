/**
 * Email template: REGISTERED (Step 1 complete — pay now)
 *
 * Data: teamId, teamName, players[], amount, upiId, payeeName, qrString, resumeLink
 */

export function render(data: Record<string, unknown>) {
  const d = data as {
    teamId: string;
    teamName: string;
    players: Array<{ fullName: string; email: string; regNo: string; isLeader: boolean }>;
    amount: number;
    upiId: string;
    payeeName: string;
    resumeLink: string;
  };

  const playerList = d.players
    .map((p, i) => `${i + 1}. ${p.fullName} (${p.regNo})${p.isLeader ? ' — Leader' : ''}`)
    .join('\n');

  const playerListHtml = d.players
    .map((p, i) => `<li>${p.fullName} (${p.regNo})${p.isLeader ? ' — <strong>Leader</strong>' : ''}</li>`)
    .join('');

  const subject = `You've entered the Borderland — complete your payment (${d.teamId})`;

  const text = `Team ${d.teamId} — ${d.teamName}

Your team has been registered! Complete your payment to confirm your spot.

Players:
${playerList}

Payment Details:
Amount: ₹${d.amount}
UPI ID: ${d.upiId}
Payee: ${d.payeeName}

IMPORTANT: Add "${d.teamId}" in the payment note/remarks.

After paying, submit your 12-digit UTR here:
${d.resumeLink}

If you close this page, use the link above to resume anytime.

— Borderland · SRM DBUG Labs`;

  const html = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 32px; border-radius: 12px;">
  <h1 style="color: #00ff88; font-size: 24px; margin-bottom: 4px;">Welcome to the Borderland</h1>
  <p style="color: #888; margin-top: 0;">Team <strong style="color: #fff;">${d.teamId}</strong> — ${d.teamName}</p>

  <div style="background: #1a1a2e; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <h3 style="color: #00ff88; margin-top: 0;">Your Team</h3>
    <ul style="padding-left: 20px; margin: 0;">${playerListHtml}</ul>
  </div>

  <div style="background: #1a1a2e; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <h3 style="color: #ff6b6b; margin-top: 0;">Complete Your Payment</h3>
    <p><strong>Amount:</strong> ₹${d.amount}</p>
    <p><strong>UPI ID:</strong> <code style="background: #333; padding: 2px 8px; border-radius: 4px;">${d.upiId}</code></p>
    <p><strong>Payee:</strong> ${d.payeeName}</p>
    <p style="color: #ffcc00; font-weight: bold;">⚠️ Add "${d.teamId}" in the payment note/remarks</p>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${d.resumeLink}" style="display: inline-block; background: #00ff88; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Submit Payment Proof →</a>
  </div>

  <p style="color: #666; font-size: 13px;">If you close the page, use the button above to resume anytime.</p>
  <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
  <p style="color: #555; font-size: 12px; text-align: center;">Borderland · SRM DBUG Labs</p>
</div>`;

  return { subject, html, text };
}
