import { useState, useEffect, useRef } from 'react';

// Owns the trip-planner state at App level so a planned trip (and the chosen mode) survives view
// switches — App unmounts hidden views, so anything kept inside PlannerView would reset.
// PlannerView is purely presentational over this hook.
export function usePlanner() {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [trip, setTrip] = useState(null);
  const [mode, setMode] = useState('walk'); // shared by the comparison cards, Directions, and the map
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const seqRef = useRef(0); // drops responses from superseded plan() calls and prefill resets

  useEffect(() => {
    if (trip) setMode(trip.fastest);
  }, [trip]);

  // Overrides let a just-picked suggestion plan immediately (state updates land asynchronously).
  const plan = async (fromValue = fromLocation, toValue = toLocation) => {
    if (!fromValue.trim() || !toValue.trim()) return;
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    setTrip(null);
    try {
      const res = await fetch(`/api/plan?from=${encodeURIComponent(fromValue)}&to=${encodeURIComponent(toValue)}`);
      const data = await res.json();
      if (seq !== seqRef.current) return; // a newer plan or prefill superseded this request
      if (data.error === 'unresolved_from') setError(`Couldn't find "${fromValue}" near campus.`);
      else if (data.error === 'unresolved_to') setError(`Couldn't find "${toValue}" near campus.`);
      else if (data.error) setError('Could not plan that trip.');
      else setTrip(data);
    } catch {
      if (seq === seqRef.current) setError('Planner is unavailable right now.');
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  // Home's "plan a trip" shortcuts land on a clean planner: new endpoints, no stale results or
  // errors from a previous trip, and any in-flight plan invalidated.
  const prefill = (fromValue, toValue) => {
    seqRef.current++;
    setFromLocation(fromValue);
    setToLocation(toValue);
    setTrip(null);
    setError('');
    setLoading(false);
  };

  return { fromLocation, setFromLocation, toLocation, setToLocation, trip, mode, setMode, loading, error, plan, prefill };
}
