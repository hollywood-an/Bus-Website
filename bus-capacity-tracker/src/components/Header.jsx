// Brand mark, used in the desktop rail and the mobile top bar. The Ohio State logo PNG has a white
// background; `mix-blend-multiply` drops that white into the light rail/top-bar surface so it reads as
// a transparent logo without needing an alpha-cut asset.
export default function Header({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/osu-logo.png"
        alt="Ohio State logo"
        width="40"
        height="40"
        className="h-10 w-10 shrink-0 object-contain mix-blend-multiply"
      />
      <div className="leading-tight">
        <div className="font-extrabold tracking-tight text-ink">Buckeye Transit</div>
        {!compact && <div className="text-[11px] text-muted">Live campus bus + crowd reports</div>}
      </div>
    </div>
  );
}
