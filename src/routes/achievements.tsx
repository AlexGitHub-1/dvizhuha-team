import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScreenShell } from "@/components/ui-kit";
import { ACHIEVEMENTS, ACH_GROUPS, FRAMES, type AchGroup } from "@/game/data/achievements";
import { SCENE_BY_ID } from "@/game/data/story";
import { achProgress, achState, hasAch, setFrame, setTitle, unlockedFrames, unlockedTitles } from "@/game/meta/achievements";
import { setProgress, useProgress } from "@/game/meta/store";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Деяния Владыки — SIEGE: March of Doom" },
      { name: "description", content: "Странные и смешные достижения Тёмного Владыки: поражения, пацифизм, ошибки следствия. Награды — титулы, рамки и тайные страницы Летописи." },
      { property: "og:title", content: "Деяния Владыки — SIEGE: March of Doom" },
      { property: "og:description", content: "24 необычных достижения и тайные страницы сюжета." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Achievements,
});

type Filter = "all" | "got" | "secret";

function Achievements() {
  const p = useProgress();
  const [f, setF] = useState<Filter>("all");
  const a = achState(p);
  const got = ACHIEVEMENTS.filter((d) => hasAch(p, d.id)).length;
  const titles = unlockedTitles(p); const frames = unlockedFrames(p);
  const list = ACHIEVEMENTS.filter((d) => f === "all" || (f === "got" ? hasAch(p, d.id) : d.secret));
  const groups = (Object.keys(ACH_GROUPS) as AchGroup[]).map((g) => ({ g, items: list.filter((d) => d.group === g) })).filter((x) => x.items.length);
  return (
    <ScreenShell title="Деяния Владыки">
      <section className="panel-texture relative mb-4 overflow-hidden rounded-2xl border-2 border-gold/50 bg-card/90 p-5 shadow-[var(--shadow-deep)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Свиток деяний</div>
            <h2 className="font-display text-3xl uppercase text-gold">Открыто {got} из {ACHIEVEMENTS.length}</h2>
            <div className="mt-2 h-2.5 w-64 max-w-full overflow-hidden rounded-full border border-border bg-muted"><div className="h-full bg-gold" style={{ width: `${(got / ACHIEVEMENTS.length) * 100}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">Награды не дают силы: только титулы, рамки и тайные страницы Летописи.</p>
          </div>
          <div className="flex gap-1 rounded-full border border-border bg-background/50 p-1">
            {([["all", "Все"], ["got", "Открытые"], ["secret", "Секретные"]] as [Filter, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setF(k)} className={cn("rounded-full px-3 py-1 text-xs transition", f === k ? "bg-gold text-background" : "text-muted-foreground hover:text-foreground")}>{l}</button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Титул в меню</div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setProgress((q) => setTitle(q, undefined))} className={cn("rounded-full border px-2.5 py-0.5 text-xs", !a.title ? "border-gold text-gold" : "border-border text-muted-foreground")}>Без титула</button>
              {titles.map((t) => <button key={t} onClick={() => setProgress((q) => setTitle(q, t))} className={cn("rounded-full border px-2.5 py-0.5 text-xs", a.title === t ? "border-gold bg-gold/15 text-gold" : "border-border text-foreground/80 hover:border-gold/60")}>{t}</button>)}
              {!titles.length && <span className="text-xs text-muted-foreground">Пока нет — открой первое деяние.</span>}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Рамка портретов отряда</div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setProgress((q) => setFrame(q, undefined))} className={cn("rounded-full border px-2.5 py-0.5 text-xs", !a.frame ? "border-gold text-gold" : "border-border text-muted-foreground")}>Обычная</button>
              {frames.map((fr) => <button key={fr} onClick={() => setProgress((q) => setFrame(q, fr))} className={cn("rounded-full border px-2.5 py-0.5 text-xs", a.frame === fr ? "border-gold bg-gold/15 text-gold" : "border-border text-foreground/80 hover:border-gold/60")}>{FRAMES[fr].name}</button>)}
            </div>
          </div>
        </div>
      </section>
      <div className="space-y-5">
        {groups.map(({ g, items }) => (
          <section key={g}>
            <h3 className="mb-2 font-display text-lg uppercase tracking-widest text-primary">{ACH_GROUPS[g]}</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((d, k) => {
                const on = hasAch(p, d.id); const hidden = d.secret && !on; const n = achProgress(p, d);
                return (
                  <div key={d.id} className={cn("panel-texture relative flex gap-3 overflow-hidden rounded-xl border-2 p-3 animate-stagger-in", on ? "border-gold/70 bg-card shadow-[0_0_24px_color-mix(in_oklab,var(--gold)_25%,transparent)]" : "border-border bg-card/60")} style={{ animationDelay: `${k * 40}ms` }}>
                    <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-3xl", on ? "border-gold bg-gold/15" : "border-border bg-muted grayscale opacity-60")}>{hidden ? "❓" : d.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className={cn("font-display leading-tight", on ? "text-gold" : "text-foreground/85")}>{hidden ? "???" : d.name}</div>
                        {d.secret && <span className="shrink-0 rounded-full border border-blood/60 px-1.5 text-[9px] uppercase tracking-wider text-blood">тайное</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{hidden ? `Намёк: ${d.hint}` : d.desc}</div>
                      {d.goal > 1 && !on && !hidden && <div className="mt-1.5"><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(n / d.goal) * 100}%` }} /></div><div className="mt-0.5 text-right text-[10px] text-muted-foreground">{n}/{d.goal}</div></div>}
                      {!hidden && <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                        {d.reward.title && <span className="rounded border border-gold/40 px-1.5 text-gold">титул «{d.reward.title}»</span>}
                        {d.reward.frame && <span className="rounded border border-poison/40 px-1.5 text-poison">рамка «{FRAMES[d.reward.frame].name}»</span>}
                        {d.reward.scene && <span className="rounded border border-primary/40 px-1.5 text-primary">📜 {on ? SCENE_BY_ID[d.reward.scene]?.title.replace("Тайное: ", "") : "тайная страница"}</span>}
                        {d.reward.joke && <span className="rounded border border-border px-1.5 text-muted-foreground">сюрприз в меню</span>}
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </ScreenShell>
  );
}
