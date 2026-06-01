import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Keep tests off the real SQLite file — any lazily-constructed store uses an in-memory DB.
    env: { REPORTS_DB: ':memory:' },
  },
});
