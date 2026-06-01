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
