// Crowdsourced capacity scale (0–4). Extracted verbatim from the original App.jsx
// during the Phase 0 decomposition. Slated for a redesigned capacity meter in Phase 5.
export const CAPACITY_LEVELS = [
  { label: 'Empty', value: 0, color: 'bg-green-500', textColor: 'text-green-700', icon: '😊' },
  { label: 'Few Seats', value: 1, color: 'bg-blue-500', textColor: 'text-blue-700', icon: '🙂' },
  { label: 'Filling Up', value: 2, color: 'bg-yellow-500', textColor: 'text-yellow-700', icon: '😐' },
  { label: 'Crowded', value: 3, color: 'bg-orange-500', textColor: 'text-orange-700', icon: '😬' },
  { label: 'Very Full', value: 4, color: 'bg-red-500', textColor: 'text-red-700', icon: '😰' }
];
