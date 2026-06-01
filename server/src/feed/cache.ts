import type { RouteSummary, RouteDetail, Vehicle, FeedStatus } from './types';
import { fixtureRoutes, fixtureRouteDetail } from './fixtures';

// In-memory last-known-good cache for the OSU feed. Reads always succeed: if the poller has fresh
// data we serve it; otherwise we fall back to the committed fixtures. The feed is treated as "live"
// only if a poll succeeded recently and there's no outstanding error.
const LIVE_TTL_MS = Number(process.env.OSU_LIVE_TTL_MS ?? 60_000);

interface State {
  routes: RouteSummary[] | null;
  details: Map<string, RouteDetail>;
  detailFetchedAt: Map<string, number>;
  vehicles: Map<string, Vehicle[]>;
  lastUpdated: number | null;
  lastError: string | null;
}

const state: State = {
  routes: null,
  details: new Map(),
  detailFetchedAt: new Map(),
  vehicles: new Map(),
  lastUpdated: null,
  lastError: null,
};

// --- writes (poller) ---
export function setRoutes(routes: RouteSummary[]): void {
  if (routes.length) state.routes = routes;
}
export function setDetail(detail: RouteDetail): void {
  if (detail.stops.length || detail.patterns.length) {
    state.details.set(detail.code, detail);
    state.detailFetchedAt.set(detail.code, Date.now());
  }
}
export function setVehicles(code: string, vehicles: Vehicle[]): void {
  state.vehicles.set(code.toUpperCase(), vehicles);
}
export function markSuccess(): void {
  state.lastUpdated = Date.now();
  state.lastError = null;
}
export function markError(message: string): void {
  state.lastError = message;
}
export function detailAgeMs(code: string): number {
  const t = state.detailFetchedAt.get(code.toUpperCase());
  return t ? Date.now() - t : Infinity;
}

// --- reads (API), with fixture fallback ---
export function getRoutes(): RouteSummary[] {
  return state.routes ?? fixtureRoutes();
}
export function getRouteDetail(code: string): RouteDetail | null {
  return state.details.get(code.toUpperCase()) ?? fixtureRouteDetail(code);
}
export function getCachedVehicles(code: string): Vehicle[] {
  return state.vehicles.get(code.toUpperCase()) ?? [];
}

export function isLive(): boolean {
  return state.lastUpdated != null && Date.now() - state.lastUpdated < LIVE_TTL_MS && state.lastError == null;
}

export function feedStatus(): FeedStatus {
  return {
    live: isLive(),
    source: state.routes ? 'feed' : 'fixtures',
    lastUpdated: state.lastUpdated,
    lastError: state.lastError,
  };
}
