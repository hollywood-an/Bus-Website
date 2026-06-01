import { useState } from 'react';
import { Bus, Users } from 'lucide-react';
import { CAPACITY_LEVELS } from '../data/capacity';
import { timeAgo } from '../lib/format';

// Submits to the shared server store (Phase 1.6); route values are codes.
export default function ReportView({ routes, down, submitCapacityReport, submitBusDownReport, nameForCode, currentTheme }) {
  const [downBusRoute, setDownBusRoute] = useState('');
  const [reportBusId, setReportBusId] = useState('');
  const [reportCapacity, setReportCapacity] = useState(2);

  const onReportDown = () => {
    submitBusDownReport(downBusRoute);
    setDownBusRoute('');
  };

  const onReportCapacity = () => {
    submitCapacityReport(reportBusId, reportCapacity);
    setReportBusId('');
    setReportCapacity(2);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
          <Bus size={24} />
          Report Bus Down
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Let others know if a route isn&apos;t running. It takes two riders to confirm a route is down.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bus Route</label>
            <select
              value={downBusRoute}
              onChange={(e) => setDownBusRoute(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
            >
              <option value="">Select a bus route...</option>
              {routes.map((route) => (
                <option key={route.code} value={route.code}>{route.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={onReportDown}
            disabled={!downBusRoute}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Report Bus Down (+2 points)
          </button>
        </div>

        {down.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-sm text-red-600 mb-2">Currently reported down:</h3>
            <div className="space-y-2">
              {down.map((d) => (
                <div
                  key={d.route}
                  className={`border-l-4 p-2 rounded text-sm ${d.confirmed ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-400'}`}
                >
                  <span className="font-semibold">{nameForCode(d.route)}</span>
                  <span className="text-gray-600 ml-2">
                    {d.confirmed ? 'confirmed' : 'unconfirmed'} · {d.reporterCount} reporter{d.reporterCount !== 1 ? 's' : ''} · {timeAgo(d.newestAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Users size={24} />
          Report Current Capacity
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bus Route</label>
            <select
              value={reportBusId}
              onChange={(e) => setReportBusId(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a bus route...</option>
              {routes.map((route) => (
                <option key={route.code} value={route.code}>{route.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">How full is the bus?</label>
            <div className="space-y-2">
              {CAPACITY_LEVELS.map((level, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReportCapacity(idx)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    reportCapacity === idx ? `${level.color} border-transparent text-white` : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{level.label}</span>
                    <span className="text-2xl">{level.icon}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onReportCapacity}
            disabled={!reportBusId}
            className={`w-full ${currentTheme.primary} ${currentTheme.textColor} py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            Submit Report (+1 point)
          </button>
        </div>
      </div>
    </div>
  );
}
