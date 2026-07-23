import { describe, it, expect } from 'vitest';
import { app, normalizeMessages } from './app';

describe('normalizeMessages', () => {
  it('drops entries with non-string or empty content', () => {
    expect(
      normalizeMessages([
        { role: 'user', content: 'hi' },
        { role: 'user', content: '   ' },
        { role: 'user', content: 5 },
        null,
      ]),
    ).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('coerces unknown roles to user and preserves assistant', () => {
    expect(
      normalizeMessages([
        { role: 'system', content: 'a' },
        { role: 'assistant', content: 'b' },
      ]),
    ).toEqual([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ]);
  });

  it('drops leading assistant turns (Anthropic requires a leading user turn)', () => {
    expect(
      normalizeMessages([
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'how do I get to RPAC' },
      ]),
    ).toEqual([{ role: 'user', content: 'how do I get to RPAC' }]);
  });

  it('keeps only the most recent 12 turns', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
    }));
    const out = normalizeMessages(many);
    expect(out).toHaveLength(12);
    expect(out[0]).toEqual({ role: 'user', content: 'm8' });
  });

  it('merges consecutive same-role turns (the client splits replies around trip maps)', () => {
    expect(
      normalizeMessages([
        { role: 'user', content: 'take me to rpac' },
        { role: 'assistant', content: 'Let me grab those directions.' },
        { role: 'assistant', content: 'Scooter wins at 5 min.' },
        { role: 'user', content: 'thanks' },
      ]),
    ).toEqual([
      { role: 'user', content: 'take me to rpac' },
      { role: 'assistant', content: 'Let me grab those directions.\n\nScooter wins at 5 min.' },
      { role: 'user', content: 'thanks' },
    ]);
  });

  it('drops a leading assistant turn exposed by the history cut', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
    }));
    const out = normalizeMessages(many);
    expect(out).toHaveLength(11);
    expect(out[0]).toEqual({ role: 'user', content: 'm10' });
  });

  it('returns [] for non-array input', () => {
    expect(normalizeMessages('nope')).toEqual([]);
    expect(normalizeMessages(undefined)).toEqual([]);
  });
});

describe('routes', () => {
  it('GET /api/health returns ok + model', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; model: string };
    expect(body.ok).toBe(true);
    expect(typeof body.model).toBe('string');
  });

  it('GET /api/service reports per-route in-service state', async () => {
    const res = await app.request('/api/service');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { source: string; routes: Array<{ code: string; inService: boolean }> };
    expect(body.source).toBe('mock'); // pinned in vitest config
    expect(body.routes.length).toBeGreaterThanOrEqual(6);
    // Mock buses always predict stops, so every fixture route is in service under test.
    expect(body.routes.every((r) => r.inService === true)).toBe(true);
  });

  it('POST /api/reports accepts a down report for an in-service route (mock mode)', async () => {
    // The out-of-service 409 guard can't fire in mock mode (always in service); this locks in the
    // happy path so the guard never over-rejects.
    const res = await app.request('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-id': 'test-client-guard' },
      body: JSON.stringify({ kind: 'down', route: 'CC' }),
    });
    expect(res.status).toBe(200);
  });

  it('POST /api/agent rejects empty message list', async () => {
    const res = await app.request('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('no_messages');
  });

  it('POST /api/agent rejects malformed JSON', async () => {
    const res = await app.request('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('bad_json');
  });
});
