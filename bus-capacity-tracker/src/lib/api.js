// Base origin for all /api calls.
//
// - Dev: VITE_API_BASE is unset → '' → calls stay same-origin ('/api/...') and Vite's dev proxy
//   forwards them to the local Hono server (see vite.config.js).
// - Prod: the frontend (Vercel) and backend (Railway) are different origins, so VITE_API_BASE is
//   set to the backend origin, e.g. https://bus-agent.up.railway.app. The browser then talks
//   straight to the backend — keeping Vercel out of the assistant's SSE streaming path (no proxy
//   buffering). The backend's CORS allow-list (ALLOWED_ORIGIN) must name the Vercel origin.
const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

// Build a full API URL. Pass the same '/api/...' path used in dev; the base is prepended in prod.
export const apiUrl = (path) => `${BASE}${path}`;
