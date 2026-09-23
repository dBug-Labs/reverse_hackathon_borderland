/**
 * Email template: CONFIRMED (payment verified — Entry Visa issued)
 *
 * Data: teamId, teamName, players[], venue, day1Date, day2Date, visaLink, statusLink
 */

export function render(data: Record<string, unknown>) {
  const d = data as {
    teamId: string;
    teamName: string;
    players: Array<{ fullName: string; regNo: string; isLeader: boolean }>;
    venue: string;
    day1Date: string;
    day2Date: string;
    visaLink: string;
    statusLink: string;
  };

  const playerList = d.players
    .map((p, i) => `${i + 1}. ${p.fullName} (${p.regNo})${p.isLeader ? ' — Leader' : ''}`)
    .join('\n');

  const playerListHtml = d.players
    .map((p) => `<li>${p.fullName} <span style="color: #888;">(${p.regNo})</span>${p.isLeader ? ' — <strong>Leader</strong>' : ''}</li>`)
    .join('');

  const subject = `GAME CLEAR — your Entry Visa is issued (${d.teamId})`;

  const text = `GAME CLEAR! Team ${d.teamId} — ${d.teamName}

Your payment has been verified. Your Entry Visa is ready!

Players:
${playerList}

Event Details:
Venue: ${d.venue}
Day 1: ${d.day1Date}
Day 2: ${d.day2Date}

View & Download Your Entry Visa: ${d.visaLink}

IMPORTANT:
- Bring your SRM ID card — it will be checked at the gate
- Show your Entry Visa QR code at attendance

— Borderland · SRM DBUG Labs`;

  const html = `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 32px; border-radius: 12px;">
  <h1 style="color: #00ff88; font-size: 28px; margin-bottom: 4px;">🎮 GAME CLEAR</h1>
  <p style="color: #888; margin-top: 0;">Team <strong style="color: #fff;">${d.teamId}</strong> — ${d.teamName}</p>

  <div style="background: linear-gradient(135deg, #0a2e1a 0%, #1a1a2e 100%); padding: 20px; border-radius: 8px; margin: 16px 0; border: 1px solid #00ff8844;">
    <h3 style="color: #00ff88; margin-top: 0;">✅ Payment Verified — Visa Issued</h3>
    <p>Your Entry Visa is ready. Download it and keep it handy for both event days.</p>
  </div>

  <div style="background: #1a1a2e; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <h3 style="color: #fff; margin-top: 0;">Your Team</h3>
    <ul style="padding-left: 20px; margin: 0;">${playerListHtml}</ul>
  </div>

  <div style="background: #1a1a2e; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <h3 style="color: #fff; margin-top: 0;">Event Details</h3>
    <p>📍 <strong>Venue:</strong> ${d.venue}</p>
    <p>📅 <strong>Day 1:</strong> ${d.day1Date}</p>
    <p>📅 <strong>Day 2:</strong> ${d.day2Date}</p>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${d.visaLink}" style="display: inline-block; background: #00ff88; color: #000; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">View Entry Visa & QR →</a>
  </div>

  <div style="background: #2a1a0a; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #ffcc00;">
    <p style="margin: 0; color: #ffcc00; font-weight: bold;">⚠️ Bring your SRM ID card</p>
    <p style="margin: 4px 0 0 0; color: #ccc; font-size: 13px;">ID cards will be checked against the player list at the gate.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">
  <p style="color: #555; font-size: 12px; text-align: center;">Borderland · SRM DBUG Labs</p>
</div>`;

  return { subject, html, text };
}
