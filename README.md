# BUS Tracker

**Crowdsourced OSU campus bus tracker with a live map, route planner, and an AI assistant — built because, as a fellow Buckeye, I could never figure out the OSU bus system either.**

https://github.com/hollywood-an/Bus-Website/assets/HackOHVideo.mp4

> Demo video: [`HackOHVideo.mp4`](./HackOHVideo.mp4) (also embedded above — click to play, or download if your viewer doesn't render inline video).

---

## What makes it interesting

OSU runs 6+ bus routes across a campus that takes 25 minutes to walk end-to-end, and the official tools don't tell you the thing that actually matters: *is the next bus already packed?* BUS Tracker fixes that with three ideas glued together:

- **Crowdsourced capacity, not vehicle GPS.** Students tap a 5-level emoji scale ("Empty" → "Very Full") to report what they see. Reports decay over time and feed back into every other feature. Reporting earns points and unlocks cosmetic themes — the gamification is what keeps the data fresh.
- **A route planner that takes the bus seriously *and* doesn't.** Every origin/destination pair compares walking, scooter (Veo/Spin), and bus time side-by-side, so the app will happily tell you "just walk, it's faster" when that's true.
- **An AI assistant grounded in live state.** A GPT-4o-mini chatbot answers natural-language questions ("how do I get from the Union to Morrill?") with a system prompt that's rebuilt on every message from the current capacity reports, downed-bus alerts, and the full walk/bus/scooter time matrix — so its recommendations actually reflect what's happening right now, not a stale snapshot.

Built solo at HackOH/IO over a weekend.

## Tech Stack

- **Frontend:** React 19, Vite 7, TailwindCSS 3, lucide-react
- **Maps:** Google Maps JavaScript API (Directions + Geometry libraries) for street-routed polylines across all 6 bus routes
- **AI:** OpenAI `gpt-4o-mini` via the Chat Completions API, called directly from the browser with a dynamically-rebuilt system prompt
- **Storage:** Browser-side key/value layer (`window.storage`) for reports, points, and theme persistence
- **Deprecated:** A FastAPI + Python streaming backend lives in `bus-tracker-backend/` from an earlier iteration — ignore it, the AI is now fully client-side

## Architecture

Single-page React app with five views (`check`, `report`, `map`, `planner`, `ai`) wired off one `view` state in `src/App.jsx`. State flows in one direction:

```
 User reports (emoji 0–4)
        │
        ▼
 busReports + busDownReports  ─────────┐
        │                              │
        ├──► Capacity badges (check)   │
        ├──► Route planner ranking     │
        └──► AI system prompt ─────────┤
                                       ▼
                              GPT-4o-mini response
```

- **`ROUTE_TIMES`** is a hard-coded origin→destination matrix of walk/bus minutes and which routes serve the pair — the source of truth for both the planner UI and the AI's routing answers.
- **`BUS_STOPS`** holds lat/lng for every stop per route; the map renders these as colored markers and uses the Directions API (chunked into 25-waypoint segments to dodge the API limit) to draw street-accurate polylines.
- **AI prompt assembly** (`handleSendMessage`) snapshots current capacity, down-bus alerts, the full route matrix, and stop counts on *every* turn — the model is explicitly told to ignore stale capacity from earlier in the conversation.

## Local Setup

```bash
git clone https://github.com/hollywood-an/Bus-Website.git
cd Bus-Website/bus-capacity-tracker
npm install
npm run dev
```

Open http://localhost:5173. The app runs entirely in the browser.

To enable the map and AI assistant, drop your own keys into `src/App.jsx`:
- Google Maps key — `script.src` in the `useEffect` that loads `maps.googleapis.com`
- OpenAI key — the `OPENAI_API_KEY` constant in `handleSendMessage` (note: browser-side OpenAI calls require billing enabled on your OpenAI account for CORS to work)

> For a real deployment these would move server-side; they're inlined here because this was built as a hackathon prototype.
