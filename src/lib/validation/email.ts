/**
 * SRM email format: two letters + four digits, e.g. ab1234@srmist.edu.in.
 *
 * Shared by the form (client) and every API route that accepts an email —
 * anything else (gmail, throwaway domains, random srmist aliases) is spam.
 */

export const DEFAULT_EMAIL_DOMAIN = 'srmist.edu.in';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function srmEmailRegex(domain: string = DEFAULT_EMAIL_DOMAIN): RegExp {
  return new RegExp(`^[a-z]{2}\\d{4}@${escapeRe(domain.toLowerCase())}$`);
}

export function isSrmEmail(email: unknown, domain: string = DEFAULT_EMAIL_DOMAIN): boolean {
  return typeof email === 'string' && srmEmailRegex(domain).test(email.trim().toLowerCase());
}

export const srmEmailMessage = (domain: string = DEFAULT_EMAIL_DOMAIN) =>
  `Use your SRM email, e.g. ab1234@${domain}`;
