import { describe, it, expect } from 'vitest';
import { planTrip } from './planTrip';

// No GOOGLE_MAPS_SERVER_KEY in tests → geocode uses the curated fallback and walkPath uses a
// straight-line estimate. Routing still assembles from the fixture stops.
describe('planTrip', () => {
  it('plans a trip between two resolvable campus spots', async () => {
    const r = await planTrip('the union', 'rpac');
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.from.name).toBe('Ohio Union');
    expect(r.to.name).toBe('RPAC');
    expect(r.walkMin).toBeGreaterThan(0);
    expect(r.scooterMin).toBeGreaterThan(0);
    expect(['walk', 'bus', 'scooter']).toContain(r.fastest);
    if (r.bus) {
      expect(r.bus.board).toHaveProperty('name');
      expect(r.bus.alight).toHaveProperty('name');
      expect(r.bus.totalMin).toBeGreaterThan(0);
    }
  });

  it('carries walk-leg geometry on the bus option (offline fallbacks with no key)', async () => {
    const r = await planTrip('the union', 'rpac');
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.bus).toBeTruthy();
    if (!r.bus) return;
    expect(r.bus.walkToBoardPolyline).toBe('');
    expect(r.bus.walkToBoardSteps).toEqual([]);
    expect(r.bus.walkFromAlightPolyline).toBe('');
    expect(r.bus.walkFromAlightSteps).toEqual([]);
    expect(r.bus.board.id).not.toBe(r.bus.alight.id);
    expect(r.bus.totalMin).toBe(r.bus.walkToBoardMin + r.bus.busMin + r.bus.walkFromAlightMin);
  });

  it('returns identical plans for identical queries', async () => {
    const r1 = await planTrip('the union', 'rpac');
    const r2 = await planTrip('the union', 'rpac');
    expect(r2).toEqual(r1);
  });

  it('flags an unresolved origin', async () => {
    const r = await planTrip('somewhere imaginary zzz', 'rpac');
    expect(r).toMatchObject({ error: 'unresolved_from' });
  });

  it('flags an unresolved destination', async () => {
    const r = await planTrip('rpac', 'somewhere imaginary zzz');
    expect(r).toMatchObject({ error: 'unresolved_to' });
  });
});
