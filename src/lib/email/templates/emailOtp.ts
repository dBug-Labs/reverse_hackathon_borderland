/**
 * Email template: EMAIL_OTP — leader email verification code, sent before payment.
 *
 * Data: code
 */
import { C, emailLayout, esc, label } from '../layout';

export function render(data: Record<string, unknown>) {
  const d = data as { code: string };

  const subject = `${d.code} is your HACKBACK verification code`;

  const text = `Your HACKBACK verification code is ${d.code}

Enter it on the registration page to verify your SRM email. It expires in 10 minutes.

Didn't try to register? Ignore this email.

dBug Labs`;

  const body = `
    <div style="text-align:center;padding:4px 0 8px;">
      ${label('Verify your email')}
      <div style="font-family:${C.display};font-size:56px;line-height:1.05;letter-spacing:8px;color:${C.ink};margin-top:10px;">${esc(d.code)}</div>
      <p style="margin:14px 0 0;color:#4a423b;">Enter this code on the registration page to verify your SRM email. It expires in <strong>10 minutes</strong>.</p>
      <p style="margin:14px 0 0;font-size:13px;color:${C.muted};">Didn&rsquo;t try to register? Just ignore this email.</p>
    </div>`;

  return { subject, html: emailLayout({ preheader: `Your code is ${d.code}`, bodyHtml: body }), text };
}
