import { Navigation, Bot, Map, Megaphone, Gauge, Footprints, Bus, Zap, ArrowRight } from 'lucide-react';
import CapacityMeter from './CapacityMeter';
import RouteChip from './RouteChip';

// The landing / how-to page (default view). Visual-forward by design: it demonstrates the features with
// live-looking previews (real Mode cards, chat bubbles, capacity meter, route-color chips) and jumps the
// user straight into Plan or the Assistant, prefilling an example so they land mid-action.

// Mock of the planner's three-mode result, mirroring PlannerView's Mode card.
function ModeCard({ icon, min, label, sub, fast = false }) {
  const Icon = icon;
  return (
    <div className={`rounded-lg border p-2.5 text-center ${fast ? 'border-scarlet bg-scarlet-wash' : 'border-line bg-surface'}`}>
      <Icon size={18} className={`mx-auto ${fast ? 'text-scarlet-ink' : 'text-ink-soft'}`} />
      <div className="mt-1 font-mono text-xl font-bold text-ink">{min}</div>
      <div className="text-[12px] font-bold text-ink-soft">{label}</div>
      <div className="text-[11px] text-muted">{sub}</div>
      {fast && <div className="mt-1 inline-block rounded-full bg-ok px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">fastest</div>}
    </div>
  );
}

// A decorative campus-route motif for the hero (purely visual).
function RouteMotif() {
  const line = (d, color, w = 6, o = 0.9) => (
    <path d={d} fill="none" strokeLinecap="round" strokeWidth={w} style={{ stroke: color, opacity: o }} />
  );
  const stop = (cx, cy, color) => <circle cx={cx} cy={cy} r="5.5" style={{ fill: '#fff', stroke: color }} strokeWidth="3" />;
  return (
    <svg viewBox="0 0 320 210" className="h-full w-full" role="img" aria-label="Illustration of campus bus routes">
      <rect x="0" y="0" width="320" height="210" rx="16" style={{ fill: 'var(--scarlet-wash)' }} />
      {line('M24,168 C92,150 120,70 196,64 S288,96 300,52', 'var(--scarlet)', 7)}
      {line('M16,108 C96,128 168,134 236,98 S300,66 308,116', 'var(--cap-0)', 5, 0.85)}
      {line('M34,54 C104,40 150,116 226,142 S298,182 300,150', 'var(--info)', 5, 0.8)}
      {stop(24, 168, 'var(--scarlet)')}
      {stop(196, 64, 'var(--scarlet)')}
      {stop(236, 98, 'var(--cap-0)')}
      {stop(34, 54, 'var(--info)')}
      {/* a bus, mid-route */}
      <g transform="translate(150,104) rotate(-18)">
        <rect x="-13" y="-8" width="26" height="16" rx="4" style={{ fill: 'var(--scarlet)' }} />
        <rect x="-8" y="-5" width="16" height="6" rx="1.5" style={{ fill: '#fff', opacity: 0.9 }} />
      </g>
    </svg>
  );
}

const Step = ({ n, children }) => (
  <li className="flex gap-2.5">
    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-scarlet-wash font-mono text-[11px] font-bold text-scarlet-ink">{n}</span>
    <span>{children}</span>
  </li>
);

// ≥44px tap height on the primary actions (project a11y standard; this page is phone-first).
const primaryBtn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-scarlet px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-scarlet-ink';
const ghostBtn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:bg-surface-2';
const chip = 'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:border-scarlet hover:text-scarlet-ink';

export default function HomeView({ setView, setPlannerFrom, setPlannerTo, setChatInput, routes = [] }) {
  const goAssistant = (q) => {
    setChatInput(q);
    setView('ai');
  };
  const goPlan = (from, to) => {
    setPlannerFrom(from);
    setPlannerTo(to);
    setView('planner');
  };
  const go = (id) => setView(id);

  const more = [
    { id: 'map', icon: Map, title: 'Campus map', desc: 'Live bus positions, every route, and all the stops on one map.' },
    { id: 'report', icon: Megaphone, title: 'Report', desc: 'Tell other riders how full your bus is, or flag one that is not running.' },
    { id: 'check', icon: Gauge, title: 'Live crowding', desc: 'A glance at how packed every route is right now.' },
  ];

  return (
    <section className="mx-auto max-w-4xl space-y-9 pb-10">
      {/* Hero */}
      <div className="animate-rise overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-float)]">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-scarlet-wash px-2.5 py-1 text-[12px] font-bold text-scarlet-ink">
              <Bus size={14} /> Ohio State campus transit
            </span>
            <h1 className="mt-3 text-3xl sm:text-[2.5rem]">Get across campus without guessing.</h1>
            <p className="mt-2.5 max-w-prose text-[15px] leading-relaxed text-muted">
              Live bus locations, crowdsourced "how full is it," and an assistant that plans your trip and shows it on a map.
              Made for getting between classes.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button onClick={() => go('planner')} className={primaryBtn}>
                <Navigation size={16} /> Plan a trip
              </button>
              <button onClick={() => goAssistant('')} className={ghostBtn}>
                <Bot size={16} /> Ask the assistant
              </button>
            </div>
          </div>
          <div className="h-44 sm:h-52">
            <RouteMotif />
          </div>
        </div>
        {routes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-surface-2 px-6 py-3">
            <span className="mr-1 text-[12px] font-semibold text-muted">Routes on campus:</span>
            {routes.map((r) => (
              <RouteChip key={r.code} code={r.code} color={r.color} />
            ))}
          </div>
        )}
      </div>

      {/* Primary feature: Plan (copy left, preview right) */}
      <div className="animate-rise grid items-center gap-5 md:grid-cols-2" style={{ animationDelay: '70ms' }}>
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-scarlet-wash text-scarlet-ink">
              <Navigation size={22} />
            </span>
            <h2 className="text-xl">Plan a trip</h2>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
            Type any OSU building or nearby address. You get walking, bus, and scooter side by side with the fastest one
            called out, plus a map of the route. No memorizing lines.
          </p>
          <ol className="mt-3 space-y-1.5 text-sm text-ink-soft">
            <Step n="1">Enter where you are and where you are going.</Step>
            <Step n="2">Compare walk vs. bus vs. scooter at a glance.</Step>
            <Step n="3">Follow the route on the map.</Step>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => go('planner')} className={primaryBtn}>
              Plan a trip <ArrowRight size={15} />
            </button>
            <button onClick={() => goPlan('Morrill Tower', 'Thompson Library')} className={chip}>
              Try: Morrill Tower to Thompson Library
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wide text-muted">Morrill Tower to Ohio Union</div>
          <div className="grid grid-cols-3 gap-2">
            <ModeCard icon={Footprints} min="19" label="Walk" sub="free" />
            <ModeCard icon={Bus} min="7" label="Bus · CLS" sub="Mid Towers" />
            <ModeCard icon={Zap} min="6" label="Scooter" sub="Veo / Spin" fast />
          </div>
        </div>
      </div>

      {/* Primary feature: Assistant (preview left on desktop, copy right; copy first on mobile) */}
      <div className="animate-rise grid items-center gap-5 md:grid-cols-2" style={{ animationDelay: '140ms' }}>
        <div className="md:order-2">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-scarlet-wash text-scarlet-ink">
              <Bot size={22} />
            </span>
            <h2 className="text-xl">Assistant</h2>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
            Ask in plain words. The assistant checks live buses and crowd reports, plans the trip, and draws it on a map
            right in the chat. It can even queue a crowding report for you to confirm.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => goAssistant('')} className={primaryBtn}>
              Open the assistant <ArrowRight size={15} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['How do I get from Morrill to the Union?', 'Which bus is least crowded right now?', 'Is the Connector packed?'].map((q) => (
              <button key={q} onClick={() => goAssistant(q)} className={chip}>
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3.5 md:order-1">
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-scarlet px-3.5 py-2 text-sm font-medium text-white">
              How do I get from Morrill to the Union?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="md max-w-[90%] rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 text-sm">
              Take the CLS: 1 min walk to Mid Towers South, ride ~5 min to Ohio Union. A scooter is about as quick if one is nearby.
            </div>
          </div>
          <div className="ml-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <Map size={13} /> plus a route map, in the chat
          </div>
        </div>
      </div>

      {/* More features */}
      <div className="animate-rise" style={{ animationDelay: '210ms' }}>
        <h2 className="text-lg">More to explore</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {more.map(({ id, icon, title, desc }) => {
            const Icon = icon;
            return (
            <button
              key={id}
              onClick={() => go(id)}
              className="group flex flex-col rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-2 hover:bg-surface-2"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-scarlet-wash text-scarlet-ink">
                <Icon size={20} />
              </span>
              <span className="mt-3 font-bold text-ink">{title}</span>
              <span className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{desc}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-scarlet-ink">
                Open <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
            );
          })}
        </div>
      </div>

      {/* Good to know */}
      <div className="animate-rise rounded-xl border border-line bg-surface-2 p-5" style={{ animationDelay: '280ms' }}>
        <h2 className="text-lg">Good to know</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink-soft">
              <Gauge size={15} className="text-scarlet-ink" /> Crowdsourced crowding
            </div>
            <div className="mt-2">
              <CapacityMeter level={3} />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              It takes two riders to confirm a status, so one bad report cannot mislead you.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink-soft">
              <Bus size={15} className="text-scarlet-ink" /> Live, or simulated off-hours
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Buses show live during service hours. Outside them, positions are simulated and clearly labeled.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink-soft">
              <Megaphone size={15} className="text-scarlet-ink" /> Reporting earns points
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Every report helps the next rider. Points are just for fun, kept on your device, no account needed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
