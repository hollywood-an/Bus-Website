import { describe, it, expect, beforeAll } from 'vitest';
import { dispatchTool, directiveFor } from './tools';
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
    expect(r.outOfService).toBeUndefined(); // mock buses always predict stops
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
    expect(r.notInService).toEqual([]); // mock mode: every route is in service
  });

  it('plan_route plans a trip for a geocodable pair (offline curated fallback)', async () => {
    const r: any = await dispatchTool('plan_route', { from: 'the union', to: 'rpac' });
    expect(r.from).toBe('Ohio Union');
    expect(r.to).toBe('RPAC');
    expect(r.walkMin).toBeGreaterThan(0);
    expect(r.scooterMin).toBeGreaterThan(0);
    expect(['walk', 'bus', 'scooter']).toContain(r.fastest);
  });

  it('plan_route reports an unresolved location', async () => {
    const r: any = await dispatchTool('plan_route', { from: 'Narnia', to: 'rpac' });
    expect(r.error).toBe('unresolved_from');
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

describe('action tools (propose, never write)', () => {
  it('submit_capacity_report proposes and validates the level', async () => {
    const ok: any = await dispatchTool('submit_capacity_report', { route: 'cc', level: 3 });
    expect(ok.proposed).toBe(true);
    expect(ok.route).toBe('CC');
    expect(ok.label).toBe('Crowded');
    expect(ok.points).toBe(1);

    expect((await dispatchTool('submit_capacity_report', { route: 'CC', level: 9 })) as any).toHaveProperty('error', 'bad_level');
    expect((await dispatchTool('submit_capacity_report', { route: 'ZZZ', level: 2 })) as any).toHaveProperty('error', 'unknown_route');
  });

  it('report_bus_down proposes with +2 points', async () => {
    const r: any = await dispatchTool('report_bus_down', { route: 'NWC' });
    expect(r.proposed).toBe(true);
    expect(r.kind).toBe('down');
    expect(r.points).toBe(2);
  });

  it('directiveFor returns a confirm directive for a proposal, null otherwise', async () => {
    const proposal = await dispatchTool('submit_capacity_report', { route: 'CC', level: 4 });
    const d = directiveFor('submit_capacity_report', proposal);
    expect(d).toMatchObject({ type: 'confirm', action: 'submit_capacity_report' });
    expect(d!.args).toMatchObject({ kind: 'capacity', route: 'CC', level: 4, label: 'Very full', points: 1 });

    expect(directiveFor('get_capacity', await dispatchTool('get_capacity', {}))).toBeNull();
    // a rejected proposal must NOT produce a confirm directive
    expect(directiveFor('submit_capacity_report', await dispatchTool('submit_capacity_report', { route: 'ZZZ', level: 2 }))).toBeNull();
  });
});

describe('UI-control tools (drive the app, emit ui_directive)', () => {
  it('focus_map_on_route validates and yields a ui_directive', async () => {
    const r: any = await dispatchTool('focus_map_on_route', { route: 'cc' });
    expect(r.ok).toBe(true);
    expect(r.route).toBe('CC');
    expect(directiveFor('focus_map_on_route', r)).toEqual({ type: 'ui_directive', action: 'focus_map_on_route', args: { route: 'CC' } });

    const bad: any = await dispatchTool('focus_map_on_route', { route: 'ZZZ' });
    expect(bad.error).toBe('unknown_route');
    expect(directiveFor('focus_map_on_route', bad)).toBeNull();
  });

  it('highlight_stops carries the stop ids', async () => {
    const r: any = await dispatchTool('highlight_stops', { stop_ids: ['501', '94'], route: 'CC' });
    expect(r.ok).toBe(true);
    expect(directiveFor('highlight_stops', r)).toMatchObject({ type: 'ui_directive', action: 'highlight_stops', args: { stopIds: ['501', '94'], route: 'CC' } });
    expect((await dispatchTool('highlight_stops', { stop_ids: [] })) as any).toHaveProperty('error', 'no_stops');
  });

  it('plan_route emits a show_trip ui_directive with map geometry', async () => {
    const r: any = await dispatchTool('plan_route', { from: 'the union', to: 'rpac' });
    const d = directiveFor('plan_route', r);
    expect(d).toMatchObject({ type: 'ui_directive', action: 'show_trip' });
    expect(d!.args).toHaveProperty('from');
    expect(d!.args).toHaveProperty('to');
    expect(d!.args).toHaveProperty('walk');
    const geoBus = (d!.args as { bus: Record<string, unknown> | null }).bus;
    if (geoBus) {
      // The map needs the walk-leg paths; turn-by-turn steps stay out of the SSE payload.
      expect(geoBus).toHaveProperty('walkToBoardPolyline');
      expect(geoBus).toHaveProperty('walkFromAlightPolyline');
      expect(geoBus).not.toHaveProperty('walkToBoardSteps');
    }
    // The model-visible summary carries no geometry (token guard; _geometry is stripped by the loop).
    if (r.bus) {
      expect(r.bus).not.toHaveProperty('routePolyline');
      expect(r.bus).not.toHaveProperty('walkToBoardPolyline');
      expect(r.bus).not.toHaveProperty('walkToBoardSteps');
    }
    // an unresolved trip produces no directive
    expect(directiveFor('plan_route', await dispatchTool('plan_route', { from: 'Narnia', to: 'rpac' }))).toBeNull();
  });
});
