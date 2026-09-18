import { useCallback, useEffect, useRef, useState } from 'react';

// iOS/iPadOS (all browsers there run WebKit). Location for web pages is gated by an OS toggle most
// users never find, so the "blocked" message has to name the exact Settings path.
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Turn a GeolocationPositionError code into copy that actually tells the user how to fix it. The old
// generic "allow location in your browser" was actively misleading on iOS: the real toggle lives in
// iOS Settings → Location Services → Safari Websites, not in Safari's own settings. `code` 1 =
// PERMISSION_DENIED (often the OS toggle on iOS, where Safari can't even prompt), 2 = unavailable,
// 3 = timeout; missing geolocation is `null`.
function locationHelp(code) {
  if (isIOS() && (code === 1 || code === 2)) {
    return 'Location is turned off for Safari. Turn it on in Settings → Privacy & Security → Location Services → Safari Websites, then reload and tap again.';
  }
  if (code === 1) {
    return "Location is blocked for this site. Allow it in your browser's site settings (the lock/aA icon in the address bar), then try again.";
  }
  if (code === 3) return 'Getting your location took too long. Try again.';
  return 'Couldn’t get your location — make sure Location Services is on for your browser, then try again.';
}

// The one source of truth for the user's location, shared by the Map (blue dot + nearest stops),
// the Planner ("Your location" origin), and the Assistant (opt-in context).
//
// Permission model, deliberately polite: the browser prompt fires ONLY from a user gesture
// (requestLocation — wired to "Locate me", the planner's "Your location" pick, and the assistant's
// share chip). If permission was granted on an earlier visit, the Permissions API tells us and a
// position watch starts silently — every surface lights up with no prompt. We never auto-prompt on
// page load.
export function useUserLocation() {
  const [location, setLocation] = useState(null); // { lat, lng, accuracy } or null
  const [status, setStatus] = useState('unknown'); // unknown | prompt | granted | denied | unavailable
  const [errorMessage, setErrorMessage] = useState(''); // actionable copy when a fix fails ('' when fine)
  const watchIdRef = useRef(null);
  // Mirror of `location` readable inside requestLocation without stale-closure issues.
  const locationRef = useRef(null);

  const startWatch = useCallback(() => {
    if (watchIdRef.current != null || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('granted');
        setErrorMessage(''); // a live fix clears any prior "blocked" banner
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        locationRef.current = here;
        setLocation(here);
      },
      () => {}, // transient watch errors keep the last good fix; a hard denial surfaces via requestLocation
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return undefined;
    }
    let cancelled = false;
    let perm = null;
    (async () => {
      try {
        perm = await navigator.permissions.query({ name: 'geolocation' });
        if (cancelled) return;
        const apply = () => {
          if (perm.state === 'granted') {
            setStatus('granted');
            startWatch(); // already trusted on a past visit — no prompt happens
          } else {
            setStatus(perm.state); // 'prompt' | 'denied'
          }
        };
        apply();
        perm.onchange = apply;
      } catch {
        if (!cancelled) setStatus('prompt'); // Permissions API missing (older Safari): wait for a gesture
      }
    })();
    return () => {
      cancelled = true;
      if (perm) perm.onchange = null;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [startWatch]);

  // Gesture-triggered: prompts if the browser needs to, then keeps a live watch. Resolves the fix
  // ({lat,lng,accuracy}) or null so callers can await and react inline.
  //
  // Robustness order matters here (a real-device bug taught us): the background watch's fix is used
  // FIRST — if it already knows where the user is, resolve instantly with zero GPS round trips. A
  // fresh one-shot is only for the very first grant, and it accepts a recent/coarse cached fix
  // (maximumAge) rather than demanding fresh high accuracy, which desktop browsers routinely time
  // out on even with permission granted. The high-accuracy watch keeps refining the map dot anyway.
  const requestLocation = useCallback(
    () =>
      new Promise((resolve) => {
        if (locationRef.current) {
          resolve(locationRef.current);
          return;
        }
        if (!navigator.geolocation) {
          setStatus('unavailable');
          setErrorMessage(locationHelp(null));
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const here = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
            setStatus('granted');
            setErrorMessage('');
            locationRef.current = here;
            setLocation(here);
            startWatch();
            resolve(here);
          },
          (err) => {
            // The watch may have delivered while the one-shot struggled — that fix still wins.
            if (locationRef.current) {
              resolve(locationRef.current);
              return;
            }
            setStatus(err?.code === 1 ? 'denied' : 'unavailable');
            setErrorMessage(locationHelp(err?.code));
            resolve(null);
          },
          { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
        );
      }),
    [startWatch],
  );

  return { location, status, errorMessage, requestLocation };
}

// ~1m precision — plenty for stops/trips, and what we send to the server (never the raw fix).
export const roundCoord = (n) => Math.round(n * 1e5) / 1e5;
