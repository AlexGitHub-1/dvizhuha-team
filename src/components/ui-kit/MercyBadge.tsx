import { LOCATIONS } from "@/game/data/locations";
import { MERCY_AT, mercyBonuses, mercyTier, type Progress, lossStreak } from "@/game/meta/progress";

/** "Horde Support" status after repeated losses on a level. */
export function MercyBadge({ p, levelId }: { p: Progress; levelId: number }) {
  const streak = lossStreak(p, levelId); const tier = mercyTier(streak);
  const next = MERCY_AT.find((n) => n > streak);
  if (!tier) {
    if (!streak) return null;
    return <div className="mt-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-left text-[11px] text-muted-foreground">Поражений подряд: {streak}. С {MERCY_AT[0]}-го включится <b className="text-gold">Поддержка Орды</b>.</div>;
  }
  const b = mercyBonuses(tier);
  const items = [`+${Math.round((b.startEssenceMul - 1) * 100)}% стартовой эссенции`, `+${b.lossShards} осколк${b.lossShards > 1 ? "а" : ""} за поражение`,
    b.lossGoldK ? `не меньше ${b.lossGoldK * 100}% золота за поражение` : null,
    b.memoryShare === 0 ? "башни забывают твой отряд" : "память башен ослаблена вдвое",
    tier >= 3 ? (p.mercyDiscount ? "скидка 30% на следующее улучшение ждёт" : "скидка 30% использована") : null].filter(Boolean);
  return (
    <div className="mt-3 rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 text-left">
      <div className="flex items-center justify-between text-xs"><b className="font-display uppercase tracking-widest text-gold">Поддержка Орды · ступень {tier}</b><span className="text-muted-foreground">поражений: {streak}</span></div>
      <ul className="mt-1 grid gap-0.5 text-[11px] text-foreground/85">{items.map((t) => <li key={t}>• {t}</li>)}</ul>
      {next && <div className="mt-1 text-[10px] text-muted-foreground">Следующая ступень после {next} поражений подряд</div>}
    </div>
  );
}

/** The region's built-in defence trick. */
export function PuzzleBadge({ loc }: { loc: number }) {
  const z = LOCATIONS[loc]!.puzzle;
  return <div className="mt-2 rounded-lg border border-blood/50 bg-blood/10 px-3 py-2 text-left text-[11px]"><b className="font-display uppercase tracking-widest text-blood">Защита региона: {z.name}</b><div className="text-foreground/80">{z.hint}</div></div>;
}
