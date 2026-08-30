import type { Context, MiddlewareHandler } from 'hono';

// Minimal in-memory fixed-window rate limiter, keyed by client IP (or an x-client-id when the
// caller supplies one).
//
// DEPLOY ASSUMPTION: correct only on a single long-lived instance (the app runs on Railway, not
// serverless) — the counters live in this process's memory. If this ever moves to horizontally
// scaled or serverless functions, back it with a shared store (Redis/KV) or the limit is defeated.
//
// NOTE (documented honestly in SECURITY.md): per-IP limiting is weak on a shared campus NAT —
// thousands of students can share an egress IP, so a window loose enough for them is loose for an
// abuser too. This is an abuse dampener, not an identity control; the real bill backstop is the
// hard monthly spend cap set in the Anthropic console.
interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit({
  windowMs,
  max,
  key,
}: {
  windowMs: number;
  max: number;
  key?: (c: Context) => string;
}): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();

  return async (c, next) => {
    const id = (key ? key(c) : clientIp(c)) || 'unknown';
    const now = Date.now();

    let bucket = buckets.get(id);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(id, bucket);
    }
    bucket.count++;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      return c.json({ error: 'rate_limited', retryAfter }, 429, { 'Retry-After': String(retryAfter) });
    }

    // Opportunistic cleanup so the map can't grow unbounded.
    if (buckets.size > 5000) {
      for (const [key, b] of buckets) if (now > b.resetAt) buckets.delete(key);
    }

    await next();
  };
}

export function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  // @hono/node-server exposes the raw Node request on c.env.incoming
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming;
  return incoming?.socket?.remoteAddress ?? 'unknown';
}
