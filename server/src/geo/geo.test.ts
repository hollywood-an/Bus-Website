import { describe, it, expect } from 'vitest';
import { geocode } from './geocode';
import { walkPath } from './directions';
import { decodePolyline, encodePolyline, sliceRiddenPath, joinPolylines } from './polyline';

// With no GOOGLE_MAPS_SERVER_KEY (the test env), these exercise the graceful fallbacks: a small
// curated campus map for geocoding and a straight-line estimate for walking.
describe('geocode (curated fallback, no key)', () => {
  it('resolves a core campus name', async () => {
    const p = await geocode('the union');
    expect(p?.name).toBe('Ohio Union');
    expect(typeof p?.lat).toBe('number');
  });

  it('returns null for something off the curated list', async () => {
    expect(await geocode('completely unknown place 9999')).toBeNull();
  });
});

describe('walkPath (straight-line fallback, no key)', () => {
  it('returns a distance + duration estimate with an empty polyline', async () => {
    const w = await walkPath({ lat: 40.0, lng: -83.01 }, { lat: 40.003, lng: -83.015 });
    expect(w.encodedPolyline).toBe('');
    expect(w.meters).toBeGreaterThan(0);
    expect(w.seconds).toBeGreaterThan(0);
  });
});

describe('polyline codec + ridden-segment slice', () => {
  // The canonical example from Google's polyline algorithm docs.
  const ENCODED = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
  const POINTS: Array<[number, number]> = [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ];

  it('round-trips decode/encode', () => {
    const decoded = decodePolyline(ENCODED);
    expect(decoded).toEqual(POINTS);
    expect(encodePolyline(POINTS)).toBe(ENCODED);
  });

  it('joins pattern halves into one path, dropping the shared junction', () => {
    const h1 = encodePolyline([
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
    const h2 = encodePolyline([
      [0, 2],
      [0, 3],
      [0, 4],
    ]);
    expect(decodePolyline(joinPolylines([h1, h2]))).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ]);
  });

  // A closed loop where the two arcs between the snap points have clearly different lengths:
  // direct [v1..v3] spans ~2 deg, the wrap arc spans ~4 deg (~111 km per deg of lng at the equator).
  const LOOP: Array<[number, number]> = [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 0],
  ];
  const board = { lat: 0, lng: 1.001 }; // near v1
  const alight = { lat: 0, lng: 3.001 }; // near v3
  const SHORT = [
    [0, 1],
    [0, 2],
    [0, 3],
  ];
  const LONG = [
    [0, 3],
    [0, 0],
    [0, 0],
    [0, 1],
  ];

  it('defaults to the shorter arc with no target distance', () => {
    expect(decodePolyline(sliceRiddenPath(encodePolyline(LOOP), board, alight))).toEqual(SHORT);
  });

  it('picks the arc whose length matches the ride distance (short hop)', () => {
    // ~2 deg of lng ~= 222 km; far closer to the direct arc than the ~445 km wrap arc.
    expect(decodePolyline(sliceRiddenPath(encodePolyline(LOOP), board, alight, 222_000))).toEqual(SHORT);
  });

  it('picks the long way around when the ride distance says so', () => {
    // ~4 deg ~= 445 km: the ride goes the long way around the loop, not the short hop.
    expect(decodePolyline(sliceRiddenPath(encodePolyline(LOOP), board, alight, 445_000))).toEqual(LONG);
  });
});
