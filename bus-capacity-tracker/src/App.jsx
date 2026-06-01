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

  const reports = useReports();
  const map = useGoogleMap(view);
  const chat = useChat({
    busReports: reports.busReports,
    busDownReports: reports.busDownReports,
    getCapacityInfo: reports.getCapacityInfo
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
            busReports={reports.busReports}
            busDownReports={reports.busDownReports}
            getCapacityInfo={reports.getCapacityInfo}
            checkStatus={reports.checkStatus}
            currentTheme={currentTheme}
          />
        )}

        {view === 'report' && (
          <ReportView
            busDownReports={reports.busDownReports}
            submitCapacityReport={reports.submitCapacityReport}
            submitBusDownReport={reports.submitBusDownReport}
            currentTheme={currentTheme}
          />
        )}

        {view === 'map' && (
          <MapView
            mapLoaded={map.mapLoaded}
            selectedBusRoute={map.selectedBusRoute}
            setSelectedBusRoute={map.setSelectedBusRoute}
          />
        )}

        {view === 'planner' && <PlannerView />}

        {view === 'ai' && (
          <AiView
            chatMessages={chat.chatMessages}
            chatInput={chat.chatInput}
            setChatInput={chat.setChatInput}
            isAiThinking={chat.isAiThinking}
            sendMessage={chat.sendMessage}
            currentTheme={currentTheme}
          />
        )}

        <RewardOverlay showReward={reports.showReward} />
      </div>
    </div>
  );
}
