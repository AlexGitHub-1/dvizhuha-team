import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Currency, GameButton, gameButton, Panel, ScreenShell } from "@/components/ui-kit";
import { Wallet } from "@/components/ui-kit/MonsterCard";
import { PoolCard, PoolZone, SquadDnd, SquadRow } from "@/components/ui-kit/SquadDnd";
import { BattleView } from "@/components/game/BattleView";
import { getLevel } from "@/game/data/levels";
import { LOCATIONS } from "@/game/data/locations";
import { TOWERS, type TowerKind } from "@/game/data/towers";
import { COLLECTIBLE } from "@/game/data/monsters";
import { SPELLS } from "@/game/data/shop";
import { isLevelUnlocked, squadLimit, toggleSquad } from "@/game/meta/progress";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";

export const Route = createFileRoute("/play/$levelId")({
  head: ({ params }) => ({
    meta: [
      { title: `Уровень ${params.levelId} — SIEGE: March of Doom` },
      { name: "description", content: "Штурм крепости: собери отряд и пробей Главные Ворота." },
      { property: "og:title", content: `Уровень ${params.levelId} — SIEGE: March of Doom` },
      { property: "og:description", content: "Штурм крепости людей." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Play,
});

function Play() {
  const { levelId } = Route.useParams();
  const level = getLevel(Number(levelId));
  const p = useProgress();
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(false);

  if (!level || !isLevelUnlocked(p, level.id)) {
    return <ScreenShell title="Закрыто"><Panel className="text-center"><p>Этот уровень пока закрыт.</p><Link to="/campaign" className={gameButton({ variant: "primary", className: "mt-4" })}>К кампании</Link></Panel></ScreenShell>;
  }
  if (started) {
    const squad = p.squad.filter((id) => p.owned[id]).map((id) => ({ kind: id, lvl: p.owned[id]!.lvl }));
    return <BattleView key={run} level={level} squad={squad} spell={p.spell} onRetry={() => setRun((r) => r + 1)} />;
  }
  const kinds = [...new Set([...level.towers, ...level.buildKinds])] as TowerKind[];
  return (
    <SquadDnd>
    <ScreenShell title={`Уровень ${level.id}: ${level.name}`} right={<Wallet />}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel title={`Выбери отряд (${p.squad.length}/${squadLimit(p)})`}>
          <SquadRow onSelect={(id) => setProgress(toggleSquad(getProgress(), id))} />
          <div className="mb-2 mt-6 text-xs text-muted-foreground">Коллекция — перетащи в отряд или нажми:</div>
          <PoolZone className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {COLLECTIBLE.filter((id) => p.owned[id]).map((id) => <PoolCard key={id} id={id} compact selected={p.squad.includes(id)} onSelect={() => setProgress(toggleSquad(getProgress(), id))} />)}
          </PoolZone>
          <p className="mt-3 text-sm text-muted-foreground">Заклинание: <b className="text-foreground">{SPELLS[p.spell].icon} {SPELLS[p.spell].name}</b> — сменить в «Отряде».</p>
        </Panel>
        <Panel title="Разведка">
          <ul className="space-y-1 text-sm">
            <li>Земля: <b>{LOCATIONS[level.loc]!.name}</b>{level.boss ? " · босс" : ""}</li>
            <li>Ворота: <b>{level.gateHp} HP</b></li>
            <li>Время: <b>{Math.floor(level.timeLimit / 60)}:{String(level.timeLimit % 60).padStart(2, "0")}</b></li>
            <li>Сила башен: <b>×{level.towerMul}</b></li>
            {level.upgradeEvery > 0 && <li className="text-gold">Башни улучшаются каждые {level.upgradeEvery} с</li>}
            {level.buildEvery > 0 && <li className="text-ice">Новые башни каждые {level.buildEvery} с</li>}
            {level.repair && <li className="text-ice">Руины отстраиваются, если рядом нет монстров</li>}
          </ul>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">{kinds.map((k) => <div key={k}><b className="text-foreground">{TOWERS[k].name}</b> — {TOWERS[k].desc}</div>)}</div>
          <div className="mt-3 text-xs">Награда: <Currency kind="gold" value={level.gold} className="text-xs" /> {!p.stars[level.id] && <>+ <Currency kind="skulls" value={3} className="text-xs" /> за первую победу</>}</div>
          <GameButton variant="primary" size="lg" className="mt-4 w-full" onClick={() => setStarted(true)}>В бой!</GameButton>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">1–6 — призыв · Space — заклинание · Esc — пауза</p>
        </Panel>
      </div>
    </ScreenShell>
    </SquadDnd>
  );
}
