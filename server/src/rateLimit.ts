import type { Context, MiddlewareHandler } from 'hono';

// Minimal in-memory fixed-window rate limiter, keyed by client IP.
//
// NOTE (documented honestly in SECURITY.md): per-IP limiting is weak on a shared campus NAT —
// thousands of students can share an egress IP, so a window that's loose enough for them is loose
// for an abuser too. This is a basic abuse dampener, not a real identity control.
interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();

  return async (c, next) => {
    const ip = clientIp(c);
    const now = Date.now();

    let bucket = buckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
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
