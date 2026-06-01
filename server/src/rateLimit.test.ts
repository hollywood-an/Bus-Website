import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { rateLimit } from './rateLimit';

// Backs the "rate limiting" section of SECURITY.md: the limiter allows N requests per window then
// 429s, and keys are independent. (The honest caveat that the key is spoofable / weak on NAT lives in
// the doc, not here — this only proves the mechanism does what it claims.)
function makeApp(max: number, windowMs = 60_000) {
  const app = new Hono();
  app.use('*', rateLimit({ windowMs, max, key: (c) => c.req.header('x-client-id') || 'anon' }));
  app.get('/', (c) => c.text('ok'));
  return app;
}
const hit = (app: Hono, id: string) => app.request('/', { headers: { 'x-client-id': id } });

describe('rateLimit', () => {
  it('allows up to max, then returns 429 with a Retry-After', async () => {
    const app = makeApp(3);
    for (let i = 0; i < 3; i++) expect((await hit(app, 'a')).status).toBe(200);

    const blocked = await hit(app, 'a');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(await blocked.json()).toMatchObject({ error: 'rate_limited' });
  });

  it('tracks separate buckets per client key', async () => {
    const app = makeApp(1);
    expect((await hit(app, 'a')).status).toBe(200);
    expect((await hit(app, 'a')).status).toBe(429); // client a exhausted
    expect((await hit(app, 'b')).status).toBe(200); // client b is independent
  });

  it('opens a fresh window after windowMs elapses', async () => {
    vi.useFakeTimers();
    try {
      const app = makeApp(1, 1000);
      expect((await hit(app, 'a')).status).toBe(200);
      expect((await hit(app, 'a')).status).toBe(429);
      vi.advanceTimersByTime(1001);
      expect((await hit(app, 'a')).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });
});
