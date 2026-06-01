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

// The populated vehicle shape can't be verified until fall service hours (the live array is empty
// over summer). Fields beyond lat/lng are optional and parsed defensively; the mock source models
// the same shape so everything downstream is source-agnostic.
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
}

export type VehicleSource = 'live' | 'mock';

export interface FeedStatus {
  live: boolean;
  source: 'feed' | 'fixtures';
  lastUpdated: number | null;
  lastError: string | null;
}
