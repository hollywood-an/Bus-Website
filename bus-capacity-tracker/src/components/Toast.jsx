// Transient feedback (replaces the old pulsing notification banner). Floats at the top, slides in,
// auto-dismissed by the hook that owns the message.
export default function Toast({ notification }) {
  if (!notification) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="animate-toast pointer-events-auto max-w-[90vw] rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-float"
      >
        {notification}
      </div>
    </div>
  );
}
