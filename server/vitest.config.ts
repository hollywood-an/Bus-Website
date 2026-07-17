import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Keep tests off the real SQLite file — any lazily-constructed store uses an in-memory DB.
    // Vehicles are pinned to mock so tests are deterministic and offline; production defaults to live.
    env: { REPORTS_DB: ':memory:', USE_MOCK_VEHICLES: 'true' },
  },
});
