import { useState, useEffect } from 'react';
import { MapPinOff, LocateFixed, Navigation2, AlertTriangle } from 'lucide-react';
import CapacityMeter from './CapacityMeter';
import RouteChip from './RouteChip';
import { CAPACITY_LEVELS } from '../data/capacity';
import { timeAgo } from '../lib/format';

// Map-forward, now with a detail panel: route lines + stops + buses on the left, and crowding / status /
// arrivals on the right (below the map on mobile). Crowding + down come from useReports via App.
export default function MapView({
  mapLoaded,
  mapError,
  routesError,
  routes,
  selectedBusRoute,
  setSelectedBusRoute,
  feedLive,
  vehicleSource,
  vehicles = [],
  capacity = [],
  down = [],
  nameForCode = (c) => c,
  locateUser,
  locateError,
  setView,
}) {
  const [stopCount, setStopCount] = useState(null);

  const capByCode = new Map(capacity.map((c) => [c.route, c]));
  const downByCode = new Map(down.map((d) => [d.route, d]));
  const selected = selectedBusRoute !== 'all' ? routes.find((r) => r.code === selectedBusRoute) : null;

  // Stop count for the selected route (server-cached; cheap).
  useEffect(() => {
    if (selectedBusRoute === 'all') {
      setStopCount(null);
      return;
    }
    let cancelled = false;
    setStopCount(null);
    fetch(`/api/routes/${selectedBusRoute}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && Array.isArray(d.stops)) setStopCount(d.stops.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedBusRoute]);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl">Ohio State Campus Map</h1>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1" style={{ color: feedLive ? 'var(--ok)' : 'var(--warn)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: feedLive ? 'var(--ok)' : 'var(--warn)' }} />
            {feedLive ? 'Live feed' : 'Last known'}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">buses: {vehicleSource === 'live' ? 'live' : 'simulated'}</span>
        </div>
      </div>

      {routesError && routes.length === 0 && (
        <div className="mb-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-soft">
          Routes unavailable. Check your connection; showing the map without route lines.
        </div>
      )}

      {/* Route filter chips, each with a crowding / down dot. */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedBusRoute('all')}
          className="rounded-full px-3 py-2 text-xs font-bold transition-colors"
          style={selectedBusRoute === 'all' ? { backgroundColor: 'var(--ink)', color: '#fff' } : { backgroundColor: 'var(--surface-2)', color: 'var(--ink-soft)' }}
        >
          All
        </button>
        {routes.map((r) => {
          const active = selectedBusRoute === r.code;
          const cap = capByCode.get(r.code);
          const dn = downByCode.get(r.code);
          const dotColor = dn?.confirmed ? 'var(--danger)' : cap ? `var(--cap-${cap.level})` : null;
          const dotTitle = dn?.confirmed ? 'reported down' : cap ? CAPACITY_LEVELS[cap.level]?.label : '';
          return (
            <button
              key={r.code}
              onClick={() => setSelectedBusRoute(r.code)}
              title={r.name}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide transition-colors"
              style={active ? { backgroundColor: r.color, color: '#fff' } : { backgroundColor: 'var(--surface-2)', color: 'var(--ink-soft)' }}
            >
              {r.code}
              {dotColor && (
                <span
                  aria-label={dotTitle}
                  title={dotTitle}
                  className="h-2 w-2 rounded-full ring-1 ring-white/70"
                  style={{ backgroundColor: dotColor }}
                />
              )}
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

        {/* Detail panel (right on desktop, below on mobile) */}
        <aside className="mt-3 rounded-xl border border-line bg-surface p-4 md:mt-0 md:w-80 md:shrink-0 md:overflow-y-auto">
          {selected ? (
            <RouteDetail
              route={selected}
              cap={capByCode.get(selected.code)}
              down={downByCode.get(selected.code)}
              liveCount={vehicles.filter((v) => v.route === selected.code).length}
              vehicleSource={vehicleSource}
              stopCount={stopCount}
              setView={setView}
            />
          ) : (
            <Legend down={down} nameForCode={nameForCode} />
          )}
        </aside>
      </div>

      <p className="mt-2.5 text-xs text-muted">
        Stops and route lines from OSU&apos;s live feed. Arrows are buses
        {vehicleSource === 'live' ? ' (live positions)' : ' (simulated while service is paused)'}; tap a stop or bus for details.
      </p>
    </section>
  );
}

function RouteDetail({ route, cap, down, liveCount, vehicleSource, stopCount, setView }) {
  const status = down ? (down.confirmed ? { label: 'Reported down', color: 'var(--danger)' } : { label: 'Possibly down', color: 'var(--warn)' }) : { label: 'Running', color: 'var(--ok)' };
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
          <div className="mt-0.5 font-mono text-lg font-bold text-ink">{liveCount}</div>
          <div className="text-[11px] text-muted">{vehicleSource === 'live' ? 'live' : 'simulated'}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Stops</div>
          <div className="mt-0.5 font-mono text-lg font-bold text-ink">{stopCount ?? '—'}</div>
          <div className="text-[11px] text-muted">on this route</div>
        </div>
      </div>

      {setView && (
        <button
          onClick={() => setView('report')}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink-soft transition-colors hover:bg-surface-2"
        >
          Report this route&apos;s crowding
        </button>
      )}
      <p className="text-[12px] text-muted">Tap a stop for the next arrival, or a bus for where it&apos;s headed.</p>
    </div>
  );
}

function Legend({ down, nameForCode }) {
  const downRoutes = down.filter((d) => d.confirmed);
  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-base font-bold">What you&apos;re looking at</h2>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <Navigation2 size={16} className="shrink-0 text-ink" fill="currentColor" />
          <span className="text-ink-soft">Arrows are buses, pointing the way they travel.</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 shrink-0 rounded-full border-2 border-white bg-ink-soft ring-1 ring-line" />
          <span className="text-ink-soft">Dots are stops. Tap one for the next arrival.</span>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Crowding scale</div>
        <div className="mt-1.5 flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-2.5 flex-1 rounded-full" style={{ backgroundColor: `var(--cap-${i})` }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>Empty</span>
          <span>Very full</span>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Service</div>
        {downRoutes.length ? (
          <div className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-danger">
            <AlertTriangle size={14} /> Down: {downRoutes.map((d) => nameForCode(d.route)).join(', ')}
          </div>
        ) : (
          <div className="mt-1 text-[13px] text-ink-soft">All routes running.</div>
        )}
      </div>

      <p className="text-[12px] text-muted">Tap a route above to see its crowding, status, and live buses.</p>
    </div>
  );
}
