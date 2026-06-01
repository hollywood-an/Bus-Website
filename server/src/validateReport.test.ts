import { describe, it, expect } from 'vitest';
import * as feed from './feed';
import { validateReport } from './validateReport';

// validateReport is the single gate shared by POST /api/reports and the submit_capacity_report tool,
// so these cases back the "unvalidated writes -> server validation" claim in SECURITY.md. Routes are
// checked against the live/fixture route set, so derive a real code rather than hardcoding one.
const KNOWN = feed.getRoutes()[0]!.code;

describe('validateReport', () => {
  it('accepts a known route + valid level, and upper-cases the code', () => {
    expect(validateReport('capacity', KNOWN.toLowerCase(), 3)).toEqual({ ok: true, code: KNOWN, kind: 'capacity', level: 3 });
  });

  it('accepts a down report for a known route (no level)', () => {
    expect(validateReport('down', KNOWN, undefined)).toEqual({ ok: true, code: KNOWN, kind: 'down' });
  });

  it('rejects an unknown route', () => {
    expect(validateReport('capacity', 'ZZZ', 2)).toEqual({ ok: false, error: 'unknown_route' });
  });

  it('rejects out-of-range / non-integer / non-numeric levels', () => {
    for (const bad of [5, -1, 2.5, 'lots', NaN, undefined]) {
      expect(validateReport('capacity', KNOWN, bad)).toEqual({ ok: false, error: 'bad_level' });
    }
  });

  it('rejects an unrecognized kind', () => {
    expect(validateReport('explode', KNOWN, 2)).toEqual({ ok: false, error: 'bad_kind' });
  });
});
