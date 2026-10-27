import { describe, it, expect, vi, beforeEach } from 'vitest';

// The network layer is mocked so these run offline; the cache is real (fixture-backed routes).
vi.mock('./osu', () => ({
  fetchRoutes: vi.fn(),
  fetchRouteDetail: vi.fn(),
  fetchVehicles: vi.fn(),
}));

const osu = await import('./osu');
const cache = await import('./cache');
const { refreshVehicles } = await import('./poller');
const fetchVehicles = vi.mocked(osu.fetchVehicles);

describe('refreshVehicles (outage detection + backoff signal)', () => {
  // Braces matter: a function returned from beforeEach runs as a teardown, and mockReset returns the mock.
  beforeEach(() => {
    fetchVehicles.mockReset();
  });

  it('a poll where every route fails reports failure and marks the feed not live', async () => {
    cache.markSuccess(); // pretend an earlier poll succeeded
    fetchVehicles.mockImplementation(async () => {
      throw new Error('OSU feed 503');
    });

    expect(await refreshVehicles()).toBe(false); // false -> the scheduler backs off
    const s = cache.feedStatus();
    expect(s.live).toBe(false);
    expect(s.lastError).toMatch(/503/);
  });

  it('a partial failure still succeeds, keeping last-known vehicles for the failed route', async () => {
    const [first, second] = cache.getRoutes();
    cache.setVehicles(second!.code, [{ latitude: 40, longitude: -83 }]); // last-known for `second`
    fetchVehicles.mockImplementation(async (code) => {
      if (code === second!.code) throw new Error('timeout');
      return [{ latitude: 40.001, longitude: -83.001, route: code }];
    });

    expect(await refreshVehicles()).toBe(true);
    expect(cache.feedStatus().lastError).toBeNull();
    expect(cache.getCachedVehicles(first!.code)).toHaveLength(1);
    expect(cache.getCachedVehicles(second!.code)).toEqual([{ latitude: 40, longitude: -83 }]);
  });
});
