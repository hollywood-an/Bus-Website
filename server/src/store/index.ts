import { SqliteReportStore, type ReportStore } from './reportStore';

// Lazy singleton so importing the app (e.g. in tests) doesn't open a DB file until a request
// actually needs it. Tests set REPORTS_DB=':memory:' (vitest.config.ts) or construct their own.
let instance: ReportStore | null = null;

export function getReportStore(): ReportStore {
  if (!instance) instance = new SqliteReportStore();
  return instance;
}

export { SqliteReportStore } from './reportStore';
export type { ReportStore } from './reportStore';
export * from './types';
