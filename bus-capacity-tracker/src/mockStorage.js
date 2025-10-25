const storage = {};

window.storage = {
  async get(key, shared = false) {
    const storageKey = shared ? `shared:${key}` : `local:${key}`;
    const value = storage[storageKey];
    return value ? { key, value, shared } : null;
  },

  async set(key, value, shared = false) {
    const storageKey = shared ? `shared:${key}` : `local:${key}`;
    storage[storageKey] = value;
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const storageKey = shared ? `shared:${key}` : `local:${key}`;
    delete storage[storageKey];
    return { key, deleted: true, shared };
  },

  async list(prefix = '', shared = false) {
    const prefixKey = shared ? `shared:${prefix}` : `local:${prefix}`;
    const keys = Object.keys(storage)
      .filter(k => k.startsWith(prefixKey))
      .map(k => k.replace(/^(shared:|local:)/, ''));
    return { keys, prefix, shared };
  }
};