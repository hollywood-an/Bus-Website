import { useEffect, useRef, useState } from 'react';
import { Footprints, Bus, Zap, MapPinOff } from 'lucide-react';
import { loadMaps } from '../lib/loadMaps';

// Google-Maps-style trip map: shows ONE mode at a time (fastest by default), with a tab per mode
// (walk / bus / scooter) carrying its ETA. Tap a tab to swap which route is drawn. `geometry` is the
// show_trip shape: { from, to, fastest, walk:{encodedPolyline,min}, scooter:{min}, bus:{...,min}|null }.
const WALK_COLOR = '#6b7280';
const SCOOTER_COLOR = '#7c3aed';

const MODE_META = {
  walk: { label: 'Walk', icon: Footprints },
  bus: { label: 'Bus', icon: Bus },
  scooter: { label: 'Scooter', icon: Zap },
};

export default function TripMap({ geometry }) {
  const [mode, setMode] = useState(geometry?.fastest || 'walk');
  const [mapError, setMapError] = useState(false); // Maps JS failed to load (bad/missing key, offline)
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);

  // Reset to the fastest mode (and clear any prior load error) when a new trip comes in.
  useEffect(() => {
    setMode(geometry?.fastest || 'walk');
    setMapError(false);
  }, [geometry]);

  const modes = ['walk', 'bus', 'scooter'].filter((m) => m !== 'bus' || geometry?.bus);
  const minFor = (m) => (m === 'walk' ? geometry?.walk?.min : m === 'scooter' ? geometry?.scooter?.min : geometry?.bus?.min);

  useEffect(() => {
    if (!geometry?.from || !geometry?.to) return;
    let cancelled = false;

    loadMaps()
      .then((maps) => {
        if (cancelled || !divRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new maps.Map(divRef.current, {
            zoom: 14,
            center: { lat: geometry.from.lat, lng: geometry.from.lng },
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'cooperative',
          });
        }
        const map = mapRef.current;
        overlaysRef.current.forEach((o) => o.setMap(null));
        overlaysRef.current = [];
        const keep = (o) => overlaysRef.current.push(o);
        const bounds = new maps.LatLngBounds();

        const a = { lat: geometry.from.lat, lng: geometry.from.lng };
        const b = { lat: geometry.to.lat, lng: geometry.to.lng };

        if (mode === 'bus' && geometry.bus) {
          const color = geometry.bus.routeColor || '#005716';
          if (geometry.bus.routePolyline) {
            const busPath = maps.geometry.encoding.decodePath(geometry.bus.routePolyline);
            keep(new maps.Polyline({ path: busPath, map, strokeColor: color, strokeOpacity: 0.85, strokeWeight: 5 }));
            busPath.forEach((p) => bounds.extend(p));
          }
          const board = { lat: geometry.bus.board.lat, lng: geometry.bus.board.lng };
          const alight = { lat: geometry.bus.alight.lat, lng: geometry.bus.alight.lng };
          const dash = { icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '10px' };
          keep(new maps.Polyline({ path: [a, board], map, strokeOpacity: 0, icons: [dash] }));
          keep(new maps.Polyline({ path: [alight, b], map, strokeOpacity: 0, icons: [dash] }));
          keep(
            new maps.Marker({
              position: board,
              map,
              title: `Board: ${geometry.bus.board.name}`,
              icon: { path: maps.SymbolPath.CIRCLE, scale: 7, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
            }),
          );
          keep(
            new maps.Marker({
              position: alight,
              map,
              title: `Get off: ${geometry.bus.alight.name}`,
              icon: { path: maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#fff', fillOpacity: 1, strokeColor: color, strokeWeight: 3 },
            }),
          );
          bounds.extend(board);
          bounds.extend(alight);
        } else {
          // walk or scooter — same direct path, different color
          const path = geometry.walk?.encodedPolyline ? maps.geometry.encoding.decodePath(geometry.walk.encodedPolyline) : [a, b];
          keep(
            new maps.Polyline({
              path,
              map,
              strokeColor: mode === 'scooter' ? SCOOTER_COLOR : WALK_COLOR,
              strokeOpacity: 0.95,
              strokeWeight: 5,
            }),
          );
          path.forEach((p) => bounds.extend(p));
        }

        keep(new maps.Marker({ position: a, map, label: 'A', title: geometry.from.name }));
        keep(new maps.Marker({ position: b, map, label: 'B', title: geometry.to.name }));
        bounds.extend(a);
        bounds.extend(b);
        map.fitBounds(bounds, 40);
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [geometry, mode]);

  if (!geometry) return null;

  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        {modes.map((m) => {
          const Icon = MODE_META[m].icon;
          const active = mode === m;
          const fastest = geometry.fastest === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={active}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-bold transition-colors ${
                active ? 'border-scarlet bg-scarlet-wash text-scarlet-ink' : 'border-line text-ink-soft hover:bg-surface-2'
              }`}
            >
              <Icon size={15} />
              {MODE_META[m].label}
              <span className="font-mono">{minFor(m)}m</span>
              {fastest && (
                <span className="rounded-full bg-ok px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">fast</span>
              )}
            </button>
          );
        })}
      </div>

      {mapError ? (
        <div className="grid h-[480px] max-h-[60vh] min-h-[260px] w-full place-items-center rounded-lg border border-line bg-surface-2 p-6 text-center">
          <div>
            <MapPinOff size={24} className="mx-auto text-muted" />
            <p className="mt-2 text-sm font-bold text-ink">Map unavailable</p>
            <p className="mt-1 text-xs text-muted">Couldn&apos;t load the map. The route details above still apply.</p>
          </div>
        </div>
      ) : (
        <div ref={divRef} className="h-[480px] max-h-[60vh] min-h-[260px] w-full overflow-hidden rounded-lg border border-line" />
      )}

      <div className="mt-1.5 text-xs text-muted">
        {mode === 'bus' && geometry.bus
          ? `Board ${geometry.bus.board.name} → ${geometry.bus.alight.name} on ${geometry.bus.routeName}. Dashed = walk to/from the stop.`
          : `${mode === 'scooter' ? 'Scooter' : 'Walking'} route, A → B.`}
      </div>
    </div>
  );
}
