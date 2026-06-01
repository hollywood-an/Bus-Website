import { TrendingUp } from 'lucide-react';
import { OSU_LOCATIONS } from '../data/locations';
import { ROUTE_TIMES } from '../data/routeTimes';

// from/to are controlled by App so the agent's open_planner directive can pre-fill them.
export default function PlannerView({ fromLocation, toLocation, setFromLocation, setToLocation }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp size={24} />
        Route Planner
      </h2>
      <p className="text-gray-600 mb-6">Compare walking vs. bus times between campus locations</p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">From</label>
          <select
            value={fromLocation}
            onChange={(e) => setFromLocation(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select starting location...</option>
            {OSU_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">To</label>
          <select
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select destination...</option>
            {OSU_LOCATIONS.filter(loc => loc !== fromLocation).map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      {fromLocation && toLocation && ROUTE_TIMES[fromLocation]?.[toLocation] && (
        <div className="space-y-4">
          {(() => {
            const route = ROUTE_TIMES[fromLocation][toLocation];
            const walkTime = route.walk;
            const busTime = route.bus;
            const scooterTime = Math.round(walkTime / 5);
            const timeSaved = busTime ? walkTime - busTime : 0;

            // Calculate Spin and Veo prices
            const spinPrice = Math.max(3.50, scooterTime * 0.39);
            const veoPrice = 1.00 + (scooterTime * 0.39);

            return (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className={`p-6 rounded-lg border-2 ${!busTime || (busTime >= walkTime && scooterTime >= walkTime) ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                    <div className="text-center">
                      <div className="text-4xl mb-2">🚶</div>
                      <div className="text-2xl font-bold text-gray-900">{walkTime} min</div>
                      <div className="text-sm text-gray-600 mt-1">Walking</div>
                      <div className="text-sm text-gray-500 mt-1">Free</div>
                      {(!busTime || (busTime >= walkTime && scooterTime >= walkTime)) && (
                        <div className="mt-2 text-xs font-semibold text-green-700">Best Option</div>
                      )}
                    </div>
                  </div>

                  <div className={`p-6 rounded-lg border-2 ${busTime ? (timeSaved > 0 && scooterTime >= busTime ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50') : 'border-gray-300 bg-gray-50'}`}>
                    <div className="text-center">
                      <div className="text-4xl mb-2">🚌</div>
                      {busTime ? (
                        <>
                          <div className="text-2xl font-bold text-gray-900">{busTime} min</div>
                          <div className="text-sm text-gray-600 mt-1">Bus</div>
                          {timeSaved > 0 && scooterTime >= busTime && (
                            <div className="mt-2">
                              <div className="text-xs font-semibold text-green-700">Best Option</div>
                              <div className="text-xs text-green-600">Save {timeSaved} min</div>
                            </div>
                          )}
                          {timeSaved < 0 && (
                            <div className="mt-2 text-xs text-orange-600">
                              {Math.abs(timeSaved)} min slower
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-lg font-medium text-gray-500">N/A</div>
                          <div className="text-xs text-gray-500 mt-1">No bus available</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`p-6 rounded-lg border-2 ${scooterTime < walkTime && (!busTime || scooterTime < busTime) ? 'border-green-500 bg-green-50' : 'border-purple-500 bg-purple-50'}`}>
                    <div className="text-center">
                      <div className="text-4xl mb-2">🛴</div>
                      <div className="text-2xl font-bold text-gray-900">{scooterTime} min</div>
                      <div className="text-sm text-gray-600 mt-1">Spin/Veo</div>
                      {scooterTime < walkTime && (!busTime || scooterTime < busTime) && (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-green-700">Fastest Option</div>
                          <div className="text-xs text-green-600">Save {walkTime - scooterTime} min</div>
                        </div>
                      )}
                      <div className="mt-3 space-y-2 text-xs bg-white bg-opacity-70 p-2 rounded">
                        <div className="border-b pb-2">
                          <div className="font-semibold text-orange-600">Spin</div>
                          <div className="text-gray-700">${spinPrice.toFixed(2)}</div>
                          <div className="text-gray-500 text-xs">($3.50 min + $0.39/min)</div>
                        </div>
                        <div>
                          <div className="font-semibold text-blue-600">Veo</div>
                          <div className="text-gray-700">${veoPrice.toFixed(2)}</div>
                          <div className="text-gray-500 text-xs">($1.00 unlock + $0.39/min)</div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 justify-center">
                        <a
                          href="https://www.spin.app/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-orange-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-orange-600 transition-colors"
                        >
                          Open Spin
                        </a>
                        <a
                          href="https://www.veoride.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-blue-600 transition-colors"
                        >
                          Open Veo
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {busTime && route.routes.length > 0 && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h3 className="font-semibold text-blue-900 mb-2">Available Bus Routes:</h3>
                    <div className="flex flex-wrap gap-2">
                      {route.routes.map((busRoute, idx) => (
                        <span key={idx} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                          {busRoute}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!busTime && (
                  <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
                    <p className="text-gray-700">
                      <strong>No bus available:</strong> Consider walking or using a Spin/Veo scooter for this trip!
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {fromLocation && toLocation && !ROUTE_TIMES[fromLocation]?.[toLocation] && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <p className="text-yellow-800">No route information available for this combination.</p>
        </div>
      )}
    </div>
  );
}
