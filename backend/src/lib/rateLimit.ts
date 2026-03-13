// Simple in-memory token-bucket rate limiter

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

// Clean up old buckets every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 600_000;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) {
      buckets.delete(key);
    }
  }
}, 600_000);

/**
 * Returns true if request is allowed, false if rate limited.
 * @param key       Unique key (e.g. "ip:1.2.3.4:route")
 * @param maxTokens Max requests in the window
 * @param windowMs  Rolling window in milliseconds
 */
export function checkRateLimit(key: string, maxTokens: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { tokens: maxTokens - 1, lastRefill: now });
    return true;
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor((elapsed / windowMs) * maxTokens);

  if (refill > 0) {
    bucket.tokens = Math.min(maxTokens, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    return false;
  }

  bucket.tokens -= 1;
  return true;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
