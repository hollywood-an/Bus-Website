import type { RouteSummary, Stop, Pattern, RouteDetail, Vehicle } from './types';

// Defensive coercion — the feed is unofficial and could change shape or send junk; never trust it.
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};
const bool = (v: unknown): boolean => v === true;
const isFiniteNum = (v: unknown): boolean => Number.isFinite(typeof v === 'number' ? v : Number(v));

// The feed's display strings arrive mangled ("Uh Doan " — trailing space, broken acronym) and land
// verbatim in the one instruction that matters most: "Get off at …". Normalize ONCE here so every
// surface (planner itinerary, map popups, assistant answers) inherits clean names. Casing fixes
// only — never invent words the feed didn't send.
const ACRONYMS: Record<string, string> = { uh: 'UH', osu: 'OSU', rpac: 'RPAC' };
export const cleanName = (v: unknown): string =>
  str(v)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[A-Za-z]+/g, (w) => ACRONYMS[w.toLowerCase()] ?? w);

export function parseRoutes(raw: unknown): RouteSummary[] {
  const routes = (raw as { data?: { routes?: unknown[] } })?.data?.routes ?? [];
  return (Array.isArray(routes) ? routes : [])
    .map((r) => {
      const o = r as Record<string, unknown>;
      return {
        code: str(o.code).toUpperCase(),
        service: str(o.service),
        name: str(o.name),
        color: str(o.color),
        darkColor: str(o.darkColor),
        showByDefault: bool(o.showByDefault),
      };
    })
    .filter((r) => r.code);
}

export function parseRouteDetail(code: string, raw: unknown): RouteDetail {
  const data = (raw as { data?: { patterns?: unknown[]; stops?: unknown[] } })?.data ?? {};
  const patterns: Pattern[] = (Array.isArray(data.patterns) ? data.patterns : [])
    .map((p) => {
      const o = p as Record<string, unknown>;
      return {
        id: str(o.id),
        length: num(o.length),
        encodedPolyline: str(o.encodedPolyline),
        direction: str(o.direction),
      };
    })
    .filter((p) => p.encodedPolyline);
  const stops: Stop[] = (Array.isArray(data.stops) ? data.stops : [])
    .map((s) => {
      const o = s as Record<string, unknown>;
      return {
        id: str(o.id),
        name: cleanName(o.name),
        service: str(o.service) || undefined,
        latitude: num(o.latitude),
        longitude: num(o.longitude),
      };
    })
    .filter((s) => isFiniteNum(s.latitude) && isFiniteNum(s.longitude) && (s.latitude !== 0 || s.longitude !== 0));
  return { code: code.toUpperCase(), patterns, stops };
}

export function parseVehicles(code: string, raw: unknown): Vehicle[] {
  const vehicles = (raw as { data?: { vehicles?: unknown[] } })?.data?.vehicles ?? [];
  return (Array.isArray(vehicles) ? vehicles : [])
    .map((v) => {
      const o = v as Record<string, unknown>;
      return {
        id: str(o.id) || undefined,
        route: code.toUpperCase(),
        latitude: num(o.latitude),
        longitude: num(o.longitude),
        heading: isFiniteNum(o.heading) ? num(o.heading) : undefined,
        speed: isFiniteNum(o.speed) ? num(o.speed) : undefined,
        delayed: typeof o.delayed === 'boolean' ? o.delayed : undefined,
        destination: cleanName(o.destination) || undefined,
        distance: isFiniteNum(o.distance) ? num(o.distance) : undefined,
        nextStops: parseNextStops(o.predictions),
        service: str(o.service) || undefined,
        updatedAt: parseUpdated(o.updated),
      };
    })
    .filter((v) => isFiniteNum(v.latitude) && isFiniteNum(v.longitude) && (v.latitude !== 0 || v.longitude !== 0));
}

// The live feed's per-vehicle `predictions` carry real ETAs per upcoming stop (both 'arrival' and
// 'departure' entries are genuine visits). Keep ALL valid ones — arrivals.ts matches arbitrary
// stops against them; the UI caps its own display. Garbage in → undefined out.
function parseNextStops(raw: unknown): Vehicle['nextStops'] {
  if (!Array.isArray(raw)) return undefined;
  const stops = raw
    .map((p) => {
      const q = p as Record<string, unknown>;
      return {
        id: str(q.stopId) || undefined,
        name: cleanName(q.stopName),
        seconds: isFiniteNum(q.timeToArrivalInSeconds) ? num(q.timeToArrivalInSeconds) : NaN,
      };
    })
    .filter((s) => s.name && Number.isFinite(s.seconds) && s.seconds >= 0)
    .sort((a, b) => a.seconds - b.seconds) // the feed looks ordered, but don't trust it
    .map((s) => ({ id: s.id, name: s.name, etaMin: Math.round(s.seconds / 60) }));
  return stops.length ? stops : undefined;
}

// Each vehicle carries its last GPS-report time, but the format depends on the provider: Clever sends
// ISO-8601 ("2026-09-22T06:36:00.000Z"); DoubleMap sends epoch SECONDS as a string ("1790059008").
// Normalize both to ms epoch (used as the freshness signal for prediction-less routes). Junk → undefined.
function parseUpdated(raw: unknown): number | undefined {
  const fromEpoch = (n: number) => (Number.isFinite(n) ? (n > 1e12 ? n : n * 1000) : undefined);
  if (typeof raw === 'number') return fromEpoch(raw);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return undefined;
    if (/^\d+$/.test(s)) return fromEpoch(Number(s)); // all-digits → epoch seconds (or ms)
    const t = Date.parse(s); // otherwise an ISO-8601 timestamp
    return Number.isFinite(t) ? t : undefined;
  }
  return undefined;
}
