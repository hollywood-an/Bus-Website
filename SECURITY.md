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
agent 20/min (`app.ts:26`), report writes 15/min (`app.ts:65`), trip planning 30/min (`app.ts:71`, it
hits Google). Over the limit returns `429` with `Retry-After`. Covered by `server/src/rateLimit.test.ts`.

**Limitation, stated plainly:** this is a basic abuse dampener, **not an identity control**. Thousands of
OSU students share NAT'd egress IPs, so any window loose enough not to block a lecture hall letting out is
also loose for an abuser. The keys are spoofable either way: the agent endpoint keys on client IP via the
trusted `X-Forwarded-For` header (`server/src/app.ts:26` uses the default `clientIp`), while the report
and plan endpoints key on the client-supplied `x-client-id` (falling back to that same IP). It exists to
slow accidental floods and trivial spam, nothing stronger. The state is also in-memory, so it resets on
restart and is per-instance (it does not coordinate across multiple server replicas).

## CORS and transport

`/api/*` is locked to a single `ALLOWED_ORIGIN` (`server/src/app.ts:25`, default `http://localhost:5173`,
set to the deployed client origin in production) with methods restricted to `GET`, `POST`, `OPTIONS`.

**Limitation:** CORS is a browser policy. It stops other *web origins* from using these endpoints in a
user's browser; it does nothing against a script or curl. The real write protections are validation and
rate limiting above.

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

Code cannot enforce these; they are configured in the Google Cloud Console and the host:

- **Browser Maps key** (`VITE_GOOGLE_MAPS_API_KEY`): restrict by **HTTP referrer** to the deployed
  origin, and by API to the **Maps JavaScript API** only.
- **Server Maps key** (`GOOGLE_MAPS_SERVER_KEY`): restrict by **IP** to the server, and by API to
  **Geocoding + Places + Directions** only. Do not referrer-restrict it (there is no referrer).
- Set `ALLOWED_ORIGIN` to the real client origin.
- Keep `server/.env` out of version control (already gitignored) and out of the client build.
- Revoke any key that has ever been committed or bundled, including the legacy `VITE_OPENAI_API_KEY` from
  the original browser-side build (no longer used anywhere in the code).

## Out of scope

Accounts / auth, device attestation, a distributed (cross-replica) rate-limit or report store, and
defense against a compromised server host. These are deliberate omissions for an anonymous campus tool,
documented here rather than papered over.
