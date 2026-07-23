// One anonymous client id shared by every API caller (reports, plan, suggest) so the server's
// per-client rate limits key on the person, not the shared campus NAT. Reads/writes the same
// localStorage key the window.storage shim uses ('local:client-id'), so ids minted before this
// helper existed are kept. Sync on purpose — fetch call sites need it inline.
const STORAGE_KEY = 'local:client-id';
let cached = '';

function make() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getClientId() {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(STORAGE_KEY) || '';
    if (!cached) {
      cached = make();
      localStorage.setItem(STORAGE_KEY, cached);
    }
  } catch {
    cached = cached || make(); // storage blocked (private mode): stable for this session only
  }
  return cached;
}
