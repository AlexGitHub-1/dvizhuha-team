import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type React from "react";
import { Tooltip } from "@/components/ui-kit";
import { SYNERGIES } from "@/game/data/synergies";
import { MONSTERS } from "@/game/data/monsters";
import { cn } from "@/lib/utils";
import { Currency, GameButton, gameButton, LiveBackdrop, MonsterPortrait, Panel, StatBar } from "@/components/ui-kit";
import { Wallet } from "@/components/ui-kit/MonsterCard";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";
import { sfx } from "@/game/audio";
import { resetTutorials, squadLimit, synergyCount, freeStars, nextLevelId, rewardsReady, squadUpgradeReady, claimDaily, claimQuest, DAILY, dailyAvailable, dayKey, highestCleared, nextStreak, QUESTS, questState, requiredPower, squadPower } from "@/game/meta/progress";
import { LEVELS, recLabel } from "@/game/data/levels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SIEGE: March of Doom — штурм Цитадели" },
      { name: "description", content: "Веди Орду на штурм: собирай монстров из кейсов, прокачивай их и ломай всё более укреплённые крепости людей." },
      { property: "og:title", content: "SIEGE: March of Doom" },
      { property: "og:description", content: "Tower Offense в тёмном фэнтези: кампания, прокачка, кейсы и 16 монстров." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Menu,
});

function Badge({ children, tone = "blood" }: { children: React.ReactNode; tone?: "blood" | "gold" }) {
  return <span className={cn("absolute -right-2 -top-2 flex h-5 min-w-5 animate-soft-pulse items-center justify-center rounded-full px-1 font-display text-[10px] shadow", tone === "gold" ? "bg-gold text-background" : "bg-blood text-foreground")}>{children}</span>;
}

function Menu() {
  const p = useProgress();
  const cleared = highestCleared(p);
  const next = LEVELS[nextLevelId(p) - 1]!;
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => { setToday(dayKey(new Date())); }, []);
  const stars = freeStars(p); const upg = squadUpgradeReady(p); const rew = today ? rewardsReady(p, today) : false;
  const round = "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/80 text-base transition hover:bg-secondary";
  return (
    <div className="animate-screen-in relative isolate flex min-h-screen flex-col items-center gap-8 overflow-hidden p-6 pt-20 lg:grid lg:grid-cols-[minmax(260px,1fr)_auto_minmax(300px,1fr)] lg:items-center lg:gap-10 lg:px-12">
      <LiveBackdrop />
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button aria-label="Звуковые эффекты" title="Звуковые эффекты" onClick={() => setProgress((x) => ({ ...x, muted: !x.muted }))} className={cn(round, p.muted && "opacity-50")}>{p.muted ? "🔇" : "🔊"}</button>
        <button aria-label="Музыка" title="Музыка" onClick={() => setProgress((x) => ({ ...x, musicMuted: !x.musicMuted }))} className={cn(round, p.musicMuted && "opacity-50")}>{p.musicMuted ? "🔕" : "🎵"}</button>
        <button aria-label="Показать обучение снова" title="Показать обучение снова" onClick={() => setProgress((x) => resetTutorials(x))} className={round}>❔</button>
        <Wallet />
      </div>

      <HordeHQ />

      <div className="relative order-1 flex flex-col items-center gap-6 lg:order-none">
        <div className="relative text-center">
          <h1 className="font-display text-6xl tracking-[0.12em] text-primary drop-shadow-[0_4px_20px_var(--blood)] sm:text-8xl">SIEGE</h1>
          <p className="font-display text-base tracking-[0.45em] text-muted-foreground">MARCH OF DOOM</p>
        </div>
        <Link to="/campaign" className={cn(gameButton({ variant: "primary", size: "lg" }), "h-auto w-full max-w-md flex-col gap-0 py-3")}>
          <span className="font-display text-2xl tracking-widest">В БОЙ</span>
          <span className="text-xs opacity-90">Уровень {next.id}: {next.name}</span>
        </Link>
        <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
          <Link to="/squad" className={cn(gameButton({ size: "md" }), "relative")}>Отряд{upg && <Badge>↑</Badge>}</Link>
          <Link to="/talents" className={cn(gameButton({ size: "md" }), "relative")}>Таланты{stars > 0 && <Badge tone="gold">★{stars}</Badge>}</Link>
          <Link to="/shop" className={gameButton({ variant: "gold", size: "md" })}>Кейсы</Link>
          <Link to="/chronicle" className={gameButton({ size: "md" })}>Летопись</Link>
        </div>
        <p className="text-center text-xs text-muted-foreground">Пройдено уровней: {cleared}/{LEVELS.length}</p>
      </div>

      <div className="relative order-3 w-full max-w-sm lg:order-none">
        <Rewards />
        {rew && <span className="absolute right-0 top-0 z-10"><Badge>!</Badge></span>}
      </div>
    </div>
  );
}

function Rewards() {
  const p = useProgress();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => { setToday(dayKey(new Date())); }, []);
  const avail = today ? dailyAvailable(p, today) : false;
  const streak = today ? (avail ? nextStreak(p, today) : p.streak) : 0;
  return (
    <Panel title="Награды" className="relative w-full">
      <div className="mb-1 text-xs text-muted-foreground">Ежедневная награда · день {streak || 1} из {DAILY.length}</div>
      <div className="mb-3 grid grid-cols-7 gap-1">
        {DAILY.map((d, i) => {
          const got = i < streak - (avail ? 1 : 0); const cur = avail && i === streak - 1;
          return (
            <div key={i} className={cn("flex flex-col items-center rounded border p-1 text-[9px] leading-tight", got ? "border-gold/50 bg-gold/15 text-gold" : cur ? "animate-soft-pulse border-gold bg-secondary" : "border-border bg-muted text-muted-foreground")}>
              <span className="font-display">{i + 1}</span><span>🪙{d.gold}</span>{d.skulls > 0 && <span>💀{d.skulls}</span>}
            </div>
          );
        })}
      </div>
      <GameButton variant="gold" size="sm" className="w-full" disabled={!avail} onClick={() => { const r = today && claimDaily(getProgress(), today); if (r) { setProgress(r.p); sfx.coin(); } }}>
        {avail ? "Забрать" : "Завтра будет новая"}
      </GameButton>
      <div className="mt-4 space-y-2">
        {QUESTS.map((q) => {
          const s = questState(p, q.id);
          return (
            <div key={q.id} className="rounded-md border border-border bg-secondary/60 p-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold">{s.name}</span>
                <span className="flex gap-2"><Currency kind="gold" value={s.gold} className="text-xs" />{s.skulls > 0 && <Currency kind="skulls" value={s.skulls} className="text-xs" />}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <StatBar value={s.value} max={s.target} tone={s.done ? "poison" : "gold"} className="flex-1" />
                {s.done ? <GameButton size="sm" variant="primary" className="h-6 px-2 text-[10px]" onClick={() => { const n = claimQuest(getProgress(), q.id); if (n) { setProgress(n); sfx.coin(); } }}>Забрать</GameButton>
                  : <span className="text-[10px] text-muted-foreground">{s.value}/{s.target}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function HordeHQ() {
  const p = useProgress();
  const limit = squadLimit(p); const cols = Math.max(4, limit);
  const avg = squadPower(p);
  const next = LEVELS[nextLevelId(p) - 1]!; const rec = requiredPower(next.id);
  const tone = avg >= rec ? "text-poison" : avg >= rec * 0.85 ? "text-gold" : "text-blood";
  return (
    <Panel title="Штаб Орды" className="relative order-2 flex w-full max-w-md flex-col justify-self-end lg:order-none">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }, (_, i) => {
          const id = p.squad[i];
          if (!id) return i < limit
            ? <Link key={i} to="/squad" className="flex min-h-36 items-center justify-center rounded-lg border-2 border-dashed border-border text-2xl text-muted-foreground transition hover:border-primary hover:text-primary">+</Link>
            : <div key={i} className="flex min-h-36 items-center justify-center rounded-lg border border-border/40 text-muted-foreground/40">🔒</div>;
          const lvl = p.owned[id]?.lvl ?? 1; const rc = `var(--rarity-${MONSTERS[id].rarity})`;
          return (
            <Link key={id} to="/squad" className="group flex flex-col items-center gap-1 rounded-lg border border-border bg-secondary/50 px-1 pb-2 pt-1 transition hover:-translate-y-0.5 hover:border-primary">
              <div className="relative flex w-full justify-center rounded-md" style={{ background: `radial-gradient(circle at 50% 60%, color-mix(in oklab, ${rc} 35%, transparent), transparent 70%)` }}>
                <MonsterPortrait id={id} size={72} lvl={lvl} animate />
              </div>
              <span className="line-clamp-2 min-h-[2.2em] w-full text-center text-[11px] font-semibold leading-tight">{MONSTERS[id].name}</span>
              <span className="rounded-full border border-gold/50 bg-gold/15 px-2 text-[10px] font-bold text-gold">Ур. {lvl}</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-3 rounded-md border border-border bg-muted/60 px-3 py-2 text-xs">
        Сила отряда <b className={tone}>{avg}</b> · нужно <b>{rec}</b> ({recLabel(next.id)}) для «{next.name}»
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {SYNERGIES.map((sy) => {
          const n = Math.min(sy.need, synergyCount(p.squad, sy.id)); const on = n >= sy.need;
          return (
            <Tooltip key={sy.id} tip={<>Нужны: {sy.members.map((m) => MONSTERS[m].name).join(", ")}</>}>
              <div className={cn("flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition", on ? "border-poison/60 bg-poison/10 shadow-[0_0_12px_-4px_var(--poison)]" : "border-border bg-secondary/40 opacity-70")}>
                <span className="text-base">{sy.icon}</span>
                <span className={cn("font-semibold", on && "text-poison")}>{sy.name}</span>
                <span className="flex gap-0.5">{Array.from({ length: sy.need }, (_, k) => <span key={k} className={cn("h-1.5 w-3 rounded-full", k < n ? "bg-poison" : "bg-muted-foreground/30")} />)}</span>
                <span className="ml-auto truncate text-[10px] text-muted-foreground">{sy.desc}</span>
              </div>
            </Tooltip>
          );
        })}
      </div>
      <Link to="/squad" className={cn(gameButton({ variant: "ghost", size: "sm" }), "mt-3 self-end")}>Изменить отряд →</Link>
    </Panel>
  );
}
