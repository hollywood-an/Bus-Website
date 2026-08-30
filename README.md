# Buckeye Transit

**A crowdsourced OSU campus bus tracker with a live map and a tool-using Claude agent that plans your
trip and drives the app. It fuses Ohio State's real-time bus feed with the one signal that feed lacks:
is the next bus already packed?**

OSU runs 6+ routes across a campus that takes 25 minutes to walk end to end, and the official tools tell
you where a bus is but not whether you'll actually fit on it. Buckeye Transit adds a crowdsourced
fullness layer on top of the live feed, and puts an agent in front of both that can reason over live
data, take actions (with confirmation), and operate the UI.

> Built solo. Started as a HackOH/IO weekend prototype, then rebuilt from a single 1,500-line
> browser-side chatbot into a real server-side agent. The original prototype demo is
> [`HackOHVideo.mp4`](./HackOHVideo.mp4) (it shows the old chatbot version, before the agent rebuild).

## From chatbot to agent (why the rewrite)

The prototype's "AI" stuffed all app state into a prompt and called a model **directly from the
browser**, which meant the model key was inlined into the shipped JS. It only ever produced text: it took
no actions and fetched nothing on demand.

The rebuild makes it a true tool-using agent:

- **Grounded in live data, not a stuffed prompt.** The agent calls tools to fetch buses, crowding,
  arrivals, and routes on demand. The system prompt carries voice and guidance, never data.
- **Behind a hardened proxy.** All model and Google calls run server-side. No model or API secret reaches
  the browser bundle. See [`SECURITY.md`](./SECURITY.md).
- **It acts and shows.** It can propose a report (you confirm before anything is written) and drive the
  app: a "how do I get from A to B" question renders a walk/bus/scooter trip map inline in the chat.

## Architecture

```
bus-capacity-tracker/ (Vite + React)        server/ (Hono + TypeScript)            Anthropic API
  chat ── message + history ───────────────► POST /api/agent (SSE)
    ▲                                          │  agent loop (<= 8 tool round-trips)
    │ SSE: text deltas + ui_directives ◄───────┤   ├─ read tools  ─► feed cache + ReportStore
    │ (dispatcher drives map / inline trip)     │   ├─ action tools ─► propose, user confirms, then write
    │                                           │   └─ ui tools    ─► stream a ui_directive
  map / views ◄─ GET /api/routes, /vehicles ───┤  ── messages + tool defs ──► Claude (stream, tool_use)
  reports     ◄─ GET /api/reports             ─┤  feed/  poll OSU ~15s ─► cache ─► committed fixtures
              └─ POST /api/reports (validate) ─►  store/ SQLite ReportStore (decay + anti-poisoning)
                                                 geo/   Google geocoding + walking directions
  localStorage: points + theme (personal, cosmetic) + read-only offline report cache
```

- **Client** (`bus-capacity-tracker/`): React 19, Vite 7, Tailwind 3, lucide-react, Google Maps JS. Five
  views (map, plan, assistant, report, check) over a map-forward app shell.
- **Server** (`server/`): Hono + `@anthropic-ai/sdk`. `agent/` (streaming loop + tools), `feed/` (poller,
  last-known-good cache, fixtures fallback, mock vehicles), `store/` (`better-sqlite3` ReportStore with
  decay-on-read + seed/demo mode), `geo/` + `planning/` (geocoded multi-modal trip planning), plus
  `prompt.ts`, `validateReport.ts`, `rateLimit.ts`.
- **Data ownership:** route/stop/vehicle data and all crowdsourced reports are server-owned. The client
  never sends an aggregate the server has to trust. Only cosmetic personal state (points, theme) is local.

## Agent tools

- **Read:** `get_live_buses`, `get_next_arrival`, `get_capacity`, `find_least_crowded`,
  `find_most_crowded`, `check_down_buses`, `plan_route`, `get_stops`.
- **Action (propose, then user confirms, then server validates + writes):** `submit_capacity_report`,
  `report_bus_down`.
- **UI (stream a directive the client applies mid-answer):** `plan_route` renders an inline
  walk/bus/scooter trip map; `focus_map_on_route` and `highlight_stops` drive the campus map.

## Model choice

Default `claude-haiku-4-5`, swappable with the `AGENT_MODEL` env var (this repo currently runs
`claude-sonnet-4-6`). Haiku is the production default on purpose: a glance-and-go transit app on a phone
between classes wants low latency and cost, and Haiku is strong at tool use. Sonnet is the quality
upgrade for harder multi-step planning.

## Local setup

Requires Node 20+. Run the client and server together:

```bash
git clone https://github.com/hollywood-an/Bus-Website.git
cd Bus-Website
npm run install:all          # installs root, client, and server deps
npm run dev                   # client on :5173, server on :8787 (Vite proxies /api -> server)
```

Open http://localhost:5173.

**`bus-capacity-tracker/.env`** (client; only a public, referrer-restrictable browser key):

```
VITE_GOOGLE_MAPS_API_KEY=...   # Maps JavaScript API, with the geometry library
```

**`server/.env`** (server-side only, never bundled; see `server/.env.example`):

```
ANTHROPIC_API_KEY=...          # the model key, server-side only
AGENT_MODEL=claude-haiku-4-5   # optional; any Claude model id
GOOGLE_MAPS_SERVER_KEY=...      # Geocoding + Places + Directions (IP-restricted, not referrer)
ALLOWED_ORIGIN=http://localhost:5173
USE_MOCK_VEHICLES=false         # live by default; true = demo mode (labeled simulated buses)
SEED_DEMO=true                  # seed plausible decaying reports on a cold start
```

If a key is missing the app degrades instead of crashing: no Google key falls back to a small curated
campus geocoder and straight-line walks; no Anthropic key makes the assistant use an offline responder.

## Security

The short version: no secrets in the browser, all writes validated server-side on a single shared path,
anonymous reports hardened with a 2-reporter confirmation threshold and a median aggregate, per-client
rate limits documented honestly as a dampener (weak on shared campus NAT) not an identity control, and a
hard Anthropic spend cap as the real ceiling on AI cost. Full threat model, including where each control
stops, is in [`SECURITY.md`](./SECURITY.md).

## Honest scope

- **Vehicles are live by default; empty can be the truth.** Positions and per-stop ETAs come from
  OSU's real feed (schema verified against live service, July 2026); arrival times use the feed's
  own predictions when a bus reports them and fall back to straight-line estimates otherwise.
  Outside service hours the map honestly shows no buses — `USE_MOCK_VEHICLES=true` is an explicit
  demo mode that interpolates labeled "simulated" buses along the real polylines. The feed's route
  lineup also shifts (routes appear and disappear); everything is parsed defensively.
- **Crowdsourcing is anonymous and gameable.** See the report-poisoning section of `SECURITY.md`.
- **Points are cosmetic.** They are local, non-authoritative, and exist to keep reports fresh. No accounts.
- **Bus stop choice costs Google Routes calls.** Board/alight stops are picked by real walking time
  (straight-line pruning first, then ~10–20 `computeRoutes` calls worst case per never-seen
  origin/destination pair, cached in-process per coord pair). With no Google key it degrades to
  straight-line estimates and straight dashed walk legs on the map.
- **Persistence is SQLite.** Fine for a single instance; in production it lives on a mounted volume
  (`REPORTS_DB=/data/reports.db`) so reports survive redeploys. Bus times are estimates (along-route
  distance plus dwell), not the official ETA.

## Deployment

Split by shape: the **frontend** (static Vite build) → **Vercel**; the **backend** (a long-lived Node
process — background feed poller, in-memory cache + rate limiter, SQLite) → **Railway**. The browser
calls the backend directly (`VITE_API_BASE`), keeping Vercel out of the assistant's SSE path.

**Do the [operator checklist in `SECURITY.md`](./SECURITY.md#operator-checklist-deployment) first** —
rotate the key that was in git history, set the Anthropic spend cap, restrict both Google keys.

1. **Backend → Railway.** New project from this repo, root `server/`. Config in `server/railway.json`
   (build `npm install`, start `npm start`, healthcheck `/api/health`). Attach a **volume mounted at
   `/data`**. Set env: `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_SERVER_KEY`, `REPORTS_DB=/data/reports.db`,
   `SEED_DEMO=false`, `USE_MOCK_VEHICLES=false`, and `ALLOWED_ORIGIN=` (fill in after step 2). Copy the
   service URL, e.g. `https://bus-agent.up.railway.app`.
2. **Frontend → Vercel.** Import the repo, root `bus-capacity-tracker` (config in its `vercel.json`).
   Set env `VITE_GOOGLE_MAPS_API_KEY` (the restricted browser key) and `VITE_API_BASE=` the Railway URL
   from step 1. Deploy, then copy the Vercel URL.
3. **Close the loop.** Put the Vercel URL into Railway's `ALLOWED_ORIGIN` and redeploy the backend; add
   the Vercel domain to the browser Maps key's referrer allow-list.
4. **Verify:** `curl https://<railway>/api/health` → ok; open the Vercel URL → Map/Plan work and the
   **assistant streams**; confirm the Anthropic spend cap is active. Then flip the repo public.

## Tests

```bash
cd server && npx vitest run                 # agent loop, tools, store, feed, geo, validation, rate limit
cd bus-capacity-tracker && npm run lint && npm run build
```

---

A portfolio piece: a security-first agent architecture (browser-side model key moved behind a validating,
rate-limited proxy; a tool-using Claude agent grounded in live data that takes confirmed actions and
drives the UI) on a real OSU dataset, with the scope and limitations documented rather than overclaimed.
