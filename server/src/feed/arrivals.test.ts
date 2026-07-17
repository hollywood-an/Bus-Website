import { describe, it, expect } from 'vitest';
import { estimateArrivals, predictedEtaMin } from './arrivals';
import { getRoutes, getRouteDetail, getVehicles } from './index';
import type { Stop, Vehicle } from './types';

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
        expect(e.etaMin).toBeGreaterThanOrEqual(0); // 0 = due (real feed prediction)
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

describe('predictedEtaMin (real feed ETAs beat straight-line)', () => {
  const stop: Stop = { id: '24', name: 'St. John Arena (Westbound)', latitude: 40, longitude: -83 };
  const vehicleAt = (nextStops?: Vehicle['nextStops']): Vehicle => ({ latitude: 40.01, longitude: -83.01, nextStops });

  it('matches by stop id and takes the soonest across vehicles', () => {
    const eta = predictedEtaMin(
      [
        vehicleAt([{ id: '24', name: 'St. John Arena (Westbound)', etaMin: 6 }]),
        vehicleAt([{ id: '24', name: 'St. John Arena (Westbound)', etaMin: 2 }]),
      ],
      stop,
    );
    expect(eta).toBe(2);
  });

  it('falls back to an exact case-insensitive name match when ids are absent', () => {
    const eta = predictedEtaMin([vehicleAt([{ name: 'st. john arena (westbound)', etaMin: 4 }])], stop);
    expect(eta).toBe(4);
  });

  it('returns null when no vehicle predicts the stop (straight-line fallback applies)', () => {
    expect(predictedEtaMin([vehicleAt([{ id: '99', name: 'Elsewhere', etaMin: 1 }]), vehicleAt(undefined)], stop)).toBeNull();
  });
});
