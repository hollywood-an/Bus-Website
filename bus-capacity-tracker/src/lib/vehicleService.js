// Mirror of the server's isVehicleRunning (server/src/feed/vehicles.ts) — ONE definition of "is this
// bus in passenger service", provider-aware, so the map / hero / route board never disagree with what
// /api/service reports:
//  - 'clever' (Clever Devices, e.g. Medical Center) broadcasts per-stop ETA predictions, so a bus with
//    none is an end-of-service deadhead ("Last Pick Up") — not in service.
//  - 'double' (DoubleMap, e.g. the Wexner Med Center shuttle) NEVER sends predictions, so the only
//    signal is motion: a bus that's moving or just reported a fresh GPS fix is on a run. Routes that
//    truly stop drop out of the feed entirely, so this can't falsely light up an idle route.
// Mock buses (no `service`, always moving) fall through to the motion branch and stay in service.
// Keep SERVICE_FRESH_MS in sync with the server default.
const SERVICE_FRESH_MS = 180_000;

export function isVehicleRunning(v, now = Date.now()) {
  if (!v) return false;
  if ((v.nextStops?.length ?? 0) > 0) return true;
  if (v.service === 'clever') return false; // predictions expected but absent → deadhead
  const moving = (v.speed ?? 0) > 0;
  const fresh = v.updatedAt != null && now - v.updatedAt < SERVICE_FRESH_MS;
  return moving || fresh;
}
