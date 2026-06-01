import { describe, it, expect } from 'vitest';
import { geocode } from './geocode';
import { walkPath } from './directions';

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
