import Database from 'better-sqlite3';
import type { RouteCapacity, DownStatus, SubmitResult } from './types';

// Decay windows carried over from the original client logic.
const CAPACITY_TTL_MS = 30 * 60_000;
const DOWN_TTL_MS = 60 * 60_000;
// Distinct reporters required before a status is treated as real (anti-poisoning dampener).
const CONFIRM_THRESHOLD = 2;

export interface ReportStore {
  addCapacity(route: string, level: number, reporterId: string): SubmitResult;
  addDown(route: string, reporterId: string): SubmitResult;
  capacity(route?: string): RouteCapacity[];
  down(): DownStatus[];
  sweep(): void;
  seed(routes: string[]): void;
  close(): void;
}

interface CapRow {
  route: string;
  level: number;
  reporterId: string;
  createdAt: number;
}
interface DownRow {
  route: string;
  reporterId: string;
  createdAt: number;
}

export class SqliteReportStore implements ReportStore {
  private db: Database.Database;

  constructor(path = process.env.REPORTS_DB ?? 'reports.db') {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        route TEXT NOT NULL,
        level INTEGER,
        reporterId TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reports_active ON reports (kind, route, expiresAt);
    `);
  }

  addCapacity(route: string, level: number, reporterId: string): SubmitResult {
    const now = Date.now();
    this.db
      .prepare('INSERT INTO reports (kind, route, level, reporterId, createdAt, expiresAt) VALUES (?,?,?,?,?,?)')
      .run('capacity', route.toUpperCase(), level, reporterId, now, now + CAPACITY_TTL_MS);
    return { ok: true, pointsDelta: 1 };
  }

  addDown(route: string, reporterId: string): SubmitResult {
    const now = Date.now();
    this.db
      .prepare('INSERT INTO reports (kind, route, level, reporterId, createdAt, expiresAt) VALUES (?,?,?,?,?,?)')
      .run('down', route.toUpperCase(), null, reporterId, now, now + DOWN_TTL_MS);
    return { ok: true, pointsDelta: 2 };
  }

  capacity(route?: string): RouteCapacity[] {
    const now = Date.now();
    const rows = (
      route
        ? this.db
            .prepare("SELECT route, level, reporterId, createdAt FROM reports WHERE kind='capacity' AND expiresAt > ? AND route = ?")
            .all(now, route.toUpperCase())
        : this.db.prepare("SELECT route, level, reporterId, createdAt FROM reports WHERE kind='capacity' AND expiresAt > ?").all(now)
    ) as CapRow[];
    return aggregateCapacity(rows);
  }

  down(): DownStatus[] {
    const now = Date.now();
    const rows = this.db
      .prepare("SELECT route, reporterId, createdAt FROM reports WHERE kind='down' AND expiresAt > ?")
      .all(now) as DownRow[];
    return aggregateDown(rows);
  }

  sweep(): void {
    this.db.prepare('DELETE FROM reports WHERE expiresAt <= ?').run(Date.now());
  }

  // Idempotent demo data so the crowdsourced layer looks alive for reviewers (cold-start problem is
  // documented in the README). Only seeds when there are no active reports.
  seed(routes: string[]): void {
    const active = this.db.prepare('SELECT COUNT(*) AS n FROM reports WHERE expiresAt > ?').get(Date.now()) as { n: number };
    if (active.n > 0 || routes.length === 0) return;

    const now = Date.now();
    const insert = this.db.prepare('INSERT INTO reports (kind, route, level, reporterId, createdAt, expiresAt) VALUES (?,?,?,?,?,?)');
    const pick = (i: number) => routes[i % routes.length]!;
    const capAt = (mins: number) => now - mins * 60_000 + CAPACITY_TTL_MS; // expiresAt for a report made `mins` ago
    const downAt = (mins: number) => now - mins * 60_000 + DOWN_TTL_MS;

    const seedCap = (route: string, level: number, who: string, mins: number) =>
      insert.run('capacity', route, level, who, now - mins * 60_000, capAt(mins));
    const seedDown = (route: string, who: string, mins: number) =>
      insert.run('down', route, null, who, now - mins * 60_000, downAt(mins));

    this.db.transaction(() => {
      // A crowded, well-corroborated route (3 distinct reporters → confident).
      seedCap(pick(1), 3, 'seed-a', 4);
      seedCap(pick(1), 4, 'seed-b', 3);
      seedCap(pick(1), 3, 'seed-c', 1);
      // A comfortable, corroborated route (2 reporters).
      seedCap(pick(0), 1, 'seed-a', 6);
      seedCap(pick(0), 1, 'seed-d', 2);
      // A single, UNconfident report (1 reporter — shouldn't flip a badge).
      seedCap(pick(2), 2, 'seed-e', 5);
      // A confirmed-down route (2 reporters) and an unconfirmed one (1 reporter).
      seedDown(pick(3), 'seed-a', 8);
      seedDown(pick(3), 'seed-f', 5);
      seedDown(pick(4), 'seed-g', 10);
    })();
  }

  close(): void {
    this.db.close();
  }
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  return map;
}

function aggregateCapacity(rows: CapRow[]): RouteCapacity[] {
  return [...groupBy(rows, (r) => r.route).entries()]
    .map(([route, rs]) => {
      const reporters = new Set(rs.map((r) => r.reporterId));
      return {
        route,
        level: robustLevel(rs.map((r) => r.level)),
        reportCount: rs.length,
        reporterCount: reporters.size,
        newestAt: Math.max(...rs.map((r) => r.createdAt)),
        confident: reporters.size >= CONFIRM_THRESHOLD,
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}

function aggregateDown(rows: DownRow[]): DownStatus[] {
  return [...groupBy(rows, (r) => r.route).entries()]
    .map(([route, rs]) => {
      const reporters = new Set(rs.map((r) => r.reporterId));
      return {
        route,
        reportCount: rs.length,
        reporterCount: reporters.size,
        newestAt: Math.max(...rs.map((r) => r.createdAt)),
        confirmed: reporters.size >= CONFIRM_THRESHOLD,
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}

// Median down-weights a single outlier (e.g. one troll reporting "very full"); falls back to the
// rounded mean for 1–2 samples.
function robustLevel(levels: number[]): number {
  if (levels.length === 0) return 0;
  const sorted = [...levels].sort((a, b) => a - b);
  const n = sorted.length;
  if (n >= 3) {
    const mid = Math.floor(n / 2);
    return n % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return Math.round(sorted.reduce((s, v) => s + v, 0) / n);
}
