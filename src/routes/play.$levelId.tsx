import { MercyBadge, PuzzleBadge } from "@/components/ui-kit/MercyBadge";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ADAPT, createBattle, GATE, W, H } from "@/game/engine/battle";
import { MAPS, type LevelDef } from "@/game/data/levels";
import { Currency, GameButton, gameButton, Panel, ScreenShell } from "@/components/ui-kit";
import { Wallet } from "@/components/ui-kit/MonsterCard";
import { PoolCard, PoolZone, SquadDnd, SquadRow } from "@/components/ui-kit/SquadDnd";
import { BattleView } from "@/components/game/BattleView";
import { getLevel, recLabel } from "@/game/data/levels";
import { cn } from "@/lib/utils";
import { LOCATIONS } from "@/game/data/locations";
import { TOWERS, type TowerKind } from "@/game/data/towers";
import { COLLECTIBLE } from "@/game/data/monsters";
import { SPELLS } from "@/game/data/shop";
import { Cutscene } from "@/components/ui-kit/Cutscene";
import { isLevelUnlocked, markScene, prologueFor, squadLimit, talentBonuses, toggleSquad, defenseMemory, lossStreak, mercyBonuses, mercyTier, requiredPower, squadPower, garrisonScout } from "@/game/meta/progress";
import { SynergyList } from "@/components/ui-kit/SynergyList";
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
  const prologue = level && isLevelUnlocked(p, level.id) ? prologueFor(p, level.id) : null;
  if (prologue) return <Cutscene sceneId={prologue} onDone={() => setProgress((q) => markScene(q, prologue))} />;
  if (started) {
    const squad = p.squad.filter((id) => p.owned[id]).map((id) => ({ kind: id, lvl: p.owned[id]!.lvl }));
    return <BattleView key={run} level={level} squad={squad} spell={p.spell} mods={{ ...talentBonuses(p), startEssenceMul: mercyBonuses(mercyTier(lossStreak(p, level.id))).startEssenceMul, adapt: defenseMemory(p, level.id, squad.map((m) => m.kind)) }} onRetry={() => setRun((r) => r + 1)} />;
  }
  const kinds = [...new Set([...level.towers, ...level.buildKinds])] as TowerKind[];
  const loc = LOCATIONS[level.loc]!;
  const rec = requiredPower(level.id);
  const avg = squadPower(p);
  const tone = avg >= rec ? "poison" : avg >= rec * 0.85 ? "gold" : "blood";
  const toneBg = { poison: "bg-poison", gold: "bg-gold", blood: "bg-blood" }[tone];
  const toneText = { poison: "text-poison", gold: "text-gold", blood: "text-blood" }[tone];
  const sp = SPELLS[p.spell];
  return (
    <SquadDnd>
    <ScreenShell title="Подготовка к штурму" right={<Wallet />}>
      <section className={cn("panel-texture relative mb-4 overflow-hidden rounded-2xl border-2 p-5 shadow-[var(--shadow-deep)]", level.boss ? "border-blood/70" : "border-gold/50")}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/25 via-transparent to-blood/20" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{loc.name} · уровень {level.id}</div>
            <h2 className="font-display text-3xl uppercase text-primary drop-shadow-[0_0_14px_var(--primary)] md:text-4xl">{level.boss && <span className="mr-2">👑</span>}{level.name}</h2>
            <div className="mt-1 flex gap-1 text-xl">{[1, 2, 3].map((k) => <span key={k} className={k <= (p.stars[level.id] ?? 0) ? "text-gold" : "text-border"}>★</span>)}</div>
          </div>
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs"><span className="uppercase tracking-widest text-muted-foreground">Сила отряда</span><span className={toneText}><b>{avg}</b> / нужно <b>{rec}</b> · {recLabel(level.id)}</span></div>
            <div className="mt-1 h-3 overflow-hidden rounded-full border border-border bg-muted"><div className={cn("h-full rounded-full transition-[width]", toneBg)} style={{ width: `${Math.min(100, (avg / rec) * 100)}%` }} /></div>
            <div className="mt-1 text-[11px] text-muted-foreground">{tone === "poison" ? "Отряд готов к штурму" : tone === "gold" ? "Будет тяжело — стоит прокачаться" : "Слишком слабо: улучши монстров в лагере"}</div>
            <PuzzleBadge loc={level.loc} />
            <MercyBadge p={p} levelId={level.id} />
          </div>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="panel-texture rounded-2xl border-2 border-primary/50 bg-card/90 p-4 shadow-[var(--shadow-glow)]">
            <div className="mb-3 flex items-end justify-between">
              <div><div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Отряд в бой</div><h3 className="font-display text-xl uppercase text-primary">{p.squad.length}/{squadLimit(p)} бойцов</h3></div>
              <Link to="/squad" className={gameButton({ size: "sm", variant: "ghost" })}>Прокачать в лагере →</Link>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-2"><SquadRow onSelect={(id) => setProgress(toggleSquad(getProgress(), id))} /></div>
          </section>
          <SynergyList squad={p.squad} />
          <Panel title="Коллекция — перетащи в отряд или нажми">
            <PoolZone className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
              {COLLECTIBLE.filter((id) => p.owned[id]).map((id) => <PoolCard key={id} id={id} compact onSelect={() => setProgress(toggleSquad(getProgress(), id))} />)}
            </PoolZone>
          </Panel>
        </div>
        <div className="flex h-fit flex-col gap-4 lg:sticky lg:top-20">
          <Panel title="Разведка гарнизона">
            <ul data-tut="scout" className="mb-3 space-y-1.5">
              {garrisonScout(level, p.squad.filter((id) => p.owned[id])).map((l, i) => (
                <li key={i} className={cn("flex gap-2 rounded-lg border px-2 py-1.5 text-xs leading-snug", l.tone === "warn" ? "border-blood/40 bg-blood/10" : l.tone === "good" ? "border-poison/40 bg-poison/10" : "border-border bg-background/40")}>
                  <span className="shrink-0">{l.icon}</span><span>{l.text}</span>
                </li>))}
            </ul>
          </Panel>
          <Panel title="Разведка">
            <ReconMap level={level} />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border bg-background/40 p-2"><div className="text-xl">🏰</div><div className="font-display text-sm">{level.gateHp}</div><div className="text-[10px] text-muted-foreground">ворота</div></div>
              <div className="rounded-lg border border-border bg-background/40 p-2"><div className="text-xl">⏳</div><div className="font-display text-sm">{Math.floor(level.timeLimit / 60)}:{String(level.timeLimit % 60).padStart(2, "0")}</div><div className="text-[10px] text-muted-foreground">время</div></div>
              <div className="rounded-lg border border-border bg-background/40 p-2"><div className="text-xl">🗼</div><div className="font-display text-sm">{level.towers.length}</div><div className="text-[10px] text-muted-foreground">башен</div></div>
            </div>
            <div className="mt-3 space-y-1.5">{kinds.map((k) => <div key={k} className="rounded-lg border border-border bg-secondary/60 px-2 py-1.5 text-xs"><b className="font-display uppercase">{TOWERS[k].name}</b><div className="text-muted-foreground">{TOWERS[k].desc}</div></div>)}</div>
            <ul className="mt-2 space-y-0.5 text-xs">
              {level.upgradeEvery > 0 && <li className="text-gold">⬆ Башни улучшаются каждые {level.upgradeEvery} с</li>}
              {level.buildEvery > 0 && <li className="text-ice">🔨 Новые башни каждые {level.buildEvery} с</li>}
              {level.repair && <li className="text-ice">♻ Руины отстраиваются, если рядом нет монстров</li>}
            </ul>
          </Panel>
          <Link to="/squad" className="panel-texture flex items-center gap-3 rounded-xl border-2 border-blood/60 bg-blood/10 p-3 transition hover:-translate-y-0.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-blood bg-card text-2xl">{sp.icon}</span>
            <span className="min-w-0"><span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Заклинание · сменить</span><span className="block font-display uppercase">{sp.name}</span><span className="block truncate text-[11px] text-muted-foreground">{sp.desc}</span></span>
          </Link>
          <div className="text-center text-xs">Награда: <Currency kind="gold" value={level.gold} className="text-xs" /> {!p.stars[level.id] && <>+ <Currency kind="skulls" value={3} className="text-xs" /> за первую победу</>}</div>
          <GameButton variant="primary" size="lg" className="w-full animate-soft-pulse py-6 text-2xl shadow-[var(--shadow-glow)]" disabled={!p.squad.length} onClick={() => setStarted(true)}>⚔ В бой!</GameButton>
          <p className="text-center text-[11px] text-muted-foreground">1–6 — призыв · Space — заклинание · Esc — пауза</p>
        </div>
      </div>
    </ScreenShell>
    </SquadDnd>
  );
}

const TOWER_DOT: Partial<Record<TowerKind, string>> = { archer: "var(--gold)", cannon: "var(--blood)", mage: "var(--ice)", frost: "var(--ice)", bell: "var(--gold)", censer: "var(--poison)", ballista: "var(--primary)", flame: "var(--blood)" };
/** Defence scheme before the battle: road, tower posts, barricades and the ruin cover. */
function ReconMap({ level }: { level: LevelDef }) {
  const b = useMemo(() => createBattle(level, [], "march"), [level]);
  const pts = MAPS[level.map]!.path.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <div className="mb-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-border bg-background/60">
        <polyline points={pts} fill="none" stroke="var(--muted)" strokeWidth={46} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={pts} fill="none" stroke="var(--border)" strokeWidth={4} strokeDasharray="14 14" />
        {b.slots.map((s, i) => !b.towers.some((t) => t.slot === i) && <circle key={i} cx={s.x} cy={s.y} r={16} fill="none" stroke="var(--muted-foreground)" strokeWidth={3} strokeDasharray="6 6" />)}
        {b.towers.map((t) => <g key={t.id}><circle cx={t.x} cy={t.y} r={t.elite ? 26 : 20} fill={TOWER_DOT[t.kind] ?? "var(--foreground)"} stroke="var(--background)" strokeWidth={5} />{t.elite && <text x={t.x} y={t.y - 32} textAnchor="middle" fontSize={34} fill="var(--gold)">★</text>}</g>)}
        {b.obstacles.map((o, i) => o.kind === "barricade"
          ? <rect key={i} x={o.x - 30} y={o.y - 10} width={60} height={20} rx={4} fill="var(--gold)" stroke="var(--background)" strokeWidth={4} transform={`rotate(${(o.ang * 180) / Math.PI + 90} ${o.x} ${o.y})`} />
          : <circle key={i} cx={o.x} cy={o.y} r={40} fill="var(--ice)" opacity={0.35} />)}
        <rect x={GATE.x - 40} y={GATE.y - 70} width={70} height={140} rx={8} fill="var(--blood)" opacity={0.85} />
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span>● башни ({b.towers.length})</span><span>◌ пустые места</span>
        {b.obstacles.some((o) => o.kind === "barricade") && <span className="text-gold">▬ баррикады — их надо разбить</span>}
        {b.obstacles.some((o) => o.kind === "cover") && <span className="text-ice">◯ руины — укрытие от стрел</span>}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">Гарнизон: метка наводчика каждые {ADAPT.mark.every} с, паника при воротах ниже {ADAPT.panicAt * 100}%, ярость в последние {ADAPT.furyLast} с. Осадные бойцы и бомберы срывают суперзаряд.</div>
    </div>
  );
}
