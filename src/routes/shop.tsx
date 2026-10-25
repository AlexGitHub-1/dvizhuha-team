import { sfx } from "@/game/audio";
import { Tutorial } from "@/components/ui-kit/Tutorial";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Currency, GameButton, RARITY_BG, RARITY_TEXT, ScreenShell } from "@/components/ui-kit";
import { CaseOpening } from "@/components/ui-kit/CaseOpening";
import { Wallet } from "@/components/ui-kit/MonsterCard";
import { CASES, type CaseDef } from "@/game/data/shop";
import { RARITIES, RARITY_INFO } from "@/game/data/rarity";
import { openCase, PITY_AT, type CaseResult } from "@/game/meta/progress";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Магазин кейсов — SIEGE: March of Doom" },
      { name: "description", content: "Открывай сундуки и находи редких, эпических, легендарных и мифических монстров." },
      { property: "og:title", content: "Магазин — SIEGE: March of Doom" },
      { property: "og:description", content: "Кейсы с монстрами пяти редкостей." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

const CASE_ICON: Record<string, string> = { rusty: "🧰", cursed: "⚱️", legend: "👑" };
const CASE_TONE: Record<string, { c: string; tag?: string }> = {
  rusty: { c: "var(--rarity-common)" },
  cursed: { c: "var(--rarity-epic)" },
  legend: { c: "var(--rarity-legendary)", tag: "Лучший шанс" },
};

function Shop() {
  const p = useProgress();
  const [open, setOpen] = useState<{ c: CaseDef; res: CaseResult; key: number } | null>(null);

  const buy = (c: CaseDef) => {
    const r = openCase(getProgress(), c.id); if (!r) return; sfx.chest();
    setProgress(r.p);
    setOpen({ c, res: r.result, key: performance.now() });
  };
  const left = PITY_AT - p.pity;

  return (
    <ScreenShell title="Сокровищница Орды" right={<Wallet />}>
      <Tutorial id="shop" />
      <div data-tut="pity" className="mx-auto mb-6 max-w-3xl rounded-xl border border-rarity-epic/40 bg-card/70 px-5 py-3 shadow-[0_0_30px_-10px_var(--rarity-epic)]">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-display uppercase tracking-wider text-rarity-epic">Гарантия эпика</span>
          <span className="text-muted-foreground">осталось <span className="font-display text-lg text-foreground">{left}</span> {left === 1 ? "кейс" : left < 5 ? "кейса" : "кейсов"}</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: PITY_AT }, (_, i) => (
            <div key={i} className={`flex h-7 flex-1 items-center justify-center rounded-md border text-sm transition ${i < p.pity ? "border-rarity-epic bg-rarity-epic/30 shadow-[0_0_10px_var(--rarity-epic)]" : "border-border bg-background/50 opacity-40"}`}>{i === PITY_AT - 1 ? "💎" : "💀"}</div>
          ))}
        </div>
      </div>
      <div data-tut="cases" className="grid gap-6 md:grid-cols-3">
        {CASES.map((c, i) => {
          const tone = CASE_TONE[c.id]!; const lack = c.price - p[c.currency];
          return (
            <div key={c.id} className="animate-stagger-in group relative flex flex-col items-center rounded-2xl border-2 bg-card/80 px-5 pb-5 pt-8 text-center transition duration-300 hover:-translate-y-2"
              style={{ animationDelay: `${i * 90}ms`, borderColor: `color-mix(in oklab, ${tone.c} 55%, transparent)`, boxShadow: `0 0 40px -14px ${tone.c}, inset 0 0 60px -30px ${tone.c}` }}>
              {tone.tag && <span className="absolute -top-3 rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-background" style={{ background: tone.c }}>{tone.tag}</span>}
              <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl">
                <div className="animate-rays absolute h-72 w-72 opacity-40 transition group-hover:opacity-80" style={{ background: `repeating-conic-gradient(from 0deg, ${tone.c} 0deg 8deg, transparent 8deg 30deg)`, maskImage: "radial-gradient(circle, black 15%, transparent 65%)" }} />
                <div className="absolute bottom-3 h-5 w-32 rounded-[50%] bg-background/80 blur-sm" />
                <div className="animate-chest-float relative text-8xl" style={{ filter: `drop-shadow(0 0 22px ${tone.c})`, animationDelay: `${i * 0.6}s` }}>{CASE_ICON[c.id]}</div>
              </div>
              <h2 className="mt-3 font-display text-2xl uppercase" style={{ color: tone.c }}>{c.name}</h2>
              <p className="text-sm italic text-muted-foreground">{c.desc}</p>
              <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full border border-border">
                {RARITIES.filter((r) => c.odds[r]).map((r) => <div key={r} className={RARITY_BG[r]} style={{ width: `${c.odds[r]}%` }} />)}
              </div>
              <ul className="my-3 grid w-full grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {RARITIES.filter((r) => c.odds[r]).map((r) => <li key={r} className="flex justify-between"><span className={RARITY_TEXT[r]}>● {RARITY_INFO[r].name}</span><span className="font-display">{c.odds[r]}%</span></li>)}
              </ul>
              <GameButton variant={c.currency === "gold" ? "gold" : "primary"} size="lg" className="mt-auto w-full" disabled={lack > 0 || !!open} onClick={() => buy(c)}>
                {lack > 0 ? <>Не хватает <Currency kind={c.currency} value={lack} className="text-primary-foreground" /></> : <>Открыть · <Currency kind={c.currency} value={c.price} className="text-primary-foreground" /></>}
              </GameButton>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-full border border-border bg-card/60 px-3 py-1">♻ Повторный монстр → осколки</span>
        <span className="rounded-full border border-border bg-card/60 px-3 py-1">🔷 Осколки нужны с 5-го уровня прокачки</span>
      </div>
      {open && (
        <CaseOpening key={open.key} chest={open.c} result={open.res} canAgain={p[open.c.currency] >= open.c.price}
          onDone={() => setOpen(null)} onAgain={() => buy(open.c)} />
      )}
    </ScreenShell>
  );
}
