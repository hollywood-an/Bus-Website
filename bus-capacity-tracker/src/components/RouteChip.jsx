// A route's code on its own (feed) color — the consistent way routes are identified across the app.
export default function RouteChip({ code, color, size = 'sm', className = '' }) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-bold uppercase tracking-wide text-white ${pad} ${className}`}
      style={{ backgroundColor: color || 'var(--ink-soft)' }}
    >
      {code}
    </span>
  );
}
