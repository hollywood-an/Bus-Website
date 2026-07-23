import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt';
import { rateLimit, clientIp } from './rateLimit';
import * as feed from './feed';
import { getReportStore } from './store';
import { runAgentLoop, makeRunTurn } from './agent/loop';
import { TOOL_DEFS, dispatchTool, directiveFor } from './agent/tools';
import { validateReport } from './validateReport';
import { planTrip } from './planning/planTrip';
import { suggestPlaces } from './geo/suggest';
import type { AgentRequest, ChatMessage } from './types';

export const MODEL = process.env.AGENT_MODEL ?? 'claude-haiku-4-5';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173';
const MAX_MSG_CHARS = 4000;
const MAX_HISTORY = 12;

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const runTurn = makeRunTurn(anthropic, MODEL, SYSTEM_PROMPT, TOOL_DEFS);

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

// Per-route service state (is anything actually running?) for views that don't poll vehicles —
// the Crowding board must not render "no reports" as if an asleep route were fine.
app.get('/api/service', (c) =>
  c.json({
    source: feed.vehicleSource(),
    routes: feed.getRoutes().map((r) => ({ code: r.code, inService: feed.routeInService(r.code) })),
  }),
);

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

// Rough next-arrival estimate at a stop, from current bus positions (straight-line). Same estimator the
// get_next_arrival tool uses. Cheap read of cached state, so not rate-limited (like the other feed reads).
app.get('/api/arrivals', (c) => {
  const stop = c.req.query('stop') ?? '';
  if (!stop.trim()) return c.json({ error: 'missing_stop', estimates: [] }, 400);
  return c.json(feed.estimateArrivals(stop, c.req.query('route')));
});

// --- crowdsourced reports (server-owned; the fullness/down layer the official feed lacks) ---

// Rate-limit writes per client (id header, falling back to IP). The NAT caveat is documented.
const reportLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  key: (c) => c.req.header('x-client-id') || clientIp(c),
});
// Trip planning hits Google (geocoding/directions) — rate-limit per client.
const planLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  key: (c) => c.req.header('x-client-id') || clientIp(c),
});
// Typeahead is debounced client-side but still chatty — allow more, keyed the same way.
const suggestLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  key: (c) => c.req.header('x-client-id') || clientIp(c),
});

app.get('/api/reports', (c) => {
  const store = getReportStore();
  return c.json({ capacity: store.capacity(), down: store.down() });
});

app.post('/api/reports', reportLimiter, async (c) => {
  let body: { kind?: unknown; route?: unknown; level?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'bad_json' }, 400);
  }

  // Same validator the agent's action tool uses — a malformed write can't slip in even if a client
  // bypasses the agent and POSTs directly.
  const v = validateReport(body.kind, body.route, body.level);
  if (!v.ok) return c.json({ error: v.error }, 400);

  // A route with no buses in passenger service can't be "down" — it's asleep. Rejecting here (the
  // single write path) also covers the agent's confirm flow, so night riders can't paint an
  // off-schedule route red.
  if (v.kind === 'down' && !feed.routeInService(v.code)) {
    return c.json({ error: 'route_not_in_service' }, 409);
  }

  const reporterId = c.req.header('x-client-id') || clientIp(c);
  const store = getReportStore();
  const result = v.kind === 'capacity' ? store.addCapacity(v.code, v.level!, reporterId) : store.addDown(v.code, reporterId);
  return c.json({ ...result, capacity: store.capacity(), down: store.down() });
});

// Multi-modal trip planning (geocoded). Used by the Route Planner tab; the AI assistant reaches the
// same core via the plan_route tool.
app.get('/api/plan', planLimiter, async (c) => {
  const from = c.req.query('from') ?? '';
  const to = c.req.query('to') ?? '';
  if (!from.trim() || !to.trim()) return c.json({ error: 'missing_params' }, 400);
  const result = await planTrip(from, to);
  return c.json(result); // includes an `error` field if a location couldn't be resolved
});

// Planner typeahead: curated campus spots + Google Places autocomplete (display strings only).
app.get('/api/suggest', suggestLimiter, async (c) => {
  const suggestions = await suggestPlaces(c.req.query('q'));
  return c.json({ suggestions });
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

  // Run the real agent loop: the model fetches what it needs via tools — the prompt carries no data.
  return streamSSE(c, async (stream) => {
    try {
      await runAgentLoop({
        messages,
        runTurn,
        dispatch: dispatchTool,
        directiveFor,
        onText: (t) => stream.writeSSE({ data: JSON.stringify({ type: 'delta', text: t }) }),
        onEvent: (e) => stream.writeSSE({ data: JSON.stringify(e) }),
        log: (line) => console.log(line),
      });
    } catch (err) {
      // Don't leak internals; the client degrades to its offline responder on error.
      console.error('[agent] loop error:', (err as Error)?.message ?? err);
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
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const prev = out[out.length - 1];
    // The client splits one reply into several bubbles (text · trip map · text); the API wants
    // alternating roles, so consecutive same-role messages collapse into one.
    if (prev && prev.role === role) prev.content = `${prev.content}\n\n${content}`.slice(0, MAX_MSG_CHARS);
    else out.push({ role, content });
  }
  // Trim to budget FIRST, then drop any leading assistant turn the cut exposed — the other order
  // could hand the API a history starting mid-exchange.
  const recent = out.slice(-MAX_HISTORY);
  while (recent.length && recent[0]!.role !== 'user') recent.shift(); // Anthropic requires a leading user turn
  return recent;
}
