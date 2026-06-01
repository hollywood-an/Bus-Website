import type { RouteSummary, RouteDetail, Vehicle } from './types';
import { parseRoutes, parseRouteDetail, parseVehicles } from './parse';

// Live fetchers for the OSU CABS feed. Each call is time-boxed and throws on any non-OK response
// or timeout, so the caller (poller) can keep last-known-good and back off.
const BASE = process.env.OSU_BUS_BASE ?? 'https://content.osu.edu/v2/bus';
const TIMEOUT_MS = Number(process.env.OSU_TIMEOUT_MS ?? 8000);

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`OSU feed ${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRoutes(): Promise<RouteSummary[]> {
  return parseRoutes(await getJson(`${BASE}/routes`));
}

export async function fetchRouteDetail(code: string): Promise<RouteDetail> {
  return parseRouteDetail(code, await getJson(`${BASE}/routes/${encodeURIComponent(code)}`));
}

export async function fetchVehicles(code: string): Promise<Vehicle[]> {
  return parseVehicles(code, await getJson(`${BASE}/routes/${encodeURIComponent(code)}/vehicles`));
}
