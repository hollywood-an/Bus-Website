// Crowdsourced capacity scale (0-4) — the CANONICAL label source for the client (sentence case per
// DESIGN.md). The meter draws its fill from the --cap-0..4 design tokens (CapacityMeter /
// ReportView), not from these per-level classes. Server twin: CAPACITY_LABELS in
// server/src/agent/tools.ts — keep the strings identical.
export const CAPACITY_LEVELS = [
  { label: 'Empty', value: 0 },
  { label: 'Few seats', value: 1 },
  { label: 'Filling up', value: 2 },
  { label: 'Crowded', value: 3 },
  { label: 'Very full', value: 4 },
];
