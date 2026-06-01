import * as cache from './cache';
import * as osu from './osu';

// Polls the OSU feed server-side and updates the cache. Two cadences:
//  - static (route list + per-route stops/polylines): refreshed on a long interval; these rarely
//    change. Warmed once at boot.
//  - vehicles: only polled in live mode (USE_MOCK_VEHICLES=false); mock mode never touches the feed
//    for vehicles, so over summer the poller barely talks to OSU at all.
// Errors never throw out of here — we keep last-known-good and back off exponentially. Being a
// respectful client to an unofficial endpoint is the whole point.
const STATIC_INTERVAL_MS = Number(process.env.OSU_STATIC_MS ?? 5 * 60_000);
const VEHICLE_INTERVAL_MS = Number(process.env.OSU_POLL_MS ?? 15_000);
const DETAIL_TTL_MS = Number(process.env.OSU_DETAIL_TTL_MS ?? 10 * 60_000);
const MAX_BACKOFF_MS = Number(process.env.OSU_MAX_BACKOFF_MS ?? 5 * 60_000);
const USE_MOCK = (process.env.USE_MOCK_VEHICLES ?? 'true').toLowerCase() !== 'false';

let started = false;

export async function startPoller(): Promise<void> {
  if (started) return;
  started = true;

  await refreshStatic(); // warm routes + details once so the first map render has real data
  scheduleStatic(STATIC_INTERVAL_MS);
  if (!USE_MOCK) scheduleVehicles(VEHICLE_INTERVAL_MS);

  console.log(`[feed] poller started (vehicles: ${USE_MOCK ? 'MOCK' : 'live'})`);
}

function scheduleStatic(delay: number): void {
  setTimeout(async () => {
    const ok = await refreshStatic();
    scheduleStatic(ok ? STATIC_INTERVAL_MS : nextBackoff(delay));
  }, delay);
}

function scheduleVehicles(delay: number): void {
  setTimeout(async () => {
    const ok = await refreshVehicles();
    scheduleVehicles(ok ? VEHICLE_INTERVAL_MS : nextBackoff(delay));
  }, delay);
}

function nextBackoff(current: number): number {
  return Math.min(current * 2, MAX_BACKOFF_MS);
}

async function refreshStatic(): Promise<boolean> {
  try {
    const routes = await osu.fetchRoutes();
    cache.setRoutes(routes);
    for (const r of routes) {
      if (cache.detailAgeMs(r.code) > DETAIL_TTL_MS) {
        try {
          cache.setDetail(await osu.fetchRouteDetail(r.code));
        } catch {
          /* keep last-known-good / fixture for this route */
        }
      }
    }
    cache.markSuccess();
    return true;
  } catch (err) {
    cache.markError((err as Error)?.message ?? 'feed error');
    return false;
  }
}

async function refreshVehicles(): Promise<boolean> {
  try {
    const routes = cache.getRoutes();
    await Promise.all(
      routes.map(async (r) => {
        try {
          cache.setVehicles(r.code, await osu.fetchVehicles(r.code));
        } catch {
          /* keep last-known vehicles for this route */
        }
      }),
    );
    cache.markSuccess();
    return true;
  } catch (err) {
    cache.markError((err as Error)?.message ?? 'feed error');
    return false;
  }
}
