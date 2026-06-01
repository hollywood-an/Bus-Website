# Product

## Register

product

## Users
Ohio State students, on their phones, between classes — often outdoors in daylight, frequently in a
hurry. They glance for a few seconds: "Is the Connector packed? When's the next one? What's the
fastest way from here to my 2pm right now?" They are not sitting at a desk studying the screen.

## Product Purpose
Fuse OSU's live bus feed (real positions, stops, routes) with a crowdsourced "how full is it" signal
the official data lacks, plus a tool-using agent that plans trips and operates the app itself. Success
is a student getting a trustworthy answer in one glance and moving — not browsing a dashboard.

## Brand Personality
Confident, dry, Buckeye-insider, utilitarian-with-character. The voice is a transit-savvy upperclassman
who takes a stance ("honestly, just walk") — never chirpy, never relentlessly enthusiastic. Visually
it carries OSU scarlet with conviction: bold and energetic, but clean and legible, not decorative.

## Anti-references
- Emoji-as-UI (😊😬🗺️ as buttons, status, and reactions) — the #1 hackathon-template tell.
- Multi-stop gradient "theme" washes; generic `rounded-xl shadow-lg` card soup; identical card grids.
- A chirpy assistant ("Hey there! 🚌✨").
- A centered `max-w` marketing column with everything stacked — this is an app, not a landing page.
- Stock motion: three bouncing dots as "typing", `animate-pulse`/`animate-bounce` rewards.

## Design Principles
1. **Glanceable first.** The answer (crowding, ETA, recommendation) reads in one look, outdoors, at arm's length.
2. **Show, don't tell.** The map, the capacity meter, and the agent driving the UI carry meaning — not paragraphs.
3. **Honest signal.** Always surface confidence and freshness ("2 riders · 4m ago", unconfirmed flags); never fake precision.
4. **Earned familiarity.** Standard affordances, one consistent component vocabulary; the tool disappears into the task.
5. **Scarlet means something.** The accent marks state and action (selected, primary, alert) — never decoration.

## Accessibility & Inclusion
WCAG AA, tuned for outdoor phone use: extra-high text contrast, large tap targets (≥44px), full keyboard
nav with visible focus, semantic landmarks, and a `prefers-reduced-motion` alternative for every motion.
Capacity is never encoded by color alone — a filled-segment meter plus a text label carries it for
color-blind users and in glare.
