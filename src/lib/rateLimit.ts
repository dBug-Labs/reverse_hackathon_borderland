interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (record.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function checkRateLimit(
  identifier: string,
  action: string,
  options: RateLimitOptions = { windowMs: 10 * 60 * 1000, max: 10 }
): { success: boolean; remaining: number; resetAt: number } {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    memoryStore.set(key, newRecord);
    return { success: true, remaining: options.max - 1, resetAt: newRecord.resetAt };
  }

  if (record.count >= options.max) {
    return { success: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { success: true, remaining: options.max - record.count, resetAt: record.resetAt };
}
