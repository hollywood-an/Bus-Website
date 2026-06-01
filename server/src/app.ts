import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt';
import { rateLimit } from './rateLimit';
import * as feed from './feed';
import type { AgentRequest, ChatMessage } from './types';

export const MODEL = process.env.AGENT_MODEL ?? 'claude-haiku-4-5';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173';
const MAX_TOKENS = 700;
const MAX_MSG_CHARS = 4000;
const MAX_HISTORY = 12;

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

export const app = new Hono();

app.use('/api/*', cors({ origin: ALLOWED_ORIGIN, allowMethods: ['GET', 'POST', 'OPTIONS'] }));
app.use('/api/agent', rateLimit({ windowMs: 60_000, max: 20 }));

app.get('/api/health', (c) =>
  c.json({ ok: true, model: MODEL, hasKey: Boolean(process.env.ANTHROPIC_API_KEY), feed: feed.feedStatus() }),
);

// --- OSU feed (route data is server-owned; reads fall back to fixtures, never error) ---

app.get('/api/routes', (c) => {
  const status = feed.feedStatus();
  return c.json({ routes: feed.getRoutes(), ...status });
});

app.get('/api/routes/:code', (c) => {
  const code = c.req.param('code').toUpperCase();
  const detail = feed.getRouteDetail(code);
  if (!detail) return c.json({ error: 'unknown_route' }, 404);
  const status = feed.feedStatus();
  return c.json({ ...detail, ...status });
});

app.get('/api/vehicles', (c) => {
  const status = feed.feedStatus();
  const route = c.req.query('route');
  const vehicles = route
    ? feed.getVehicles(route)
    : feed.getRoutes().flatMap((r) => feed.getVehicles(r.code));
  return c.json({
    route: route ? route.toUpperCase() : null,
    vehicles,
    source: feed.vehicleSource(),
    live: status.live,
    lastUpdated: status.lastUpdated,
  });
});

app.post('/api/agent', async (c) => {
  let body: AgentRequest;
  try {
    body = (await c.req.json()) as AgentRequest;
  } catch {
    return c.json({ error: 'bad_json' }, 400);
  }

  const messages = normalizeMessages(body?.messages);
  if (messages.length === 0) return c.json({ error: 'no_messages' }, 400);

  const context = typeof body?.context === 'string' ? body.context.slice(0, MAX_MSG_CHARS) : '';
  const system = context
    ? `${SYSTEM_PROMPT}\n\nCURRENT BUS STATUS (crowdsourced; may be sparse or stale):\n${context}`
    : SYSTEM_PROMPT;

  return streamSSE(c, async (stream) => {
    try {
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages,
        stream: true,
      });

      let stopReason: string | null = null;
      for await (const event of resp) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          await stream.writeSSE({ data: JSON.stringify({ type: 'delta', text: event.delta.text }) });
        } else if (event.type === 'message_delta') {
          stopReason = event.delta.stop_reason ?? stopReason;
        }
      }

      await stream.writeSSE({ data: JSON.stringify({ type: 'done', stop_reason: stopReason }) });
    } catch (err) {
      // Don't leak internals; the client degrades to its offline responder on error.
      console.error('[agent] error:', (err as Error)?.message ?? err);
      await stream.writeSSE({ data: JSON.stringify({ type: 'error', message: 'Agent unavailable' }) });
    }
  });
});

// Coerce arbitrary client input into a valid Anthropic message list: known roles, trimmed,
// length-capped, starting with a user turn, most-recent N kept. Exported for unit tests.
export function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const out: ChatMessage[] = [];
  for (const m of input as Array<{ role?: unknown; content?: unknown }>) {
    if (!m || typeof m.content !== 'string') continue;
    const content = m.content.slice(0, MAX_MSG_CHARS);
    if (!content.trim()) continue;
    out.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content });
  }
  while (out.length && out[0]!.role !== 'user') out.shift(); // Anthropic requires a leading user turn
  return out.slice(-MAX_HISTORY);
}
