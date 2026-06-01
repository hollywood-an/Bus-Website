// Route list, colors, and names now come from the server feed (passed in via useGoogleMap),
// not hardcoded constants. Shows a quiet degraded-state indicator and whether buses are live or
// simulated.
export default function MapView({ mapLoaded, routes, selectedBusRoute, setSelectedBusRoute, feedLive, vehicleSource }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold">Interactive Campus Map</h2>
        <div className="flex items-center gap-2 text-xs font-medium">
          {feedLive ? (
            <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Live feed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Live data unavailable — last known
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded">
            buses: {vehicleSource === 'live' ? 'live' : 'simulated'}
          </span>
        </div>
      </div>

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
          {routes.map((route) => (
            <button
              key={route.code}
              onClick={() => setSelectedBusRoute(route.code)}
              className="px-4 py-2 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: selectedBusRoute === route.code ? route.color : '#e5e7eb',
                color: selectedBusRoute === route.code ? 'white' : '#374151',
              }}
              title={route.name}
            >
              {route.code}
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

      <p className="mt-3 text-sm text-gray-500">
        Real stops and route paths from OSU&apos;s live feed. Click a stop for details; arrows are buses
        ({vehicleSource === 'live' ? 'live positions' : 'simulated while service is paused'}).
      </p>

      {routes.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          {routes.map((route) => (
            <div key={route.code} className="flex items-center gap-2 text-sm">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: route.color }}
              ></div>
              <span className="font-semibold">{route.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
