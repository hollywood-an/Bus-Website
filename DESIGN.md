# Design

Visual system for Buckeye Transit. Register: **product** (design serves the task). Direction:
**Bold Buckeye** — light, scarlet-forward, bold display type, clean and outdoor-readable. Identity is
preserved (OSU scarlet is the committed brand color); route colors come from the live OSU feed.

## Color

Light theme, ink-on-paper with scarlet as the single brand accent. OKLCH throughout. Contrast tuned
for daylight phone use (body ≥ 7:1 where feasible, never < 4.5:1).

```
/* neutrals */
--paper:    oklch(0.985 0.003 95);   /* app background (near-white, faint warm) */
--surface:  oklch(1     0     0);     /* panels / cards */
--surface-2:oklch(0.965 0.004 95);   /* rail / inset / hover */
--ink:      oklch(0.18  0.012 260);  /* primary text (~13:1 on paper) */
--ink-soft: oklch(0.34  0.012 260);  /* secondary text (~7:1) */
--muted:    oklch(0.47  0.01  260);  /* tertiary / mono meta (~4.6:1) */
--line:     oklch(0.90  0.005 260);  /* hairline borders */
--line-2:   oklch(0.83  0.006 260);  /* stronger divider */

/* brand */
--scarlet:    oklch(0.50 0.205 27);   /* OSU scarlet #BB0000 — accent: selected/primary/alert */
--scarlet-ink:oklch(0.43 0.20 27);    /* scarlet text/hover on light (AA on paper) */
--scarlet-wash:oklch(0.96 0.03 27);   /* faint scarlet tint for selected backgrounds */

/* capacity ramp (0..4) — paired ALWAYS with fill level + text label, never color alone */
--cap-0: oklch(0.62 0.15 150);  /* empty   — green  */
--cap-1: oklch(0.70 0.15 130);  /* few     — green-lime */
--cap-2: oklch(0.76 0.15 85);   /* filling — amber  */
--cap-3: oklch(0.66 0.17 55);   /* crowded — orange */
--cap-4: oklch(0.55 0.20 27);   /* full    — scarlet-red */

/* semantic */
--ok: var(--cap-0); --warn: oklch(0.72 0.16 75); --danger: oklch(0.52 0.21 25); --info: oklch(0.50 0.13 250);
```

Route colors are the feed's own (`BE #c25700`, `CC #005716`, `CLS #850000`, `ER #11196a`, `MC #e31665`,
`NWC #9d53c6`, `WMC #26686d`) — used as data/identity color on chips, polylines, and meters, never as the
UI accent. State vocabulary standardized: hover, focus-visible (2px scarlet ring), active, disabled, selected.

## Typography

Two families, contrast by role + weight (not two similar sans).
- **Archivo** (variable, self-hosted) — display + UI. Grotesque with strong heavy/expanded weights = the
  bold, athletic Buckeye voice. Headings/route names 700–800; UI/body 400–500.
- **JetBrains Mono** — data only: times, ETAs, counts, "reported 4m ago", coordinates, points.

Fixed rem scale (product, ratio ~1.2), not fluid: 12 / 13 / 14(base) / 16 / 19 / 24 / 32 / 44.
Display headings use `text-wrap: balance`, letter-spacing −0.02em on large sizes. No all-caps body; short
labels/route codes may be uppercase. Mono for anything numeric/temporal so data scans cleanly.

## Spacing & shape

- 4px base scale: 4 8 12 16 20 24 32 40 48 64.
- **One radius:** `--radius: 0.625rem` (10px) for cards, inputs, buttons. Pills/segments/chips use full-round
  (a distinct affordance). Nothing else.
- Borders over shadows: 1px `--line` hairlines define surfaces. One soft shadow reserved for truly floating
  elements (toast, dialog, map overlays).

## Components

- **CapacityMeter** — 5 segments, filled to the reported level, colored on the ramp; below it a label
  ("Filling up") + mono meta ("3 riders · 4m ago"). Unconfirmed (single report) → hollow/dashed segments
  + "unconfirmed" tag. This replaces the emoji faces.
- **Buttons** — primary (scarlet fill, white text), secondary (surface + hairline), ghost; all with
  hover/focus-visible/active/disabled. ≥44px tap height on mobile.
- **RouteChip** — uppercase mono route code on the route's color (contrast-checked) — BE/CC/…
- **Toast** — replaces the notification banner: surface + hairline + soft shadow, slides in, auto-dismiss.
- **Segmented controls / inputs** — consistent hairline + scarlet focus ring vocabulary.
- Lucide icons throughout (one icon style). At most a couple of intentional emoji, if any.

## Layout

App shell, not a centered column:
- **Desktop (≥768px):** fixed **left rail** — brand mark (top), icon+label nav, points (bottom) — beside a
  main pane where the **map / results dominate**.
- **Mobile (<768px):** top app bar (brand + points) + **bottom tab bar** (icon nav); content fills the
  viewport. Tap targets ≥44px, safe-area insets.
- Responsive is structural (rail ↔ tab bar), not fluid type.

## Motion

150–250ms, ease-out (quart/expo). Motion conveys state only: view transitions, toast in/out, capacity
fill, the map moving as the agent answers, tokens streaming into the chat (no typing dots). Capacity
segments animate their fill once on update. Every animation has a `prefers-reduced-motion: reduce`
crossfade/instant fallback. No bounce, no pulse, no orchestrated page-load sequence.
