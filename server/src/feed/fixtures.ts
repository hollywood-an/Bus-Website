import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { RouteSummary, RouteDetail } from './types';
import { parseRoutes, parseRouteDetail } from './parse';

// Last-known-good snapshots captured from the live feed (server/fixtures/), used as the fallback
// when the feed is unreachable so the map never breaks. Parsed through the same validators.
const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf8'));
}

export function fixtureRoutes(): RouteSummary[] {
  try {
    return parseRoutes(readJson('routes.json'));
  } catch {
    return [];
  }
}

export function fixtureRouteDetail(code: string): RouteDetail | null {
  try {
    return parseRouteDetail(code, readJson(`route-${code.toUpperCase()}.json`));
  } catch {
    return null;
  }
}
