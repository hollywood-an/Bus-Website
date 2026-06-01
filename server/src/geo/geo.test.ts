import { describe, it, expect } from 'vitest';
import { geocode } from './geocode';
import { walkPath } from './directions';
import { decodePolyline, encodePolyline, sliceRiddenPath } from './polyline';

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

  it('slices to just the board -> alight portion, dropping the rest of the loop', () => {
    // A square loop of 5 vertices (last == first). Board near v1, alight near v3.
    const loop: Array<[number, number]> = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ];
    const sliced = decodePolyline(sliceRiddenPath(encodePolyline(loop), { lat: 0.01, lng: 1.01 }, { lat: 1.01, lng: 0.01 }));
    expect(sliced).toEqual([
      [0, 1],
      [1, 1],
      [1, 0],
    ]);
  });

  it('wraps past the end of the loop when alight comes before board', () => {
    const loop: Array<[number, number]> = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ];
    // Board near v3 ([1,0]), alight near v1 ([0,1]) -> forward path wraps through the end/start.
    const sliced = decodePolyline(sliceRiddenPath(encodePolyline(loop), { lat: 1.01, lng: 0.01 }, { lat: 0.01, lng: 1.01 }));
    expect(sliced).toEqual([
      [1, 0],
      [0, 0],
      [0, 0],
      [0, 1],
    ]);
  });
});
