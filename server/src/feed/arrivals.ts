import { getRoutes, getRouteDetail } from './cache';
import { getVehicles, vehicleSource } from './vehicles';
import { haversineMeters } from '../geo/util';
import type { Stop, Vehicle } from './types';

// Next-arrival estimate at a named stop. Prefers the REAL per-stop ETAs the live feed attaches to
// each vehicle (nextStops, from its `predictions`); falls back to a rough straight-line estimate
// (~5 m/s) when no bus predicts that stop. Shared by the get_next_arrival agent tool and
// GET /api/arrivals so both stay in sync.
const VEHICLE_MPS = 5;

// All feed-predicted ETAs (minutes, soonest first) for a stop across the given vehicles — one per
// bus that predicts it (stop-id match first, exact name as fallback). The planner uses the full
// list to find the first bus a rider can actually catch after walking to the stop.
export function predictedEtasFor(vehicles: Vehicle[], stop: Stop): number[] {
  const nameLower = stop.name.toLowerCase();
  const etas: number[] = [];
  for (const v of vehicles) {
    const p = v.nextStops?.find((s) => (s.id && s.id === stop.id) || s.name.toLowerCase() === nameLower);
    if (p) etas.push(p.etaMin);
  }
  return etas.sort((a, b) => a - b);
}

// Soonest predicted ETA, or null when no vehicle predicts the stop. Exported for unit tests.
export function predictedEtaMin(vehicles: Vehicle[], stop: Stop): number | null {
  return predictedEtasFor(vehicles, stop)[0] ?? null;
}

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

  // Find the stop (by name match) on each candidate route, then take the real predicted ETA if any
  // bus reports one, else estimate from the nearest vehicle.
  const estimates: ArrivalEstimate[] = [];
  let anyPredicted = false;
  for (const code of codes) {
    const detail = getRouteDetail(code);
    const stop = detail?.stops.find((s) => s.name.toLowerCase().includes(stopQuery));
    if (!stop) continue;
    // Live deadheads (no predicted stops) are not coming back — never estimate from them.
    const all = getVehicles(code);
    const vehicles = source === 'live' ? all.filter((v) => v.nextStops?.length) : all;
    let nearest: { etaMin: number; meters: number } | null = null;
    for (const v of vehicles) {
      const meters = haversineMeters(v.latitude, v.longitude, stop.latitude, stop.longitude);
      const etaMin = Math.max(1, Math.round(meters / VEHICLE_MPS / 60));
      if (!nearest || meters < nearest.meters) nearest = { etaMin, meters: Math.round(meters) };
    }
    if (!nearest) continue;
    const predicted = predictedEtaMin(vehicles, stop);
    if (predicted !== null) anyPredicted = true;
    estimates.push({ route: code, stop: stop.name, etaMin: predicted ?? nearest.etaMin, meters: nearest.meters });
  }
  estimates.sort((a, b) => a.etaMin - b.etaMin);
  const live = anyPredicted && source === 'live';
  return {
    stopQuery,
    source,
    estimates,
    note:
      estimates.length === 0
        ? 'No matching stop with a bus nearby (or no buses running).'
        : live
          ? 'Live ETAs from the bus feed.'
          : 'ETAs are rough straight-line estimates' + (source === 'mock' ? ' from simulated positions.' : '.'),
  };
}
