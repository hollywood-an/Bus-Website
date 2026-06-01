import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import TripMap from './TripMap';

// Phase 4.7: free-text, geocoded planning. from/to are controlled by App; the trip comes from the
// server's GET /api/plan (the same planTrip core the agent's plan_route tool uses).
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

  const card = (active) =>
    `p-4 rounded-lg border-2 text-center ${active ? 'border-green-500 bg-green-50' : 'border-gray-200'}`;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp size={24} />
        Route Planner
      </h2>
      <p className="text-gray-600 mb-4">Type any OSU building or nearby address — walk vs. bus vs. scooter.</p>

      <div className="space-y-3 mb-4">
        <input
          type="text"
          value={fromLocation}
          onChange={(e) => setFromLocation(e.target.value)}
          onKeyDown={onKey}
          placeholder="From — e.g. Morrill Tower"
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          value={toLocation}
          onChange={(e) => setToLocation(e.target.value)}
          onKeyDown={onKey}
          placeholder="To — e.g. Thompson Library"
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={plan}
          disabled={loading || !fromLocation.trim() || !toLocation.trim()}
          className="w-full bg-[#BB0000] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Planning…' : 'Plan trip'}
        </button>
      </div>

      {error && <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded text-yellow-800 text-sm">{error}</div>}

      {trip && (
        <div className="space-y-4">
          <div className="text-sm text-gray-700 font-medium">
            {trip.from.name} → {trip.to.name}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className={card(trip.fastest === 'walk')}>
              <div className="text-2xl font-bold text-gray-900">{trip.walkMin} min</div>
              <div className="text-sm text-gray-600 mt-1">Walk</div>
              <div className="text-xs text-gray-500 mt-1">free</div>
            </div>
            <div className={card(trip.fastest === 'bus')}>
              {trip.bus ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">{trip.bus.totalMin} min</div>
                  <div className="text-sm text-gray-600 mt-1">Bus · {trip.bus.routeCode}</div>
                  <div className="text-xs text-gray-500 mt-1">{trip.bus.busMin} min on board</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-medium text-gray-500">—</div>
                  <div className="text-sm text-gray-600 mt-1">Bus</div>
                  <div className="text-xs text-gray-500 mt-1">no good route</div>
                </>
              )}
            </div>
            <div className={card(trip.fastest === 'scooter')}>
              <div className="text-2xl font-bold text-gray-900">{trip.scooterMin} min</div>
              <div className="text-sm text-gray-600 mt-1">Scooter</div>
              <div className="text-xs text-gray-500 mt-1">Veo / Spin</div>
            </div>
          </div>

          {trip.bus && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-sm text-blue-900">
              Take the <strong>{trip.bus.routeName}</strong>: walk ~{trip.bus.walkToBoardMin} min to{' '}
              <strong>{trip.bus.board.name}</strong>, ride ~{trip.bus.busMin} min, then ~{trip.bus.walkFromAlightMin} min to{' '}
              <strong>{trip.bus.alight.name}</strong>.
            </div>
          )}

          <TripMap geometry={geometry} />
        </div>
      )}
    </div>
  );
}
