// Walk-time estimates + location aliases — the small slice of data the live feed does NOT provide
// (the feed has stops/positions, not "how long to walk between these two campus spots"). The bus
// minutes here are rough hand estimates and are clearly labeled as such to the agent. Ported from
// the original client ROUTE_TIMES during the Phase 2 server-tools work.

export const LOCATIONS = [
  'Ohio Union',
  'RPAC',
  'Thompson',
  'Traditions at Scott',
  'The Stadium',
  'South Rec',
  'Hitchcock Hall',
  'Lincoln and Morrill Towers',
  'Traditions at Kennedy',
  'ARPS Parking',
];

// Loose aliases so the agent can pass natural names. Keys are lowercase substrings.
const ALIASES: Record<string, string> = {
  union: 'Ohio Union',
  rpac: 'RPAC',
  thompson: 'Thompson',
  library: 'Thompson',
  scott: 'Traditions at Scott',
  stadium: 'The Stadium',
  shoe: 'The Stadium',
  'south rec': 'South Rec',
  hitchcock: 'Hitchcock Hall',
  morrill: 'Lincoln and Morrill Towers',
  lincoln: 'Lincoln and Morrill Towers',
  towers: 'Lincoln and Morrill Towers',
  kennedy: 'Traditions at Kennedy',
  arps: 'ARPS Parking',
};

export function resolveLocation(input: string): string | null {
  if (!input) return null;
  const q = input.trim().toLowerCase();
  const exact = LOCATIONS.find((l) => l.toLowerCase() === q);
  if (exact) return exact;
  for (const [key, value] of Object.entries(ALIASES)) {
    if (q.includes(key)) return value;
  }
  const partial = LOCATIONS.find((l) => l.toLowerCase().includes(q) || q.includes(l.toLowerCase()));
  return partial ?? null;
}

export interface RouteTime {
  walk: number;
  bus: number | null;
  routes: string[];
}

export const ROUTE_TIMES: Record<string, Record<string, RouteTime>> = {
  'Ohio Union': {
    Thompson: { walk: 9, bus: null, routes: [] },
    RPAC: { walk: 15, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'Traditions at Scott': { walk: 15, bus: 4, routes: ['Campus Connector', 'Buckeye Express', 'Campus Loop South'] },
    'The Stadium': { walk: 18, bus: 5, routes: ['Campus Connector', 'Buckeye Express', 'Campus Loop South'] },
    'South Rec': { walk: 8, bus: 2, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 12, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'Lincoln and Morrill Towers': { walk: 17, bus: 6, routes: ['Campus Loop South', 'Northwest Connector'] },
    'Traditions at Kennedy': { walk: 13, bus: 4, routes: ['Campus Connector'] },
    'ARPS Parking': { walk: 5, bus: 2, routes: ['Buckeye Express'] },
  },
  RPAC: {
    'Ohio Union': { walk: 15, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    Thompson: { walk: 6, bus: null, routes: [] },
    'Traditions at Scott': { walk: 10, bus: 8, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 1, bus: null, routes: [] },
    'South Rec': { walk: 12, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'Hitchcock Hall': { walk: 8, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'Lincoln and Morrill Towers': { walk: 9, bus: 5, routes: ['Campus Loop South'] },
    'Traditions at Kennedy': { walk: 11, bus: 7, routes: ['Campus Connector'] },
    'ARPS Parking': { walk: 11, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
  },
  Thompson: {
    'Ohio Union': { walk: 9, bus: null, routes: [] },
    RPAC: { walk: 6, bus: null, routes: [] },
    'Traditions at Scott': { walk: 8, bus: null, routes: [] },
    'The Stadium': { walk: 7, bus: null, routes: [] },
    'South Rec': { walk: 8, bus: null, routes: [] },
    'Hitchcock Hall': { walk: 6, bus: null, routes: [] },
    'Lincoln and Morrill Towers': { walk: 11, bus: null, routes: [] },
    'Traditions at Kennedy': { walk: 8, bus: null, routes: [] },
    'ARPS Parking': { walk: 7, bus: null, routes: [] },
  },
  'Traditions at Scott': {
    'Ohio Union': { walk: 15, bus: 3, routes: ['Campus Connector'] },
    RPAC: { walk: 10, bus: 11, routes: ['Campus Connector'] },
    Thompson: { walk: 8, bus: null, routes: [] },
    'The Stadium': { walk: 8, bus: 2, routes: ['Buckeye Express', 'Campus Connector', 'Campus Loop South'] },
    'South Rec': { walk: 15, bus: 6, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 14, bus: 6, routes: ['Campus Connector', 'Campus Loop South'] },
    'Lincoln and Morrill Towers': { walk: 12, bus: 7, routes: ['Campus Connector', 'Campus Loop South'] },
    'Traditions at Kennedy': { walk: 10, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'ARPS Parking': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
  },
  'The Stadium': {
    'Ohio Union': { walk: 18, bus: 6, routes: ['Campus Connector'] },
    RPAC: { walk: 1, bus: null, routes: [] },
    Thompson: { walk: 7, bus: null, routes: [] },
    'Traditions at Scott': { walk: 8, bus: 2, routes: ['Buckeye Express', 'Campus Connector'] },
    'South Rec': { walk: 17, bus: 7, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 10, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'Lincoln and Morrill Towers': { walk: 13, bus: 5, routes: ['Campus Loop South', 'Northwest Connector'] },
    'Traditions at Kennedy': { walk: 9, bus: 3, routes: ['Campus Connector', 'Campus Loop South'] },
    'ARPS Parking': { walk: 8, bus: 3, routes: ['Buckeye Express', 'Campus Connector'] },
  },
  'South Rec': {
    'Ohio Union': { walk: 8, bus: 2, routes: ['Campus Connector', 'Campus Loop South'] },
    RPAC: { walk: 12, bus: 4, routes: ['Campus Connector'] },
    Thompson: { walk: 8, bus: null, routes: [] },
    'Traditions at Scott': { walk: 15, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 17, bus: 8, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 9, bus: 3, routes: ['Campus Connector'] },
    'Lincoln and Morrill Towers': { walk: 14, bus: 5, routes: ['Campus Loop South'] },
    'Traditions at Kennedy': { walk: 14, bus: 5, routes: ['Campus Connector'] },
    'ARPS Parking': { walk: 10, bus: 3, routes: ['Campus Connector'] },
  },
  'Hitchcock Hall': {
    'Ohio Union': { walk: 12, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    RPAC: { walk: 8, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    Thompson: { walk: 6, bus: null, routes: [] },
    'Traditions at Scott': { walk: 14, bus: 6, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 10, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'South Rec': { walk: 9, bus: 3, routes: ['Campus Connector'] },
    'Lincoln and Morrill Towers': { walk: 12, bus: 5, routes: ['Campus Loop South', 'Northwest Connector'] },
    'Traditions at Kennedy': { walk: 13, bus: 5, routes: ['Campus Connector'] },
    'ARPS Parking': { walk: 6, bus: 2, routes: ['Buckeye Express'] },
  },
  'Lincoln and Morrill Towers': {
    'Ohio Union': { walk: 17, bus: 6, routes: ['Campus Loop South', 'Northwest Connector'] },
    RPAC: { walk: 9, bus: 5, routes: ['Campus Loop South'] },
    Thompson: { walk: 11, bus: null, routes: [] },
    'Traditions at Scott': { walk: 12, bus: 7, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 13, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'South Rec': { walk: 14, bus: 5, routes: ['Campus Loop South'] },
    'Hitchcock Hall': { walk: 12, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'Traditions at Kennedy': { walk: 14, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'ARPS Parking': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
  },
  'Traditions at Kennedy': {
    'Ohio Union': { walk: 13, bus: 4, routes: ['Campus Connector'] },
    RPAC: { walk: 11, bus: 8, routes: ['Campus Connector'] },
    Thompson: { walk: 8, bus: null, routes: [] },
    'Traditions at Scott': { walk: 10, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 9, bus: 3, routes: ['Campus Connector', 'Campus Loop South'] },
    'South Rec': { walk: 14, bus: 5, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 13, bus: 5, routes: ['Campus Connector'] },
    'Lincoln and Morrill Towers': { walk: 14, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'ARPS Parking': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
  },
  'ARPS Parking': {
    'Ohio Union': { walk: 5, bus: 2, routes: ['Buckeye Express'] },
    RPAC: { walk: 11, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
    Thompson: { walk: 7, bus: null, routes: [] },
    'Traditions at Scott': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
    'The Stadium': { walk: 8, bus: 3, routes: ['Campus Connector', 'Buckeye Express'] },
    'South Rec': { walk: 10, bus: 3, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 6, bus: 2, routes: ['Buckeye Express'] },
    'Lincoln and Morrill Towers': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
    'Traditions at Kennedy': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
  },
};
