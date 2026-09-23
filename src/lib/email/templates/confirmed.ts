/**
 * Email template: CONFIRMED — payment verified, here is your Entry Visa.
 *
 * The Visa is drawn inside the email itself; the attendance QR (plain team
 * code, e.g. "DBG-472") is attached inline as cid:visa-qr so mail clients
 * that block remote images still show it.
 *
 * Data: teamId, teamName, players[], venue, day1Date, day2Date, statusLink
 */
import QRCode from 'qrcode';
import { C, button, emailLayout, esc, label, playersTable } from '../layout';

type Data = {
  teamId: string;
  teamName: string;
  players: Array<{ fullName: string; regNo: string; isLeader: boolean }>;
  venue: string;
  day1Date: string;
  day2Date: string;
  statusLink?: string;
};

export async function attachments(data: Record<string, unknown>) {
  const d = data as Data;
  const png = await QRCode.toBuffer(d.teamId, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 360,
    color: { dark: '#1b1714', light: '#ffffff' },
  });
  return [{ filename: `${d.teamId}-visa-qr.png`, content: png, cid: 'visa-qr', contentType: 'image/png' }];
}

export function render(data: Record<string, unknown>) {
  const d = data as Data;

  const subject = `Payment verified — your Entry Visa for HACKBACK (${d.teamId})`;

  const playerList = d.players
    .map((p, i) => `${i + 1}. ${p.fullName} (${p.regNo})${p.isLeader ? ' — Team leader' : ''}`)
    .join('\n');

  const text = `Payment verified. Welcome to the Borderland, ${d.teamName}!

PLAYER VISA — ${d.teamId}
${playerList}

Day 1: ${d.day1Date}, 9 AM – 5 PM
Day 2: ${d.day2Date}, 9 AM – 5 PM
Venue: ${d.venue}
Starting Visa Points: 03

Show the attendance QR in this email at the check-in desk on both days.
Every player must bring their SRM ID card.

HACKBACK · dBug Labs`;

  const body = `
    <div style="text-align:center;padding:4px 0 6px;">
      ${label('Payment verified')}
      <div style="font-family:${C.display};font-size:40px;line-height:1.05;text-transform:uppercase;color:${C.ink};margin-top:6px;">Welcome to the Borderland</div>
      <p style="margin:12px 0 0;color:#4a423b;">Your payment is confirmed and your team&rsquo;s spot is locked. Here is your <strong>Entry Visa</strong> &mdash; keep this email handy for both days.</p>
    </div>

    <!-- The Visa -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;background:#fbf6ec;border:2px solid ${C.ink};border-radius:12px;">
      <tr><td style="padding:18px 20px 6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-family:${C.body};font-size:11px;font-weight:700;letter-spacing:3px;color:${C.red};">PLAYER VISA</td>
            <td align="right" style="font-family:${C.body};font-size:11px;font-weight:700;letter-spacing:2px;color:#2f7d4f;">&#9679; VALID</td>
          </tr>
        </table>
        <div style="font-family:${C.display};font-size:52px;line-height:1;color:${C.ink};margin-top:6px;">${esc(d.teamId)}</div>
        <div style="font-family:${C.body};font-size:16px;font-weight:700;color:${C.ink};margin-top:2px;">${esc(d.teamName)}</div>
      </td></tr>
      <tr><td style="padding:6px 20px;">${playersTable(d.players)}</td></tr>
      <tr><td style="padding:10px 20px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top" style="font-family:${C.body};font-size:13px;line-height:1.7;color:#4a423b;">
              <strong style="color:${C.ink};">Day 1</strong> · ${esc(d.day1Date)}<br>
              <strong style="color:${C.ink};">Day 2</strong> · ${esc(d.day2Date)}<br>
              9 AM – 5 PM · <strong style="color:${C.ink};">${esc(d.venue)}</strong><br>
              Starting Visa Points: <strong style="color:${C.red};">03</strong>
            </td>
            <td width="150" align="right" valign="top">
              <img src="cid:visa-qr" width="140" height="140" alt="Attendance QR for ${esc(d.teamId)}" style="display:block;border:0;border-radius:6px;">
              <div style="font-family:${C.body};font-size:10px;color:${C.muted};text-align:center;margin-top:4px;">Scan at check-in</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:16px 0 0;color:#4a423b;"><strong style="color:${C.red};">At the desk:</strong> show this QR on Day 1 and Day 2. Every player must carry their <strong>SRM ID card</strong> &mdash; we check it against the names above.</p>

    ${d.statusLink ? `<div style="text-align:center;margin:22px 0 10px;">${button(d.statusLink, 'View your status')}</div>` : ''}`;

  return { subject, html: emailLayout({ preheader: `${d.teamId} is confirmed — your Entry Visa is inside.`, bodyHtml: body }), text };
}
