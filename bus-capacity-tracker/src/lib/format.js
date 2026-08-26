// ONE spelling for arrival estimates everywhere (the audit found five: Due/due/now/~N min/N min).
export function fmtEta(etaMin) {
  return etaMin === 0 ? 'due' : `~${etaMin} min`;
}

// Wall-clock arrival ("will I make my 2:10?" should never require mental math).
export function fmtArrive(minFromNow) {
  return new Date(Date.now() + minFromNow * 60_000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Relative timestamp for report freshness ("reported 4 min ago") — small product-texture detail.
export function timeAgo(ts) {
  if (!ts) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
