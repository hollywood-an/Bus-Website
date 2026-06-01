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

// Return the encoded polyline for just the board -> alight portion of a (possibly looping) route.
// Falls back to the full polyline if it can't be decoded.
export function sliceRiddenPath(
  encoded: string,
  board: { lat: number; lng: number },
  alight: { lat: number; lng: number },
): string {
  const pts = decodePolyline(encoded);
  if (pts.length < 2) return encoded;
  const bi = nearestVertex(pts, board.lat, board.lng);
  const ai = nearestVertex(pts, alight.lat, alight.lng);
  if (bi === ai) return encoded;
  const segment = ai > bi ? pts.slice(bi, ai + 1) : pts.slice(bi).concat(pts.slice(0, ai + 1));
  return encodePolyline(segment);
}
