import { useEffect, useRef } from 'react';
import { loadMaps } from '../lib/loadMaps';

// Inline map for a planned trip. Draws the walk/scooter path (gray — real Directions polyline, or a
// straight line if none), the bus route (route color) with board/alight markers + dashed walk-to-stop
// connectors, and A/B endpoints. Used inside the AI assistant and the Route Planner. `geometry` is the
// show_trip directive shape: { from, to, walk:{encodedPolyline}, bus:{routeColor,routePolyline,board,alight}|null }.
export default function TripMap({ geometry }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);

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

        // Walk / scooter path (same line; scooter just has a faster ETA).
        const walkPath =
          geometry.walk?.encodedPolyline ? maps.geometry.encoding.decodePath(geometry.walk.encodedPolyline) : [a, b];
        keep(new maps.Polyline({ path: walkPath, map, strokeColor: '#6b7280', strokeOpacity: 0.9, strokeWeight: 4 }));
        walkPath.forEach((p) => bounds.extend(p));

        // Bus route + board/alight + dashed access walks.
        if (geometry.bus) {
          const color = geometry.bus.routeColor || '#005716';
          if (geometry.bus.routePolyline) {
            const busPath = maps.geometry.encoding.decodePath(geometry.bus.routePolyline);
            keep(new maps.Polyline({ path: busPath, map, strokeColor: color, strokeOpacity: 0.85, strokeWeight: 5 }));
            busPath.forEach((p) => bounds.extend(p));
          }
          const board = { lat: geometry.bus.board.lat, lng: geometry.bus.board.lng };
          const alight = { lat: geometry.bus.alight.lat, lng: geometry.bus.alight.lng };
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
          const dash = { icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '10px' };
          keep(new maps.Polyline({ path: [a, board], map, strokeOpacity: 0, icons: [dash] }));
          keep(new maps.Polyline({ path: [alight, b], map, strokeOpacity: 0, icons: [dash] }));
          bounds.extend(board);
          bounds.extend(alight);
        }

        keep(new maps.Marker({ position: a, map, label: 'A', title: geometry.from.name }));
        keep(new maps.Marker({ position: b, map, label: 'B', title: geometry.to.name }));
        bounds.extend(a);
        bounds.extend(b);

        map.fitBounds(bounds, 36);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [geometry]);

  if (!geometry) return null;
  return (
    <div>
      <div ref={divRef} className="rounded-lg overflow-hidden border border-gray-300" style={{ height: 220, width: '100%' }} />
      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-500 inline-block" /> walk / scooter</span>
        {geometry.bus && (
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: geometry.bus.routeColor || '#005716' }} /> bus route
          </span>
        )}
        <span>A → from · B → to{geometry.bus ? ' · ● board / ○ get off' : ''}</span>
      </div>
    </div>
  );
}
