import nodemailer, { type Transporter } from 'nodemailer';
import { getEnv } from '@/lib/env';
import type { EmailJob } from '@/lib/types';
import * as registered from './templates/registered';
import * as proofReceived from './templates/proofReceived';
import * as confirmed from './templates/confirmed';
import * as rejected from './templates/rejected';
import * as reminder from './templates/reminder';
import * as yourLink from './templates/yourLink';
import * as emailOtp from './templates/emailOtp';

/**
 * Nodemailer transport (Gmail SMTP 465 SSL).
 *
 * Reuses one transport across invocations.
 */

let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (transport) return transport;

  const env = getEnv();
  transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_APP_PASSWORD,
    },
  });

  return transport;
}

// ── Template registry ───────────────────────────────────────────────────────

type Attachment = { filename: string; content: Buffer; cid?: string; contentType?: string };

const templates: Record<string, {
  render: (data: Record<string, unknown>) => { subject: string; html: string; text: string };
  attachments?: (data: Record<string, unknown>) => Promise<Attachment[]>;
}> = {
  REGISTERED: registered,
  PROOF_RECEIVED: proofReceived,
  CONFIRMED: confirmed,
  REJECTED: rejected,
  REMINDER: reminder,
  YOUR_LINK: yourLink,
  EMAIL_OTP: emailOtp,
  EVENT_REMINDER: reminder, // reuse reminder template with different data
};

// ── Send a rendered email ───────────────────────────────────────────────────

export async function sendEmail(opts: {
  to: string | string[];
  cc?: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
}): Promise<string> {
  const env = getEnv();
  const t = getTransport();

  const info = await t.sendMail({
    from: env.MAIL_FROM,
    to: opts.to,
    cc: opts.cc,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    attachments: opts.attachments,
  });

  return info.messageId;
}

// ── Send a template email from an EmailJob document ─────────────────────────

export async function sendTemplateEmail(job: EmailJob): Promise<string> {
  const templateModule = templates[job.template];

  if (!templateModule) {
    throw new Error(`Unknown email template: ${job.template}`);
  }

  const { subject, html, text } = templateModule.render(job.templateData);
  const attachments = templateModule.attachments ? await templateModule.attachments(job.templateData) : undefined;

  return sendEmail({
    to: job.to,
    cc: job.cc,
    subject,
    html,
    text,
    attachments,
  });
}
