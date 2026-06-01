import { describe, it, expect, beforeAll } from 'vitest';
import { dispatchTool } from './tools';
import { getReportStore } from '../store';

// Tools read server-owned state: the feed cache (falls back to committed fixtures when the poller
// hasn't run, as in tests) and the report store (in-memory in vitest — seeded here).
beforeAll(() => {
  getReportStore().seed(['BE', 'CC', 'CLS', 'ER', 'MC', 'NWC', 'WMC']);
});

describe('dispatchTool (read tools)', () => {
  it('get_stops returns fixture stops for CC', async () => {
    const r: any = await dispatchTool('get_stops', { route: 'cc' });
    expect(r.route).toBe('CC');
    expect(r.stops.length).toBeGreaterThan(0);
  });

  it('get_stops rejects an unknown route', async () => {
    const r: any = await dispatchTool('get_stops', { route: 'ZZZ' });
    expect(r.error).toBe('unknown_route');
  });

  it('get_live_buses returns simulated buses with a source flag', async () => {
    const r: any = await dispatchTool('get_live_buses', { route: 'CC' });
    expect(r.source).toBe('mock');
    expect(r.count).toBeGreaterThanOrEqual(1);
    expect(r.buses[0].route).toBe('CC');
  });

  it('get_capacity returns seeded routes with labels + confidence', async () => {
    const r: any = await dispatchTool('get_capacity', {});
    expect(Array.isArray(r.routes)).toBe(true);
    expect(r.routes.length).toBeGreaterThan(0);
    expect(r.routes[0]).toHaveProperty('label');
    expect(r.routes[0]).toHaveProperty('confident');
  });

  it('find_most_crowded returns a ranking', async () => {
    const r: any = await dispatchTool('find_most_crowded', {});
    expect(r.ranking.length).toBeGreaterThan(0);
  });

  it('check_down_buses separates confirmed from unconfirmed', async () => {
    const r: any = await dispatchTool('check_down_buses', {});
    expect(Array.isArray(r.confirmedDown)).toBe(true);
    expect(Array.isArray(r.unconfirmedReports)).toBe(true);
  });

  it('plan_route compares modes for a known pair (and resolves aliases)', async () => {
    const r: any = await dispatchTool('plan_route', { from: 'the union', to: 'rpac' });
    expect(r.from).toBe('Ohio Union');
    expect(r.to).toBe('RPAC');
    expect(r.walkMin).toBeGreaterThan(0);
    expect(r.scooterMin).toBeGreaterThan(0);
    expect(r.hasDirectBus).toBe(true);
    expect(r.busRoutes.length).toBeGreaterThan(0);
  });

  it('plan_route rejects an unknown location', async () => {
    const r: any = await dispatchTool('plan_route', { from: 'Narnia', to: 'RPAC' });
    expect(r.error).toBe('unknown_location');
  });

  it('get_next_arrival returns estimates or a clear note', async () => {
    const r: any = await dispatchTool('get_next_arrival', { stop: 'Ohio Union' });
    expect(r).toHaveProperty('estimates');
    expect(r).toHaveProperty('source');
  });

  it('unknown tool returns an error', async () => {
    const r: any = await dispatchTool('nope', {});
    expect(r.error).toMatch(/unknown_tool/);
  });
});
