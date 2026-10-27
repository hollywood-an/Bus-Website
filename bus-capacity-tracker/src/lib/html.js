// Escape text for interpolation into an HTML string. Google Maps InfoWindow.setContent takes raw HTML,
// and the strings we put there (stop names, destinations, route names) come from the unofficial OSU
// feed — untrusted input. The server's parse layer only normalizes whitespace/casing, so encoding at
// this sink is what keeps feed text from ever becoming markup.
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}
