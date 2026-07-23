import { AlertTriangle } from 'lucide-react';
import CapacityMeter from './CapacityMeter';
import RouteChip from './RouteChip';
import { statusFor } from '../lib/serviceStatus';
import { timeAgo } from '../lib/format';

// A glanceable live-status board over every route (replaces the old "pick a route, click Check" form).
// serviceByCode (App's /api/service poll) keeps this board honest about service: an asleep route says
// "Not in service" instead of a "no reports" that reads as all-clear (audit D2).
export default function CheckView({ routes, capacity, down, serviceByCode = null }) {
  const capByCode = new Map(capacity.map((c) => [c.route, c]));
  const downByCode = new Map(down.map((d) => [d.route, d]));
  const empty = capacity.length === 0 && down.length === 0;

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl">Live crowding</h1>
      <p className="mt-1 text-sm text-muted">
        Crowdsourced fullness for every route.{empty ? ' No reports yet. Be the first to report.' : ''}
      </p>

      <div className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {routes.map((r) => {
          const cap = capByCode.get(r.code);
          const dn = downByCode.get(r.code);
          // Unknown until the first poll lands — never flash a false "Not in service".
          const asleep = serviceByCode != null && serviceByCode[r.code] === false;
          if (asleep) {
            const status = statusFor(dn, false); // not-in-service wins over down-reports (D5)
            return (
              <div key={r.code} className="flex items-center gap-3 p-3.5">
                <RouteChip code={r.code} color={r.color} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-ink">{r.name}</div>
                  <div className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: status.color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                    {status.label}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={r.code} className="flex items-center gap-3 p-3.5">
              <RouteChip code={r.code} color={r.color} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-ink">{r.name}</div>
                {dn ? (
                  <div
                    className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold"
                    style={{ color: dn.confirmed ? 'var(--danger)' : 'var(--warn)' }}
                  >
                    <AlertTriangle size={14} />
                    {dn.confirmed ? 'Reported down' : 'Possibly down'}
                    <span className="font-mono text-[11px] font-normal text-muted">
                      {dn.reporterCount} rider{dn.reporterCount !== 1 ? 's' : ''} · {timeAgo(dn.newestAt)}
                    </span>
                  </div>
                ) : cap ? (
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <CapacityMeter level={cap.level} confident={cap.confident} />
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {cap.reporterCount} rider{cap.reporterCount !== 1 ? 's' : ''} · {timeAgo(cap.newestAt)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-[13px] text-muted">No recent reports</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
