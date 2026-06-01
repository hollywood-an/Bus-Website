import { haversineMeters, fetchJson, type LatLng } from './util';

// Real walking path between two points via the Google Routes API (computeRoutes, WALK). Returns the
// encoded polyline + distance + duration. (The legacy Directions API is blocked for new GCP projects,
// which is why we use Routes.) Cached by rounded coord-pair (cheap, stable). Falls back to a
// straight-line estimate (empty polyline → client draws a straight segment) if Routes/key is unavailable.
const KEY = process.env.GOOGLE_MAPS_SERVER_KEY ?? '';
const WALK_MPS = 1.35; // ~4.9 km/h

export interface WalkPath {
  encodedPolyline: string; // '' → caller/client should draw a straight line between the endpoints
  meters: number;
  seconds: number;
}

const cache = new Map<string, WalkPath>();
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
// Routes API duration is a string like "165s".
const parseSeconds = (d?: string): number => (d ? parseInt(d, 10) || 0 : 0);

export async function walkPath(a: LatLng, b: LatLng): Promise<WalkPath> {
  const cacheKey = `${round5(a.lat)},${round5(a.lng)}|${round5(b.lat)},${round5(b.lng)}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  let result: WalkPath | null = null;
  if (KEY) {
    try {
      const data = (await fetchJson('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
          destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
          travelMode: 'WALK',
          polylineEncoding: 'ENCODED_POLYLINE',
        }),
      })) as {
        routes?: Array<{ distanceMeters?: number; duration?: string; polyline?: { encodedPolyline?: string } }>;
      };
      const route = data?.routes?.[0];
      if (route) {
        const meters = route.distanceMeters ?? 0;
        const seconds = parseSeconds(route.duration) || meters / WALK_MPS;
        result = { encodedPolyline: route.polyline?.encodedPolyline ?? '', meters, seconds };
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
