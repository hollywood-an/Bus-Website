import { OSU_CENTER, OSU_RADIUS_M, withinCampus, fetchJson } from './util';

// Resolve any OSU building or nearby address to coordinates, biased to campus. Primary: Google
// Places (New) Text Search (great for building names like "Jones Tower"); fallback: Geocoding API
// (great for street addresses). Results are cached (stable) to keep Google usage/cost minimal, and
// rejected if they land outside the campus radius. Degrades to a tiny curated map if no key is set.
const KEY = process.env.GOOGLE_MAPS_SERVER_KEY ?? '';

export interface Place {
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

const cache = new Map<string, Place | null>();

export async function geocode(query: string): Promise<Place | null> {
  const q = (query ?? '').trim();
  if (!q) return null;
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  let result: Place | null = null;
  if (KEY) {
    result = (await placesTextSearch(q)) ?? (await geocodeAddress(q));
    if (result && !withinCampus(result.lat, result.lng)) result = null; // outside the campus area
  }
  if (!result) result = curatedFallback(q);

  cache.set(key, result);
  return result;
}

async function placesTextSearch(q: string): Promise<Place | null> {
  try {
    const data = (await fetchJson('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask': 'places.location,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery: q,
        locationBias: { circle: { center: { latitude: OSU_CENTER.lat, longitude: OSU_CENTER.lng }, radius: OSU_RADIUS_M } },
      }),
    })) as {
      places?: Array<{ location?: { latitude: number; longitude: number }; displayName?: { text?: string }; formattedAddress?: string }>;
    };
    const p = data?.places?.[0];
    if (!p?.location) return null;
    return { name: p.displayName?.text ?? q, lat: p.location.latitude, lng: p.location.longitude, address: p.formattedAddress };
  } catch {
    return null;
  }
}

async function geocodeAddress(q: string): Promise<Place | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      `${q} near Ohio State University, Columbus, OH`,
    )}&key=${KEY}`;
    const data = (await fetchJson(url)) as {
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } }; formatted_address?: string }>;
    };
    const r = data?.results?.[0];
    if (!r?.geometry?.location) return null;
    return { name: q, lat: r.geometry.location.lat, lng: r.geometry.location.lng, address: r.formatted_address };
  } catch {
    return null;
  }
}

// Minimal offline fallback so the app still resolves core campus spots without a key. Approximate
// coords; the real geocoder supersedes these whenever GOOGLE_MAPS_SERVER_KEY is set.
const CURATED: Array<{ match: string[]; place: Place }> = [
  { match: ['ohio union', 'the union', 'union'], place: { name: 'Ohio Union', lat: 39.99785, lng: -83.00853 } },
  { match: ['rpac'], place: { name: 'RPAC', lat: 40.00259, lng: -83.01657 } },
  { match: ['thompson', 'library'], place: { name: 'Thompson Library', lat: 39.99948, lng: -83.01459 } },
  { match: ['stadium', 'shoe', 'horseshoe'], place: { name: 'Ohio Stadium', lat: 40.00167, lng: -83.01972 } },
  { match: ['morrill', 'lincoln', 'towers'], place: { name: 'Lincoln & Morrill Towers', lat: 39.99861, lng: -83.02049 } },
  { match: ['hitchcock'], place: { name: 'Hitchcock Hall', lat: 40.00104, lng: -83.02055 } },
  { match: ['scott'], place: { name: 'Traditions at Scott', lat: 40.00461, lng: -83.01636 } },
];

function curatedFallback(q: string): Place | null {
  const lower = q.toLowerCase();
  for (const { match, place } of CURATED) {
    if (match.some((m) => lower.includes(m))) return place;
  }
  return null;
}
