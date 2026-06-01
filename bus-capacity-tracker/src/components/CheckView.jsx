import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { OSU_BUS_ROUTES } from '../data/routes';

export default function CheckView({ busReports, busDownReports, getCapacityInfo, checkStatus, currentTheme }) {
  const [checkBusId, setCheckBusId] = useState('');
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
            {OSU_BUS_ROUTES.map((route) => (
              <option key={route} value={route}>{route}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Your Stop (optional)</label>
          <input
            type="text"
            value={checkStop}
            onChange={(e) => setCheckStop(e.target.value)}
            placeholder="e.g., Main St, Station 5"
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
          {Object.keys(busReports).length === 0 && Object.keys(busDownReports).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No reports yet. Be the first to report!</p>
          ) : (
            <>
              {Object.keys(busDownReports).map(route => {
                const validReports = busDownReports[route].filter(r => r.expiresAt > Date.now());
                if (validReports.length === 0) return null;
                return (
                  <div key={`down-${route}`} className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{route}</span>
                      <span className="text-red-700 font-medium flex items-center gap-2">
                        🚨 Bus Down
                        <span className="text-xs text-gray-600">({validReports.length} report{validReports.length !== 1 ? 's' : ''})</span>
                      </span>
                    </div>
                  </div>
                );
              })}
              {Object.keys(busReports).map(busId => {
                const info = getCapacityInfo(busId);
                if (!info) return null;
                return (
                  <div key={busId} className={`${info.level.color} bg-opacity-10 border-l-4 ${info.level.color} p-3 rounded`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{busId}</span>
                      <span className={`${info.level.textColor} font-medium flex items-center gap-2`}>
                        {info.level.icon} {info.level.label}
                        <span className="text-xs text-gray-600">({info.reportCount} reports)</span>
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
