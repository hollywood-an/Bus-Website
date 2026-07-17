import { describe, it, expect } from 'vitest';
import { parseRoutes, parseRouteDetail, parseVehicles } from './parse';
import * as cache from './cache';
import { getVehicles, vehicleSource, routeInService } from './vehicles';

describe('parse (defensive coercion of an untrusted feed)', () => {
  it('parseRoutes upper-cases codes and drops junk', () => {
    const routes = parseRoutes({
      data: {
        routes: [
          { code: 'cc', service: 'clever', name: 'Campus Connector', color: '#005716', darkColor: '#0A8721', showByDefault: true },
          { code: '', name: 'no code' },
          { nope: 1 },
        ],
      },
    });
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ code: 'CC', name: 'Campus Connector', showByDefault: true });
  });

  it('parseRouteDetail keeps valid stops/patterns, drops bad coords and empty polylines', () => {
    const d = parseRouteDetail('cc', {
      data: {
        patterns: [
          { id: '1', length: 10, encodedPolyline: 'abc', direction: 'ib' },
          { id: '2', encodedPolyline: '' },
        ],
        stops: [
          { id: '1', name: 'A', latitude: 40, longitude: -83 },
          { id: '2', name: 'bad', latitude: 'x', longitude: null },
          { id: '3', name: 'null island', latitude: 0, longitude: 0 },
        ],
      },
    });
    expect(d.code).toBe('CC');
    expect(d.patterns).toHaveLength(1);
    expect(d.stops).toHaveLength(1);
  });

  it('parseVehicles handles the empty summer array', () => {
    expect(parseVehicles('cc', { data: { vehicles: [] } })).toEqual([]);
  });

  it('parseVehicles parses a populated vehicle and drops coord-less ones', () => {
    const v = parseVehicles('cc', {
      data: { vehicles: [{ latitude: 40, longitude: -83, heading: 90, delayed: true, destination: 'RPAC' }, { latitude: 'nope' }] },
    });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ route: 'CC', latitude: 40, heading: 90, delayed: true, destination: 'RPAC' });
  });

  it('parseVehicles keeps all valid predictions as nextStops, soonest first', () => {
    const v = parseVehicles('cc', {
      data: {
        vehicles: [
          {
            latitude: 40,
            longitude: -83,
            predictions: [
              { stopName: 'Mount Hall Loop', timeToArrivalInSeconds: 420, type: 'departure' },
              { stopId: '24', stopName: 'St. John Arena (Westbound)', timeToArrivalInSeconds: 0 },
              { stopName: 'Fifth', timeToArrivalInSeconds: 600 },
              { stopName: 'Midwest Campus', timeToArrivalInSeconds: 180 },
              { timeToArrivalInSeconds: 300 }, // no name -> dropped
              { stopName: 'Bad', timeToArrivalInSeconds: 'x' }, // junk seconds -> dropped
            ],
          },
        ],
      },
    });
    expect(v[0]!.nextStops).toEqual([
      { id: '24', name: 'St. John Arena (Westbound)', etaMin: 0 },
      { id: undefined, name: 'Midwest Campus', etaMin: 3 },
      { id: undefined, name: 'Mount Hall Loop', etaMin: 7 },
      { id: undefined, name: 'Fifth', etaMin: 10 },
    ]);
  });

  it('parseVehicles leaves nextStops undefined for missing or junk predictions', () => {
    const v = parseVehicles('cc', {
      data: { vehicles: [{ latitude: 40, longitude: -83 }, { latitude: 41, longitude: -83, predictions: 'junk' }] },
    });
    expect(v[0]!.nextStops).toBeUndefined();
    expect(v[1]!.nextStops).toBeUndefined();
  });
});

describe('cache fixture fallback (poller never ran)', () => {
  it('getRoutes falls back to committed fixtures', () => {
    const routes = cache.getRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(6);
    expect(routes.map((r) => r.code)).toContain('CC');
  });

  it('getRouteDetail returns real stops + an encoded polyline for CC', () => {
    const d = cache.getRouteDetail('CC');
    expect(d).not.toBeNull();
    expect(d!.stops.length).toBeGreaterThan(0);
    expect(d!.patterns.length).toBeGreaterThan(0);
    expect(d!.patterns[0]!.encodedPolyline.length).toBeGreaterThan(0);
  });

  it('getRouteDetail returns null for an unknown route', () => {
    expect(cache.getRouteDetail('ZZZ')).toBeNull();
  });

  it('feedStatus is fixtures + not live before any successful poll', () => {
    const s = cache.feedStatus();
    expect(s.live).toBe(false);
    expect(s.source).toBe('fixtures');
  });
});

describe('mock vehicles (default source)', () => {
  it('reports mock as the source by default', () => {
    expect(vehicleSource()).toBe('mock');
  });

  it('places buses on the route at finite coords with a heading', () => {
    const v = getVehicles('CC');
    expect(v.length).toBeGreaterThanOrEqual(1);
    expect(v[0]).toMatchObject({ route: 'CC' });
    expect(Number.isFinite(v[0]!.latitude)).toBe(true);
    expect(Number.isFinite(v[0]!.longitude)).toBe(true);
    expect(v[0]!.heading).toBeGreaterThanOrEqual(0);
  });

  it('routeInService follows whether any bus predicts an upcoming stop', () => {
    expect(routeInService('CC')).toBe(true); // mock buses always predict
    expect(routeInService('ZZZ')).toBe(false); // unknown route -> no vehicles -> not in service
  });

  it('synthesizes nextStops from real stop names with plausible ETAs', () => {
    const stopNames = new Set(cache.getRouteDetail('CC')!.stops.map((s) => s.name));
    for (const v of getVehicles('CC')) {
      if (!v.nextStops) continue; // a bus at the very end of the loop legitimately has none
      expect(v.nextStops.length).toBeGreaterThanOrEqual(1);
      expect(v.nextStops.length).toBeLessThanOrEqual(3);
      for (const s of v.nextStops) {
        expect(stopNames.has(s.name)).toBe(true);
        expect(s.etaMin).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
