# Security model

Buckeye Transit is a public, anonymous, campus-scale web app: a Vite/React client, a Hono + TypeScript
proxy (`server/`), a Claude agent, the OSU bus feed, and a crowdsourced "how full is it" layer in
SQLite. This document is an honest threat model. It states what each control actually does and, just as
importantly, where it stops. Input validation and rate limiting are the floor, not the fix; where a
control is a dampener rather than a real defense, it says so.

There are no user accounts and no secrets in the browser. The trust boundary is the proxy: the client
is untrusted, the proxy validates everything, and the model never writes to anything on its own.

## At a glance

| Surface | Control | Honest limitation |
| --- | --- | --- |
| Model / API keys | Server-side only, behind the proxy | None in the bundle; relies on `server/.env` staying server-side |
| AI cost / bill run-up | Rate limit + a **hard monthly spend cap** in the Anthropic console | The cap is the true ceiling; the rate limit alone is IP-spoofable |
| Report writes | Shared validator on both the endpoint and the agent tool | Anonymous; identity is a client-supplied id |
| Report poisoning | Needs 2 distinct reporters to confirm + median aggregate | A coordinated 2-person pair can still flip a status |
| Abuse / spam | Per-client in-memory rate limit | Weak on shared campus NAT; the key is spoofable |
| CORS | Locked to `ALLOWED_ORIGIN` | Not a defense against non-browser clients |
| Agent loop | Iteration cap + private-field stripping + message caps | Prompt-injection of tool *arguments* is constrained, not eliminated |
| Errors | Generic message to client, details to server log | None significant |

## Keys are server-side, not bundled

The original hackathon build called the model directly from the browser, so Vite inlined the model key
into the shipped JS (extractable from any deploy). That is the real leak the proxy closes.

- `ANTHROPIC_API_KEY` is read only by the Anthropic SDK from the environment (`server/src/app.ts:20`).
- `GOOGLE_MAPS_SERVER_KEY` is read only server-side for geocoding and directions
  (`server/src/geo/geocode.ts`, `server/src/geo/directions.ts`), and is sent only to Google (in a request
  header, or a URL query param for the Geocoding fallback), never to the browser.
- Both live in `server/.env`, which is gitignored; `server/.env.example` ships placeholders only.
- The only key in the client bundle is `VITE_GOOGLE_MAPS_API_KEY` (`bus-capacity-tracker/src/lib/loadMaps.js:21`),
  which is a browser Maps JS key and is *meant* to be public. It must be HTTP-referrer + API restricted (see below).
- `GET /api/health` exposes `hasKey: Boolean(process.env.ANTHROPIC_API_KEY)`, a boolean only, never the key.

**Limitation:** this protects against bundle extraction, not against someone with access to the server
host or its environment. Standard server hygiene (don't commit `.env`, scope deploy secrets) still applies.

## Writes are validated server-side

Every write goes through one validator, `validateReport` (`server/src/validateReport.ts`): the route
must exist in the live route set, and a capacity level must be an integer 0 to 4. Invalid input returns a
safe error object and never throws.

The important property is that the validator gates **both** paths:

- `POST /api/reports` (`server/src/app.ts:92`), the direct HTTP path, and
- the `submit_capacity_report` agent tool.

So a malformed or out-of-range write cannot slip in even if a client skips the agent and POSTs directly.
The agent never writes on its own: action tools only *propose*, the user confirms in the UI, and the
client then POSTs. Reports are stored with parameterized SQLite statements (`better-sqlite3`), so there
is no SQL injection surface. Covered by `server/src/validateReport.test.ts`.

## Report poisoning (anonymous crowdsourcing)

Reports are anonymous by design; this is a campus convenience tool, not an authenticated system. Anyone
can submit, so the aggregate is hardened rather than the writer (`server/src/store/reportStore.ts`):

- A status only **flips** (a "very full" badge, or a route shown as "down") once it is corroborated by
  **2 distinct reporters** (`CONFIRM_THRESHOLD`, lines 8, 152, 167). A single report is surfaced as
  unconfirmed and the agent is told to treat it as weak.
- Capacity uses a robust aggregate (`robustLevel`, line 175): a true **median** once there are 3+
  reports, so a single outlier cannot swing a well-corroborated level. With only 1 to 2 reports it falls
  back to the rounded mean, so at the exact 2-reporter point a status first confirms, one outlier can
  still move the displayed level by half its distance. Median robustness kicks in as more honest reports
  accumulate; it is not a guarantee at the confirmation boundary.
- Reports **decay** on read (30 min capacity / 60 min down), so stale or one-off noise ages out.

**Limitation, stated plainly:** distinct-reporter counting keys off a client-supplied id
(`x-client-id`, falling back to IP, `server/src/app.ts:95`), which is **spoofable**. The IP fallback is
no stronger: `clientIp` trusts the `X-Forwarded-For` header (`server/src/rateLimit.ts:50`), which a
client can also forge. A determined pair of
clients (or one client with two ids) can still reach the threshold and flip a status. Raising the
threshold would chill legitimate crowdsourcing, which is the whole point of the app. This is a
game-theory trade-off, not a solved problem. Real abuse resistance would require accounts or device
attestation, which is out of scope.

## Rate limiting

A minimal in-memory fixed-window limiter (`server/src/rateLimit.ts`) caps per-client request rates:
agent 10/min, report writes 15/min, trip planning 30/min (hits Google), suggest 60/min. Over the limit
returns `429` with `Retry-After`. Covered by `server/src/rateLimit.test.ts`.

**Limitation, stated plainly:** this is a basic abuse dampener, **not an identity control**. Thousands of
OSU students share NAT'd egress IPs, so any window loose enough not to block a lecture hall letting out is
also loose for an abuser. The keys are spoofable either way: the agent endpoint keys on client IP via the
trusted `X-Forwarded-For` header, while the report and plan endpoints key on the client-supplied
`x-client-id` (falling back to that same IP). The limiter is in-memory, so it is correct **only on a
single long-lived instance** (the production backend runs on one Railway service, not serverless); it
resets on restart and would be defeated across horizontally-scaled replicas without a shared store.

## AI cost — the real backstop is a spend cap

The concern behind a public AI endpoint is a bill run-up. Two layers:

- **Per-request cost is bounded by design:** the default model is Claude Haiku (cheapest), each turn is
  capped at `max_tokens: 1024`, the loop runs at most 8 tool round-trips, and history is capped at 12
  turns × 4000 chars. So a single request is cheap; the only risk is *volume*.
- **Volume is capped by a hard monthly spend limit** set in the Anthropic console (Billing → Usage
  limits). This is the one control that *physically* cannot be exceeded regardless of any code path,
  spoofed IP, or rotated client id — the rate limiter slows abuse, the spend cap ends it. Setting it is
  a deploy prerequisite (operator checklist below). A bot challenge (e.g. Turnstile) on the agent
  endpoint is the next step if abuse ever materializes; the spend cap makes it unnecessary to start.

## CORS and transport

`/api/*` is locked to a single `ALLOWED_ORIGIN` (default `http://localhost:5173`, set to the deployed
frontend origin in production) with methods restricted to `GET`, `POST`, `OPTIONS` and request headers to
`Content-Type` + `x-client-id`. In production the frontend (Vercel) and backend (Railway) are different
origins, so the browser calls the backend cross-origin and this allow-list is what lets the real client
through while rejecting others' browser origins.

**Limitation:** CORS is a browser policy. It stops other *web origins* from using these endpoints in a
user's browser; it does nothing against a script or curl. The real write protections are validation and
rate limiting above (and, for cost, the spend cap).

## Agent loop safety

- **Iteration cap:** the loop runs at most 8 tool round-trips then gives up gracefully
  (`server/src/agent/loop.ts`, `DEFAULT_MAX_ITERS`), so a misbehaving model cannot loop forever.
- **Context hygiene:** `stripPrivate` removes `_`-prefixed keys from each tool result before it re-enters
  the model's context (`server/src/agent/loop.ts`), so map geometry and other client-only payloads never
  reach the model (smaller context, less to leak or confuse).
- **Input bounds:** incoming messages are normalized to known roles, trimmed, capped at 4000 chars each
  and the most recent 12 turns (`normalizeMessages`, `server/src/app.ts:144`), and the request body
  carries only the conversation, never an app-state snapshot the server would have to trust.

**Limitation:** tool *arguments* still originate from model output influenced by user text, so
prompt-injection that tries to steer a tool call is constrained (every tool validates its own inputs, and
writes need explicit user confirmation) but not categorically eliminated. The blast radius is small: the
only writes are anonymous, validated, rate-limited, decaying bus reports.

## Error handling

The agent stream catches errors, logs details to the server console only, and sends the client a generic
`{ type: 'error', message: 'Agent unavailable' }` (`server/src/app.ts:137`). The client then degrades to
an offline responder. Other routes return plain status codes (400 bad JSON, 404 unknown route, 429 rate
limited). No stack traces or internals reach the client.

## Operator checklist (deployment)

Code cannot enforce these; they are configured in the Google Cloud Console, the Anthropic console, and the
hosts. Do these **before** making the repo public or sharing the live URL:

- **Rotate every key that ever touched git history.** An early commit included a real OpenAI key in
  `bus-tracker-backend/.env` (the legacy Python backend, since deleted). The value is recoverable from
  history until scrubbed, so it must be **revoked** at platform.openai.com and the history purged
  (`git filter-repo --path bus-tracker-backend/.env --invert-paths`, then force-push) before publishing.
  It's unused by the current code (which uses Anthropic), so revoking has no app impact.
- **Anthropic monthly spend cap** (Billing → Usage limits): the hard ceiling on AI cost. Set it.
- **Browser Maps key** (`VITE_GOOGLE_MAPS_API_KEY`): restrict by **HTTP referrer** to the deployed Vercel
  origin (plus `localhost` for dev), and by API to the **Maps JavaScript API** only.
- **Server Maps key** (`GOOGLE_MAPS_SERVER_KEY`): restrict by API to **Geocoding + Places + Routes** only;
  add an **IP** restriction if the host exposes a static outbound IP (Railway may not — the key is
  server-only and never bundled, so API-restriction alone is an acceptable posture).
- **`ALLOWED_ORIGIN`** (Railway env) = the real Vercel frontend origin. **`VITE_API_BASE`** (Vercel env) =
  the Railway backend origin. **`SEED_DEMO=false`** and **`REPORTS_DB=/data/reports.db`** (volume) in prod.
- Keep `server/.env` out of version control (already gitignored) and out of the client build.

## Out of scope

Accounts / auth, device attestation, a distributed (cross-replica) rate-limit or report store, and
defense against a compromised server host. These are deliberate omissions for an anonymous campus tool,
documented here rather than papered over.
