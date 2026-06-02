import { describe, it, expect } from 'vitest';
import { estimateArrivals } from './arrivals';
import { getRoutes, getRouteDetail, getVehicles } from './index';

// Derive a real stop from the fixture-backed cache so the test does not hardcode feed contents.
const firstRoute = getRoutes()[0]!;
const firstStop = getRouteDetail(firstRoute.code)!.stops[0]!;

describe('estimateArrivals', () => {
  it('returns no estimates for an empty stop query', () => {
    expect(estimateArrivals('').estimates).toEqual([]);
  });

  it('returns no estimates for an unknown stop', () => {
    const r = estimateArrivals('zzz nowhere stop 9999');
    expect(r.estimates).toEqual([]);
    expect(r.note).toMatch(/no matching stop/i);
  });

  it('estimates ETAs at a real stop from current vehicle positions, sorted soonest-first', () => {
    const r = estimateArrivals(firstStop.name);
    expect(['live', 'mock']).toContain(r.source);
    if (getVehicles(firstRoute.code).length > 0) {
      expect(r.estimates.length).toBeGreaterThan(0);
      const etas = r.estimates.map((e) => e.etaMin);
      expect([...etas].sort((a, b) => a - b)).toEqual(etas);
      for (const e of r.estimates) {
        expect(e.etaMin).toBeGreaterThanOrEqual(1);
        expect(e.meters).toBeGreaterThanOrEqual(0);
        expect(typeof e.stop).toBe('string');
      }
    }
  });

  it('narrows to a single route with a route filter', () => {
    const r = estimateArrivals(firstStop.name, firstRoute.code);
    for (const e of r.estimates) expect(e.route).toBe(firstRoute.code);
  });
});
