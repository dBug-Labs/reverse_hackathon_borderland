import { getEnv } from '@/lib/env';

/**
 * Server-side Cloudflare Turnstile token verification.
 *
 * Checks:
 * 1. Token is present
 * 2. Cloudflare siteverify returns success
 * 3. Hostname matches our domain (prevents token reuse across sites)
 * 4. Action matches what we expected (prevents token reuse across forms)
 *
 * If Cloudflare is unreachable → reject (fail safe).
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface SiteverifyResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
  challenge_ts?: string;
  // Set by Cloudflare when the secret is one of its public test keys (local dev only)
  metadata?: { result_with_testing_key?: boolean };
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  expectedAction: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!token) {
    return { ok: false, reason: 'No Turnstile token provided' };
  }

  const env = getEnv();
  let result: SiteverifyResponse;

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });
    result = await res.json() as SiteverifyResponse;
  } catch {
    // Cloudflare unreachable → fail safe
    return { ok: false, reason: 'Turnstile verification service unreachable' };
  }

  if (!result.success) {
    return {
      ok: false,
      reason: `Turnstile verification failed: ${result['error-codes']?.join(', ') || 'unknown error'}`,
    };
  }

  // Check hostname — prevents token reuse across different domains
  // Cloudflare's test keys always answer with hostname "example.com", so skip the
  // check for them; production uses a real secret and never gets a test result.
  const allowedHost = new URL(env.APP_URL).hostname;
  if (
    !result.metadata?.result_with_testing_key &&
    result.hostname &&
    result.hostname !== allowedHost &&
    result.hostname !== 'localhost' &&
    result.hostname !== '127.0.0.1'
  ) {
    return {
      ok: false,
      reason: `Turnstile hostname mismatch: expected ${allowedHost}, got ${result.hostname}`,
    };
  }

  // Check action — prevents a "register" token being used on "payment"
  if (result.action && result.action !== expectedAction) {
    return {
      ok: false,
      reason: `Turnstile action mismatch: expected ${expectedAction}, got ${result.action}`,
    };
  }

  return { ok: true };
}
