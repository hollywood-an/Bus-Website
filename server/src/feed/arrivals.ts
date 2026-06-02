import { getRoutes, getRouteDetail } from './cache';
import { getVehicles, vehicleSource } from './vehicles';
import { haversineMeters } from '../geo/util';

// Rough next-arrival estimate at a named stop, from current bus positions (straight-line, ~5 m/s). It is
// NOT schedule-based. Shared by the get_next_arrival agent tool and GET /api/arrivals so both stay in sync.
const VEHICLE_MPS = 5;

export interface ArrivalEstimate {
  route: string;
  stop: string;
  etaMin: number;
  meters: number;
}

export interface ArrivalResult {
  stopQuery: string;
  source: ReturnType<typeof vehicleSource>;
  estimates: ArrivalEstimate[];
  note: string;
}

function knownCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const up = input.toUpperCase();
  return getRoutes().some((r) => r.code === up) ? up : null;
}

export function estimateArrivals(stopInput: unknown, routeInput?: unknown): ArrivalResult {
  const stopQuery = typeof stopInput === 'string' ? stopInput.trim().toLowerCase() : '';
  const source = vehicleSource();
  if (!stopQuery) return { stopQuery: '', source, estimates: [], note: 'No stop given.' };

  const routeFilter = knownCode(routeInput);
  const codes = routeFilter ? [routeFilter] : getRoutes().map((r) => r.code);

  // Find the stop (by name match) on each candidate route, then estimate from the nearest vehicle.
  const estimates: ArrivalEstimate[] = [];
  for (const code of codes) {
    const detail = getRouteDetail(code);
    const stop = detail?.stops.find((s) => s.name.toLowerCase().includes(stopQuery));
    if (!stop) continue;
    let best: { etaMin: number; meters: number } | null = null;
    for (const v of getVehicles(code)) {
      const meters = haversineMeters(v.latitude, v.longitude, stop.latitude, stop.longitude);
      const etaMin = Math.max(1, Math.round(meters / VEHICLE_MPS / 60));
      if (!best || meters < best.meters) best = { etaMin, meters: Math.round(meters) };
    }
    if (best) estimates.push({ route: code, stop: stop.name, ...best });
  }
  estimates.sort((a, b) => a.etaMin - b.etaMin);
  return {
    stopQuery,
    source,
    estimates,
    note:
      estimates.length === 0
        ? 'No matching stop with a bus nearby (or no buses running).'
        : 'ETAs are rough straight-line estimates' + (source === 'mock' ? ' from simulated positions.' : '.'),
  };
}
