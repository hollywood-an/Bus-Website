import { MessageCircle } from 'lucide-react';

// The five-view tab bar. Class strings are identical to the original inline buttons.
export default function Nav({ view, setView, currentTheme }) {
  const tabClass = (active) =>
    `flex-1 py-3 rounded-lg font-semibold transition-all ${
      active
        ? `${currentTheme.primary} ${currentTheme.textColor} shadow-lg`
        : 'bg-white text-gray-700 hover:bg-gray-50'
    }`;

  return (
    <div className="flex gap-2 mb-6">
      <button onClick={() => setView('check')} className={tabClass(view === 'check')}>
        Check Bus Status
      </button>
      <button onClick={() => setView('report')} className={tabClass(view === 'report')}>
        Report
      </button>
      <button onClick={() => setView('map')} className={tabClass(view === 'map')}>
        🗺️ Campus Map
      </button>
      <button onClick={() => setView('planner')} className={tabClass(view === 'planner')}>
        Route Planner
      </button>
      <button onClick={() => setView('ai')} className={tabClass(view === 'ai')}>
        <MessageCircle className="inline mr-2" size={20} />
        Best Route AI
      </button>
    </div>
  );
}
