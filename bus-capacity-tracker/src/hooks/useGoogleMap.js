import { useState, useEffect, useRef, useCallback } from 'react';
import { loadMaps } from '../lib/loadMaps';

// Drives the campus map from the server feed (Phase 1.5). Route list, stops, and polylines come
// from /api/routes[/:code]; vehicles from /api/vehicles (live or mock, server's choice). The old
// 25-waypoint Google Directions chunking hack is gone — we decode the feed's real encodedPolyline
// with the Maps geometry library instead.
//
// The server always returns *something* (last-known-good cache → committed fixtures), so the map
// degrades gracefully; `feedLive` surfaces when we're not on fresh data.
const FALLBACK_CENTER = { lat: 40.0017, lng: -83.0197 };
const VEHICLE_POLL_MS = 15000;

export function useGoogleMap(view) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false); // Maps JS failed to load (bad/missing key, offline)
  const [routesError, setRoutesError] = useState(false); // /api/routes unreachable
  const [routes, setRoutes] = useState([]); // [{ code, name, color, darkColor }]
  const [selectedBusRoute, setSelectedBusRoute] = useState('all');
  const [feedLive, setFeedLive] = useState(true);
  const [vehicleSource, setVehicleSource] = useState('mock');
  const [highlightedStops, setHighlightStops] = useState([]); // stop ids the agent asked to emphasize

  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const detailCacheRef = useRef(new Map()); // code -> { stops, patterns }
  const routeOverlaysRef = useRef([]); // stop markers + polylines for the current selection
  const vehicleMarkersRef = useRef([]);

  const colorFor = useCallback((code) => routes.find((r) => r.code === code)?.color || '#64748b', [routes]);

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

      const codes = selectedBusRoute === 'all' ? routes.map((r) => r.code) : [selectedBusRoute];
      const bounds = new window.google.maps.LatLngBounds();
      const highlightBounds = new window.google.maps.LatLngBounds();
      const highlightSet = new Set(highlightedStops);
      const weight = selectedBusRoute === 'all' ? 3 : 5;
      const opacity = selectedBusRoute === 'all' ? 0.7 : 0.9;

      for (const code of codes) {
        const detail = await detailFor(code);
        if (cancelled || !detail) continue;
        const color = colorFor(code);

        for (const pattern of detail.patterns) {
          const path = window.google.maps.geometry.encoding.decodePath(pattern.encodedPolyline);
          const line = new window.google.maps.Polyline({
            path,
            geodesic: false,
            strokeColor: color,
            strokeOpacity: opacity,
            strokeWeight: weight,
            map,
          });
          routeOverlaysRef.current.push(line);
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
            infoWindowRef.current.setContent(
              `<div style="padding:6px 8px;font-family:system-ui,sans-serif"><strong>${stop.name}</strong><br><span style="font-size:12px;color:#666">${code}</span></div>`,
            );
            infoWindowRef.current.open(map, marker);
          });
          routeOverlaysRef.current.push(marker);
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
    };
  }, [mapLoaded, routes, selectedBusRoute, view, colorFor, highlightedStops]);

  // 4) Poll vehicles and redraw their markers while on the map view.
  useEffect(() => {
    if (view !== 'map' || !mapLoaded || routes.length === 0) return;
    let cancelled = false;

    const drawVehicles = async () => {
      if (!mapRef.current) return;
      const url = selectedBusRoute === 'all' ? '/api/vehicles' : `/api/vehicles?route=${selectedBusRoute}`;
      const d = await fetch(url)
        .then((r) => r.json())
        .catch(() => null);
      if (cancelled || !d) return;
      if (d.source) setVehicleSource(d.source);

      vehicleMarkersRef.current.forEach((m) => m.setMap(null));
      vehicleMarkersRef.current = [];

      (d.vehicles || []).forEach((v) => {
        const marker = new window.google.maps.Marker({
          position: { lat: v.latitude, lng: v.longitude },
          map: mapRef.current,
          title: `${v.route}${v.destination ? ` → ${v.destination}` : ''}`,
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
        vehicleMarkersRef.current.push(marker);
      });
    };

    drawVehicles();
    const id = setInterval(drawVehicles, VEHICLE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mapLoaded, routes, selectedBusRoute, view, colorFor]);

  // 5) Tear down the map instance when leaving the map view (its DOM node unmounts), so re-entry
  //    rebuilds against a fresh #google-map element.
  useEffect(() => {
    if (view !== 'map') {
      mapRef.current = null;
      routeOverlaysRef.current = [];
      vehicleMarkersRef.current = [];
    }
  }, [view]);

  return { mapLoaded, mapError, routesError, routes, selectedBusRoute, setSelectedBusRoute, feedLive, vehicleSource, setHighlightStops };
}
