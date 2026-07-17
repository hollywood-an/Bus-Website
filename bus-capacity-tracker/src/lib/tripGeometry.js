// /api/plan response → TripMap `geometry` (the show_trip shape). Single source of truth for
// PlannerView and HomeView; the chat gets the same shape server-side from plan_route's _geometry.
export function tripGeometry(trip) {
  if (!trip) return null;
  return {
    from: trip.from,
    to: trip.to,
    fastest: trip.fastest,
    walk: { encodedPolyline: trip.walkPolyline, min: trip.walkMin },
    scooter: { min: trip.scooterMin },
    bus: trip.bus
      ? {
          routeCode: trip.bus.routeCode,
          routeName: trip.bus.routeName,
          routeColor: trip.bus.routeColor,
          routePolyline: trip.bus.routePolyline,
          walkToBoardPolyline: trip.bus.walkToBoardPolyline || '',
          walkFromAlightPolyline: trip.bus.walkFromAlightPolyline || '',
          board: trip.bus.board,
          alight: trip.bus.alight,
          min: trip.bus.totalMin,
        }
      : null,
  };
}
