import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { loadMaps } from '../lib/loadMaps';
import { apiUrl } from '../lib/api';

// The hero's right-hand visual: a small, non-interactive campus map with the REAL live buses moving on
// it (route-colored arrows, repositioned every 15s from the feed). "Show, don't tell" — the product is
// visibly live the instant you land. Reuses the shared loadMaps() singleton (the assistant TripMap below
// already loads the script, so this adds a map instance, not a second download) and the same arrow-marker
// recipe as the full Campus Map (useGoogleMap).
//
// Honest-signal rules (DESIGN principle 3, and the feed's real behavior): the server always returns
// vehicles (last-known-good -> fixtures) and end-of-service buses LINGER with empty nextStops, so
// `vehicles.length` is not "buses running". The truth test is `nextStops?.length > 0`, and we never label
// the map "live" when the feed is on mock data. If Maps can't load at all, we fall back to the static
// `fallback` art so the hero always looks intentional.
const POLL_MS = 15000; // matches useGoogleMap's VEHICLE_POLL_MS — the feed's own cadence
const CAMPUS_CENTER = { lat: 40.0017, lng: -83.0197 }; // FALLBACK_CENTER, the campus core

export default function HeroLiveMap({ routes = [], onOpenMap, fallback = null }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeLinesRef = useRef([]);
  const routesDrawnRef = useRef(false); // route polylines are static — draw them once
  const [mapReady, setMapReady] = useState(false); // first tiles painted — gates the crossfade + badge
  const [failed, setFailed] = useState(false); // Maps JS/key unavailable -> show the fallback art
  const [vehicles, setVehicles] = useState([]);
  const [loaded, setLoaded] = useState(false); // first poll landed, so [] is now truthful, not "checking"
  const [source, setSource] = useState(null); // 'live' | 'mock' — never claim live before we know
  const [live, setLive] = useState(false);

  // Memoized so the marker-draw effect stays stable across renders (only re-derives when routes change).
  // Fallback is a hex — Google Maps overlays reject CSS-var strings for fill/stroke.
  const colorFor = useCallback((code) => routes.find((r) => r.code === code)?.color || '#9ca3af', [routes]);

  // 1) Create one non-interactive, decorative map. Reveal (crossfade in) once the map has settled so the
  //    user never sees a grey rectangle. The reveal fires on the map's `idle` event with a timeout safety
  //    net — deliberately NOT gated on a per-effect `cancelled` flag, since React StrictMode's
  //    mount→cleanup→remount would otherwise bind the reveal to a torn-down run and strand the fallback.
  //    Any load/init failure -> fall back to the static art.
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    loadMaps()
      .then((maps) => {
        if (cancelled || !divRef.current || mapRef.current) return;
        let map;
        try {
          map = new maps.Map(divRef.current, {
            center: CAMPUS_CENTER,
            zoom: 13, // a touch wide so the running buses land in frame after the pan below
            disableDefaultUI: true,
            gestureHandling: 'none', // decorative — the whole tile is a click-through to the full map
            keyboardShortcuts: false,
            clickableIcons: false,
            zoomControl: false,
          });
        } catch {
          setFailed(true);
          return;
        }
        mapRef.current = map;
        const reveal = () => setMapReady(true); // no-op if already true / unmounted (React 18)
        maps.event.addListenerOnce(map, 'idle', reveal);
        timer = setTimeout(reveal, 1500);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // 2) Poll live vehicles on the feed's cadence. Pause while the tab is hidden (no point burning the map
  //    or a request nobody's looking at); re-poll immediately on return. A fetch failure keeps the last
  //    good positions rather than blanking the map.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const d = await fetch(apiUrl('/api/vehicles'))
        .then((r) => r.json())
        .catch(() => null);
      if (cancelled || !d) return;
      if (d.source) setSource(d.source);
      setLive(Boolean(d.live));
      setVehicles(Array.isArray(d.vehicles) ? d.vehicles : []);
      setLoaded(true);
    };
    poll(); // always load once on mount, even in a background tab
    // Refresh on the feed's cadence, but skip the repeating polls while the tab is hidden (nobody's
    // watching); re-sync immediately when it comes back to the foreground.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') poll();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // 2b) Draw the route network once — thin, route-colored lines. Always present (they don't depend on
  //     buses running), so the hero reads as OSU transit even off-peak; the bus arrows ride on top.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google || routes.length === 0 || routesDrawnRef.current) return;
    routesDrawnRef.current = true;
    let cancelled = false;
    const maps = window.google.maps;
    (async () => {
      for (const r of routes) {
        const d = await fetch(apiUrl(`/api/routes/${r.code}`))
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null);
        if (cancelled || !d?.patterns) continue;
        for (const pattern of d.patterns) {
          if (!pattern.encodedPolyline) continue;
          routeLinesRef.current.push(
            new maps.Polyline({
              path: maps.geometry.encoding.decodePath(pattern.encodedPolyline),
              geodesic: false,
              clickable: false,
              strokeColor: r.color || '#9ca3af',
              strokeOpacity: 0.7,
              strokeWeight: 3,
              zIndex: 1, // beneath the bus markers (zIndex 1000)
              map: mapRef.current,
            }),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      routeLinesRef.current.forEach((l) => l.setMap(null));
      routeLinesRef.current = [];
      routesDrawnRef.current = false;
    };
  }, [mapReady, routes]);

  // 3) Draw the buses as route-colored arrows, rotated to heading. Clear + redraw each poll (same recipe
  //    as the Campus Map). Purely visual here — no marker click handlers; the whole map is the affordance.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = vehicles.map(
      (v) =>
        new window.google.maps.Marker({
          position: { lat: v.latitude, lng: v.longitude },
          map: mapRef.current,
          clickable: false,
          zIndex: 1000,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            rotation: v.heading || 0,
            fillColor: colorFor(v.route),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
          },
        }),
    );
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [vehicles, mapReady, colorFor]);

  // Honest status for the overlay badge. Buses in passenger service = those predicting next stops.
  const running = vehicles.filter((v) => v.nextStops?.length > 0).length;
  const isMock = source === 'mock' || (loaded && !live);
  const badge = !loaded
    ? null
    : isMock
      ? { color: 'var(--warn)', label: 'simulated' }
      : running > 0
        ? { color: 'var(--ok)', label: `${running} running` }
        : { color: 'var(--muted)', label: 'no buses right now' };

  const open = () => onOpenMap?.();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      aria-label="Open the live campus map"
      className="group relative h-44 w-full cursor-pointer overflow-hidden rounded-2xl border border-line outline-none ring-scarlet transition-shadow focus-visible:ring-2 sm:h-52"
    >
      {/* The map fills the frame but never captures pointer events — clicks/keys drive the click-through. */}
      {!failed && <div ref={divRef} className="absolute inset-0 h-full w-full [&_*]:pointer-events-none" aria-hidden />}

      {/* Fallback art: shown instantly (no layout shift, no spinner), crossfaded out once tiles paint.
          Stays put permanently if Maps never loads. */}
      {fallback && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none ${
            mapReady && !failed ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          aria-hidden
        >
          {fallback}
        </div>
      )}

      {/* Live status — honest by construction. A map overlay earns the one soft shadow (DESIGN). Count is
          mono (data), matching the "· live" widget elsewhere on this page. */}
      {mapReady && !failed && badge && (
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 shadow-[var(--shadow-float)]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: badge.color }} />
          <span className="font-mono text-[11px] font-bold text-ink">{badge.label}</span>
        </span>
      )}

      {/* Click-through affordance — appears on hover/focus, scarlet = action. */}
      {mapReady && !failed && (
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-scarlet-ink opacity-0 shadow-[var(--shadow-float)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
          Open map <ArrowUpRight size={13} />
        </span>
      )}
    </div>
  );
}
