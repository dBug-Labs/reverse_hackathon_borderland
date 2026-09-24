/**
 * Shared HTML frame for HACKBACK emails, in the poster style:
 * dark page, HACKBACK wordmark, an aged playing-card panel with red border
 * and suit corners, then organiser contacts.
 *
 * Table-based with inline styles so it survives Gmail / Outlook.
 */
import { CONTACTS, CONTACT_EMAIL } from '@/components/contacts';

export const C = {
  page: '#0b0a09',
  paper: '#f2e9d8',
  ink: '#1b1714',
  red: '#b3202a',
  muted: '#6b6259',
  display: "Impact, 'Anton', 'Arial Narrow Bold', 'Helvetica Neue', Arial, sans-serif",
  body: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

export const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function appUrl(): string {
  return (process.env.APP_URL || '').replace(/\/$/, '');
}

/** Small uppercase red label */
export const label = (text: string) =>
  `<div style="font-family:${C.body};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.red};">${esc(text)}</div>`;

/** Red call-to-action button */
export const button = (href: string, text: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:${C.red};color:#ffffff;font-family:${C.body};font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;">${esc(text)}</a>`;

/** WhatsApp call-to-action button */
export const whatsappButton = (href: string, text = 'Join WhatsApp Community') =>
  `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#25D366;color:#111b21;font-family:${C.body};font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${esc(text)} &rarr;</a>`;

export function emailLayout(opts: { preheader: string; bodyHtml: string }): string {
  const wordmark = `${appUrl()}/brand/hackback-wordmark.png`;
  const contacts = CONTACTS.map(
    (c) => `${esc(c.name)} (${esc(c.role)}) · <a href="tel:+91${c.phone}" style="color:#d9ccb2;text-decoration:none;">+91 ${c.phone.slice(0, 5)} ${c.phone.slice(5)}</a>`
  ).join('<br>');

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td align="center" style="padding:0 0 24px;">
        <img src="${wordmark}" width="300" alt="HACKBACK — Play the reverse. Find the answer." style="display:block;width:300px;max-width:80%;height:auto;border:0;color:#f5eee1;font-family:${C.display};font-size:40px;">
      </td></tr>

      <tr><td style="background:${C.paper};border-radius:16px;padding:10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.red};border-radius:10px;">
          <tr>
            <td style="padding:10px 14px 0;font-size:18px;color:${C.ink};">&#9824;</td>
            <td align="right" style="padding:10px 14px 0;font-size:18px;color:${C.red};">&#9829;</td>
          </tr>
          <tr><td colspan="2" style="padding:4px 28px 8px;font-family:${C.body};color:${C.ink};font-size:15px;line-height:1.6;">
            ${opts.bodyHtml}
          </td></tr>
          <tr>
            <td style="padding:0 14px 10px;font-size:18px;color:${C.red};">&#9830;</td>
            <td align="right" style="padding:0 14px 10px;font-size:18px;color:${C.ink};">&#9827;</td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="padding:24px 8px 0;font-family:${C.body};font-size:12px;line-height:1.7;color:#8a8076;text-align:center;">
        HACKBACK · 5 &amp; 6 October, 9 AM – 5 PM · TP2 712, SRM IST<br>
        Questions? ${contacts}<br>
        <a href="mailto:${CONTACT_EMAIL}" style="color:#d9ccb2;">${CONTACT_EMAIL}</a> · Instagram <a href="https://www.instagram.com/dbuglabs/" style="color:#d9ccb2;">@dbuglabs</a><br>
        <span style="color:#5c544c;">dBug Labs · SRM Institute of Science and Technology</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Players as a simple two-column list (name, register number). */
export function playersTable(players: Array<{ fullName: string; regNo: string; isLeader: boolean }>): string {
  const suits = ['&#9824;', '&#9829;', '&#9830;', '&#9827;'];
  const reds = [false, true, true, false];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${C.body};font-size:14px;color:${C.ink};">
    ${players
      .map(
        (p, i) => `<tr>
      <td width="22" style="padding:6px 0;color:${reds[i] ? C.red : C.ink};">${suits[i] || '&#9824;'}</td>
      <td style="padding:6px 0;font-weight:600;">${esc(p.fullName)}${p.isLeader ? ` <span style="font-weight:400;color:${C.muted};">· Team leader</span>` : ''}</td>
      <td align="right" style="padding:6px 0;color:${C.muted};letter-spacing:0.5px;">${esc(p.regNo)}</td>
    </tr>`
      )
      .join('')}
  </table>`;
}
