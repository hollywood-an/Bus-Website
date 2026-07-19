import { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle } from 'lucide-react';
import { CAPACITY_LEVELS } from '../data/capacity';
import CapacityMeter from './CapacityMeter';
import RouteChip from './RouteChip';
import { timeAgo } from '../lib/format';

const CAP_VARS = ['var(--cap-0)', 'var(--cap-1)', 'var(--cap-2)', 'var(--cap-3)', 'var(--cap-4)'];
const selectClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink focus:border-scarlet focus:outline-none';

export default function ReportView({ routes, down, submitCapacityReport, submitBusDownReport, nameForCode, initialRoute = '' }) {
  const [capRoute, setCapRoute] = useState(initialRoute);
  const [level, setLevel] = useState(2);
  const [downRoute, setDownRoute] = useState(initialRoute);

  // The Map's "Report this route's crowding" button lands here preselected.
  useEffect(() => {
    if (initialRoute) {
      setCapRoute(initialRoute);
      setDownRoute(initialRoute);
    }
  }, [initialRoute]);

  // The route stays selected after a submit — the daily rider reports the same bus every morning.
  const onCap = async () => {
    if (!capRoute) return;
    const ok = await submitCapacityReport(capRoute, level);
    if (ok) setLevel(2);
  };
  const onDown = () => {
    if (!downRoute) return;
    submitBusDownReport(downRoute);
  };

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl">Report</h1>
        <p className="mt-1 text-sm text-muted">Help everyone out. It takes two riders to confirm a status.</p>
      </div>

      {/* capacity */}
      <div className="rounded-lg border border-line bg-surface p-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Megaphone size={18} className="text-scarlet-ink" /> How full is it?
        </h2>
        <div className="mt-3 space-y-3">
          <select value={capRoute} onChange={(e) => setCapRoute(e.target.value)} className={selectClass} aria-label="Route to report capacity">
            <option value="">Select a route…</option>
            {routes.map((r) => (
              <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
            ))}
          </select>

          <div className="grid grid-cols-5 gap-1.5">
            {CAPACITY_LEVELS.map((lv, i) => {
              const active = level === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLevel(i)}
                  aria-pressed={active}
                  className={`rounded-lg border px-1 py-2 text-[11px] font-bold leading-tight transition-colors ${
                    active ? 'border-transparent text-white' : 'border-line text-ink-soft hover:bg-surface-2'
                  }`}
                  style={active ? { backgroundColor: CAP_VARS[i] } : undefined}
                >
                  {lv.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2.5">
            <span className="text-xs font-semibold text-muted">Preview</span>
            <CapacityMeter level={level} showLabel={false} />
          </div>

          <button
            onClick={onCap}
            disabled={!capRoute}
            className="w-full rounded-lg bg-scarlet px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-scarlet-ink disabled:bg-surface-2 disabled:text-muted"
          >
            Submit report <span className="font-mono">· +1</span>
          </button>
        </div>
      </div>

      {/* down */}
      <div className="rounded-lg border border-line bg-surface p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-danger">
          <AlertTriangle size={18} /> Route not running?
        </h2>
        <div className="mt-3 space-y-3">
          <select value={downRoute} onChange={(e) => setDownRoute(e.target.value)} className={selectClass} aria-label="Route to report down">
            <option value="">Select a route…</option>
            {routes.map((r) => (
              <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
            ))}
          </select>
          <button
            onClick={onDown}
            disabled={!downRoute}
            className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-bold text-danger transition-colors hover:bg-surface-2 disabled:opacity-40"
          >
            Report as down <span className="font-mono">· +2</span>
          </button>
        </div>

        {down.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-line pt-3">
            {down.map((d) => (
              <div key={d.route} className="flex flex-wrap items-center gap-2 text-sm">
                <RouteChip code={d.route} color={routes.find((r) => r.code === d.route)?.color} />
                <span className="font-semibold text-ink">{nameForCode(d.route)}</span>
                <span className="font-mono text-[11px] text-muted">
                  {d.confirmed ? 'confirmed' : 'unconfirmed'} · {d.reporterCount} · {timeAgo(d.newestAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
