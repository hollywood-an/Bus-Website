import * as feed from './feed';

// Single source of truth for report validation, shared by the action tool (which only PROPOSES) and
// POST /api/reports (which actually WRITES). Both validate, so a malformed write can't sneak in even
// if a client skips the agent. Routes are checked against the live route set; capacity 0..4 only.
export type ReportKind = 'capacity' | 'down';

export type ValidatedReport =
  | { ok: true; code: string; kind: ReportKind; level?: number }
  | { ok: false; error: 'unknown_route' | 'bad_level' | 'bad_kind' };

export function validateReport(kind: unknown, route: unknown, level: unknown): ValidatedReport {
  const code = typeof route === 'string' ? route.toUpperCase() : '';
  if (!feed.getRoutes().some((r) => r.code === code)) return { ok: false, error: 'unknown_route' };

  if (kind === 'capacity') {
    const n = Number(level);
    if (!Number.isInteger(n) || n < 0 || n > 4) return { ok: false, error: 'bad_level' };
    return { ok: true, code, kind: 'capacity', level: n };
  }
  if (kind === 'down') {
    return { ok: true, code, kind: 'down' };
  }
  return { ok: false, error: 'bad_kind' };
}
