import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Currency, GameButton, gameButton, LiveBackdrop, MonsterPortrait, Panel, StatBar } from "@/components/ui-kit";
import { Wallet } from "@/components/ui-kit/MonsterCard";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";
import { sfx } from "@/game/audio";
import { claimDaily, claimQuest, DAILY, dailyAvailable, dayKey, highestCleared, nextStreak, QUESTS, questState } from "@/game/meta/progress";
import { LEVELS } from "@/game/data/levels";

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

function Menu() {
  const p = useProgress();
  const cleared = highestCleared(p);
  return (
    <div className="animate-screen-in relative isolate flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden p-6 lg:flex-row lg:items-center lg:gap-12">
      <LiveBackdrop />
      <div className="absolute right-4 top-4"><Wallet /></div>
      <div className="flex flex-col items-center gap-8">
      <div className="relative flex items-end gap-2">
        <MonsterPortrait id="goblin" size={90} animate />
        <MonsterPortrait id="troll" size={130} animate />
        <MonsterPortrait id="shaman" size={90} animate />
      </div>
      <div className="relative text-center">
        <h1 className="font-display text-6xl tracking-[0.12em] text-primary drop-shadow-[0_4px_20px_var(--blood)] sm:text-8xl">SIEGE</h1>
        <p className="font-display text-base tracking-[0.45em] text-muted-foreground">MARCH OF DOOM</p>
      </div>
      <Panel className="relative flex w-full max-w-xs flex-col gap-3">
        <Link to="/campaign" className={gameButton({ variant: "primary", size: "lg" })}>{cleared ? "Продолжить" : "Играть"}</Link>
        <Link to="/squad" className={gameButton({ size: "md" })}>Отряд и прокачка</Link>
        <Link to="/shop" className={gameButton({ variant: "gold", size: "md" })}>Магазин кейсов</Link>
        <button onClick={() => setProgress((x) => ({ ...x, muted: !x.muted }))} className={gameButton({ variant: "ghost", size: "sm" })}>{p.muted ? "🔇 Эффекты выкл." : "🔊 Эффекты вкл."}</button>
        <button onClick={() => setProgress((x) => ({ ...x, musicMuted: !x.musicMuted }))} className={gameButton({ variant: "ghost", size: "sm" })}>{p.musicMuted ? "🔇 Музыка выкл." : "🎵 Музыка вкл."}</button>
        <p className="text-center text-xs text-muted-foreground">Пройдено уровней: {cleared}/{LEVELS.length}</p>
      </Panel>
      </div>
      <Rewards />
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
    <Panel title="Награды" className="relative w-full max-w-sm">
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
