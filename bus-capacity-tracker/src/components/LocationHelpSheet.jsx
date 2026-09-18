import { useEffect, useRef } from 'react';
import { MapPin, RotateCw } from 'lucide-react';

// Shown when location is blocked at the iOS level (Location Services → Safari Websites off). A website
// genuinely cannot open iOS Settings or trigger the native prompt — that's native-app-only — so this
// walks the user there with the exact path. The only button that can actually do something is Reload.
// Bottom sheet on phones, centered card on desktop; dismissible (Escape / backdrop / "Not now").
const STEPS = [
  <>Open the <strong>Settings</strong> app</>,
  <>Tap <strong>Privacy &amp; Security</strong> › <strong>Location Services</strong></>,
  <>Scroll down and tap <strong>Safari Websites</strong></>,
  <>Choose <strong>“While Using the App”</strong> or <strong>“Ask”</strong></>,
  <>Come back here and tap <strong>Reload</strong> below</>,
];

export default function LocationHelpSheet({ open, onClose }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cardRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="loc-help-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop w-full max-w-md rounded-t-2xl border border-line bg-surface p-6 shadow-[var(--shadow-float)] outline-none sm:rounded-2xl"
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-scarlet-wash text-scarlet-ink">
          <MapPin size={24} />
        </div>
        <h2 id="loc-help-title" className="mt-3 text-xl">
          Turn on location for Safari
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Safari can’t ask for your location until it’s switched on in your iPhone’s Settings.
        </p>

        <ol className="mt-4 space-y-2.5">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-scarlet-wash font-mono text-[12px] font-bold text-scarlet-ink">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-ink">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-scarlet px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-scarlet-ink"
          >
            <RotateCw size={16} /> Reload the page
          </button>
          <button
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold text-ink-soft transition-colors hover:bg-surface-2"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
