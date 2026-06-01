// Browser storage shim exposing `window.storage` with an async key/value API.
//
// Phase 0 change: the original was purely in-memory, so reports/points/theme were lost on
// every refresh. This drop-in keeps the exact same async signatures but persists to
// localStorage, so personal state survives a reload (and seed/demo data sticks). Falls back
// to in-memory if localStorage is unavailable (e.g. Safari private mode).
//
// NOTE: this remains single-device. Crowdsourced *reports* move to a shared server-side
// store in Phase 1.6; after that, localStorage holds only personal state (points/theme) and
// acts as a read-only offline fallback.

const memory = {};

let backend = null;
try {
  const probe = '__storage_probe__';
  window.localStorage.setItem(probe, '1');
  window.localStorage.removeItem(probe);
  backend = window.localStorage;
} catch {
  backend = null; // localStorage blocked/unavailable — fall back to in-memory
}

const read = (k) => (backend ? backend.getItem(k) : (k in memory ? memory[k] : null));
const write = (k, v) => { if (backend) backend.setItem(k, v); else memory[k] = v; };
const remove = (k) => { if (backend) backend.removeItem(k); else delete memory[k]; };
const allKeys = () => (backend ? Object.keys(backend) : Object.keys(memory));

window.storage = {
  async get(key, shared = false) {
    const storageKey = shared ? `shared:${key}` : `local:${key}`;
    const value = read(storageKey);
    return value != null ? { key, value, shared } : null;
  },

  async set(key, value, shared = false) {
    const storageKey = shared ? `shared:${key}` : `local:${key}`;
    write(storageKey, value);
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const storageKey = shared ? `shared:${key}` : `local:${key}`;
    remove(storageKey);
    return { key, deleted: true, shared };
  },

  async list(prefix = '', shared = false) {
    const prefixKey = shared ? `shared:${prefix}` : `local:${prefix}`;
    const keys = allKeys()
      .filter(k => k.startsWith(prefixKey))
      .map(k => k.replace(/^(shared:|local:)/, ''));
    return { keys, prefix, shared };
  }
};
