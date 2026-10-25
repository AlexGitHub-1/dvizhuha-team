import { cn } from "@/lib/utils";
import { MONSTERS, type MonsterId } from "@/game/data/monsters";
import { useProgress } from "@/game/meta/store";
import { SYNERGIES } from "@/game/data/synergies";
import { canUpgrade } from "@/game/meta/progress";
import { Currency, MonsterPortrait, RarityBadge, RARITY_BORDER } from "./index";

/** synergy icons that `id` shares with `other` */
export function sharedSynergies(id: MonsterId, other?: MonsterId) {
  if (!other || other === id) return [];
  return SYNERGIES.filter((s) => s.members.includes(id) && s.members.includes(other));
}

export function MonsterCard({ id, selected, inSquad, onClick, compact, partnerOf }: { id: MonsterId; selected?: boolean; inSquad?: boolean; onClick?: () => void; compact?: boolean; partnerOf?: MonsterId | undefined }) {
  const p = useProgress(); const def = MONSTERS[id]; const o = p.owned[id];
  const syn = sharedSynergies(id, partnerOf); const up = !!o && canUpgrade(p, id);
  return (
    <button onClick={onClick} className={cn("group relative flex w-full min-w-0 flex-col items-center overflow-hidden rounded-lg border-2 bg-card p-2 text-center transition hover:-translate-y-0.5", o ? RARITY_BORDER[def.rarity] : "border-border opacity-70", selected && "border-primary shadow-[var(--shadow-glow)]", inSquad && "bg-primary/10", syn.length > 0 && !selected && "border-poison animate-syn-glow")}>
      {syn.length > 0 && <span title={syn.map((s) => s.name).join(", ")} className="absolute right-1 top-1 z-10 flex gap-0.5 rounded-full border border-poison bg-card/90 px-1 text-xs animate-pop-in">{syn.map((s) => <span key={s.id}>{s.icon}</span>)}</span>}
      {up && syn.length === 0 && <span title="Можно улучшить" className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[12px] font-bold text-background animate-soft-pulse">↑</span>}
      {inSquad && <span title="В отряде" className="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">✓</span>}
      <MonsterPortrait id={id} size={compact ? 56 : 88} silhouette={!o} lvl={o?.lvl ?? 1} animate={selected ?? false} />
      <div className="mt-1 w-full shrink-0 truncate text-xs font-semibold">{o ? def.name : "???"}</div>
      <div className="mt-0.5 flex shrink-0 flex-wrap items-center justify-center gap-1">
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
