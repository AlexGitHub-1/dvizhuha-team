import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Currency, GameButton, Panel, RARITY_TEXT, ScreenShell } from "@/components/ui-kit";
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

function Shop() {
  const p = useProgress();
  const [open, setOpen] = useState<{ c: CaseDef; res: CaseResult; key: number } | null>(null);

  const buy = (c: CaseDef) => {
    const r = openCase(getProgress(), c.id); if (!r) return;
    setProgress(r.p);
    setOpen({ c, res: r.result, key: performance.now() });
  };

  return (
    <ScreenShell title="Магазин" right={<Wallet />}>
      <div className="grid gap-4 md:grid-cols-3">
        {CASES.map((c, i) => (
          <Panel key={c.id} className="animate-stagger-in group flex flex-col items-center text-center" >
            <div className="text-7xl transition duration-300 group-hover:-translate-y-1 group-hover:rotate-[-4deg] group-hover:scale-110 drop-shadow-[0_0_20px_var(--primary)]" style={{ animationDelay: `${i * 80}ms` }}>{CASE_ICON[c.id]}</div>
            <h2 className="mt-2 font-display text-xl uppercase text-primary">{c.name}</h2>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
            <ul className="my-3 w-full space-y-1 text-xs">
              {RARITIES.filter((r) => c.odds[r]).map((r) => <li key={r} className="flex justify-between"><span className={RARITY_TEXT[r]}>{RARITY_INFO[r].name}</span><span>{c.odds[r]}%</span></li>)}
            </ul>
            <GameButton variant={c.currency === "gold" ? "gold" : "primary"} className="mt-auto w-full" disabled={p[c.currency] < c.price || !!open} onClick={() => buy(c)}>
              Открыть · <Currency kind={c.currency} value={c.price} className="text-primary-foreground" />
            </GameButton>
          </Panel>
        ))}
      </div>
      <Panel className="mt-4 text-center text-sm text-muted-foreground">
        Гарантия: эпический монстр или лучше не реже чем раз в {PITY_AT} кейсов — до гарантии осталось <span className="font-display text-primary">{PITY_AT - p.pity}</span>.
        <br />Повторный монстр превращается в осколки. С 5-го уровня прокачка требует осколков, зато стоит дешевле.
      </Panel>
      {open && (
        <CaseOpening key={open.key} chest={open.c} result={open.res} canAgain={p[open.c.currency] >= open.c.price}
          onDone={() => setOpen(null)} onAgain={() => buy(open.c)} />
      )}
    </ScreenShell>
  );
}
