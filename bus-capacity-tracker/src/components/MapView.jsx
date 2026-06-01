import { MapPinOff } from 'lucide-react';

// Map-forward: the map dominates the pane. Route data + colors come from the feed (via useGoogleMap).
export default function MapView({ mapLoaded, mapError, routesError, routes, selectedBusRoute, setSelectedBusRoute, feedLive, vehicleSource }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl">Campus map</h1>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1"
            style={{ color: feedLive ? 'var(--ok)' : 'var(--warn)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: feedLive ? 'var(--ok)' : 'var(--warn)' }} />
            {feedLive ? 'Live feed' : 'Last known'}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">
            buses: {vehicleSource === 'live' ? 'live' : 'simulated'}
          </span>
        </div>
      </div>

      {routesError && routes.length === 0 && (
        <div className="mb-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-soft">
          Routes unavailable. Check your connection; showing the map without route lines.
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedBusRoute('all')}
          className="rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
          style={
            selectedBusRoute === 'all'
              ? { backgroundColor: 'var(--ink)', color: '#fff' }
              : { backgroundColor: 'var(--surface-2)', color: 'var(--ink-soft)' }
          }
        >
          All
        </button>
        {routes.map((r) => {
          const active = selectedBusRoute === r.code;
          return (
            <button
              key={r.code}
              onClick={() => setSelectedBusRoute(r.code)}
              title={r.name}
              className="rounded-full px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide transition-colors"
              style={active ? { backgroundColor: r.color, color: '#fff' } : { backgroundColor: 'var(--surface-2)', color: 'var(--ink-soft)' }}
            >
              {r.code}
            </button>
          );
        })}
      </div>

      <div
        id="google-map"
        className="relative h-[58vh] overflow-hidden rounded-xl border border-line bg-surface-2 md:h-[calc(100vh-9.5rem)]"
      >
        {mapError ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <MapPinOff size={28} className="mx-auto text-muted" />
              <p className="mt-2 font-bold text-ink">Map unavailable</p>
              <p className="mt-1 text-sm text-muted">Couldn&apos;t load the map. Check your connection and try again.</p>
            </div>
          </div>
        ) : (
          !mapLoaded && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-scarlet" />
            </div>
          )
        )}
      </div>

      <p className="mt-2.5 text-xs text-muted">
        Stops and route lines from OSU&apos;s live feed. Arrows are buses
        {vehicleSource === 'live' ? ' (live positions)' : ' (simulated while service is paused)'}; tap a stop for details.
      </p>
    </section>
  );
}
