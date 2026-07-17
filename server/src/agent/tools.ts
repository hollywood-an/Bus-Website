import * as feed from '../feed';
import { getReportStore } from '../store';
import { planTrip } from '../planning/planTrip';
import { validateReport } from '../validateReport';

// Read tools for the agent. Each reads server-owned state (feed cache + report store) and returns a
// plain JSON-serializable object. Tools validate their own input and return { error } rather than
// throwing, so the model can recover. Anthropic tool-use schemas are exported as TOOL_DEFS.

export const CAPACITY_LABELS = ['Empty', 'Few seats', 'Filling up', 'Crowded', 'Very full'];
const round = (n: number) => Math.round(n * 1e6) / 1e6;

function nameForCode(code: string): string {
  return feed.getRoutes().find((r) => r.code === code)?.name ?? code;
}
function knownCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const up = input.toUpperCase();
  return feed.getRoutes().some((r) => r.code === up) ? up : null;
}
function minutesAgo(ts: number): number {
  return Math.round((Date.now() - ts) / 60_000);
}

function capacityForCode(code: string) {
  const c = getReportStore().capacity(code)[0];
  if (!c) return null;
  return {
    route: code,
    name: nameForCode(code),
    level: c.level,
    label: CAPACITY_LABELS[c.level],
    reporters: c.reporterCount,
    confident: c.confident,
    reportedMinAgo: minutesAgo(c.newestAt),
  };
}

// --- tool implementations ---

function getLiveBuses(input: { route?: unknown }) {
  const source = feed.vehicleSource();
  const code = knownCode(input.route);
  if (input.route && !code) return { error: 'unknown_route', knownRoutes: feed.getRoutes().map((r) => r.code) };
  const codes = code ? [code] : feed.getRoutes().map((r) => r.code);
  const buses = codes.flatMap((c) =>
    feed.getVehicles(c).map((v) => ({
      route: c,
      lat: round(v.latitude),
      lng: round(v.longitude),
      heading: v.heading ?? null,
      destination: v.destination ?? null,
      delayed: v.delayed ?? null,
    })),
  );
  return {
    source,
    count: buses.length,
    buses,
    note: source === 'mock' ? 'Positions are simulated (demo mode), not live service.' : undefined,
  };
}

function getStops(input: { route?: unknown }) {
  const code = knownCode(input.route);
  if (!code) return { error: 'unknown_route', knownRoutes: feed.getRoutes().map((r) => r.code) };
  const detail = feed.getRouteDetail(code);
  if (!detail) return { error: 'unknown_route' };
  return {
    route: code,
    name: nameForCode(code),
    stops: detail.stops.map((s) => ({ id: s.id, name: s.name, lat: round(s.latitude), lng: round(s.longitude) })),
  };
}

function getNextArrival(input: { stop?: unknown; route?: unknown }) {
  if (typeof input.stop !== 'string' || !input.stop.trim()) return { error: 'missing_stop' };
  // Shared estimator (also serves GET /api/arrivals). Keep the raw stop string in the reply.
  return { ...feed.estimateArrivals(input.stop, input.route), stopQuery: input.stop };
}

function getCapacity(input: { route?: unknown }) {
  const code = knownCode(input.route);
  if (input.route && !code) return { error: 'unknown_route', knownRoutes: feed.getRoutes().map((r) => r.code) };
  const caps = getReportStore()
    .capacity(code ?? undefined)
    .map((c) => ({
      route: c.route,
      name: nameForCode(c.route),
      level: c.level,
      label: CAPACITY_LABELS[c.level],
      reporters: c.reporterCount,
      confident: c.confident,
      reportedMinAgo: minutesAgo(c.newestAt),
    }));
  return { routes: caps, note: caps.length === 0 ? 'No capacity reports right now.' : undefined };
}

function rankCrowded(most: boolean) {
  const caps = getReportStore().capacity();
  if (caps.length === 0) return { result: null, note: 'No capacity reports right now.' };
  const sorted = [...caps].sort((a, b) => (most ? b.level - a.level : a.level - b.level));
  const top = sorted[0]!;
  return {
    route: top.route,
    name: nameForCode(top.route),
    label: CAPACITY_LABELS[top.level],
    confident: top.confident,
    ranking: sorted.map((c) => ({ route: c.route, label: CAPACITY_LABELS[c.level], confident: c.confident })),
  };
}

function checkDownBuses() {
  const down = getReportStore().down();
  const label = (d: { route: string }) => ({ route: d.route, name: nameForCode(d.route) });
  return {
    confirmedDown: down.filter((d) => d.confirmed).map(label),
    unconfirmedReports: down.filter((d) => !d.confirmed).map(label),
    note:
      feed.vehicleSource() === 'mock'
        ? 'Vehicle positions are simulated (demo mode), so I can’t cross-check live presence right now.'
        : undefined,
  };
}

// Plan a trip between ANY two OSU buildings / nearby addresses (geocoded). Returns a compact summary
// for the model plus `_geometry` (stripped from the tool_result by the loop) that directiveFor turns
// into a show_trip directive — the 3 options render on a map inside the chat (no view switch).
async function planRoute(input: { from?: unknown; to?: unknown }) {
  const result = await planTrip(
    typeof input.from === 'string' ? input.from : '',
    typeof input.to === 'string' ? input.to : '',
  );
  if ('error' in result) {
    return { error: result.error, query: result.query, hint: 'Use any OSU building name or a nearby address.' };
  }

  const bus = result.bus;
  return {
    from: result.from.name,
    to: result.to.name,
    walkMin: result.walkMin,
    scooterMin: result.scooterMin,
    bus: bus
      ? {
          routeCode: bus.routeCode,
          routeName: bus.routeName,
          board: bus.board.name,
          alight: bus.alight.name,
          walkToBoardMin: bus.walkToBoardMin,
          busMin: bus.busMin,
          walkFromAlightMin: bus.walkFromAlightMin,
          totalMin: bus.totalMin,
          capacity: capacityForCode(bus.routeCode)?.label ?? 'no reports',
        }
      : null,
    fastest: result.fastest,
    note: 'Walk/scooter times from real walking distance; bus time is an estimate. Crowding is crowdsourced.',
    _geometry: {
      from: { name: result.from.name, lat: result.from.lat, lng: result.from.lng },
      to: { name: result.to.name, lat: result.to.lat, lng: result.to.lng },
      fastest: result.fastest,
      walk: { encodedPolyline: result.walkPolyline, min: result.walkMin },
      scooter: { min: result.scooterMin },
      bus: bus
        ? {
            routeCode: bus.routeCode,
            routeName: bus.routeName,
            routeColor: bus.routeColor,
            routePolyline: bus.routePolyline,
            // Real walking paths for the access legs (map only — steps stay out of the SSE payload).
            walkToBoardPolyline: bus.walkToBoardPolyline,
            walkFromAlightPolyline: bus.walkFromAlightPolyline,
            board: bus.board,
            alight: bus.alight,
            min: bus.totalMin,
          }
        : null,
    },
  };
}

// --- action tools: PROPOSE only. They validate and return a proposal; the actual write happens
// after the user confirms in the UI (see directiveFor + the client's POST /api/reports). The agent
// never silently writes data. ---

function proposeCapacity(input: { route?: unknown; level?: unknown }) {
  const v = validateReport('capacity', input.route, input.level);
  if (!v.ok) {
    return v.error === 'bad_level'
      ? { error: 'bad_level', validLevels: [0, 1, 2, 3, 4] }
      : { error: 'unknown_route', knownRoutes: feed.getRoutes().map((r) => r.code) };
  }
  return {
    proposed: true,
    kind: 'capacity' as const,
    route: v.code,
    name: nameForCode(v.code),
    level: v.level,
    label: CAPACITY_LABELS[v.level!],
    points: 1,
    awaiting: 'user confirmation',
  };
}

function proposeDown(input: { route?: unknown }) {
  const v = validateReport('down', input.route, undefined);
  if (!v.ok) return { error: 'unknown_route', knownRoutes: feed.getRoutes().map((r) => r.code) };
  return {
    proposed: true,
    kind: 'down' as const,
    route: v.code,
    name: nameForCode(v.code),
    points: 2,
    awaiting: 'user confirmation',
  };
}

// --- UI-control tools: drive the app's own UI. They don't change data — they return a small
// success object, and directiveFor() turns it into a ui_directive the client dispatcher applies
// mid-answer (the agent operates the product, it doesn't just describe it). ---

function focusMapOnRoute(input: { route?: unknown }) {
  const code = knownCode(input.route);
  if (!code) return { error: 'unknown_route', knownRoutes: feed.getRoutes().map((r) => r.code) };
  return { ok: true, route: code, shown: `Showing ${nameForCode(code)} (${code}) on the map.` };
}

function highlightStops(input: { stop_ids?: unknown; route?: unknown }) {
  const ids = Array.isArray(input.stop_ids) ? input.stop_ids.map(String).slice(0, 25) : [];
  if (ids.length === 0) return { error: 'no_stops' };
  return { ok: true, stopIds: ids, route: knownCode(input.route), shown: `Highlighted ${ids.length} stop(s).` };
}

export async function dispatchTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_live_buses':
      return getLiveBuses(input);
    case 'get_next_arrival':
      return getNextArrival(input);
    case 'get_capacity':
      return getCapacity(input);
    case 'find_least_crowded':
      return rankCrowded(false);
    case 'find_most_crowded':
      return rankCrowded(true);
    case 'check_down_buses':
      return checkDownBuses();
    case 'plan_route':
      return planRoute(input);
    case 'get_stops':
      return getStops(input);
    case 'submit_capacity_report':
      return proposeCapacity(input);
    case 'report_bus_down':
      return proposeDown(input);
    case 'focus_map_on_route':
      return focusMapOnRoute(input);
    case 'highlight_stops':
      return highlightStops(input);
    default:
      return { error: `unknown_tool:${name}` };
  }
}

// Build a client directive from a tool result, if the tool produces one. Action tools that validated
// successfully produce a `confirm` directive (the UI asks the user before the write commits). The
// loop streams this to the client AND the result still goes back to the model as the tool_result.
export interface Directive {
  type: 'confirm' | 'ui_directive';
  action: string;
  args: Record<string, unknown>;
}

export function directiveFor(name: string, result: unknown): Directive | null {
  if (!result || typeof result !== 'object') return null;
  const r = result as Record<string, unknown>;
  if ((name === 'submit_capacity_report' || name === 'report_bus_down') && r.proposed) {
    const args =
      r.kind === 'capacity'
        ? { kind: 'capacity', route: r.route, name: r.name, level: r.level, label: r.label, points: r.points }
        : { kind: 'down', route: r.route, name: r.name, points: r.points };
    return { type: 'confirm', action: name, args };
  }
  if (name === 'focus_map_on_route' && r.ok) {
    return { type: 'ui_directive', action: name, args: { route: r.route } };
  }
  if (name === 'highlight_stops' && r.ok) {
    return { type: 'ui_directive', action: name, args: { stopIds: r.stopIds, route: r.route } };
  }
  if (name === 'plan_route' && r._geometry) {
    return { type: 'ui_directive', action: 'show_trip', args: r._geometry as Record<string, unknown> };
  }
  return null;
}

// Anthropic tool definitions (tight descriptions help the model pick the right one).
export const TOOL_DEFS = [
  {
    name: 'get_live_buses',
    description: 'Live (or simulated) positions of buses on a route. Omit route for all routes.',
    input_schema: {
      type: 'object',
      properties: { route: { type: 'string', description: 'Route code, e.g. CC. Optional.' } },
    },
  },
  {
    name: 'get_next_arrival',
    description: 'Rough estimate of the next bus arrival at a named stop, from current bus positions.',
    input_schema: {
      type: 'object',
      properties: {
        stop: { type: 'string', description: 'Stop name or fragment, e.g. "Ohio Union".' },
        route: { type: 'string', description: 'Route code to narrow to. Optional.' },
      },
      required: ['stop'],
    },
  },
  {
    name: 'get_capacity',
    description: 'Crowdsourced fullness for a route (or all). Includes how many riders and whether it is corroborated.',
    input_schema: {
      type: 'object',
      properties: { route: { type: 'string', description: 'Route code. Optional (omit for all).' } },
    },
  },
  {
    name: 'find_least_crowded',
    description: 'The least crowded route right now, by crowdsourced reports, with the full ranking.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'find_most_crowded',
    description: 'The most crowded route right now, by crowdsourced reports, with the full ranking.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'check_down_buses',
    description: 'Routes riders report as down. Confirmed = corroborated by 2+ riders; unconfirmed = a single report.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'plan_route',
    description:
      'Plan a trip between ANY two OSU buildings or nearby addresses (free text — "Morrill", "Jones Tower", "1739 N High St"). Returns walk vs bus vs scooter, including "walk to the nearest stop, take route X", and renders the 3 options on a map inside the chat. Use for any "how do I get from A to B" question — do NOT also open the planner or switch to the campus map.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Origin campus location.' },
        to: { type: 'string', description: 'Destination campus location.' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'get_stops',
    description: 'The stops on a route (name + coordinates).',
    input_schema: {
      type: 'object',
      properties: { route: { type: 'string', description: 'Route code, e.g. CC.' } },
      required: ['route'],
    },
  },
  {
    name: 'submit_capacity_report',
    description:
      'Propose a crowdsourced capacity report for a route. Only call this when the user clearly wants to REPORT how full a bus is. The user is asked to confirm before it is saved — do not assume it is done.',
    input_schema: {
      type: 'object',
      properties: {
        route: { type: 'string', description: 'Route code, e.g. CC.' },
        level: { type: 'integer', description: 'Fullness 0=Empty,1=Few seats,2=Filling up,3=Crowded,4=Very full.' },
      },
      required: ['route', 'level'],
    },
  },
  {
    name: 'report_bus_down',
    description:
      'Propose a "bus is down / not running" report for a route. Only call this when the user clearly wants to REPORT a route as down. The user is asked to confirm before it is saved.',
    input_schema: {
      type: 'object',
      properties: { route: { type: 'string', description: 'Route code, e.g. NWC.' } },
      required: ['route'],
    },
  },
  {
    name: 'focus_map_on_route',
    description:
      'Show a route on the campus map (switches to the map view, selects the route, fits it, shows its buses). Call this whenever you talk about a specific route so the user SEES it.',
    input_schema: {
      type: 'object',
      properties: { route: { type: 'string', description: 'Route code, e.g. CC.' } },
      required: ['route'],
    },
  },
  {
    name: 'highlight_stops',
    description:
      'Emphasize specific stops on the map (use stop ids from get_stops). Optionally pass the route to select it first. Pair with focus_map_on_route to point at the stops you mention.',
    input_schema: {
      type: 'object',
      properties: {
        stop_ids: { type: 'array', items: { type: 'string' }, description: 'Stop ids from get_stops.' },
        route: { type: 'string', description: 'Route code to select first. Optional.' },
      },
      required: ['stop_ids'],
    },
  },
];
