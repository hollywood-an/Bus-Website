import type { RouteSummary, Stop, Pattern, RouteDetail, Vehicle } from './types';

// Defensive coercion — the feed is unofficial and could change shape or send junk; never trust it.
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};
const bool = (v: unknown): boolean => v === true;
const isFiniteNum = (v: unknown): boolean => Number.isFinite(typeof v === 'number' ? v : Number(v));

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
        name: str(o.name),
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
        destination: str(o.destination) || undefined,
        distance: isFiniteNum(o.distance) ? num(o.distance) : undefined,
        nextStops: parseNextStops(o.predictions),
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
        name: str(q.stopName),
        seconds: isFiniteNum(q.timeToArrivalInSeconds) ? num(q.timeToArrivalInSeconds) : NaN,
      };
    })
    .filter((s) => s.name && Number.isFinite(s.seconds) && s.seconds >= 0)
    .sort((a, b) => a.seconds - b.seconds) // the feed looks ordered, but don't trust it
    .map((s) => ({ id: s.id, name: s.name, etaMin: Math.round(s.seconds / 60) }));
  return stops.length ? stops : undefined;
}
