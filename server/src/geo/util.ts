// Shared helpers for the geo layer.

export const OSU_CENTER = {
  lat: Number(process.env.OSU_LAT ?? 40.0017),
  lng: Number(process.env.OSU_LNG ?? -83.0197),
};
export const OSU_RADIUS_M = Number(process.env.OSU_RADIUS_M ?? 5000);
const TIMEOUT_MS = Number(process.env.GEO_TIMEOUT_MS ?? 7000);

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function withinCampus(lat: number, lng: number): boolean {
  return haversineMeters(OSU_CENTER.lat, OSU_CENTER.lng, lat, lng) <= OSU_RADIUS_M;
}

// Time-boxed fetch returning parsed JSON, or throwing.
export async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
