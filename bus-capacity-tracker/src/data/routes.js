// Route metadata. Extracted verbatim from the original App.jsx (Phase 0).
// NOTE: these are slated for replacement by the live OSU CABS feed in Phase 1.5
// (the feed's colors/names are authoritative — e.g. real BE is #c25700, not #ef4444 —
// and the feed adds WMC). Kept as-is here only to preserve current behavior.
export const OSU_BUS_ROUTES = [
  'Buckeye Express',
  'Campus Connector',
  'Campus Loop South',
  'East Residential',
  'Medical Center',
  'Northwest Connector',
  'Wexner Medical Center Shuttle'
];

export const ROUTE_COLORS = {
  'BE': '#ef4444', // red
  'CC': '#10b981', // green
  'CLS': '#ec4899', // pink
  'ER': '#3b82f6', // blue
  'MC': '#f59e0b', // orange
  'NWC': '#8b5cf6', // purple
  'all': '#64748b' // gray
};

export const ROUTE_NAMES = {
  'BE': 'Buckeye Express',
  'CC': 'Campus Connector',
  'CLS': 'Campus Loop South',
  'ER': 'East Residential',
  'MC': 'Medical Center',
  'NWC': 'Northwest Connector'
};
