import { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { useReports } from './hooks/useReports';
import { useGoogleMap } from './hooks/useGoogleMap';
import { useChat } from './hooks/useChat';
import { usePlanner } from './hooks/usePlanner';
import { useUserLocation, roundCoord } from './hooks/useUserLocation';
import { apiUrl } from './lib/api';
import Header from './components/Header';
import Nav from './components/Nav';
import Toast from './components/Toast';
import RewardOverlay from './components/RewardOverlay';
import CheckView from './components/CheckView';
import ReportView from './components/ReportView';
import MapView from './components/MapView';
import PlannerView from './components/PlannerView';
import AiView from './components/AiView';
import HomeView from './components/HomeView';

function Points({ value }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1"
      title="Points earned from reporting (local, just for fun)"
    >
      <Award size={15} className="text-scarlet-ink" />
      <span className="font-mono text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

// Each view is a real URL (shareable, back/forward works) without pulling in a router: the view state
// syncs with the History API. Unknown paths land on home.
const VIEW_PATHS = { home: '/', map: '/map', planner: '/plan', ai: '/assistant', report: '/report', check: '/crowding' };
const viewFromPath = (pathname) => Object.keys(VIEW_PATHS).find((v) => VIEW_PATHS[v] === pathname) ?? 'home';

// A pinch/input zoom on mobile survives SPA "page" changes (there's no real navigation to clear it), so
// switching views could leave you stranded zoomed-in. Briefly clamping the viewport meta snaps the scale
// back to 1; restoring it right after keeps pinch-zoom available (a11y).
function resetZoom() {
  if (!(window.visualViewport?.scale > 1)) return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  const original = meta.content;
  meta.content = `${original}, maximum-scale=1.0`;
  requestAnimationFrame(() => {
    meta.content = original;
  });
}

// App shell: brand + nav (left rail on desktop, bottom tab bar on mobile) around a content pane the
// map/results dominate. State lives in hooks; views are presentational.
export default function BusCapacityTracker() {
  const [view, setView] = useState(() => viewFromPath(window.location.pathname));
  const [reportRoute, setReportRoute] = useState(''); // Map's "Report this route" prefill
  // Per-route service state for the Crowding board (null until the first poll — no false claims).
  // The Map view has its own richer vehicle poll; this is the lightweight twin for 'check'.
  const [serviceByCode, setServiceByCode] = useState(null);

  // The one true way views change: update state, push the URL, and clear any lingering mobile zoom.
  const navigate = (next) => {
    resetZoom();
    setView(next);
    const path = VIEW_PATHS[next] ?? '/';
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
  };

  // Browser back/forward moves between views; normalize unknown paths to home once on load.
  useEffect(() => {
    if (!Object.values(VIEW_PATHS).includes(window.location.pathname)) {
      window.history.replaceState(null, '', '/');
    }
    const onPop = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const planner = usePlanner();
  const reports = useReports();
  // Shared user location (permission is only ever requested from a user gesture — see the hook).
  const userLoc = useUserLocation();
  const map = useGoogleMap(view, {
    capacity: reports.capacity,
    down: reports.down,
    userLocation: userLoc.location,
    requestLocation: userLoc.requestLocation,
  });

  useEffect(() => {
    if (view !== 'check') return;
    let cancelled = false;
    const poll = async () => {
      const d = await fetch(apiUrl('/api/service'))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (cancelled || !d) return;
      setServiceByCode(Object.fromEntries((d.routes ?? []).map((r) => [r.code, r.inService])));
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [view]);

  // Apply UI directives the agent streams (Phase 4): it operates the app, not just describes it.
  const applyDirective = (d) => {
    if (!d?.action) return;
    if (d.action === 'focus_map_on_route') {
      map.setHighlightStops([]);
      if (d.args?.route) map.setSelectedRoutes([d.args.route]); // directive replaces the selection
      navigate('map');
    } else if (d.action === 'highlight_stops') {
      if (d.args?.route) map.setSelectedRoutes([d.args.route]);
      map.setHighlightStops(Array.isArray(d.args?.stopIds) ? d.args.stopIds : []);
      navigate('map');
    }
    // show_trip renders inline in the assistant (handled in useChat) — no view switch.
  };

  const chat = useChat({
    getCapacityInfo: reports.getCapacityInfo,
    down: reports.down,
    nameForCode: reports.nameForCode,
    submitCapacityReport: reports.submitCapacityReport,
    submitBusDownReport: reports.submitBusDownReport,
    onUiDirective: applyDirective,
    // Rounded (~1m) coords, only while permission is granted — the assistant never prompts by itself.
    getLocation: () =>
      userLoc.status === 'granted' && userLoc.location
        ? { lat: roundCoord(userLoc.location.lat), lng: roundCoord(userLoc.location.lng) }
        : null,
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* mobile top bar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur md:hidden"
        style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
      >
        <Header compact onHome={() => navigate('home')} />
        <Points value={reports.userPoints} />
      </header>

      <div className="md:flex">
        {/* desktop rail */}
        <aside className="hidden border-r border-line bg-surface-2 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:px-3 md:py-4">
          <div className="px-2">
            <Header onHome={() => navigate('home')} />
          </div>
          <div className="mt-6 flex-1">
            <Nav view={view} setView={navigate} variant="rail" />
          </div>
          <div className="px-2">
            <Points value={reports.userPoints} />
          </div>
        </aside>

        {/* content pane */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:py-6 md:pb-6">
          {view === 'home' && (
            <HomeView
              setView={navigate}
              prefillPlanner={planner.prefill}
              askAssistant={chat.sendMessage}
              openMapRoute={(code) => {
                map.setSelectedRoutes([code]);
                navigate('map');
              }}
              routes={reports.routes}
            />
          )}
          {view === 'map' && (
            <MapView
              mapLoaded={map.mapLoaded}
              mapError={map.mapError}
              routesError={map.routesError}
              routes={map.routes}
              selectedRoutes={map.selectedRoutes}
              setSelectedRoutes={map.setSelectedRoutes}
              feedLive={map.feedLive}
              vehicleSource={map.vehicleSource}
              vehicles={map.vehicles}
              vehiclesLoaded={map.vehiclesLoaded}
              vehiclesError={map.vehiclesError}
              capacity={reports.capacity}
              down={reports.down}
              locateUser={map.locateUser}
              locateError={userLoc.errorMessage}
              nearestStops={map.nearestStops}
              hasLocation={Boolean(userLoc.location)}
              openReport={(code) => {
                setReportRoute(code); // land on Report with this route preselected
                navigate('report');
              }}
            />
          )}
          {view === 'planner' && (
            <PlannerView planner={planner} requestLocation={userLoc.requestLocation} locationError={userLoc.errorMessage} />
          )}
          {view === 'ai' && (
            <AiView
              chatMessages={chat.chatMessages}
              chatInput={chat.chatInput}
              setChatInput={chat.setChatInput}
              isAiThinking={chat.isAiThinking}
              sendMessage={chat.sendMessage}
              pendingConfirm={chat.pendingConfirm}
              confirmPending={chat.confirmPending}
              cancelPending={chat.cancelPending}
              locationStatus={userLoc.status}
              requestLocation={userLoc.requestLocation}
              locationError={userLoc.errorMessage}
            />
          )}
          {view === 'report' && (
            <ReportView
              routes={reports.routes}
              down={reports.down}
              submitCapacityReport={reports.submitCapacityReport}
              submitBusDownReport={reports.submitBusDownReport}
              nameForCode={reports.nameForCode}
              initialRoute={reportRoute}
            />
          )}
          {view === 'check' && (
            <CheckView
              routes={reports.routes}
              capacity={reports.capacity}
              down={reports.down}
              serviceByCode={serviceByCode}
            />
          )}
        </main>
      </div>

      <Nav view={view} setView={navigate} variant="tabs" />
      <Toast notification={reports.notification} />
      <RewardOverlay showReward={reports.showReward} />
    </div>
  );
}
