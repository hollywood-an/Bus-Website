import { BUS_STOPS } from '../data/busStops';
import { ROUTE_COLORS, ROUTE_NAMES } from '../data/routes';

export default function MapView({ mapLoaded, selectedBusRoute, setSelectedBusRoute }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">Interactive Campus Map</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Filter by Route</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBusRoute('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedBusRoute === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            All Routes
          </button>
          {Object.keys(BUS_STOPS).map(route => (
            <button
              key={route}
              onClick={() => setSelectedBusRoute(route)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all`}
              style={{
                backgroundColor: selectedBusRoute === route ? ROUTE_COLORS[route] : '#e5e7eb',
                color: selectedBusRoute === route ? 'white' : '#374151'
              }}
            >
              {route}
            </button>
          ))}
        </div>
      </div>

      <div
        id="google-map"
        className="rounded-lg overflow-hidden border-2 border-gray-300 relative"
        style={{ height: '600px', width: '100%' }}
      >
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="font-bold mb-2">Map Features:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>🔵 Click any bus stop marker for details</li>
          <li>🎨 Color-coded markers by route</li>
          <li>📍 Route lines show bus paths (when route is selected)</li>
          <li>🗺️ Click "Open in Google Maps" to get directions</li>
          <li>🔍 Use map controls to zoom and pan</li>
        </ul>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.entries(ROUTE_COLORS).filter(([key]) => key !== 'all').map(([route, color]) => (
          <div key={route} className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: color }}
            ></div>
            <span className="font-semibold">{ROUTE_NAMES[route] || route}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
