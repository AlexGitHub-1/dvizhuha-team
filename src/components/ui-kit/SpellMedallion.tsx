import { cn } from "@/lib/utils";

/** Battle spell button: stone disc in a bronze frame, gold ring fills while recharging. */
export function SpellMedallion({ icon, name, cd, max, aiming, onClick }: { icon: string; name: string; cd: number; max: number; aiming: boolean; onClick: () => void }) {
  const ready = cd <= 0 && !aiming;
  const frac = cd > 0 ? 1 - Math.min(1, cd / max) : 1;
  const R = 52, L = 2 * Math.PI * R;
  return (
    <button data-tut="spell" onClick={onClick} title="Space" className={cn("group relative ml-3 h-[124px] w-[124px] shrink-0 transition", ready && "hover:scale-105")}>
      <svg viewBox="0 0 124 124" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="sm-stone" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="var(--muted)" /><stop offset="100%" stopColor="var(--background)" /></radialGradient>
          <linearGradient id="sm-bronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--gold)" /><stop offset="55%" stopColor="color-mix(in oklab, var(--gold) 45%, var(--background))" /><stop offset="100%" stopColor="var(--gold)" /></linearGradient>
        </defs>
        <circle cx="62" cy="62" r="60" fill="url(#sm-bronze)" />
        {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <circle key={i} cx={62 + Math.cos(a) * 57} cy={62 + Math.sin(a) * 57} r="1.8" fill="var(--background)" opacity="0.6" />; })}
        <circle cx="62" cy="62" r="47" fill="url(#sm-stone)" stroke="var(--background)" strokeWidth="2" />
        <circle cx="62" cy="62" r={R} fill="none" stroke="var(--background)" strokeWidth="5" opacity="0.7" />
        <circle cx="62" cy="62" r={R} fill="none" stroke={aiming ? "var(--blood)" : "var(--gold)"} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={L} strokeDashoffset={L * (1 - frac)} transform="rotate(-90 62 62)"
          className={cn(ready && "drop-shadow-[0_0_6px_var(--gold)]")} />
      </svg>
      {ready && <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"><div className="absolute inset-0 animate-rays">{[0, 120, 240].map((d) => <span key={d} className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]" style={{ transform: `rotate(${d}deg)`, transformOrigin: "50% 62px" }} />)}</div></div>}
      <div className={cn("absolute inset-0 flex flex-col items-center justify-center", cd > 0 && "opacity-60 grayscale")}>
        <span className={cn("text-4xl drop-shadow", ready && "animate-soft-pulse")}>{icon}</span>
        {cd > 0 && <span className="font-display text-lg leading-none text-gold tabular-nums">{Math.ceil(cd)}</span>}
        {aiming && <span className="font-display text-xs uppercase text-blood">Цель…</span>}
      </div>
      <span className="absolute bottom-0 left-1/2 max-w-[130px] -translate-x-1/2 truncate rounded-sm border border-gold/60 bg-card px-2 py-0.5 font-display text-[10px] uppercase text-gold shadow">{name}</span>
      <span className="absolute -right-1 top-1 rounded border border-border bg-card px-1 text-[9px] text-muted-foreground shadow">␣</span>
    </button>
  );
}
