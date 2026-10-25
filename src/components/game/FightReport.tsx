import { cn } from "@/lib/utils";
import { MonsterPortrait, RARITY_BORDER, useCountUp } from "@/components/ui-kit";
import { MONSTERS, type MonsterId } from "@/game/data/monsters";
import { SPELLS } from "@/game/data/shop";
import type { Battle } from "@/game/engine/battle";

const fmt = (v: number) => (v >= 10000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)));
const PLACE = ["bg-gold text-background", "bg-muted-foreground text-background", "bg-primary/80 text-background"];

type Tone = "gold" | "blood" | "poison";
const TONE: Record<Tone, { border: string; glow: string; text: string; bg: string }> = {
  gold: { border: "border-gold", glow: "var(--gold)", text: "text-gold", bg: "bg-gold" },
  blood: { border: "border-blood", glow: "var(--blood)", text: "text-blood", bg: "bg-blood" },
  poison: { border: "border-poison", glow: "var(--poison)", text: "text-poison", bg: "bg-poison" },
};

function Plaque({ tone, badge, title, who, icon, value, label, delay, main }: { tone: Tone; badge: string; title: string; who: MonsterId | null; icon?: string; value: number; label: string; delay: number; main?: boolean }) {
  const t = TONE[tone]; const v = useCountUp(Math.round(value), true);
  return (
    <div className={cn("relative flex flex-col items-center overflow-hidden rounded-xl border-2 bg-card px-1 pb-2 pt-4 animate-pop-in", t.border, main ? "z-10 -my-1.5 scale-105" : "opacity-95")}
      style={{ animationDelay: `${delay}ms`, boxShadow: `inset 0 0 26px color-mix(in oklab, ${t.glow} 30%, transparent), 0 0 ${main ? 26 : 12}px color-mix(in oklab, ${t.glow} ${main ? 45 : 22}%, transparent)` }}>
      <div className="pointer-events-none absolute left-1/2 top-9 h-28 w-28 -translate-x-1/2 -translate-y-1/2 animate-rays opacity-40" style={{ background: `repeating-conic-gradient(color-mix(in oklab, ${t.glow} 55%, transparent) 0 10deg, transparent 10deg 30deg)`, maskImage: "radial-gradient(circle, black 20%, transparent 70%)" }} />
      {main && <div className="pointer-events-none absolute inset-0 animate-shine bg-gradient-to-r from-transparent via-foreground/15 to-transparent" style={{ animationDelay: `${delay + 400}ms` }} />}
      <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 rounded-b-lg px-2.5 pb-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-background", t.bg)}>{title}</div>
      <div className="relative mt-1">
        <div className={cn("flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 bg-secondary", who ? RARITY_BORDER[MONSTERS[who].rarity] : t.border)}>
          {who ? <MonsterPortrait id={who} size={52} animate /> : <span className="text-3xl">{icon ?? "—"}</span>}
        </div>
        <span className={cn("absolute -bottom-1 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-xs shadow", t.bg)}>{badge}</span>
      </div>
      <div className={cn("mt-1.5 font-display leading-none tabular-nums drop-shadow", main ? "text-2xl" : "text-xl", t.text)}>{fmt(v)}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1 max-w-full truncate rounded-full border border-border bg-background/60 px-2 text-[10px]">{who ? MONSTERS[who].name : icon ? title === "Магия" ? label : "—" : "никто"}</div>
    </div>
  );
}

/** Post-battle report: trophy plaques (MVP / tank / spell) and a ranked squad damage list. */
export function FightReport({ b }: { b: Battle }) {
  const rows = b.squad.map((s) => ({ kind: s.kind, lvl: s.lvl, ...(b.fight[s.kind] ?? { dealt: 0, taken: 0, summoned: 0 }) })).sort((a, c) => c.dealt - a.dealt);
  const mvp = rows[0] && rows[0].dealt > 0 ? rows[0] : null;
  const tank = [...rows].sort((a, c) => c.taken - a.taken)[0];
  const tk = tank && tank.taken > 0 ? tank : null;
  const top = Math.max(1, ...rows.map((r) => r.dealt));
  const sp = SPELLS[b.spell];
  return (
    <div className="mt-4 text-left">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/70" />
        <div className="relative rounded-md border border-gold/70 bg-gold/15 px-4 py-0.5 font-display text-xs uppercase tracking-[0.3em] text-gold shadow-[0_0_14px_color-mix(in_oklab,var(--gold)_30%,transparent)]">⚔ Итоги боя ⚔</div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/70" />
      </div>
      <div className="mt-3 grid grid-cols-3 items-center gap-2 px-1">
        <Plaque tone="blood" badge="🛡" title="Танк" who={tk?.kind ?? null} value={tk?.taken ?? 0} label="урона принял" delay={150} />
        <Plaque tone="gold" badge="👑" title="MVP" who={mvp?.kind ?? null} value={mvp?.dealt ?? 0} label="урона нанёс" delay={550} main />
        <Plaque tone="poison" badge="✦" title="Магия" who={null} icon={sp.icon} value={b.spellDmg} label={sp.name} delay={350} />
      </div>
      <div className="mt-3 flex flex-col gap-1.5 rounded-xl border border-border bg-background/50 p-2">
        {rows.map((r, i) => {
          const out = r.summoned > 0;
          return (
            <div key={r.kind} className={cn("flex items-center gap-2", !out && "opacity-45 grayscale")}>
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-display text-[11px]", out && i < 3 ? PLACE[i] : "bg-muted text-muted-foreground")}>{i + 1}</span>
              <div className={cn("shrink-0 overflow-hidden rounded-full border-2 bg-secondary", RARITY_BORDER[MONSTERS[r.kind].rarity])}><MonsterPortrait id={r.kind} size={30} lvl={r.lvl} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="truncate font-semibold">{MONSTERS[r.kind].name}</span>
                  <span className="shrink-0 text-muted-foreground">{out ? `×${r.summoned} призывов` : "не призван"}</span>
                </div>
                <div className="relative mt-0.5 h-3.5 overflow-hidden rounded-full border border-border bg-muted">
                  <div className="relative h-full animate-bar-grow overflow-hidden rounded-full bg-gradient-to-r from-blood via-primary to-gold" style={{ width: `${Math.max(out ? 3 : 0, (r.dealt / top) * 100)}%`, animationDelay: `${700 + i * 120}ms` }}>
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-foreground/20" />
                  </div>
                  <span className="absolute inset-0 flex items-center justify-end pr-2 font-display text-[10px] tabular-nums text-foreground drop-shadow-[0_1px_1px_var(--background)]">{fmt(r.dealt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
