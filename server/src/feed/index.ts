// Public surface of the feed module. The Hono routes import from here; nothing else reaches into
// the individual files. Reads (getRoutes/getRouteDetail/getVehicles) always succeed via the cache's
// fixture fallback, so the API works even if the poller never ran (e.g. in tests).
export { getRoutes, getRouteDetail, feedStatus } from './cache';
export { getVehicles, vehicleSource, routeInService } from './vehicles';
export { estimateArrivals } from './arrivals';
export type { ArrivalEstimate, ArrivalResult } from './arrivals';
export { startPoller } from './poller';
export type { RouteSummary, RouteDetail, Stop, Pattern, Vehicle, VehicleSource, FeedStatus } from './types';
