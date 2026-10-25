import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GameButton, Panel, ScreenShell } from "@/components/ui-kit";
import { Wallet } from "@/components/ui-kit/MonsterCard";
import { Tutorial } from "@/components/ui-kit/Tutorial";
import { TALENTS } from "@/game/data/synergies";
import { buyTalent, freeStars, resetTalents, talentCost, totalStars } from "@/game/meta/progress";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";
import { sfx } from "@/game/audio";

export const Route = createFileRoute("/talents")({
  head: () => ({
    meta: [
      { title: "Таланты Владыки — SIEGE: March of Doom" },
      { name: "description", content: "Трать звёзды кампании на глобальные перки Орды." },
      { property: "og:title", content: "Таланты Владыки — SIEGE: March of Doom" },
      { property: "og:description", content: "Древо талантов Повелителя Орды." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Talents,
});

/** branch directions from the central sigil (degrees, 0 = up) */
const ANGLES = TALENTS.map((_, i) => 22.5 + (360 / TALENTS.length) * i);
const SIZE = 820, C = SIZE / 2, R0 = 82, STEP = 58, LABEL_R = 362;

function Talents() {
  const p = useProgress();
  const free = freeStars(p), total = totalStars(p);
  const [sel, setSel] = useState(TALENTS[0]!.id);
  const [burst, setBurst] = useState<{ id: string; r: number; k: number } | null>(null);
  const t = TALENTS.find((x) => x.id === sel)!;
  const rank = p.talents?.[t.id] ?? 0; const cost = talentCost(p, t.id); const max = rank >= t.costs.length;
  const buy = (id: typeof sel) => {
    const n = buyTalent(getProgress(), id); if (!n) return;
    setProgress(n); sfx.levelUp(); setBurst({ id, r: (n.talents[id] ?? 1) - 1, k: performance.now() });
  };
  const pos = (i: number, r: number) => { const a = (ANGLES[i]! * Math.PI) / 180, d = R0 + STEP * (r + 1); return [C + Math.sin(a) * d, C - Math.cos(a) * d] as const; };

  return (
    <ScreenShell title="Таланты Владыки" right={<Wallet />}>
      <Tutorial id="talents" />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel className="relative overflow-hidden">
          <div data-tut="stars" className="mx-auto flex w-fit flex-col items-center">
            <div className="font-display text-5xl text-gold drop-shadow-[0_0_18px_var(--gold)]">★ {free}</div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">свободно · всего {total}</div>
            <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gold transition-[width]" style={{ width: `${total ? ((total - free) / total) * 100 : 0}%` }} /></div>
          </div>
          <div data-tut="tree" className="relative mx-auto mt-2 aspect-square w-full max-w-[820px]">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full">
              <defs>
                <radialGradient id="altar" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></radialGradient>
              </defs>
              <circle cx={C} cy={C} r={C - 10} fill="url(#altar)" />
              {TALENTS.map((tl, i) => {
                const r = p.talents?.[tl.id] ?? 0;
                return tl.costs.map((_, k) => {
                  const [x0, y0] = k === 0 ? [C, C] : pos(i, k - 1); const [x1, y1] = pos(i, k); const lit = k < r;
                  return <line key={tl.id + k} x1={x0} y1={y0} x2={x1} y2={y1} stroke={lit ? "var(--gold)" : "var(--border)"} strokeWidth={lit ? 4 : 2} strokeLinecap="round" className={cn(lit && "drop-shadow-[0_0_6px_var(--gold)]")} />;
                });
              })}
            </svg>
            {/* central sigil */}
            <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-card text-5xl shadow-[0_0_40px_var(--primary)]">💀</div>
            {TALENTS.map((tl, i) => {
              const r = p.talents?.[tl.id] ?? 0;
              return tl.costs.map((c, k) => {
                const [x, y] = pos(i, k); const owned = k < r; const nextUp = k === r; const can = nextUp && free >= c;
                return (
                  <button key={tl.id + k} aria-label={`${tl.name} ранг ${k + 1}`}
                    onClick={() => { setSel(tl.id); if (can) buy(tl.id); }}
                    className={cn("absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 text-xl transition hover:scale-110",
                      owned ? "border-gold bg-[color-mix(in_oklab,var(--gold)_25%,var(--card))] shadow-[0_0_18px_var(--gold)]" : can ? "border-gold bg-card animate-soft-pulse" : "border-border bg-card [&>span]:opacity-50",
                      sel === tl.id && k === Math.min(r, tl.costs.length - 1) && "outline outline-2 outline-offset-2 outline-primary")}
                    style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%` }}>
                    <span>{tl.icon}</span>
                    <span className={cn("text-[10px] font-bold leading-none", owned ? "text-gold" : "text-muted-foreground")}>{owned ? "✓" : `★${c}`}</span>
                    {burst && burst.id === tl.id && burst.r === k && <span key={burst.k} className="animate-level-flash pointer-events-none absolute inset-0 rounded-full bg-gold/80 blur-md" />}
                  </button>
                );
              });
            })}
            {TALENTS.map((tl, i) => { const a = (ANGLES[i]! * Math.PI) / 180; const [lx, ly] = pos(i, tl.costs.length - 1); const x = lx + Math.sin(a) * 40 + Math.sign(Math.sin(a)) * 44 * Math.abs(Math.sin(a)), y = ly - Math.cos(a) * 46; return <div key={tl.id} className="pointer-events-none absolute w-24 -translate-x-1/2 -translate-y-1/2 text-center font-display text-[11px] leading-tight uppercase text-muted-foreground" style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%` }}>{tl.name}</div>; })}
          </div>
        </Panel>
        <Panel className="h-fit lg:sticky lg:top-20" title="Руна">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-gold/15 text-3xl">{t.icon}</div>
            <div>
              <h3 className="font-display text-lg uppercase">{t.name}</h3>
              <div className="flex gap-1">{t.costs.map((_, i) => <span key={i} className={cn("h-2 w-6 rounded-full", i < rank ? "bg-gold" : "bg-border")} />)}</div>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Сейчас</span><span>{rank > 0 ? t.desc(rank) : "не изучено"}</span></div>
            {!max && <div className="flex justify-between"><span className="text-muted-foreground">Дальше</span><span className="text-poison">{t.desc(rank + 1)}</span></div>}
          </div>
          <GameButton variant="gold" className={cn("mt-4 w-full", !max && cost !== null && free >= cost && "animate-soft-pulse")} disabled={max || cost === null || free < cost} onClick={() => buy(t.id)}>
            {max ? "Максимум" : cost !== null && free < cost ? `Нужно ★ ${cost} · есть ${free}` : `Изучить · ★ ${cost}`}
          </GameButton>
          <p className="mt-4 text-xs text-muted-foreground">Звёзды за уровни кампании превращаются в постоянные бонусы для всей Орды.</p>
          <div data-tut="reset" className="mt-3 w-fit"><GameButton size="sm" variant="ghost" onClick={() => setProgress(resetTalents(getProgress()))}>↺ Сбросить бесплатно</GameButton></div>
        </Panel>
      </div>
    </ScreenShell>
  );
}
