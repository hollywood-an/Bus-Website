import { Bus } from 'lucide-react';

// Brand mark — used in the desktop rail and the mobile top bar.
export default function Header({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-scarlet text-white">
        <Bus size={20} strokeWidth={2.4} />
      </span>
      <div className="leading-tight">
        <div className="font-extrabold tracking-tight text-ink">Buckeye Transit</div>
        {!compact && <div className="text-[11px] text-muted">Live campus bus + crowd reports</div>}
      </div>
    </div>
  );
}
