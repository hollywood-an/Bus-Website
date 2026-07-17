// Shapes from the (unofficial, unsupported) OSU CABS feed at content.osu.edu/v2/bus.
// Field names mirror the feed; we normalize/validate everything on the way in (see parse.ts).

export interface RouteSummary {
  code: string;
  service: string;
  name: string;
  color: string;
  darkColor: string;
  showByDefault: boolean;
}

export interface Stop {
  id: string;
  name: string;
  service?: string;
  latitude: number;
  longitude: number;
}

export interface Pattern {
  id: string;
  length: number;
  encodedPolyline: string;
  direction: string;
}

export interface RouteDetail {
  code: string;
  patterns: Pattern[];
  stops: Stop[];
}

// An upcoming stop for a bus: from the live feed's per-vehicle `predictions` (real ETAs), or
// synthesized from the motion model in mock mode. etaMin 0 = due now.
export interface NextStop {
  id?: string;
  name: string;
  etaMin: number;
}

// Live vehicle shape verified against the real feed 2026-07: top-level id/latitude/longitude/
// heading/speed/delayed/destination/distance plus a `predictions` array (see parse.ts). Fields
// beyond lat/lng stay optional and defensively parsed; the mock source models the same shape so
// everything downstream is source-agnostic.
export interface Vehicle {
  id?: string;
  route?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  delayed?: boolean;
  destination?: string;
  distance?: number;
  nextStops?: NextStop[];
}

export type VehicleSource = 'live' | 'mock';

export interface FeedStatus {
  live: boolean;
  source: 'feed' | 'fixtures';
  lastUpdated: number | null;
  lastError: string | null;
}
