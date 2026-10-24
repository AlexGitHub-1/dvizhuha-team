import { cn } from "@/lib/utils";
import { MONSTERS, type MonsterId } from "@/game/data/monsters";
import { useProgress } from "@/game/meta/store";
import { Currency, MonsterPortrait, RarityBadge, RARITY_BORDER } from "./index";

export function MonsterCard({ id, selected, inSquad, onClick, compact }: { id: MonsterId; selected?: boolean; inSquad?: boolean; onClick?: () => void; compact?: boolean }) {
  const p = useProgress(); const def = MONSTERS[id]; const o = p.owned[id];
  return (
    <button onClick={onClick} className={cn("group relative flex flex-col items-center rounded-lg border-2 bg-card p-2 text-center transition hover:-translate-y-0.5", o ? RARITY_BORDER[def.rarity] : "border-border opacity-70", selected && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
      {inSquad && <span className="absolute right-1 top-1 z-10 rounded bg-primary px-1 text-[10px] font-bold text-primary-foreground">В ОТРЯДЕ</span>}
      <MonsterPortrait id={id} size={compact ? 64 : 88} silhouette={!o} lvl={o?.lvl ?? 1} animate={selected ?? false} />
      <div className="mt-1 line-clamp-1 text-xs font-semibold">{o ? def.name : "???"}</div>
      <div className="mt-0.5 flex items-center gap-1">
        <RarityBadge rarity={def.rarity} />
        {o && <span className="text-[10px] font-bold text-gold">Ур.{o.lvl}</span>}
      </div>
      {o && !compact && <div className="mt-1 text-[10px] text-muted-foreground"><Currency kind="essence" value={def.cost} className="text-[10px]" /></div>}
    </button>
  );
}

export function Wallet() {
  const p = useProgress();
  return <div className="flex items-center gap-3 text-sm"><Currency kind="gold" value={p.gold} live /><Currency kind="skulls" value={p.skulls} live /></div>;
}
