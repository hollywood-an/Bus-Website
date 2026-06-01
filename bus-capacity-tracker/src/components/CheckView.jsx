import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { CAPACITY_LEVELS } from '../data/capacity';
import { timeAgo } from '../lib/format';

// Reads shared, server-owned aggregates (Phase 1.6). Shows confidence + freshness so a single
// unconfirmed report reads differently from a corroborated one.
export default function CheckView({ routes, capacity, down, checkStatus, nameForCode, currentTheme }) {
  const [checkBusId, setCheckBusId] = useState(''); // route code
  const [checkStop, setCheckStop] = useState('');

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp size={24} />
        Check Bus Capacity
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Bus Route</label>
          <select
            value={checkBusId}
            onChange={(e) => setCheckBusId(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select a bus route...</option>
            {routes.map((route) => (
              <option key={route.code} value={route.code}>{route.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Your Stop (optional)</label>
          <input
            type="text"
            value={checkStop}
            onChange={(e) => setCheckStop(e.target.value)}
            placeholder="e.g., Ohio Union, Stop 5"
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => checkStatus(checkBusId)}
          className={`w-full ${currentTheme.primary} ${currentTheme.textColor} py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity`}
        >
          Check Status
        </button>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold mb-3">Recent Reports</h3>
        <div className="space-y-2">
          {capacity.length === 0 && down.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent reports. Be the first to report!</p>
          ) : (
            <>
              {down.map((d) => (
                <div
                  key={`down-${d.route}`}
                  className={`border-l-4 p-3 rounded ${d.confirmed ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-400'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{nameForCode(d.route)}</span>
                    <span className="font-medium flex items-center gap-2 text-sm text-gray-700">
                      {d.confirmed ? 'Reported Down' : 'Down? (unconfirmed)'}
                      <span className="text-xs text-gray-500">
                        {d.reporterCount} reporter{d.reporterCount !== 1 ? 's' : ''} · {timeAgo(d.newestAt)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
              {capacity.map((c) => {
                const level = CAPACITY_LEVELS[c.level];
                return (
                  <div key={c.route} className={`${level.color} bg-opacity-10 border-l-4 ${level.color} p-3 rounded`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{nameForCode(c.route)}</span>
                      <span className={`${level.textColor} font-medium flex items-center gap-2 text-sm`}>
                        {level.icon} {level.label}
                        {!c.confident && <span className="text-xs text-gray-500">(unconfirmed)</span>}
                        <span className="text-xs text-gray-500">
                          {c.reporterCount} reporter{c.reporterCount !== 1 ? 's' : ''} · {timeAgo(c.newestAt)}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
