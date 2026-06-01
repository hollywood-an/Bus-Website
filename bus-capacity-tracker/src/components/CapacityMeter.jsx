import { CAPACITY_LEVELS } from '../data/capacity';

// 5-segment crowding meter — the replacement for the emoji faces. Segments fill 0..level on a
// green→scarlet ramp; the label carries the same meaning in text (capacity is never color-only).
// Unconfirmed (single report) → hollow/outlined segments + an "unconfirmed" tag.
const CAP_VARS = ['var(--cap-0)', 'var(--cap-1)', 'var(--cap-2)', 'var(--cap-3)', 'var(--cap-4)'];

export default function CapacityMeter({ level, confident = true, showLabel = true, segWidth = 'w-5', className = '' }) {
  const lvl = Math.max(0, Math.min(4, Number(level) || 0));
  const label = CAPACITY_LEVELS[lvl]?.label ?? '';

  return (
    <div className={className}>
      <div
        className="flex items-center gap-1"
        role="img"
        aria-label={`Crowding: ${label}${confident ? '' : ', unconfirmed'}`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const filled = i <= lvl;
          const color = CAP_VARS[i];
          return (
            <span
              key={i}
              className={`h-2.5 ${segWidth} rounded-full transition-[background-color,border-color] duration-300 ease-out`}
              style={
                filled
                  ? confident
                    ? { backgroundColor: color }
                    : { backgroundColor: 'transparent', boxShadow: `inset 0 0 0 1.5px ${color}` }
                  : { backgroundColor: 'var(--line)' }
              }
            />
          );
        })}
      </div>
      {showLabel && (
        <div className="mt-1.5 text-[13px] font-bold text-ink-soft">
          {label}
          {!confident && <span className="ml-1.5 font-mono text-[11px] font-normal text-muted">unconfirmed</span>}
        </div>
      )}
    </div>
  );
}
