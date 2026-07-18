import { useState, useEffect, useRef } from 'react';
import { Footprints, Bus, Zap, Navigation, ArrowUp, CornerUpLeft, CornerUpRight } from 'lucide-react';
import TripMap from './TripMap';
import RouteChip from './RouteChip';
import SuggestInput from './SuggestInput';
import { tripGeometry } from '../lib/tripGeometry';
import { loadMaps } from '../lib/loadMaps';

// meters -> imperial, the way a US transit app shows it (feet under ~0.1 mi, else miles).
function fmtDist(m) {
  if (m == null) return '';
  const ft = m * 3.28084;
  if (ft < 528) return `${Math.max(10, Math.round(ft / 10) * 10)} ft`;
  return `${(m / 1609.34).toFixed(1)} mi`;
}
function maneuverIcon(maneuver = '') {
  const u = String(maneuver).toUpperCase();
  if (u.includes('LEFT')) return CornerUpLeft;
  if (u.includes('RIGHT')) return CornerUpRight;
  return ArrowUp;
}

// Google-Maps-style turn-by-turn list (walk + scooter share the road path).
function StepList({ steps, className = 'max-h-72' }) {
  return (
    <ol className={`mt-2 ${className} divide-y divide-line overflow-y-auto pr-1`}>
      {steps.map((s, i) => {
        const Icon = maneuverIcon(s.maneuver);
        return (
          <li key={i} className="flex items-start gap-3 py-2">
            <Icon size={16} className="mt-0.5 shrink-0 text-ink-soft" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-ink">{s.text}</div>
              {s.meters ? <div className="mt-0.5 font-mono text-[11px] text-muted">{fmtDist(s.meters)}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// Campus map for the empty state, so the page isn't a form floating in whitespace. Swapped out
// for the real TripMap once a trip is planned. Quietly renders nothing if Maps can't load.
function CampusPreviewMap() {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then((maps) => {
        if (cancelled || !divRef.current || mapRef.current) return;
        mapRef.current = new maps.Map(divRef.current, {
          center: { lat: 40.0017, lng: -83.0197 },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (failed) return null;
  return <div ref={divRef} className="mt-5 h-[420px] max-h-[55vh] min-h-[240px] w-full overflow-hidden rounded-lg border border-line bg-surface-2" />;
}

// One row of the bus itinerary timeline: a marker + a connector line down to the next row.
function TimelineRow({ marker, connector, last, children }) {
  return (
    <li className="flex gap-3">
      <div className="flex w-5 shrink-0 flex-col items-center">
        {marker}
        {!last && <span className="mt-1 w-[2px] flex-1 rounded-full" style={{ backgroundColor: connector }} />}
      </div>
      <div className="flex-1 pb-4">{children}</div>
    </li>
  );
}

// Google-Maps-style transit itinerary: walk to the stop, board (route + stop id + how many stops),
// get off, walk to the destination.
function BusItinerary({ trip }) {
  const b = trip.bus;
  const color = b.routeColor || 'var(--ink-soft)';
  const dot = <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: color }} />;
  const ring = <span className="mt-1 h-3 w-3 rounded-full border-2 bg-surface" style={{ borderColor: color }} />;
  const foot = <Footprints size={15} className="mt-0.5 text-ink-soft" />;
  return (
    <ol className="mt-2 text-sm">
      <TimelineRow marker={foot} connector="var(--line-2)">
        <span className="text-ink-soft">
          Walk <span className="font-mono">{b.walkToBoardMin} min</span> ({fmtDist(b.walkToBoardMeters)}) to{' '}
          <strong className="text-ink">{b.board.name}</strong>
        </span>
        {b.walkToBoardSteps?.length > 0 && <StepList steps={b.walkToBoardSteps} className="max-h-48" />}
      </TimelineRow>
      <TimelineRow marker={dot} connector={color}>
        <div className="flex flex-wrap items-center gap-1.5 font-bold text-ink">
          Board <RouteChip code={b.routeCode} color={b.routeColor} /> {b.routeName}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-muted">
          ride ~{b.busMin} min · {b.stops} stop{b.stops === 1 ? '' : 's'} · Stop {b.board.id}
        </div>
      </TimelineRow>
      <TimelineRow marker={ring} connector="var(--line-2)">
        <div className="font-bold text-ink">Get off at {b.alight.name}</div>
        <div className="mt-0.5 font-mono text-[11px] text-muted">Stop {b.alight.id}</div>
      </TimelineRow>
      <TimelineRow marker={foot} last>
        <span className="text-ink-soft">
          Walk <span className="font-mono">{b.walkFromAlightMin} min</span> ({fmtDist(b.walkFromAlightMeters)}) to{' '}
          <strong className="text-ink">{trip.to.name}</strong>
        </span>
        {b.walkFromAlightSteps?.length > 0 && <StepList steps={b.walkFromAlightSteps} className="max-h-48" />}
      </TimelineRow>
    </ol>
  );
}

// Free-text, geocoded planning. from/to controlled by App; trip comes from GET /api/plan (the same
// planTrip core the agent uses). Restyled to the Bold Buckeye system.
export default function PlannerView({ fromLocation, toLocation, setFromLocation, setToLocation }) {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Selected mode, shared by the comparison cards, the Directions block, and the map's tabs.
  const [mode, setMode] = useState('walk');

  useEffect(() => {
    if (trip) setMode(trip.fastest);
  }, [trip]);

  // Overrides let a just-picked suggestion plan immediately (state updates land asynchronously).
  const plan = async (fromValue = fromLocation, toValue = toLocation) => {
    if (!fromValue.trim() || !toValue.trim()) return;
    setLoading(true);
    setError('');
    setTrip(null);
    try {
      const res = await fetch(`/api/plan?from=${encodeURIComponent(fromValue)}&to=${encodeURIComponent(toValue)}`);
      const data = await res.json();
      if (data.error === 'unresolved_from') setError(`Couldn't find "${fromValue}" near campus.`);
      else if (data.error === 'unresolved_to') setError(`Couldn't find "${toValue}" near campus.`);
      else if (data.error) setError('Could not plan that trip.');
      else setTrip(data);
    } catch {
      setError('Planner is unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  const fromRef = useRef(null);
  const toRef = useRef(null);

  const geometry = tripGeometry(trip);

  const inputClass = 'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:border-scarlet focus:outline-none';

  const Mode = ({ id, icon, min, label, sub, disabled = false }) => {
    const Icon = icon;
    const active = mode === id;
    return (
      <button
        type="button"
        onClick={() => setMode(id)}
        disabled={disabled}
        aria-pressed={active}
        className={`rounded-lg border p-3 text-center transition-colors ${
          active ? 'border-scarlet bg-scarlet-wash' : 'border-line bg-surface hover:bg-surface-2'
        } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface`}
      >
        <Icon size={18} className={`mx-auto ${active ? 'text-scarlet-ink' : 'text-ink-soft'}`} />
        <div className="mt-1.5 font-mono text-xl font-bold text-ink">{min}</div>
        <div className="text-xs font-bold text-ink-soft">{label}</div>
        <div className="text-[11px] text-muted">{sub}</div>
      </button>
    );
  };

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl">Plan a trip</h1>
      <p className="mt-1 text-sm text-muted">Any OSU building or nearby address: walk vs. bus vs. scooter.</p>

      <div className="mt-4 space-y-2.5">
        <SuggestInput
          value={fromLocation}
          onChange={setFromLocation}
          onSelect={(text) => {
            setFromLocation(text);
            if (toLocation.trim()) plan(text, toLocation);
            else toRef.current?.focus();
          }}
          onEnter={() => plan()}
          placeholder="From (e.g. Morrill Tower)"
          ariaLabel="From"
          inputRef={fromRef}
          className={inputClass}
        />
        <SuggestInput
          value={toLocation}
          onChange={setToLocation}
          onSelect={(text) => {
            setToLocation(text);
            if (fromLocation.trim()) plan(fromLocation, text);
            else fromRef.current?.focus();
          }}
          onEnter={() => plan()}
          placeholder="To (e.g. Thompson Library)"
          ariaLabel="To"
          inputRef={toRef}
          className={inputClass}
        />
        <button
          onClick={() => plan()}
          disabled={loading || !fromLocation.trim() || !toLocation.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-scarlet px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-scarlet-ink disabled:bg-surface-2 disabled:text-muted"
        >
          <Navigation size={16} />
          {loading ? 'Planning…' : 'Plan trip'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm font-semibold text-ink-soft">{error}</div>
      )}

      {!trip && <CampusPreviewMap />}

      {trip && (
        <div className="mt-5 space-y-4">
          <div className="font-bold text-ink">
            {trip.from.name} <span className="text-muted">→</span> {trip.to.name}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Mode id="walk" icon={Footprints} min={`${trip.walkMin}`} label="Walk" sub="free" />
            <Mode
              id="bus"
              icon={Bus}
              min={trip.bus ? `${trip.bus.totalMin}` : '—'}
              label={trip.bus ? `Bus · ${trip.bus.routeCode}` : 'Bus'}
              sub={trip.bus ? `${trip.bus.busMin}m on board` : 'no good route'}
              disabled={!trip.bus}
            />
            <Mode id="scooter" icon={Zap} min={`${trip.scooterMin}`} label="Scooter" sub="Veo / Spin" />
          </div>

          <TripMap geometry={geometry} mode={mode} showTabs={false} />

          <div className="rounded-lg border border-line bg-surface p-3.5">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">Directions</div>
            {mode === 'bus' && trip.bus ? (
              <BusItinerary trip={trip} />
            ) : (
              <div>
                <div className="mt-1 text-sm text-ink-soft">
                  {mode === 'scooter' ? 'Scooter' : 'Walk'} to <strong className="text-ink">{trip.to.name}</strong>{' '}
                  <span className="font-mono text-muted">
                    · {mode === 'scooter' ? trip.scooterMin : trip.walkMin} min{trip.walkMeters ? ` · ${fmtDist(trip.walkMeters)}` : ''}
                  </span>
                </div>
                {trip.walkSteps?.length ? (
                  <StepList steps={trip.walkSteps} />
                ) : (
                  <div className="mt-2 text-sm text-ink-soft">Head straight there; it is a short, direct route.</div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </section>
  );
}
