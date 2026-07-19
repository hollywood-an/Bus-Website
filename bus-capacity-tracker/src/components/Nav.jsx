import { Home, Map, Navigation, Bot, Megaphone, Gauge } from 'lucide-react';

// One nav, two renderings: a labeled left rail on desktop, an icon tab bar on mobile.
const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'planner', label: 'Plan', icon: Navigation },
  { id: 'ai', label: 'Assistant', icon: Bot },
  { id: 'report', label: 'Report', icon: Megaphone },
  { id: 'check', label: 'Crowding', icon: Gauge },
];

export default function Nav({ view, setView, variant = 'rail' }) {
  if (variant === 'tabs') {
    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const active = view === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                active ? 'text-scarlet-ink' : 'text-muted'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = view === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
              active ? 'bg-scarlet-wash text-scarlet-ink' : 'text-ink-soft hover:bg-surface-2'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
