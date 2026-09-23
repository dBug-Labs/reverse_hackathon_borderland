export async function verifyTurnstileToken(
  token?: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // In development without secret key, or using test token, gracefully pass
  if (!secretKey || process.env.NODE_ENV === 'development' || !token) {
    if (!token && secretKey && process.env.NODE_ENV === 'production') {
      return { success: false, error: 'CAPTCHA token is required in production' };
    }
    return { success: true };
  }

  // Cloudflare test dummy keys
  if (token === 'XXXX.DUMMY.TOKEN.XXXX' || token.startsWith('test-')) {
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const outcome = await res.json();
    return { success: Boolean(outcome.success), error: outcome['error-codes']?.join(', ') };
  } catch (err: unknown) {
    console.error('Turnstile verification error:', err);
    return { success: false, error: 'CAPTCHA service unreachable' };
  }
}
