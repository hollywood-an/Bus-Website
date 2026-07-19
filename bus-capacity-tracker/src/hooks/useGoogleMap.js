import { useState, useEffect, useRef, useCallback } from 'react';
import { loadMaps } from '../lib/loadMaps';
import { CAPACITY_LEVELS } from '../data/capacity';
import { timeAgo } from '../lib/format';

// Drives the campus map from the server feed (Phase 1.5). Route list, stops, and polylines come
// from /api/routes[/:code]; vehicles from /api/vehicles (live or mock, server's choice). Crowding +
// down status (passed in from useReports) enrich the tap popups and dim routes reported down; tapping
// a stop also fetches a rough next-arrival ETA from /api/arrivals.
//
// The server always returns *something* (last-known-good cache -> committed fixtures), so the map
// degrades gracefully; `feedLive` surfaces when we're not on fresh data.
const FALLBACK_CENTER = { lat: 40.0017, lng: -83.0197 };
const VEHICLE_POLL_MS = 15000;
const CAP_LABELS = CAPACITY_LEVELS.map((l) => l.label); // single label source: data/capacity.js
const CAP_COLORS = ['var(--cap-0)', 'var(--cap-1)', 'var(--cap-2)', 'var(--cap-3)', 'var(--cap-4)'];
const USER_DOT = '#1d4ed8';

function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function useGoogleMap(view, { capacity = [], down = [] } = {}) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false); // Maps JS failed to load (bad/missing key, offline)
  const [routesError, setRoutesError] = useState(false); // /api/routes unreachable
  const [routes, setRoutes] = useState([]); // [{ code, name, color, darkColor }]
  // Route selection survives visits — the daily CC rider shouldn't re-tap their chip every day.
  const [selectedRoutes, setSelectedRoutesState] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem('map-selected-routes') ?? '[]');
      return Array.isArray(v) ? v.filter((c) => typeof c === 'string') : [];
    } catch {
      return [];
    }
  });
  const [feedLive, setFeedLive] = useState(true);
  const [vehicleSource, setVehicleSource] = useState('mock');
  const [vehicles, setVehicles] = useState([]); // latest fetched positions (for the detail panel count)
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false); // first poll landed ([] can then be truthful)
  // Routes with no bus predicting an upcoming stop (deadheads/none) — joined key, same value-stable
  // pattern as selectedKey, so the route-draw effect only re-fires when the set actually changes.
  const [outOfServiceKey, setOutOfServiceKey] = useState('');
  const [highlightedStops, setHighlightStops] = useState([]); // stop ids the agent asked to emphasize
  const [locateError, setLocateError] = useState('');

  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const detailCacheRef = useRef(new Map()); // code -> { stops, patterns }
  const routeOverlaysRef = useRef([]); // stop markers + polylines for the current selection
  const vehicleMarkersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const popupTokenRef = useRef(0); // guards async ETA patches against a newer popup
  // Latest crowding/down, read inside imperative popup builders without forcing a map redraw.
  const capRef = useRef([]);
  const downRef = useRef([]);
  useEffect(() => {
    capRef.current = capacity;
  }, [capacity]);
  useEffect(() => {
    downRef.current = down;
  }, [down]);

  // Normalizing setter: accepts an array or an updater fn, uppercases + dedupes, and returns the
  // previous array when nothing changed so repeated agent directives don't re-fire the map effects.
  const setSelectedRoutes = useCallback((next) => {
    setSelectedRoutesState((prev) => {
      const arr = typeof next === 'function' ? next(prev) : next;
      const norm = [...new Set((arr || []).map((c) => String(c).toUpperCase()))];
      return norm.length === prev.length && norm.every((c, i) => c === prev[i]) ? prev : norm;
    });
  }, []);
  // Value-stable key for effect deps; effects re-derive the array from it so redraws track the
  // selection's VALUE, not the array's identity.
  const selectedKey = selectedRoutes.join('|');

  useEffect(() => {
    try {
      localStorage.setItem('map-selected-routes', JSON.stringify(selectedKey ? selectedKey.split('|') : []));
    } catch {
      /* private mode etc. — selection just won't persist */
    }
  }, [selectedKey]);

  const colorFor = useCallback((code) => routes.find((r) => r.code === code)?.color || '#64748b', [routes]);
  const nameFor = useCallback((code) => routes.find((r) => r.code === code)?.name || code, [routes]);
  const crowdingHtml = useCallback((code) => {
    const c = capRef.current.find((x) => x.route === code);
    if (!c) return '<span style="color:#666">No crowding reports yet</span>';
    const dot = `<span style="display:inline-block;width:9px;height:9px;border-radius:9px;background:${CAP_COLORS[c.level]};margin-right:5px;vertical-align:-1px"></span>`;
    // Freshness matters: cached/stale reports must not read as live (PRODUCT.md "Honest signal").
    const age = c.newestAt ? ` <span style="color:#888">· ${timeAgo(c.newestAt)}</span>` : '';
    return `${dot}${CAP_LABELS[c.level]}${c.confident ? '' : ' (unconfirmed)'}${age}`;
  }, []);
  const isDown = useCallback((code) => downRef.current.some((d) => d.route === code && d.confirmed), []);

  // 1) Load the Maps API (shared loader; geometry lib for decodePath) when the map view first opens.
  useEffect(() => {
    if (view !== 'map' || mapLoaded) return;
    loadMaps()
      .then(() => setMapLoaded(true))
      .catch(() => setMapError(true));
  }, [view, mapLoaded]);

  // 2) Fetch the route list from the server when entering the map view.
  useEffect(() => {
    if (view !== 'map') return;
    let cancelled = false;
    fetch('/api/routes')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setRoutes(Array.isArray(d.routes) ? d.routes : []);
        setFeedLive(Boolean(d.live));
        setRoutesError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFeedLive(false);
          setRoutesError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  // 3) Create the map (once) and (re)draw stops + polylines for the selected route(s).
  useEffect(() => {
    if (view !== 'map' || !mapLoaded || !window.google) return;
    const el = document.getElementById('google-map');
    if (!el) return;

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(el, {
        center: FALLBACK_CENTER,
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }
    if (routes.length === 0) return; // map is up; routes still loading

    const map = mapRef.current;
    let cancelled = false;
    // This run's overlays, removed on cleanup so a superseded async run can't strand anything on
    // the map when chips are toggled rapidly.
    const drawn = [];
    const keep = (o) => {
      drawn.push(o);
      routeOverlaysRef.current.push(o);
    };

    (async () => {
      const detailFor = async (code) => {
        if (detailCacheRef.current.has(code)) return detailCacheRef.current.get(code);
        const d = await fetch(`/api/routes/${code}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (d && !d.error) {
          detailCacheRef.current.set(code, d);
          return d;
        }
        return null;
      };

      // Clear the previous selection's overlays.
      routeOverlaysRef.current.forEach((o) => o.setMap(null));
      routeOverlaysRef.current = [];

      const sel = selectedKey ? selectedKey.split('|') : [];
      const codes = sel.length === 0 ? routes.map((r) => r.code) : sel;
      const outSet = new Set(outOfServiceKey ? outOfServiceKey.split('|') : []);
      const bounds = new window.google.maps.LatLngBounds();
      const highlightBounds = new window.google.maps.LatLngBounds();
      const highlightSet = new Set(highlightedStops);
      const weight = sel.length === 0 ? 3 : 5;
      const opacity = sel.length === 0 ? 0.7 : 0.9;

      for (const code of codes) {
        const detail = await detailFor(code);
        if (cancelled || !detail) continue;
        const color = colorFor(code);
        // Dim routes reported down or not in service (secondary cue; the panel carries the text).
        const downRoute = isDown(code) || outSet.has(code);

        for (const pattern of detail.patterns) {
          const path = window.google.maps.geometry.encoding.decodePath(pattern.encodedPolyline);
          const line = new window.google.maps.Polyline({
            path,
            geodesic: false,
            strokeColor: color,
            strokeOpacity: downRoute ? 0.25 : opacity,
            strokeWeight: downRoute ? 2 : weight,
            map,
          });
          keep(line);
          path.forEach((pt) => bounds.extend(pt));
        }

        for (const stop of detail.stops) {
          const position = { lat: stop.latitude, lng: stop.longitude };
          const isHighlighted = highlightSet.has(stop.id);
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: stop.name,
            zIndex: isHighlighted ? 600 : undefined,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: isHighlighted ? 11 : 6,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: isHighlighted ? '#111111' : '#ffffff',
              strokeWeight: isHighlighted ? 3 : 1.5,
            },
          });
          marker.addListener('click', () => {
            if (!infoWindowRef.current) return;
            const token = ++popupTokenRef.current;
            const downHtml = isDown(code)
              ? '<div style="color:var(--danger);font-weight:600;margin-top:3px">Reported down</div>'
              : '';
            infoWindowRef.current.setContent(
              `<div style="padding:6px 8px;font-family:system-ui,sans-serif;min-width:170px;line-height:1.45">
                 <strong>${stop.name}</strong>
                 <div style="font-size:12px;margin-top:2px">${nameFor(code)} <span style="color:#888">(${code})</span></div>
                 <div style="font-size:12px;margin-top:4px">${crowdingHtml(code)}</div>
                 ${downHtml}
                 <div style="font-size:12px;color:#666;margin-top:5px" id="iw-eta">Checking next arrival&hellip;</div>
               </div>`,
            );
            infoWindowRef.current.open(map, marker);
            const q = `/api/arrivals?stop=${encodeURIComponent(stop.name)}${sel.length > 0 ? `&route=${code}` : ''}`;
            fetch(q)
              .then((r) => r.json())
              .then((d) => {
                if (token !== popupTokenRef.current) return; // a newer popup opened
                const node = document.getElementById('iw-eta');
                if (!node) return;
                const list = (d.estimates || []).slice(0, 3);
                node.textContent = list.length
                  ? `Next: ${list.map((e) => `${e.route} ${e.etaMin === 0 ? 'due' : `~${e.etaMin} min`}`).join(', ')}`
                  : 'No buses nearby right now';
              })
              .catch(() => {});
          });
          keep(marker);
          bounds.extend(position);
          if (isHighlighted) highlightBounds.extend(position);
        }
      }

      // Zoom to the highlighted stops if any were requested, otherwise fit the whole selection.
      if (!cancelled) {
        if (!highlightBounds.isEmpty()) map.fitBounds(highlightBounds, 96);
        else if (!bounds.isEmpty()) map.fitBounds(bounds);
      }
    })();

    return () => {
      cancelled = true;
      drawn.forEach((o) => o.setMap(null));
    };
  }, [mapLoaded, routes, selectedKey, outOfServiceKey, view, colorFor, nameFor, crowdingHtml, isDown, highlightedStops]);

  // 4) Poll ALL vehicles on a fixed cadence while on the map view. Selection filtering happens in
  //    the draw effect below, so chip toggles re-filter instantly and never reset the poll timer,
  //    and `vehicles` always holds every bus for the detail panel's per-route counts/lists.
  useEffect(() => {
    if (view !== 'map' || !mapLoaded || routes.length === 0) return;
    let cancelled = false;

    const poll = async () => {
      const d = await fetch('/api/vehicles')
        .then((r) => r.json())
        .catch(() => null);
      if (cancelled || !d) return;
      if (d.source) setVehicleSource(d.source);
      const list = Array.isArray(d.vehicles) ? d.vehicles : [];
      setVehicles(list);
      setVehiclesLoaded(true);
      const predicting = new Set(list.filter((v) => v.nextStops?.length > 0).map((v) => v.route));
      setOutOfServiceKey(
        routes
          .map((r) => r.code)
          .filter((c) => !predicting.has(c))
          .sort()
          .join('|'),
      );
    };

    poll();
    const id = setInterval(poll, VEHICLE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mapLoaded, routes, view]);

  // 4b) Redraw vehicle markers whenever positions or the selection change (pure state -> map).
  useEffect(() => {
    if (view !== 'map' || !mapLoaded || !mapRef.current || !window.google) return;
    const sel = selectedKey ? selectedKey.split('|') : [];

    vehicleMarkersRef.current.forEach((m) => m.setMap(null));
    vehicleMarkersRef.current = [];

    vehicles
      .filter((v) => sel.length === 0 || sel.includes(v.route))
      .forEach((v) => {
        const marker = new window.google.maps.Marker({
          position: { lat: v.latitude, lng: v.longitude },
          map: mapRef.current,
          title: `${v.route}${v.destination ? ` to ${v.destination}` : ''}`,
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
        });
        marker.addListener('click', () => {
          if (!infoWindowRef.current) return;
          ++popupTokenRef.current;
          const dest = v.destination ? ` to ${v.destination}` : '';
          const late = v.delayed ? '<div style="color:var(--warn);font-weight:600;margin-top:3px">Running late</div>' : '';
          const next = v.nextStops?.length
            ? `<div style="font-size:12px;color:#666;margin-top:4px">Next: ${v.nextStops[0].name} ${v.nextStops[0].etaMin === 0 ? 'now' : `~${v.nextStops[0].etaMin} min`}</div>`
            : '<div style="font-size:12px;color:#666;margin-top:4px">Not in passenger service</div>';
          infoWindowRef.current.setContent(
            `<div style="padding:6px 8px;font-family:system-ui,sans-serif;min-width:150px;line-height:1.45">
               <strong>${nameFor(v.route)}</strong> <span style="color:#888">(${v.route})</span>
               <div style="font-size:12px;margin-top:2px">Bus${dest}</div>
               <div style="font-size:12px;margin-top:4px">${crowdingHtml(v.route)}</div>
               ${next}
               ${late}
             </div>`,
          );
          infoWindowRef.current.open(mapRef.current, marker);
        });
        vehicleMarkersRef.current.push(marker);
      });
  }, [vehicles, selectedKey, mapLoaded, view, colorFor, nameFor, crowdingHtml]);

  // 5) Tear down the map instance when leaving the map view (its DOM node unmounts), so re-entry
  //    rebuilds against a fresh #google-map element.
  useEffect(() => {
    if (view !== 'map') {
      mapRef.current = null;
      routeOverlaysRef.current = [];
      vehicleMarkersRef.current = [];
      userMarkerRef.current = null;
    }
  }, [view]);

  // Center on the user's location, drop a "you are here" marker, and point out the nearest stop.
  const locateUser = useCallback(() => {
    setLocateError('');
    if (!navigator.geolocation) {
      setLocateError('Location is not available on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current;
        if (!map || !window.google) return;
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        if (userMarkerRef.current) userMarkerRef.current.setMap(null);
        userMarkerRef.current = new window.google.maps.Marker({
          position: here,
          map,
          title: 'You are here',
          zIndex: 2000,
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: USER_DOT, fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 },
        });

        // Nearest stop across whatever route detail is currently loaded.
        let nearest = null;
        for (const detail of detailCacheRef.current.values()) {
          for (const stop of detail.stops || []) {
            const m = haversineMeters(here.lat, here.lng, stop.latitude, stop.longitude);
            if (!nearest || m < nearest.m) nearest = { stop, m };
          }
        }

        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(here);
        if (nearest) {
          bounds.extend({ lat: nearest.stop.latitude, lng: nearest.stop.longitude });
          map.fitBounds(bounds, 90);
          if (infoWindowRef.current) {
            ++popupTokenRef.current;
            infoWindowRef.current.setContent(
              `<div style="padding:6px 8px;font-family:system-ui,sans-serif;line-height:1.45">
                 <strong>${nearest.stop.name}</strong>
                 <div style="font-size:12px;color:#666;margin-top:2px">Nearest stop, ${Math.round(nearest.m)} m away</div>
               </div>`,
            );
            infoWindowRef.current.setPosition({ lat: nearest.stop.latitude, lng: nearest.stop.longitude });
            infoWindowRef.current.open(map);
          }
        } else {
          map.panTo(here);
          map.setZoom(16);
        }
      },
      () => setLocateError('Location unavailable. Allow location access and try again.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  return {
    mapLoaded,
    mapError,
    routesError,
    routes,
    selectedRoutes,
    setSelectedRoutes,
    feedLive,
    vehicleSource,
    vehicles,
    vehiclesLoaded,
    setHighlightStops,
    locateUser,
    locateError,
  };
}
