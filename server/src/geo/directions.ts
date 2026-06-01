import { haversineMeters, fetchJson, type LatLng } from './util';

// Real walking path between two points via Google Directions (mode=walking). Returns the encoded
// overview polyline + distance + duration. Cached by rounded coord-pair (cheap, stable). Falls back
// to a straight-line estimate (empty polyline → client draws a straight segment) if Directions/key
// is unavailable.
const KEY = process.env.GOOGLE_MAPS_SERVER_KEY ?? '';
const WALK_MPS = 1.35; // ~4.9 km/h

export interface WalkPath {
  encodedPolyline: string; // '' → caller/client should draw a straight line between the endpoints
  meters: number;
  seconds: number;
}

const cache = new Map<string, WalkPath>();
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

export async function walkPath(a: LatLng, b: LatLng): Promise<WalkPath> {
  const cacheKey = `${round5(a.lat)},${round5(a.lng)}|${round5(b.lat)},${round5(b.lng)}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  let result: WalkPath | null = null;
  if (KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&mode=walking&key=${KEY}`;
      const data = (await fetchJson(url)) as {
        status?: string;
        routes?: Array<{
          overview_polyline?: { points?: string };
          legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
        }>;
      };
      const route = data?.status === 'OK' ? data.routes?.[0] : undefined;
      if (route) {
        const meters = (route.legs ?? []).reduce((s, l) => s + (l.distance?.value ?? 0), 0);
        const seconds = (route.legs ?? []).reduce((s, l) => s + (l.duration?.value ?? 0), 0);
        result = { encodedPolyline: route.overview_polyline?.points ?? '', meters, seconds };
      }
    } catch {
      /* fall through to straight-line */
    }
  }
  if (!result) {
    const meters = haversineMeters(a.lat, a.lng, b.lat, b.lng);
    result = { encodedPolyline: '', meters, seconds: meters / WALK_MPS };
  }

  cache.set(cacheKey, result);
  return result;
}
