/**
 * Email template: REMINDER (unpaid 24h reminder)
 *
 * Data: teamId, teamName, resumeLink, deadline, amount
 */

export function render(data: Record<string, unknown>) {
  const d = data as {
    teamId: string;
    teamName: string;
    resumeLink: string;
    deadline: string;
    amount: number;
  };

  const subject = `Your spot isn't locked yet (${d.teamId})`;

  const text = `Team ${d.teamId} — ${d.teamName}

You registered 24 hours ago but haven't submitted your payment proof yet.

Your registration expires on ${d.deadline}. Pay ₹${d.amount} and submit your UTR to lock your spot:

${d.resumeLink}

— Borderland · SRM DBUG Labs`;

  const html = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 32px; border-radius: 12px;">
  <h1 style="color: #ffcc00; font-size: 24px; margin-bottom: 4px;">⏳ Your Spot Isn't Locked Yet</h1>
  <p style="color: #888; margin-top: 0;">Team <strong style="color: #fff;">${d.teamId}</strong> — ${d.teamName}</p>

  <div style="background: #2a2a0a; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ffcc00;">
    <p style="margin: 0;">You registered 24 hours ago but haven't submitted your payment proof yet.</p>
    <p style="margin: 8px 0 0 0;"><strong>Deadline:</strong> ${d.deadline}</p>
    <p style="margin: 4px 0 0 0;"><strong>Amount:</strong> ₹${d.amount}</p>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${d.resumeLink}" style="display: inline-block; background: #ffcc00; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Complete Payment →</a>
  </div>

  <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
  <p style="color: #555; font-size: 12px; text-align: center;">Borderland · SRM DBUG Labs</p>
</div>`;

  return { subject, html, text };
}
