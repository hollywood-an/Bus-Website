// Server-owned crowdsourced reports. This is the layer the official OSU feed lacks (how full a bus
// is / whether it's down). Aggregates are computed from raw reports with a deliberate anti-poisoning
// dampener: a status only "flips" (very-full badge, bus-down) once it's corroborated by >= 2 DISTINCT
// reporters, and capacity uses a robust (median) aggregate so one outlier can't swing it.

export type ReportKind = 'capacity' | 'down';

export interface RouteCapacity {
  route: string; // route code (e.g. CC)
  level: number; // robust aggregate, 0..4
  reportCount: number;
  reporterCount: number; // distinct reporters
  newestAt: number;
  confident: boolean; // corroborated by >= 2 distinct reporters
}

export interface DownStatus {
  route: string;
  reportCount: number;
  reporterCount: number;
  newestAt: number;
  confirmed: boolean; // corroborated by >= 2 distinct reporters
}

export interface ReportsSnapshot {
  capacity: RouteCapacity[];
  down: DownStatus[];
}

export interface SubmitResult {
  ok: boolean;
  pointsDelta: number; // cosmetic, client-side score (no accounts) — see README
}
