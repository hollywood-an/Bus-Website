import { useState, useEffect } from 'react';
import { MapPinOff, LocateFixed, Navigation2, AlertTriangle } from 'lucide-react';
import CapacityMeter from './CapacityMeter';
import RouteChip from './RouteChip';
import { CAPACITY_LEVELS } from '../data/capacity';
import { statusFor } from '../lib/serviceStatus';
import { timeAgo } from '../lib/format';

// Map-forward, now with a detail panel: route lines + stops + buses on the left, and crowding / status /
// arrivals on the right (below the map on mobile). Crowding + down come from useReports via App.
export default function MapView({
  mapLoaded,
  mapError,
  routesError,
  routes,
  selectedRoutes = [],
  setSelectedRoutes,
  feedLive,
  vehicleSource,
  vehicles = [],
  vehiclesLoaded = false,
  capacity = [],
  down = [],
  locateUser,
  locateError,
  openReport,
}) {
  const [stopCount, setStopCount] = useState(null);

  const capByCode = new Map(capacity.map((c) => [c.route, c]));
  const downByCode = new Map(down.map((d) => [d.route, d]));
  // Selection in click order drives the panel's card order; `single` gates the full detail view.
  const selectedRouteObjs = selectedRoutes.map((c) => routes.find((r) => r.code === c)).filter(Boolean);
  const single = selectedRoutes.length === 1 ? selectedRoutes[0] : null;
  const toggleRoute = (code) =>
    setSelectedRoutes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  // Stop count for a single selected route (server-cached; cheap).
  useEffect(() => {
    if (!single) {
      setStopCount(null);
      return;
    }
    let cancelled = false;
    setStopCount(null);
    fetch(`/api/routes/${single}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && Array.isArray(d.stops)) setStopCount(d.stops.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [single]);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl">Ohio State Campus Map</h1>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1" style={{ color: feedLive ? 'var(--ok)' : 'var(--warn)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: feedLive ? 'var(--ok)' : 'var(--warn)' }} />
            {feedLive ? 'Live feed' : 'Last known'}
          </span>
          {/* No claim before data: "simulated" only when the server actually says so (audit D6b). */}
          {vehicleSource != null && (
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">buses: {vehicleSource === 'live' ? 'live' : 'simulated'}</span>
          )}
        </div>
      </div>

      {routesError && routes.length === 0 && (
        <div className="mb-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-soft">
          Routes unavailable. Check your connection; showing the map without route lines.
        </div>
      )}

      {/* Route filter chips: multi-select toggles, each with its route-identity color dot.
          (Crowding/down status lives in the panel, popups, and the Check view.) */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedRoutes([])}
          aria-pressed={selectedRoutes.length === 0}
          className="rounded-full px-3 py-2 text-xs font-bold transition-colors"
          style={selectedRoutes.length === 0 ? { backgroundColor: 'var(--ink)', color: '#fff' } : { backgroundColor: 'var(--surface-2)', color: 'var(--ink-soft)' }}
        >
          All
        </button>
        {routes.map((r) => {
          const active = selectedRoutes.includes(r.code);
          return (
            <button
              key={r.code}
              onClick={() => toggleRoute(r.code)}
              title={r.name}
              aria-pressed={active}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide transition-colors"
              style={active ? { backgroundColor: r.color, color: '#fff' } : { backgroundColor: 'var(--surface-2)', color: 'var(--ink-soft)' }}
            >
              {r.code}
              <span
                aria-hidden
                className="h-2 w-2 rounded-full ring-1 ring-white/80"
                style={{ backgroundColor: active ? '#ffffff' : r.color }}
              />
            </button>
          );
        })}
      </div>

      {locateError && (
        <div className="mb-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-soft">{locateError}</div>
      )}

      <div className="md:flex md:gap-4">
        {/* Map. #google-map is a dedicated div Google fully owns; overlays are SIBLINGS so React never
            fights Google over the same children. */}
        <div className="relative h-[52vh] flex-1 overflow-hidden rounded-xl border border-line bg-surface-2 md:h-[calc(100vh-9.5rem)]">
          <div id="google-map" className="absolute inset-0" />
          {mapError ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <MapPinOff size={28} className="mx-auto text-muted" />
                <p className="mt-2 font-bold text-ink">Map unavailable</p>
                <p className="mt-1 text-sm text-muted">Couldn&apos;t load the map. Check your connection and try again.</p>
              </div>
            </div>
          ) : !mapLoaded ? (
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-scarlet" />
            </div>
          ) : null}
          {mapLoaded && !mapError && locateUser && (
            <button
              onClick={locateUser}
              aria-label="Find my location and the nearest stop"
              className="absolute bottom-3 left-3 z-10 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-ink shadow-[var(--shadow-float)] transition-colors hover:bg-surface-2"
            >
              <LocateFixed size={16} className="text-scarlet-ink" /> Locate me
            </button>
          )}
        </div>

        {/* Detail panel (right on desktop, below on mobile): live service board for All, full detail
            for one route, a compact card per route when comparing several. */}
        <aside className="mt-3 rounded-xl border border-line bg-surface p-4 md:mt-0 md:w-80 md:shrink-0 md:overflow-y-auto">
          {selectedRouteObjs.length === 0 && (
            <ServiceBoard
              routes={routes}
              vehicles={vehicles}
              capByCode={capByCode}
              downByCode={downByCode}
              vehiclesLoaded={vehiclesLoaded}
              onToggle={toggleRoute}
            />
          )}
          {selectedRouteObjs.length === 1 && (
            <RouteDetail
              route={selectedRouteObjs[0]}
              cap={capByCode.get(selectedRouteObjs[0].code)}
              down={downByCode.get(selectedRouteObjs[0].code)}
              routeVehicles={vehicles.filter((v) => v.route === selectedRouteObjs[0].code)}
              vehicleSource={vehicleSource}
              stopCount={stopCount}
              openReport={openReport}
            />
          )}
          {selectedRouteObjs.length >= 2 && (
            <div className="space-y-3">
              {selectedRouteObjs.map((r) => (
                <CompactRouteCard
                  key={r.code}
                  route={r}
                  cap={capByCode.get(r.code)}
                  down={downByCode.get(r.code)}
                  routeVehicles={vehicles.filter((v) => v.route === r.code)}
                  vehicleSource={vehicleSource}
                />
              ))}
            </div>
          )}
        </aside>
      </div>

      <p className="mt-2.5 text-xs text-muted">
        Stops and route lines from OSU&apos;s live feed. Arrows are buses
        {vehicleSource == null ? '' : vehicleSource === 'live' ? ' (live positions)' : ' (simulated while service is paused)'}; tap a stop
        or bus for details.
      </p>
    </section>
  );
}

// Mirrors the server's routeInService: end-of-service vehicles linger in the live feed with no
// predicted stops ("Last Pick Up" deadheads), so bus count alone can't be trusted.
function anyInService(routeVehicles) {
  return routeVehicles.some((v) => v.nextStops?.length > 0);
}

// One bus's destination + its next (up to 3) stops with ETAs. nextStops is real feed data when
// live, synthesized from the motion model when simulated; absent -> destination only.
function BusNextStops({ vehicle }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-2.5 py-2">
      <div className="text-[12px] font-bold text-ink">Bus{vehicle.destination ? ` to ${vehicle.destination}` : ''}</div>
      {vehicle.nextStops?.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {vehicle.nextStops.slice(0, 3).map((s, i) => (
            <li key={s.id ?? i} className="flex items-baseline justify-between gap-2 text-[12px] text-ink-soft">
              <span className="min-w-0 truncate">{s.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted">{s.etaMin === 0 ? 'Due' : `${s.etaMin} min`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RouteDetail({ route, cap, down, routeVehicles = [], vehicleSource, stopCount, openReport }) {
  const inService = anyInService(routeVehicles);
  const activeBuses = routeVehicles.filter((v) => v.nextStops?.length > 0);
  const status = statusFor(down, inService);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <RouteChip code={route.code} color={route.color} size="md" />
        <h2 className="text-base font-bold leading-tight">{route.name}</h2>
      </div>

      <div className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: status.color }}>
        {down && <AlertTriangle size={14} />}
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
        {status.label}
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Crowding</div>
        {cap ? (
          <div className="mt-1.5">
            <CapacityMeter level={cap.level} confident={cap.confident} />
            <div className="mt-1 font-mono text-[11px] text-muted">
              {cap.reporterCount} rider{cap.reporterCount !== 1 ? 's' : ''} · {timeAgo(cap.newestAt)}
            </div>
          </div>
        ) : (
          <div className="mt-1 text-sm text-muted">No recent reports.</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Buses now</div>
          <div className="mt-0.5 font-mono text-lg font-bold text-ink">{routeVehicles.length}</div>
          <div className="text-[11px] text-muted">
            {vehicleSource == null ? '' : vehicleSource !== 'live' ? 'simulated' : inService ? 'live' : 'tracked, not in service'}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Stops</div>
          <div className="mt-0.5 font-mono text-lg font-bold text-ink">{stopCount ?? '—'}</div>
          <div className="text-[11px] text-muted">on this route</div>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Next stops per bus</div>
        {activeBuses.length ? (
          <div className="mt-1.5 space-y-2">
            {activeBuses.map((v, i) => (
              <BusNextStops key={v.id ?? i} vehicle={v} />
            ))}
          </div>
        ) : (
          <div className="mt-1 text-sm text-muted">
            {routeVehicles.length ? 'Buses are tracked but not in passenger service.' : 'No buses on this route right now.'}
          </div>
        )}
      </div>

      {openReport && (
        <button
          onClick={() => openReport(route.code)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink-soft transition-colors hover:bg-surface-2"
        >
          Report this route&apos;s crowding
        </button>
      )}
      <p className="text-[12px] text-muted">Tap a stop for the next arrival, or a bus for where it&apos;s headed.</p>
    </div>
  );
}

// Compact per-route card for the multi-select comparison panel: status, crowding, and each bus's
// next stops — no stop count or report button (the single-route detail carries those).
function CompactRouteCard({ route, cap, down, routeVehicles = [], vehicleSource }) {
  const inService = anyInService(routeVehicles);
  const activeBuses = routeVehicles.filter((v) => v.nextStops?.length > 0);
  const status = statusFor(down, inService);
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <RouteChip code={route.code} color={route.color} />
          <span className="truncate text-sm font-bold text-ink">{route.name}</span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: status.color }}>
          {down && <AlertTriangle size={12} />}
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
          {status.label}
        </span>
      </div>

      <div className="mt-2">
        {cap ? (
          <CapacityMeter level={cap.level} confident={cap.confident} />
        ) : (
          <div className="text-[12px] text-muted">No recent reports.</div>
        )}
      </div>

      <div className="mt-2 font-mono text-[11px] text-muted">
        {routeVehicles.length} bus{routeVehicles.length !== 1 ? 'es' : ''}
        {vehicleSource == null ? '' : ` · ${vehicleSource !== 'live' ? 'simulated' : inService ? 'live' : 'tracked, not in service'}`}
      </div>

      {activeBuses.length > 0 && (
        <div className="mt-2 space-y-2">
          {activeBuses.map((v, i) => (
            <BusNextStops key={v.id ?? i} vehicle={v} />
          ))}
        </div>
      )}
    </div>
  );
}

// Live per-route service board: the empty-selection panel leads with what's actually running —
// real statuses (down-report > not-in-service > running) and the soonest next stop with a real
// feed ETA. Rows toggle the route into the map selection, so the board doubles as a navigator.
function ServiceBoard({ routes, vehicles, capByCode, downByCode, vehiclesLoaded, onToggle }) {
  const rows = routes.map((r) => {
    const routeVehicles = vehicles.filter((v) => v.route === r.code);
    const inService = anyInService(routeVehicles);
    const dn = downByCode.get(r.code);
    // One line per in-service bus: its soonest upcoming stop (nextStops[0]), soonest bus first.
    const busStops = routeVehicles
      .map((v) => v.nextStops?.[0])
      .filter(Boolean)
      .sort((a, b) => a.etaMin - b.etaMin);
    return {
      route: r,
      dn,
      inService,
      status: statusFor(dn, inService),
      busStops,
      cap: capByCode.get(r.code),
    };
  });
  // Count and sort from the SAME statusFor label the rows render — the summary must never
  // contradict the list below it (audit D6a).
  const running = rows.filter((x) => x.status.label === 'Running').length;
  // Running first (the 2-second glance), then down-reported (needs attention), then asleep.
  const rowRank = (x) => (x.status.label === 'Running' ? 0 : x.status.label === 'Not in service' ? 2 : 1);
  const ordered = rows.slice().sort((a, b) => rowRank(a) - rowRank(b));

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="text-base font-bold">Service right now</h2>
        {vehiclesLoaded && (
          <p className="mt-0.5 text-[12px] text-muted">
            <span className="font-mono font-bold text-ink-soft">{running}</span> of{' '}
            <span className="font-mono font-bold text-ink-soft">{routes.length}</span> routes running
          </p>
        )}
      </div>

      <ul className="-mx-1.5 space-y-0.5">
        {ordered.map(({ route, dn, inService, status, busStops, cap }) => (
          <li key={route.code}>
            <button
              onClick={() => onToggle(route.code)}
              className="min-h-11 w-full rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <RouteChip code={route.code} color={route.color} />
                  <span className="truncate text-[13px] font-bold text-ink">{route.name}</span>
                </span>
                {vehiclesLoaded ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: status.color }}>
                    {dn && <AlertTriangle size={12} />}
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                    {status.label}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-muted">checking…</span>
                )}
              </span>
              {vehiclesLoaded && inService && busStops.length > 0 && (
                <span className="mt-1 block space-y-0.5">
                  {busStops.map((s, i) => (
                    <span key={i} className="flex items-baseline justify-between gap-2 text-[12px] text-ink-soft">
                      <span className="min-w-0 truncate">→ {s.name}</span>
                      <span className="shrink-0 font-mono text-[11px] font-bold">{s.etaMin === 0 ? 'Due' : `${s.etaMin} min`}</span>
                    </span>
                  ))}
                  {cap && (
                    <span className="block text-[11px] font-bold" style={{ color: `var(--cap-${cap.level}-ink)` }}>
                      {CAPACITY_LEVELS[cap.level]?.label}
                      {!cap.confident && <span className="font-normal text-muted"> (unconfirmed)</span>}
                    </span>
                  )}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Compact how-to-read strip; the board above is the headline. */}
      <div className="space-y-2.5 border-t border-line pt-3 text-[12px] text-ink-soft">
        <div className="flex items-center gap-2">
          <Navigation2 size={13} className="shrink-0 text-ink" fill="currentColor" />
          <span>Arrows are buses, pointing the way they travel.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-ink-soft ring-1 ring-line" />
          <span>Dots are stops. Tap one for the next arrival.</span>
        </div>
        <div>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-2 flex-1 rounded-full" style={{ backgroundColor: `var(--cap-${i})` }} />
            ))}
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] text-muted">
            <span>Empty</span>
            <span>Very full</span>
          </div>
        </div>
        <p className="text-muted">Tap a route to focus it, or pick several chips to compare.</p>
      </div>
    </div>
  );
}
