import { useState, useEffect } from 'react';
import { BUS_STOPS } from '../data/busStops';
import { ROUTE_COLORS } from '../data/routes';

// Loads the Google Maps JS API (once, when the map view is first opened) and (re)draws stop
// markers + route polylines whenever the selected route changes. Logic is preserved verbatim
// from the original App.jsx (Phase 0).
//
// KNOWN SCAFFOLDING (to be removed in Phase 1.5): polylines are drawn by chunking stops through
// the Directions API in ≤25-waypoint segments. The live feed provides encoded polylines, which
// will replace this hack entirely.
export function useGoogleMap(view) {
  const [selectedBusRoute, setSelectedBusRoute] = useState('all');
  const [selectedStop, setSelectedStop] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (view === 'map' && !mapLoaded) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=directions,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    }
  }, [view, mapLoaded]);

  useEffect(() => {
    if (mapLoaded && view === 'map' && window.google) {
      initMap();
    }
  }, [mapLoaded, view, selectedBusRoute]);

  const initMap = () => {
    const mapElement = document.getElementById('google-map');
    if (!mapElement || !window.google) return;

    const map = new window.google.maps.Map(mapElement, {
      center: { lat: 40.0006, lng: -83.0150 },
      zoom: 14,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    const stops = selectedBusRoute === 'all'
      ? Object.entries(BUS_STOPS).flatMap(([route, stops]) =>
          stops.map(stop => ({ ...stop, route }))
        )
      : (BUS_STOPS[selectedBusRoute] || []).map(stop => ({ ...stop, route: selectedBusRoute }));

    const markers = [];
    const infoWindow = new window.google.maps.InfoWindow();

    stops.forEach((stop) => {
      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: map,
        title: stop.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: ROUTE_COLORS[stop.route] || ROUTE_COLORS['all'],
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        const routes = Object.entries(BUS_STOPS)
          .filter(([, stops]) => stops.find(s => s.id === stop.id))
          .map(([route]) => route);

        const content = `
          <div style="padding: 10px;">
            <h3 style="margin: 0 0 10px 0; font-weight: bold; font-size: 16px;">${stop.name}</h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Coordinates:</strong> ${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Routes:</strong></p>
            <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">
              ${routes.map(route => `
                <span style="
                  background-color: ${ROUTE_COLORS[route]};
                  color: white;
                  padding: 4px 10px;
                  border-radius: 12px;
                  font-size: 12px;
                  font-weight: bold;
                ">${route}</span>
              `).join('')}
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}"
               target="_blank"
               style="display: inline-block; margin-top: 10px; color: #1a73e8; text-decoration: none; font-size: 14px;">
              Open in Google Maps →
            </a>
          </div>
        `;

        infoWindow.setContent(content);
        infoWindow.open(map, marker);
        setSelectedStop(stop);
      });

      markers.push(marker);
    });

    // Draw polylines for all routes or selected route using Directions API for street routing
    const directionsService = new window.google.maps.DirectionsService();
    const drawRouteWithDirections = (routeStops, color, opacity, weight) => {
      if (routeStops.length < 2) return;

      // Split into segments of max 25 waypoints (API limit is 25 waypoints + origin + destination = 27)
      const segmentSize = 23;

      for (let i = 0; i < routeStops.length - 1; i += segmentSize) {
        const segmentEnd = Math.min(i + segmentSize + 1, routeStops.length);
        const segmentStops = routeStops.slice(i, segmentEnd);

        if (segmentStops.length < 2) continue;

        const origin = { lat: segmentStops[0].lat, lng: segmentStops[0].lng };
        const destination = { lat: segmentStops[segmentStops.length - 1].lat, lng: segmentStops[segmentStops.length - 1].lng };
        const waypoints = segmentStops.slice(1, -1).map(stop => ({
          location: { lat: stop.lat, lng: stop.lng },
          stopover: true
        }));

        directionsService.route({
          origin: origin,
          destination: destination,
          waypoints: waypoints,
          travelMode: 'DRIVING',
          optimizeWaypoints: false,
        }, (result, status) => {
          if (status === 'OK') {
            result.routes[0].legs.forEach((leg) => {
              // The Polyline adds itself to the map via the `map` option; no handle needed.
              new window.google.maps.Polyline({
                path: leg.steps.reduce((path, step) => {
                  return path.concat(window.google.maps.geometry.encoding.decodePath(step.polyline.points));
                }, []),
                geodesic: false,
                strokeColor: color,
                strokeOpacity: opacity,
                strokeWeight: weight,
                map: map,
              });
            });
          } else {
            // Fallback to straight line if directions API fails
            new window.google.maps.Polyline({
              path: segmentStops.map(stop => ({ lat: stop.lat, lng: stop.lng })),
              geodesic: true,
              strokeColor: color,
              strokeOpacity: opacity,
              strokeWeight: weight,
              map: map,
            });
          }
        });
      }
    };

    if (selectedBusRoute === 'all') {
      // Draw polylines for each route following streets
      Object.entries(BUS_STOPS).forEach(([route, routeStops]) => {
        if (routeStops.length > 1) {
          drawRouteWithDirections(routeStops, ROUTE_COLORS[route], 0.7, 3);
        }
      });
    } else if (BUS_STOPS[selectedBusRoute] && BUS_STOPS[selectedBusRoute].length > 1) {
      // Draw polyline for selected route with enhanced styling
      drawRouteWithDirections(BUS_STOPS[selectedBusRoute], ROUTE_COLORS[selectedBusRoute], 0.85, 5);
    }
  };

  return { mapLoaded, selectedBusRoute, setSelectedBusRoute, selectedStop };
}
