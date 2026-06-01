// Crowdsourced capacity scale (0-4). The label is what the UI renders; the meter draws its fill from
// the --cap-0..4 design tokens (CapacityMeter / ReportView), not from these per-level classes. The old
// emoji icons were dropped in the Phase 5 redesign.
export const CAPACITY_LEVELS = [
  { label: 'Empty', value: 0 },
  { label: 'Few Seats', value: 1 },
  { label: 'Filling Up', value: 2 },
  { label: 'Crowded', value: 3 },
  { label: 'Very Full', value: 4 },
];
