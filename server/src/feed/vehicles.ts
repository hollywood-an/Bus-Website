import type { Vehicle, VehicleSource } from './types';
import * as cache from './cache';

// The single seam every consumer goes through. Default is the REAL feed (schema verified 2026-07);
// USE_MOCK_VEHICLES=true is an explicit demo mode that simulates buses when no service is running.
// Off-hours an empty live map is the truth, not a bug.
const USE_MOCK = (process.env.USE_MOCK_VEHICLES ?? 'false').toLowerCase() === 'true';
const MOCK_PERIOD_MS = Number(process.env.MOCK_PERIOD_MS ?? 360_000); // time to traverse a route's stops

export function vehicleSource(): VehicleSource {
  return USE_MOCK ? 'mock' : 'live';
}

export function getVehicles(code: string): Vehicle[] {
  return USE_MOCK ? mockVehicles(code) : cache.getCachedVehicles(code);
}

// Mock buses modeled on the real schema, positioned by interpolating along the route's real stop
// coordinates on a time-based loop, so they actually move between polls. Deterministic from the
// clock (no RNG) so repeated reads within a tick agree.
function mockVehicles(code: string): Vehicle[] {
  const detail = cache.getRouteDetail(code);
  const stops = detail?.stops ?? [];
  if (stops.length < 2) return [];

  const count = Math.min(3, Math.max(1, Math.round(stops.length / 7)));
  const now = Date.now();
  const out: Vehicle[] = [];
  // Time to travel one stop-to-stop segment — exactly how fast the mock bus moves, so the
  // synthesized next-stop ETAs match what the marker will actually do.
  const segMs = MOCK_PERIOD_MS / (stops.length - 1);

  for (let i = 0; i < count; i++) {
    const phase = ((now / MOCK_PERIOD_MS) + i / count) % 1;
    const pos = phase * (stops.length - 1);
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = stops[idx]!;
    const b = stops[Math.min(idx + 1, stops.length - 1)]!;
    const nextStops = [];
    for (let k = 1; k <= 3 && idx + k <= stops.length - 1; k++) {
      const s = stops[idx + k]!;
      nextStops.push({ id: s.id, name: s.name, etaMin: Math.max(1, Math.round(((k - frac) * segMs) / 60_000)) });
    }
    out.push({
      id: `mock-${code.toUpperCase()}-${i + 1}`,
      route: code.toUpperCase(),
      latitude: a.latitude + (b.latitude - a.latitude) * frac,
      longitude: a.longitude + (b.longitude - a.longitude) * frac,
      heading: bearing(a.latitude, a.longitude, b.latitude, b.longitude),
      speed: 16,
      delayed: false,
      destination: b.name,
      distance: 0,
      nextStops: nextStops.length ? nextStops : undefined,
    });
  }
  return out;
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}
