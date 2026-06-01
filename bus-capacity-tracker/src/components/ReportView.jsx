import { useState } from 'react';
import { Bus, Users } from 'lucide-react';
import { OSU_BUS_ROUTES } from '../data/routes';
import { CAPACITY_LEVELS } from '../data/capacity';

export default function ReportView({ busDownReports, submitCapacityReport, submitBusDownReport, currentTheme }) {
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
        <p className="text-sm text-gray-600 mb-4">Let others know if a bus route is not running</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bus Route</label>
            <select
              value={downBusRoute}
              onChange={(e) => setDownBusRoute(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
            >
              <option value="">Select a bus route...</option>
              {OSU_BUS_ROUTES.map((route) => (
                <option key={route} value={route}>{route}</option>
              ))}
            </select>
          </div>
          <button
            onClick={onReportDown}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Report Bus Down 🚨 (Earn 2 Points!)
          </button>
        </div>

        {Object.keys(busDownReports).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-sm text-red-600 mb-2">⚠️ Currently Down:</h3>
            <div className="space-y-2">
              {Object.keys(busDownReports).map(route => {
                const validReports = busDownReports[route].filter(r => r.expiresAt > Date.now());
                if (validReports.length === 0) return null;
                return (
                  <div key={route} className="bg-red-50 border-l-4 border-red-500 p-2 rounded text-sm">
                    <span className="font-semibold">{route}</span>
                    <span className="text-gray-600 ml-2">({validReports.length} report{validReports.length !== 1 ? 's' : ''})</span>
                  </div>
                );
              })}
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
              {OSU_BUS_ROUTES.map((route) => (
                <option key={route} value={route}>{route}</option>
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
                    reportCapacity === idx
                      ? `${level.color} border-transparent text-white`
                      : 'bg-white border-gray-200 hover:border-gray-300'
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
            className={`w-full ${currentTheme.primary} ${currentTheme.textColor} py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity`}
          >
            Submit Report & Earn Point! 🎉
          </button>
        </div>
      </div>
    </div>
  );
}
