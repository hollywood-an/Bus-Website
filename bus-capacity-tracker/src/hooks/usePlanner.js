import { useState, useEffect, useRef } from 'react';
import { getClientId } from '../lib/clientId';

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
  const hadTripRef = useRef(false);

  // First result picks the fastest mode; replans keep the user's chosen mode (unless the new trip
  // lost its bus option) instead of yanking them back to fastest.
  useEffect(() => {
    if (!trip) {
      hadTripRef.current = false;
      return;
    }
    setMode((m) => (!hadTripRef.current || (m === 'bus' && !trip.bus) ? trip.fastest : m));
    hadTripRef.current = true;
  }, [trip]);

  // Overrides let a just-picked suggestion plan immediately (state updates land asynchronously).
  // The previous trip stays rendered while a replan is in flight — no blank-out flash.
  const plan = async (fromValue = fromLocation, toValue = toLocation) => {
    if (!fromValue.trim() || !toValue.trim()) return;
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/plan?from=${encodeURIComponent(fromValue)}&to=${encodeURIComponent(toValue)}`, {
        headers: { 'x-client-id': getClientId() }, // per-person rate limit, not per-campus-NAT
      });
      const data = await res.json().catch(() => ({}));
      if (seq !== seqRef.current) return; // a newer plan or prefill superseded this request
      // A rate limit is not a bad trip — saying "could not plan" sends people retyping good addresses.
      if (res.status === 429) setError(`Busy right now — try again in ${Number(data.retryAfter) || 15}s.`);
      else if (data.error === 'unresolved_from' || data.error === 'unresolved_to') {
        const q = data.error === 'unresolved_from' ? fromValue : toValue;
        setError(`Couldn't find "${q}" in the campus bus area (~3 mi around OSU). Try a building name or a nearby campus spot.`);
      } else if (data.error) setError('Could not plan that trip.');
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
