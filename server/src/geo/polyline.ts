// Google encoded-polyline codec + a helper to slice the ridden segment out of a full route loop.
// The OSU feed gives each route's pattern as one encoded polyline for the whole loop; for a trip we
// only want the board -> alight portion, so we snap each stop to the nearest polyline vertex and take
// the forward slice (wrapping past the end for loop routes, matching how bus time is summed).
import { haversineMeters } from './util';

export function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export function encodePolyline(points: Array<[number, number]>): string {
  let lastLat = 0;
  let lastLng = 0;
  let out = '';
  for (const [lat, lng] of points) {
    const iLat = Math.round(lat * 1e5);
    const iLng = Math.round(lng * 1e5);
    out += encodeSigned(iLat - lastLat) + encodeSigned(iLng - lastLng);
    lastLat = iLat;
    lastLng = iLng;
  }
  return out;
}

function encodeSigned(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = '';
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  out += String.fromCharCode(v + 63);
  return out;
}

function nearestVertex(points: Array<[number, number]>, lat: number, lng: number): number {
  let bestIdx = 0;
  let bestMeters = Infinity;
  points.forEach(([pLat, pLng], idx) => {
    const m = haversineMeters(lat, lng, pLat, pLng);
    if (m < bestMeters) {
      bestMeters = m;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

function pathLengthMeters(pts: Array<[number, number]>): number {
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += haversineMeters(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1]);
  return m;
}

// Join several pattern polylines (e.g. a route's outbound + inbound halves) into one ordered path.
// OSU gives patterns in travel order with shared endpoints, so concatenating their points yields the
// full loop; consecutive duplicate points (the shared junctions) are dropped.
export function joinPolylines(encodedList: string[]): string {
  const all: Array<[number, number]> = [];
  for (const enc of encodedList) {
    for (const p of decodePolyline(enc)) {
      const last = all[all.length - 1];
      if (last && last[0] === p[0] && last[1] === p[1]) continue;
      all.push(p);
    }
  }
  return encodePolyline(all);
}

// Return the encoded polyline for just the board -> alight portion of a (possibly looping) route.
// Snapping the two stops to the nearest polyline vertices leaves two candidate arcs between them; we
// pick the one whose length best matches `targetMeters` (the ride distance computed from the stop
// sequence), which is what disambiguates the short hop from the long way around a loop. Without a
// target we fall back to the shorter arc. Falls back to the whole polyline if it can't be decoded.
export function sliceRiddenPath(
  encoded: string,
  board: { lat: number; lng: number },
  alight: { lat: number; lng: number },
  targetMeters?: number,
): string {
  const pts = decodePolyline(encoded);
  if (pts.length < 2) return encoded;
  const bi = nearestVertex(pts, board.lat, board.lng);
  const ai = nearestVertex(pts, alight.lat, alight.lng);
  if (bi === ai) return encoded;

  const lo = Math.min(bi, ai);
  const hi = Math.max(bi, ai);
  const direct = pts.slice(lo, hi + 1); // the contiguous [lo..hi] arc
  const wrap = pts.slice(hi).concat(pts.slice(0, lo + 1)); // the complementary arc, around the seam

  let chosen: Array<[number, number]>;
  if (typeof targetMeters === 'number' && targetMeters > 0) {
    const dErr = Math.abs(pathLengthMeters(direct) - targetMeters);
    const wErr = Math.abs(pathLengthMeters(wrap) - targetMeters);
    chosen = dErr <= wErr ? direct : wrap;
  } else {
    chosen = pathLengthMeters(direct) <= pathLengthMeters(wrap) ? direct : wrap;
  }
  return encodePolyline(chosen);
}
