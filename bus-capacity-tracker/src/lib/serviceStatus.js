// Shared route-status vocabulary for the Map panels and the Crowding board — one wording, one
// color, one priority order everywhere.
//
// Priority: NOT IN SERVICE wins over rider down-reports (audit D5). An asleep route isn't
// "broken", and a couple of mistaken 1 AM reports must never paint it red; the server also
// rejects down reports for out-of-service routes, so this is belt and suspenders.
export function statusFor(down, inService = true) {
  // -ink variants: these colors render as small TEXT, which must clear AA contrast; the bright
  // base tokens stay on dots/fills (audit D7).
  if (!inService) return { label: 'Not in service', color: 'var(--muted)' };
  if (down) {
    return down.confirmed
      ? { label: 'Reported down', color: 'var(--danger)' }
      : { label: 'Possibly down', color: 'var(--warn-ink)' };
  }
  return { label: 'Running', color: 'var(--ok-ink)' };
}
