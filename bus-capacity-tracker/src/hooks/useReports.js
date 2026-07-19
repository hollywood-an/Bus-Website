import { useState, useEffect, useRef, useCallback } from 'react';
import { CAPACITY_LEVELS } from '../data/capacity';

// Phase 1.6: crowdsourced reports are now server-owned and multi-user. This hook reads aggregates
// from /api/reports (decay + the anti-poisoning dampener happen server-side) and submits via
// POST /api/reports. Only personal state (points, theme) stays in localStorage; a cached snapshot
// of the last good aggregates is kept there too as a read-only offline fallback.
const REPORTS_POLL_MS = 20000;

function makeClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useReports() {
  const [routes, setRoutes] = useState([]); // [{ code, name, color }]
  const [capacity, setCapacity] = useState([]); // RouteCapacity[]
  const [down, setDown] = useState([]); // DownStatus[]
  const [userPoints, setUserPoints] = useState(0);
  const [notification, setNotification] = useState('');
  const [showReward, setShowReward] = useState(false);
  const [offline, setOffline] = useState(false);
  const clientIdRef = useRef('');

  // Personal state + an anonymous client id (used for rate-limiting + distinct-reporter counting).
  useEffect(() => {
    (async () => {
      try {
        const pts = await window.storage.get('user-points');
        if (pts?.value) setUserPoints(parseInt(pts.value));
        const existing = await window.storage.get('client-id');
        if (existing?.value) {
          clientIdRef.current = existing.value;
        } else {
          const id = makeClientId();
          await window.storage.set('client-id', id);
          clientIdRef.current = id;
        }
      } catch {
        clientIdRef.current = makeClientId();
      }
    })();
  }, []);

  // Route list (codes + names + colors) for dropdowns and code↔name mapping.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/routes')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setRoutes(Array.isArray(d.routes) ? d.routes : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll the shared report aggregates; cache them for offline display.
  const loadReports = useCallback(async () => {
    try {
      const d = await fetch('/api/reports').then((r) => r.json());
      setCapacity(d.capacity ?? []);
      setDown(d.down ?? []);
      setOffline(false);
      try {
        await window.storage.set('reports-cache', JSON.stringify({ capacity: d.capacity, down: d.down }));
      } catch {
        /* storage may be unavailable */
      }
    } catch {
      setOffline(true);
      try {
        const cached = await window.storage.get('reports-cache');
        if (cached?.value) {
          const parsed = JSON.parse(cached.value);
          setCapacity(parsed.capacity ?? []);
          setDown(parsed.down ?? []);
        }
      } catch {
        /* no cache */
      }
    }
  }, []);

  useEffect(() => {
    loadReports();
    const id = setInterval(loadReports, REPORTS_POLL_MS);
    return () => clearInterval(id);
  }, [loadReports]);

  const nameForCode = useCallback((code) => routes.find((r) => r.code === code)?.name ?? code, [routes]);

  // Resolve a route code OR full name to a code (so the chat fallback, which uses names, still works).
  const codeForKey = useCallback(
    (key) => {
      if (!key) return null;
      const up = String(key).toUpperCase();
      if (routes.some((r) => r.code === up)) return up;
      const byName = routes.find((r) => r.name.toLowerCase() === String(key).toLowerCase());
      return byName ? byName.code : null;
    },
    [routes],
  );

  const getCapacityInfo = useCallback(
    (key) => {
      const code = codeForKey(key);
      if (!code) return null;
      const c = capacity.find((x) => x.route === code);
      if (!c) return null;
      return {
        level: CAPACITY_LEVELS[c.level],
        reportCount: c.reportCount,
        reporterCount: c.reporterCount,
        confident: c.confident,
        newestAt: c.newestAt,
        code,
      };
    },
    [capacity, codeForKey],
  );

  const flash = (message, reward = false) => {
    setNotification(message);
    if (reward) setShowReward(true);
    setTimeout(() => {
      setNotification('');
      setShowReward(false);
    }, 3000);
  };

  const award = async (delta, message) => {
    const next = userPoints + delta;
    setUserPoints(next);
    try {
      await window.storage.set('user-points', String(next));
    } catch {
      /* ignore */
    }
    flash(message, true);
  };

  const postReport = async (payload) => {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-id': clientIdRef.current },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`report_${res.status}`);
    return res.json();
  };

  // Honest failure copy: a rate-limited rider must not be told to "try again" (the one move
  // guaranteed to keep failing), and a rejected report is not a connectivity problem.
  const submitFailureMessage = (err) => {
    const status = Number(String(err?.message ?? '').replace('report_', ''));
    if (status === 429) return "You're reporting too often — give it a minute.";
    if (status >= 400 && status < 500) return "That report wasn't valid, so nothing was saved.";
    if (status >= 500) return "The server had a problem. Try again in a moment.";
    return "Couldn't reach the server (offline?). Try again.";
  };

  // Both submitters resolve true on success, false on failure (callers decide what to keep/clear).
  const submitCapacityReport = async (code, level) => {
    if (!code) return false;
    try {
      const d = await postReport({ kind: 'capacity', route: code, level });
      setCapacity(d.capacity ?? []);
      setDown(d.down ?? []);
      await award(d.pointsDelta ?? 1, `Reported ${nameForCode(code)} · +${d.pointsDelta ?? 1} point`);
      return true;
    } catch (err) {
      flash(submitFailureMessage(err));
      return false;
    }
  };

  const submitBusDownReport = async (code) => {
    if (!code) return false;
    try {
      const d = await postReport({ kind: 'down', route: code });
      setCapacity(d.capacity ?? []);
      setDown(d.down ?? []);
      await award(d.pointsDelta ?? 2, `Reported ${nameForCode(code)} down · +${d.pointsDelta ?? 2} points`);
      return true;
    } catch (err) {
      flash(submitFailureMessage(err));
      return false;
    }
  };

  const checkStatus = (code) => {
    if (!code) return;
    const info = getCapacityInfo(code);
    if (!info) {
      setNotification(`No recent reports for ${nameForCode(code)}`);
    } else {
      const tag = info.confident ? '' : ' (unconfirmed)';
      setNotification(
        `${nameForCode(code)}: ${info.level.label} · ${info.reporterCount} reporter${info.reporterCount !== 1 ? 's' : ''}${tag}`,
      );
    }
    setTimeout(() => setNotification(''), 5000);
  };

  return {
    routes,
    capacity,
    down,
    userPoints,
    notification,
    showReward,
    offline,
    getCapacityInfo,
    nameForCode,
    submitCapacityReport,
    submitBusDownReport,
    checkStatus,
  };
}
