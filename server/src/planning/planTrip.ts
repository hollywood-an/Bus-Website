import { geocode, type Place } from '../geo/geocode';
import { walkPath } from '../geo/directions';
import { haversineMeters } from '../geo/util';
import { sliceRiddenPath, joinPolylines } from '../geo/polyline';
import * as feed from '../feed';
import type { Stop } from '../feed';

// The multi-modal trip planner shared by the agent tool (plan_route) and GET /api/plan. Geocodes
// both endpoints, then for each live route finds the stop nearest the origin (board) and nearest the
// destination (alight), and picks the route minimizing walk-to-board + bus + walk-from-alight. This
// is the "walk to another building's stop, take the bus" behavior — for ANY pair, not a fixed table.
const WALK_MPS = 1.35; // ~4.9 km/h
const SCOOTER_MPS = 4.2; // ~15 km/h
const BUS_MPS = 4.5; // ~16 km/h including stops
const DWELL_S = 15; // dwell per intermediate stop

export interface BusOption {
  routeCode: string;
  routeName: string;
  routeColor: string;
  routePolyline: string;
  board: { name: string; lat: number; lng: number };
  alight: { name: string; lat: number; lng: number };
  walkToBoardMin: number;
  busMin: number;
  walkFromAlightMin: number;
  totalMin: number;
}

export interface TripPlan {
  from: Place;
  to: Place;
  walkMin: number;
  walkMeters: number;
  walkPolyline: string;
  scooterMin: number;
  bus: BusOption | null;
  fastest: 'walk' | 'scooter' | 'bus';
}

export type TripResult = { error: 'unresolved_from' | 'unresolved_to'; query: string } | TripPlan;

export async function planTrip(fromQuery: string, toQuery: string): Promise<TripResult> {
  const from = await geocode(fromQuery);
  if (!from) return { error: 'unresolved_from', query: fromQuery };
  const to = await geocode(toQuery);
  if (!to) return { error: 'unresolved_to', query: toQuery };

  const walk = await walkPath({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
  const walkMin = Math.max(1, Math.round(walk.seconds / 60));
  const scooterMin = Math.max(1, Math.round(walk.meters / SCOOTER_MPS / 60));

  const bus = bestBusOption(from, to);
  const fastest = pickFastest(walkMin, scooterMin, bus?.totalMin);

  return { from, to, walkMin, walkMeters: Math.round(walk.meters), walkPolyline: walk.encodedPolyline, scooterMin, bus, fastest };
}

function bestBusOption(from: Place, to: Place): BusOption | null {
  let best: BusOption | null = null;
  let bestRaw = Infinity;

  for (const route of feed.getRoutes()) {
    const detail = feed.getRouteDetail(route.code);
    if (!detail || detail.stops.length < 2) continue;

    const board = nearestStop(detail.stops, from.lat, from.lng);
    const alight = nearestStop(detail.stops, to.lat, to.lng);
    if (!board || !alight || board.idx === alight.idx) continue;

    const walkToBoardRaw = board.meters / WALK_MPS / 60;
    const walkFromAlightRaw = alight.meters / WALK_MPS / 60;
    const { meters: busMeters, intermediate } = alongRoute(detail.stops, board.idx, alight.idx);
    const busRaw = busMeters / BUS_MPS / 60 + (intermediate * DWELL_S) / 60;
    const totalRaw = walkToBoardRaw + busRaw + walkFromAlightRaw;

    if (totalRaw < bestRaw) {
      bestRaw = totalRaw;
      const walkToBoardMin = Math.max(1, Math.round(walkToBoardRaw));
      const busMin = Math.max(1, Math.round(busRaw));
      const walkFromAlightMin = Math.max(1, Math.round(walkFromAlightRaw));
      // Join ALL patterns (e.g. outbound + inbound halves) into the full route path before slicing;
      // a single pattern is only part of a loop, so the board stop may not lie on it.
      const fullPolyline = joinPolylines(detail.patterns.map((p) => p.encodedPolyline).filter(Boolean));
      const boardPt = { lat: board.stop.latitude, lng: board.stop.longitude };
      const alightPt = { lat: alight.stop.latitude, lng: alight.stop.longitude };
      best = {
        routeCode: route.code,
        routeName: route.name,
        routeColor: route.color,
        // Just the segment the rider is actually on; busMeters disambiguates which arc of a loop.
        routePolyline: fullPolyline ? sliceRiddenPath(fullPolyline, boardPt, alightPt, busMeters) : '',
        board: { name: board.stop.name, ...boardPt },
        alight: { name: alight.stop.name, ...alightPt },
        walkToBoardMin,
        busMin,
        walkFromAlightMin,
        totalMin: walkToBoardMin + busMin + walkFromAlightMin,
      };
    }
  }
  return best;
}

function nearestStop(stops: Stop[], lat: number, lng: number): { idx: number; stop: Stop; meters: number } | null {
  let best: { idx: number; stop: Stop; meters: number } | null = null;
  stops.forEach((stop, idx) => {
    const meters = haversineMeters(lat, lng, stop.latitude, stop.longitude);
    if (!best || meters < best.meters) best = { idx, stop, meters };
  });
  return best;
}

// Forward distance along the (loop) stop sequence from board to alight, wrapping if needed.
function alongRoute(stops: Stop[], fromIdx: number, toIdx: number): { meters: number; intermediate: number } {
  const n = stops.length;
  let meters = 0;
  let intermediate = 0;
  let i = fromIdx;
  while (i !== toIdx) {
    const next = (i + 1) % n;
    meters += haversineMeters(stops[i]!.latitude, stops[i]!.longitude, stops[next]!.latitude, stops[next]!.longitude);
    if (next !== toIdx) intermediate++;
    i = next;
  }
  return { meters, intermediate };
}

function pickFastest(walkMin: number, scooterMin: number, busMin?: number): 'walk' | 'scooter' | 'bus' {
  const entries: Array<['walk' | 'scooter' | 'bus', number]> = [
    ['walk', walkMin],
    ['scooter', scooterMin],
  ];
  if (typeof busMin === 'number') entries.push(['bus', busMin]);
  return entries.reduce((min, e) => (e[1] < min[1] ? e : min))[0];
}
