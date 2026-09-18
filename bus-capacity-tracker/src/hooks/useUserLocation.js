import { useCallback, useEffect, useRef, useState } from 'react';

// iOS/iPadOS (all browsers there run WebKit). Location for web pages is gated by an OS toggle most
// users never find, so the "blocked" message has to name the exact Settings path.
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Classify a GeolocationPositionError into (kind, message). `code` 1 = PERMISSION_DENIED (on iOS this
// is usually the OS toggle, where Safari can't even prompt), 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT;
// missing geolocation is `null`.
//   'ios-blocked' — iOS + denied/unavailable: needs the iOS Location Services setting. The UI shows a
//                   guided card for this (a website can't open Settings or trigger the native prompt).
//   'blocked'     — non-iOS denied: browser site-settings guidance.
//   'unavailable' — timeout / no geolocation / transient.
// The old generic "allow location in your browser" was actively misleading on iOS: the real toggle is
// in iOS Settings → Location Services → Safari Websites, not Safari's own settings.
function classifyLocationError(code) {
  if (isIOS() && (code === 1 || code === 2)) {
    return {
      kind: 'ios-blocked',
      message:
        'Location is turned off for Safari. Turn it on in Settings → Privacy & Security → Location Services → Safari Websites, then reload and tap again.',
    };
  }
  if (code === 1) {
    return {
      kind: 'blocked',
      message: "Location is blocked for this site. Allow it in your browser's site settings (the lock/aA icon in the address bar), then try again.",
    };
  }
  if (code === 3) return { kind: 'unavailable', message: 'Getting your location took too long. Try again.' };
  return { kind: 'unavailable', message: 'Couldn’t get your location — make sure Location Services is on for your browser, then try again.' };
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
  const [errorKind, setErrorKind] = useState(''); // '' | 'ios-blocked' | 'blocked' | 'unavailable'
  const watchIdRef = useRef(null);
  // Mirror of `location` readable inside requestLocation without stale-closure issues.
  const locationRef = useRef(null);

  const startWatch = useCallback(() => {
    if (watchIdRef.current != null || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('granted');
        setErrorMessage(''); // a live fix clears any prior "blocked" banner/card
        setErrorKind('');
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
          const { kind, message } = classifyLocationError(null);
          setStatus('unavailable');
          setErrorKind(kind);
          setErrorMessage(message);
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const here = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
            setStatus('granted');
            setErrorMessage('');
            setErrorKind('');
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
            const { kind, message } = classifyLocationError(err?.code);
            setStatus(err?.code === 1 ? 'denied' : 'unavailable');
            setErrorKind(kind);
            setErrorMessage(message);
            resolve(null);
          },
          { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
        );
      }),
    [startWatch],
  );

  // Dismiss the current error (the guided card's "Not now"); a later attempt re-populates it.
  const dismissError = useCallback(() => {
    setErrorMessage('');
    setErrorKind('');
  }, []);

  return { location, status, errorMessage, errorKind, dismissError, requestLocation };
}

// ~1m precision — plenty for stops/trips, and what we send to the server (never the raw fix).
export const roundCoord = (n) => Math.round(n * 1e5) / 1e5;
