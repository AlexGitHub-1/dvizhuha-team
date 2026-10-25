import { cn } from "@/lib/utils";
import { MONSTERS, type MonsterId } from "@/game/data/monsters";
import { SYNERGIES } from "@/game/data/synergies";
import { synergyCount } from "@/game/meta/progress";
import { useProgress } from "@/game/meta/store";
import { MonsterPortrait } from "./index";

/** Squad synergies as banner cards: emblem, effect, member portraits and progress pips. */
export function SynergyList({ squad, className }: { squad: MonsterId[]; className?: string }) {
  const p = useProgress();
  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {SYNERGIES.map((s) => {
        const n = synergyCount(squad, s.id); const on = n >= s.need;
        return (
          <div key={s.id} className={cn("panel-texture relative overflow-hidden rounded-xl border-2 p-3 transition",
            on ? "border-poison bg-poison/10 shadow-[0_0_22px_color-mix(in_oklab,var(--poison)_45%,transparent)]" : "border-border bg-secondary/60")}>
            {on && <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-poison/25 blur-2xl animate-soft-pulse" />}
            <div className="relative flex items-center gap-3">
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-2xl", on ? "border-poison bg-poison/20" : "border-border bg-muted grayscale")}>{s.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-display text-sm uppercase">{s.name}</span>
                  <span className={cn("rounded-full px-2 text-[10px] font-bold", on ? "bg-poison text-background" : "bg-muted text-muted-foreground")}>{on ? "АКТИВНА" : `${Math.min(n, s.need)}/${s.need}`}</span>
                </div>
                <div className="mt-1 flex gap-1">{Array.from({ length: s.need }).map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < n ? "bg-poison" : "bg-border")} />)}</div>
              </div>
            </div>
            <p className={cn("relative mt-2 text-xs", on ? "text-foreground" : "text-muted-foreground")}>{s.desc}</p>
            <div className="relative mt-2 flex flex-wrap gap-1">
              {s.members.map((m) => {
                const inSq = squad.includes(m), owned = !!p.owned[m];
                return (
                  <div key={m} title={`${MONSTERS[m].name}${inSq ? " — в отряде" : owned ? " — есть в коллекции" : " — не открыт"}`}
                    className={cn("rounded-lg border p-0.5", inSq ? "border-poison bg-poison/15" : "border-border bg-background/40 opacity-50")}>
                    <MonsterPortrait id={m} size={30} silhouette={!owned} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
