import { useState } from 'react';
import { Award } from 'lucide-react';
import { useReports } from './hooks/useReports';
import { useGoogleMap } from './hooks/useGoogleMap';
import { useChat } from './hooks/useChat';
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

// App shell: brand + nav (left rail on desktop, bottom tab bar on mobile) around a content pane the
// map/results dominate. State lives in hooks; views are presentational.
export default function BusCapacityTracker() {
  const [view, setView] = useState('home');
  const [plannerFrom, setPlannerFrom] = useState('');
  const [plannerTo, setPlannerTo] = useState('');

  const reports = useReports();
  const map = useGoogleMap(view);

  // Apply UI directives the agent streams (Phase 4): it operates the app, not just describes it.
  const applyDirective = (d) => {
    if (!d?.action) return;
    if (d.action === 'focus_map_on_route') {
      map.setHighlightStops([]);
      if (d.args?.route) map.setSelectedBusRoute(d.args.route);
      setView('map');
    } else if (d.action === 'highlight_stops') {
      if (d.args?.route) map.setSelectedBusRoute(d.args.route);
      map.setHighlightStops(Array.isArray(d.args?.stopIds) ? d.args.stopIds : []);
      setView('map');
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
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* mobile top bar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur md:hidden"
        style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
      >
        <Header compact />
        <Points value={reports.userPoints} />
      </header>

      <div className="md:flex">
        {/* desktop rail */}
        <aside className="hidden border-r border-line bg-surface-2 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:px-3 md:py-4">
          <div className="px-2">
            <Header />
          </div>
          <div className="mt-6 flex-1">
            <Nav view={view} setView={setView} variant="rail" />
          </div>
          <div className="px-2">
            <Points value={reports.userPoints} />
          </div>
        </aside>

        {/* content pane */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:py-6 md:pb-6">
          {view === 'home' && (
            <HomeView
              setView={setView}
              setPlannerFrom={setPlannerFrom}
              setPlannerTo={setPlannerTo}
              setChatInput={chat.setChatInput}
              routes={reports.routes}
            />
          )}
          {view === 'map' && (
            <MapView
              mapLoaded={map.mapLoaded}
              mapError={map.mapError}
              routesError={map.routesError}
              routes={map.routes}
              selectedBusRoute={map.selectedBusRoute}
              setSelectedBusRoute={map.setSelectedBusRoute}
              feedLive={map.feedLive}
              vehicleSource={map.vehicleSource}
            />
          )}
          {view === 'planner' && (
            <PlannerView
              fromLocation={plannerFrom}
              toLocation={plannerTo}
              setFromLocation={setPlannerFrom}
              setToLocation={setPlannerTo}
            />
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
            />
          )}
          {view === 'report' && (
            <ReportView
              routes={reports.routes}
              down={reports.down}
              submitCapacityReport={reports.submitCapacityReport}
              submitBusDownReport={reports.submitBusDownReport}
              nameForCode={reports.nameForCode}
            />
          )}
          {view === 'check' && (
            <CheckView
              routes={reports.routes}
              capacity={reports.capacity}
              down={reports.down}
              checkStatus={reports.checkStatus}
              nameForCode={reports.nameForCode}
            />
          )}
        </main>
      </div>

      <Nav view={view} setView={setView} variant="tabs" />
      <Toast notification={reports.notification} />
      <RewardOverlay showReward={reports.showReward} />
    </div>
  );
}
