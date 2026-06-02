// Brand mark, used in the desktop rail and the mobile top bar. The mark is a block "O" (Ohio State
// style) drawn as an SVG ring so it stays crisp at any size; white on the scarlet chip.
function BlockO({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5.5 12 a6.5 9.5 0 1 0 13 0 a6.5 9.5 0 1 0 -13 0 Z M9.3 12 a2.7 4.8 0 1 0 5.4 0 a2.7 4.8 0 1 0 -5.4 0 Z"
      />
    </svg>
  );
}

export default function Header({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-scarlet text-white">
        <BlockO size={20} />
      </span>
      <div className="leading-tight">
        <div className="font-extrabold tracking-tight text-ink">Buckeye Transit</div>
        {!compact && <div className="text-[11px] text-muted">Live campus bus + crowd reports</div>}
      </div>
    </div>
  );
}
