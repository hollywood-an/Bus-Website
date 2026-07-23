import { curatedSuggestions } from './geocode';
import { OSU_CENTER, OSU_RADIUS_M, fetchJson } from './util';

// Typeahead for the trip planner: instant curated campus spots first, then Google Places
// Autocomplete (New) biased to campus. Suggestions are display strings only — selecting one just
// fills the input, and the existing geocoder resolves the final text — so no place-details calls.
// Cached per query to keep Google usage/cost minimal.
const KEY = process.env.GOOGLE_MAPS_SERVER_KEY ?? '';
const MAX_SUGGESTIONS = 6;

export interface Suggestion {
  text: string; // what selecting puts in the input (fully resolvable string)
  main: string; // bold display line
  secondary?: string; // muted display line, e.g. "Columbus, OH"
  source: 'campus' | 'google';
}

const cache = new Map<string, Suggestion[]>();

export async function suggestPlaces(query: unknown): Promise<Suggestion[]> {
  const q = typeof query === 'string' ? query.trim().slice(0, 120) : '';
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;

  const campus: Suggestion[] = curatedSuggestions(q).map((name) => ({
    text: name,
    main: name,
    secondary: 'OSU campus',
    source: 'campus',
  }));

  let google: Suggestion[] = [];
  let googleOk = true;
  if (KEY) {
    try {
      const data = (await fetchJson('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
        body: JSON.stringify({
          input: q,
          // Hard restriction, not a bias: the planner rejects anything outside this circle, so
          // offering it in the dropdown would be a guaranteed dead end (audit defect D3).
          locationRestriction: {
            circle: { center: { latitude: OSU_CENTER.lat, longitude: OSU_CENTER.lng }, radius: OSU_RADIUS_M },
          },
        }),
      })) as {
        suggestions?: Array<{
          placePrediction?: {
            text?: { text?: string };
            structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
          };
        }>;
      };
      google = (data?.suggestions ?? [])
        .map((s) => s.placePrediction)
        .map((p) => ({
          text: p?.text?.text ?? p?.structuredFormat?.mainText?.text ?? '',
          main: p?.structuredFormat?.mainText?.text ?? p?.text?.text ?? '',
          secondary: p?.structuredFormat?.secondaryText?.text || undefined,
          source: 'google' as const,
        }))
        .filter((s) => s.text && s.main);
    } catch {
      googleOk = false; // campus-only this time; don't cache the degraded list
    }
  }

  // Campus spots first; dedupe on the display line so "Ohio Union" doesn't appear twice.
  const seen = new Set<string>();
  const merged = [...campus, ...google]
    .filter((s) => {
      const k = s.main.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, MAX_SUGGESTIONS);

  if (googleOk) cache.set(key, merged);
  return merged;
}
