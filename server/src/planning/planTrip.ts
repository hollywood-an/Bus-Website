import { geocode, type Place } from '../geo/geocode';
import { walkPath, coordKey, type WalkStep, type WalkPath } from '../geo/directions';
import { haversineMeters } from '../geo/util';
import { sliceRiddenPath, joinPolylines } from '../geo/polyline';
import { predictedEtasFor } from '../feed/arrivals';
import * as feed from '../feed';
import type { Stop, RouteSummary, RouteDetail, Vehicle } from '../feed';

// The multi-modal trip planner shared by the agent tool (plan_route) and GET /api/plan. Geocodes
// both endpoints, then picks the route + (board, alight) stop pair minimizing REAL walking time
// (Google Routes API) plus the estimated ride. Straight-line distance only prunes candidates; it
// never decides. This is the "walk to another building's stop, take the bus" behavior — for ANY
// pair, not a fixed table.
const WALK_MPS = 1.35; // ~4.9 km/h
const SCOOTER_MPS = 4.2; // ~15 km/h
const BUS_MPS = 4.5; // ~16 km/h including stops
const DWELL_S = 15; // dwell per intermediate stop

// Path-aware selection budget. Worst case ≈ 2 × (CANDIDATES_PER_END + survivor count) uncached
// Routes API calls per never-seen origin/destination pair; the coord-pair cache in walkPath
// collapses repeats and stops shared across routes.
const CANDIDATES_PER_END = 4; // global top-K stops per endpoint sent to the Routes API
// Phase A prune is a heuristic, not a strict bound: straight-line walks underestimate real ones,
// so a route this much worse than the best estimate (times DETOUR, plus SLACK minutes) can't win.
const PRUNE_DETOUR = 1.5;
const PRUNE_SLACK_MIN = 3;

export interface BusOption {
  routeCode: string;
  routeName: string;
  routeColor: string;
  routePolyline: string;
  board: { name: string; lat: number; lng: number; id: string };
  alight: { name: string; lat: number; lng: number; id: string };
  stops: number; // intermediate stops ridden past, board to alight
  walkToBoardMin: number;
  walkToBoardMeters: number;
  waitMin: number; // catchable wait for the next bus at the board stop (0 = walks right on)
  busMin: number;
  walkFromAlightMin: number;
  walkFromAlightMeters: number;
  totalMin: number;
  walkToBoardPolyline: string; // '' → client draws a straight dashed segment
  walkToBoardSteps: WalkStep[]; // turn-by-turn; [] when Routes/key is unavailable
  walkFromAlightPolyline: string;
  walkFromAlightSteps: WalkStep[];
}

export interface TripPlan {
  from: Place;
  to: Place;
  walkMin: number;
  walkMeters: number;
  walkPolyline: string;
  walkSteps: WalkStep[]; // turn-by-turn for the direct route (walk + scooter share it)
  scooterMin: number;
  bus: BusOption | null;
  busesInService: boolean; // any route running — distinguishes "not running now" from "no good route"
  fastest: 'walk' | 'scooter' | 'bus';
}

export type TripResult = { error: 'unresolved_from' | 'unresolved_to'; query: string } | TripPlan;

export async function planTrip(fromQuery: string, toQuery: string): Promise<TripResult> {
  const from = await geocode(fromQuery);
  if (!from) return { error: 'unresolved_from', query: fromQuery };
  const to = await geocode(toQuery);
  if (!to) return { error: 'unresolved_to', query: toQuery };

  // Snapshot service state in the same tick bestBusOption's Phase A filters on it — the poller can
  // refresh the vehicle cache mid-await, and the caption must not contradict the filtering.
  const busesInService = feed.getRoutes().some((r) => feed.routeInService(r.code));

  // The direct walk and the bus option (which fetches its own walk legs) are independent.
  const [walk, bus] = await Promise.all([
    walkPath({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }),
    bestBusOption(from, to),
  ]);
  const walkMin = Math.max(1, Math.round(walk.seconds / 60));
  const scooterMin = Math.max(1, Math.round(walk.meters / SCOOTER_MPS / 60));

  const fastest = pickFastest(walkMin, scooterMin, bus?.totalMin);

  return {
    from,
    to,
    walkMin,
    walkMeters: Math.round(walk.meters),
    walkPolyline: walk.encodedPolyline,
    walkSteps: walk.steps,
    scooterMin,
    bus,
    busesInService,
    fastest,
  };
}

type Near = { idx: number; stop: Stop; meters: number };
type ScoredRoute = { route: RouteSummary; detail: RouteDetail; board: Near; alight: Near; estMin: number };
type Candidate = { stop: Stop; idx: number; wp: WalkPath };

// Path-aware selection in four phases: (A) score every route with free straight-line estimates and
// drop the hopeless ones; (B) build a small candidate-stop set per endpoint; (C) fetch real walking
// paths for just those candidates, concurrently; (D) pick the (board, alight) pair minimizing real
// walk seconds + estimated ride. With no Google key, walkPath falls back to straight-line instantly,
// so selection degrades to the old heuristic and stays deterministic offline.
async function bestBusOption(from: Place, to: Place): Promise<BusOption | null> {
  // Phase A — straight-line estimate per route: walks to the nearest stops plus the ride between
  // them (no ride term when one stop is nearest to both ends; Phase D still evaluates real pairs).
  // Routes with no bus in passenger service are never offered, however good their geometry.
  const scored: ScoredRoute[] = [];
  for (const route of feed.getRoutes()) {
    if (!feed.routeInService(route.code)) continue;
    const detail = feed.getRouteDetail(route.code);
    if (!detail || detail.stops.length < 2) continue;

    const board = nearestStop(detail.stops, from.lat, from.lng);
    const alight = nearestStop(detail.stops, to.lat, to.lng);
    if (!board || !alight) continue;

    let estMin = (board.meters + alight.meters) / WALK_MPS / 60;
    if (board.idx !== alight.idx) {
      const { meters, intermediate } = alongRoute(detail.stops, board.idx, alight.idx);
      estMin += meters / BUS_MPS / 60 + (intermediate * DWELL_S) / 60;
    }
    scored.push({ route, detail, board, alight, estMin });
  }
  if (scored.length === 0) return null;

  const bestEst = Math.min(...scored.map((s) => s.estMin));
  const survivors = scored.filter((s) => s.estMin <= bestEst * PRUNE_DETOUR + PRUNE_SLACK_MIN);

  // Phase B — candidate stops per endpoint: the global top-K nearest across survivors, plus each
  // survivor's own nearest stop so every survivor stays evaluable. Deduped on the walkPath cache
  // key, so one physical stop shared by several routes costs at most one API call.
  const originCands = candidateStops(survivors, (s) => s.board, from.lat, from.lng);
  const destCands = candidateStops(survivors, (s) => s.alight, to.lat, to.lng);

  // Phase C — fetch all candidate walk legs concurrently. Destination legs run stop → destination,
  // never reversed: one-way paths differ and the turn-by-turn steps would read backwards.
  const fromWalks = new Map<string, WalkPath>();
  const toWalks = new Map<string, WalkPath>();
  await Promise.all([
    ...[...originCands].map(async ([key, pt]) => {
      fromWalks.set(key, await walkPath({ lat: from.lat, lng: from.lng }, pt));
    }),
    ...[...destCands].map(async ([key, pt]) => {
      toWalks.set(key, await walkPath(pt, { lat: to.lat, lng: to.lng }));
    }),
  ]);

  // Phase D — evaluate (board, alight) pairs per survivor by raw seconds; round only for display.
  // Total now includes the CATCHABLE wait for the next bus at the board stop (live predictions;
  // a bus arriving before the rider finishes walking is a miss, not a ride), so a route whose bus
  // shows up sooner can win. The Phase A prune ignores wait — survivors compare it fairly.
  const source = feed.vehicleSource();
  let best: { s: ScoredRoute; b: Candidate; a: Candidate; busMeters: number; intermediate: number; busSeconds: number; waitSeconds: number; totalSeconds: number } | null = null;
  for (const s of survivors) {
    const vehiclesAll = feed.getVehicles(s.route.code);
    const activeVehicles = source === 'live' ? vehiclesAll.filter((v) => v.nextStops?.length) : vehiclesAll;
    const boards = withWalks(s.detail.stops, fromWalks);
    const alights = withWalks(s.detail.stops, toWalks);
    // Full-loop travel time for this route: how long a just-missed bus takes to come back around.
    const n = s.detail.stops.length;
    const loopMeters =
      alongRoute(s.detail.stops, 0, n - 1).meters +
      haversineMeters(s.detail.stops[n - 1]!.latitude, s.detail.stops[n - 1]!.longitude, s.detail.stops[0]!.latitude, s.detail.stops[0]!.longitude);
    const loopSeconds = loopMeters / BUS_MPS + n * DWELL_S;
    const waitCache = new Map<number, number>();
    const waitFor = (b: Candidate): number => {
      const hit = waitCache.get(b.idx);
      if (hit !== undefined) return hit;
      const wait = waitSecondsAt(activeVehicles, b, loopSeconds);
      waitCache.set(b.idx, wait);
      return wait;
    };
    for (const b of boards) {
      for (const a of alights) {
        if (b.idx === a.idx) continue;
        const { meters: busMeters, intermediate } = alongRoute(s.detail.stops, b.idx, a.idx);
        const busSeconds = busMeters / BUS_MPS + intermediate * DWELL_S;
        const waitSeconds = waitFor(b);
        const totalSeconds = b.wp.seconds + waitSeconds + busSeconds + a.wp.seconds;
        if (!best || totalSeconds < best.totalSeconds) {
          best = { s, b, a, busMeters, intermediate, busSeconds, waitSeconds, totalSeconds };
        }
      }
    }
  }
  if (!best) return null;

  const { s, b, a } = best;
  const walkToBoardMin = Math.max(1, Math.round(b.wp.seconds / 60));
  const waitMin = Math.max(0, Math.round(best.waitSeconds / 60));
  const busMin = Math.max(1, Math.round(best.busSeconds / 60));
  const walkFromAlightMin = Math.max(1, Math.round(a.wp.seconds / 60));
  // Join ALL patterns (e.g. outbound + inbound halves) into the full route path before slicing;
  // a single pattern is only part of a loop, so the board stop may not lie on it.
  const fullPolyline = joinPolylines(s.detail.patterns.map((p) => p.encodedPolyline).filter(Boolean));
  const boardPt = { lat: b.stop.latitude, lng: b.stop.longitude };
  const alightPt = { lat: a.stop.latitude, lng: a.stop.longitude };
  return {
    routeCode: s.route.code,
    routeName: s.route.name,
    routeColor: s.route.color,
    // Just the segment the rider is actually on; busMeters disambiguates which arc of a loop.
    routePolyline: fullPolyline ? sliceRiddenPath(fullPolyline, boardPt, alightPt, best.busMeters) : '',
    board: { name: b.stop.name, ...boardPt, id: b.stop.id },
    alight: { name: a.stop.name, ...alightPt, id: a.stop.id },
    stops: best.intermediate,
    walkToBoardMin,
    walkToBoardMeters: Math.round(b.wp.meters),
    waitMin,
    busMin,
    walkFromAlightMin,
    walkFromAlightMeters: Math.round(a.wp.meters),
    totalMin: walkToBoardMin + waitMin + busMin + walkFromAlightMin,
    walkToBoardPolyline: b.wp.encodedPolyline,
    walkToBoardSteps: b.wp.steps,
    walkFromAlightPolyline: a.wp.encodedPolyline,
    walkFromAlightSteps: a.wp.steps,
  };
}

// The global top-K stops nearest the endpoint across all survivors, unioned with each survivor's
// own nearest stop. Keys are walkPath cache keys (coordKey), values the point to route to.
function candidateStops(
  survivors: ScoredRoute[],
  nearestOf: (s: ScoredRoute) => Near,
  lat: number,
  lng: number,
): Map<string, { lat: number; lng: number }> {
  const byKey = new Map<string, { pt: { lat: number; lng: number }; meters: number }>();
  for (const s of survivors) {
    for (const stop of s.detail.stops) {
      const key = coordKey(stop.latitude, stop.longitude);
      if (!byKey.has(key)) {
        byKey.set(key, {
          pt: { lat: stop.latitude, lng: stop.longitude },
          meters: haversineMeters(lat, lng, stop.latitude, stop.longitude),
        });
      }
    }
  }
  const picked = new Map<string, { lat: number; lng: number }>();
  const nearestFirst = [...byKey.entries()].sort((x, y) => x[1].meters - y[1].meters);
  for (const [key, v] of nearestFirst.slice(0, CANDIDATES_PER_END)) picked.set(key, v.pt);
  for (const s of survivors) {
    const near = nearestOf(s);
    const key = coordKey(near.stop.latitude, near.stop.longitude);
    if (!picked.has(key)) picked.set(key, { lat: near.stop.latitude, lng: near.stop.longitude });
  }
  return picked;
}

// Catchable wait (seconds) for the next bus at a board stop: the first predicted arrival AT OR
// AFTER the rider gets there. If every predicted bus passes earlier, the rider misses them all and
// the soonest-missed bus returns after a full loop. When no prediction covers the stop at all (a
// bus hasn't planned that far ahead), fall back to a straight-line estimate from the nearest bus
// (~5 m/s, mirroring feed/arrivals); with no usable signal, assume 0 (the pre-wait behavior).
function waitSecondsAt(vehicles: Vehicle[], b: Candidate, loopSeconds: number): number {
  const walkS = b.wp.seconds;
  const etaS = predictedEtasFor(vehicles, b.stop).map((m) => m * 60);
  const catchable = etaS.find((e) => e >= walkS);
  if (catchable !== undefined) return catchable - walkS;
  if (etaS.length > 0) return Math.max(0, etaS[0]! + loopSeconds - walkS);
  let nearest: number | null = null;
  for (const v of vehicles) {
    const m = haversineMeters(v.latitude, v.longitude, b.stop.latitude, b.stop.longitude);
    if (nearest === null || m < nearest) nearest = m;
  }
  return nearest === null ? 0 : Math.max(0, nearest / 5 - walkS);
}

// A route's stops that made the candidate cut, with their fetched walk legs attached.
function withWalks(stops: Stop[], walks: Map<string, WalkPath>): Candidate[] {
  return stops
    .map((stop, idx) => ({ stop, idx, wp: walks.get(coordKey(stop.latitude, stop.longitude)) }))
    .filter((c): c is Candidate => c.wp !== undefined);
}

function nearestStop(stops: Stop[], lat: number, lng: number): Near | null {
  let best: Near | null = null;
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
