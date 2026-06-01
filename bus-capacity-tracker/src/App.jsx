import { useState } from 'react';
import { THEME_COLORS } from './data/themes';
import { useReports } from './hooks/useReports';
import { useGoogleMap } from './hooks/useGoogleMap';
import { useChat } from './hooks/useChat';
import Header from './components/Header';
import Notification from './components/Notification';
import Nav from './components/Nav';
import RewardOverlay from './components/RewardOverlay';
import CheckView from './components/CheckView';
import ReportView from './components/ReportView';
import MapView from './components/MapView';
import PlannerView from './components/PlannerView';
import AiView from './components/AiView';

// Thin shell: owns only the active view and wires the data hooks into the view components.
// All behavior lives in the hooks (useReports/useGoogleMap/useChat) and components/ — extracted
// verbatim from the original monolith in the Phase 0 decomposition.
export default function BusCapacityTracker() {
  const [view, setView] = useState('map');
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
    // show_trip is handled inside useChat (renders the inline map) — no view switch.
  };

  const chat = useChat({
    getCapacityInfo: reports.getCapacityInfo,
    down: reports.down,
    nameForCode: reports.nameForCode,
    submitCapacityReport: reports.submitCapacityReport,
    submitBusDownReport: reports.submitBusDownReport,
    onUiDirective: applyDirective
  });

  const currentTheme = THEME_COLORS[reports.selectedTheme];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Header currentTheme={currentTheme} userPoints={reports.userPoints} />

        <Notification notification={reports.notification} currentTheme={currentTheme} />

        <Nav view={view} setView={setView} currentTheme={currentTheme} />

        {view === 'check' && (
          <CheckView
            routes={reports.routes}
            capacity={reports.capacity}
            down={reports.down}
            checkStatus={reports.checkStatus}
            nameForCode={reports.nameForCode}
            currentTheme={currentTheme}
          />
        )}

        {view === 'report' && (
          <ReportView
            routes={reports.routes}
            down={reports.down}
            submitCapacityReport={reports.submitCapacityReport}
            submitBusDownReport={reports.submitBusDownReport}
            nameForCode={reports.nameForCode}
            currentTheme={currentTheme}
          />
        )}

        {view === 'map' && (
          <MapView
            mapLoaded={map.mapLoaded}
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
            currentTheme={currentTheme}
            pendingConfirm={chat.pendingConfirm}
            confirmPending={chat.confirmPending}
            cancelPending={chat.cancelPending}
            trip={chat.currentTrip}
          />
        )}

        <RewardOverlay showReward={reports.showReward} />
      </div>
    </div>
  );
}
