import { useState } from 'react';
import { Footprints, Bus, Zap, Navigation } from 'lucide-react';
import TripMap from './TripMap';

// Free-text, geocoded planning. from/to controlled by App; trip comes from GET /api/plan (the same
// planTrip core the agent uses). Restyled to the Bold Buckeye system.
export default function PlannerView({ fromLocation, toLocation, setFromLocation, setToLocation }) {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plan = async () => {
    if (!fromLocation.trim() || !toLocation.trim()) return;
    setLoading(true);
    setError('');
    setTrip(null);
    try {
      const res = await fetch(`/api/plan?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}`);
      const data = await res.json();
      if (data.error === 'unresolved_from') setError(`Couldn't find "${fromLocation}" near campus.`);
      else if (data.error === 'unresolved_to') setError(`Couldn't find "${toLocation}" near campus.`);
      else if (data.error) setError('Could not plan that trip.');
      else setTrip(data);
    } catch {
      setError('Planner is unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter') plan();
  };

  const geometry = trip
    ? {
        from: trip.from,
        to: trip.to,
        walk: { encodedPolyline: trip.walkPolyline },
        bus: trip.bus
          ? { routeColor: trip.bus.routeColor, routePolyline: trip.bus.routePolyline, board: trip.bus.board, alight: trip.bus.alight }
          : null,
      }
    : null;

  const inputClass = 'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:border-scarlet focus:outline-none';

  const Mode = ({ icon, min, label, sub, active }) => {
    const Icon = icon;
    return (
    <div
      className={`rounded-lg border p-3 text-center ${active ? 'border-scarlet bg-scarlet-wash' : 'border-line bg-surface'}`}
    >
      <Icon size={18} className={`mx-auto ${active ? 'text-scarlet-ink' : 'text-ink-soft'}`} />
      <div className="mt-1.5 font-mono text-xl font-bold text-ink">{min}</div>
      <div className="text-xs font-bold text-ink-soft">{label}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
    );
  };

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl">Plan a trip</h1>
      <p className="mt-1 text-sm text-muted">Any OSU building or nearby address: walk vs. bus vs. scooter.</p>

      <div className="mt-4 space-y-2.5">
        <input value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} onKeyDown={onKey} placeholder="From (e.g. Morrill Tower)" className={inputClass} aria-label="From" />
        <input value={toLocation} onChange={(e) => setToLocation(e.target.value)} onKeyDown={onKey} placeholder="To (e.g. Thompson Library)" className={inputClass} aria-label="To" />
        <button
          onClick={plan}
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

      {trip && (
        <div className="mt-5 space-y-4">
          <div className="font-bold text-ink">
            {trip.from.name} <span className="text-muted">→</span> {trip.to.name}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Mode icon={Footprints} min={`${trip.walkMin}`} label="Walk" sub="free" active={trip.fastest === 'walk'} />
            <Mode
              icon={Bus}
              min={trip.bus ? `${trip.bus.totalMin}` : '—'}
              label={trip.bus ? `Bus · ${trip.bus.routeCode}` : 'Bus'}
              sub={trip.bus ? `${trip.bus.busMin}m on board` : 'no good route'}
              active={trip.fastest === 'bus'}
            />
            <Mode icon={Zap} min={`${trip.scooterMin}`} label="Scooter" sub="Veo / Spin" active={trip.fastest === 'scooter'} />
          </div>

          {trip.bus && (
            <div className="rounded-lg border border-line bg-surface p-3 text-sm text-ink-soft">
              Take the <strong className="text-ink">{trip.bus.routeName}</strong>: walk ~{trip.bus.walkToBoardMin}m to{' '}
              <strong className="text-ink">{trip.bus.board.name}</strong>, ride ~{trip.bus.busMin}m, then ~{trip.bus.walkFromAlightMin}m to{' '}
              <strong className="text-ink">{trip.bus.alight.name}</strong>.
            </div>
          )}

          <TripMap geometry={geometry} />
        </div>
      )}
    </section>
  );
}
