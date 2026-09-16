import { describe, it, expect } from 'vitest';
import { parseUserOrigin, OSU_CENTER } from './util';

// The single validator behind every client-supplied coordinate (GET /api/plan fromLat/fromLng,
// POST /api/agent location, find_nearest_stops / plan_route tool inputs).
describe('parseUserOrigin', () => {
  it('accepts finite on-campus coordinates and names them "Your location"', () => {
    const o = parseUserOrigin(OSU_CENTER.lat, OSU_CENTER.lng);
    expect(o).not.toBeNull();
    expect(o!.name).toBe('Your location');
    expect(o!.lat).toBeCloseTo(OSU_CENTER.lat);
  });

  it('coerces numeric strings (query params arrive as strings)', () => {
    const o = parseUserOrigin(String(OSU_CENTER.lat), String(OSU_CENTER.lng));
    expect(o).not.toBeNull();
  });

  it('rejects non-finite input', () => {
    expect(parseUserOrigin('abc', OSU_CENTER.lng)).toBeNull();
    expect(parseUserOrigin(NaN, OSU_CENTER.lng)).toBeNull();
    expect(parseUserOrigin(Infinity, OSU_CENTER.lng)).toBeNull();
    expect(parseUserOrigin(undefined, undefined)).toBeNull();
  });

  it('rejects coordinates outside the campus radius', () => {
    expect(parseUserOrigin(41.0, OSU_CENTER.lng)).toBeNull(); // ~110km north
    expect(parseUserOrigin(0, 0)).toBeNull();
  });
});
