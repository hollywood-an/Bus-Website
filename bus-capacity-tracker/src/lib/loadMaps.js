// Load the Google Maps JS API once (with the geometry library for decoding polylines) and resolve a
// promise when it's ready. Shared by the Campus Map (useGoogleMap) and the inline TripMap so the API
// is available in either view without injecting the script twice.
let promise = null;

export function loadMaps() {
  if (promise) return promise;
  if (window.google?.maps) {
    promise = Promise.resolve(window.google.maps);
    return promise;
  }
  promise = new Promise((resolve, reject) => {
    const existing = document.getElementById('gmaps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return promise;
}
