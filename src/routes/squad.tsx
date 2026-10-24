import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GEAR_LEVELS, GEAR_NAMES } from "@/game/render/gear";
import { cn } from "@/lib/utils";
import { Currency, GameButton, MonsterPortrait, Panel, RarityBadge, ScreenShell, StatBar, Tabs } from "@/components/ui-kit";
import { Wallet } from "@/components/ui-kit/MonsterCard";
import { PoolCard, PoolZone, SquadDnd, SquadRow } from "@/components/ui-kit/SquadDnd";
import { COLLECTIBLE, MONSTERS, type MonsterId } from "@/game/data/monsters";
import { RARITIES, RARITY_INFO, type Rarity } from "@/game/data/rarity";
import { SPELLS, SPELL_ORDER } from "@/game/data/shop";
import { canUpgrade, isSpellUnlocked, MAX_MONSTER_LVL, MAX_SHARDS_USED, monsterStats, shardsRequired, squadLimit, toggleSquad, upgradeCost, upgradeMonster } from "@/game/meta/progress";
import { setProgress, useProgress } from "@/game/meta/store";
import { sfx } from "@/game/audio";

export const Route = createFileRoute("/squad")({
  head: () => ({
    meta: [
      { title: "Отряд и прокачка — SIEGE: March of Doom" },
      { name: "description", content: "Коллекция монстров Орды: параметры, способности, улучшения и выбор отряда." },
      { property: "og:title", content: "Отряд — SIEGE: March of Doom" },
      { property: "og:description", content: "Прокачай монстров перед штурмом." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Squad,
});

function Squad() {
  const p = useProgress();
  const [filter, setFilter] = useState<Rarity | "all">("all");
  const [sel, setSel] = useState<MonsterId>("goblin");
  const list = COLLECTIBLE.filter((m) => filter === "all" || MONSTERS[m].rarity === filter);
  return (
    <SquadDnd>
    <ScreenShell title="Отряд" right={<Wallet />}>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Panel title={`Отряд в бой (${p.squad.length}/${squadLimit(p)})`}>
            <SquadRow selected={sel} onSelect={setSel} />
            <p className="mt-6 text-xs text-muted-foreground">Перетащи монстра из коллекции в отряд, или обратно — чтобы убрать. Порядок = клавиши 1–6. Слот 5 открывается после уровня 4, слот 6 — после уровня 8.</p>
          </Panel>
          <Panel title="Заклинание командира">
            <div className="grid gap-2 sm:grid-cols-2">
              {SPELL_ORDER.map((s) => {
                const open = isSpellUnlocked(p, s);
                return (
                  <button key={s} disabled={!open} onClick={() => setProgress((x) => ({ ...x, spell: s }))} className={cn("rounded-lg border p-2 text-left text-xs transition", p.spell === s ? "border-primary bg-primary/15" : "border-border bg-secondary", !open && "opacity-40")}>
                    <div className="font-semibold">{SPELLS[s].icon} {SPELLS[s].name}</div>
                    <div className="text-muted-foreground">{open ? SPELLS[s].desc : `Откроется после уровня ${SPELLS[s].unlockAfter}`}</div>
                  </button>
                );
              })}
            </div>
          </Panel>
          <Panel title="Коллекция">
            <Tabs value={filter} onChange={setFilter} items={[{ value: "all" as const, label: "Все" }, ...RARITIES.map((r) => ({ value: r, label: RARITY_INFO[r].name }))]} />
            <PoolZone className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {list.map((id) => <PoolCard key={id} id={id} selected={id === sel} onSelect={() => setSel(id)} />)}
            </PoolZone>
          </Panel>
        </div>
        <Detail id={sel} />
      </div>
    </ScreenShell>
    </SquadDnd>
  );
}

function Detail({ id }: { id: MonsterId }) {
  const p = useProgress(); const def = MONSTERS[id]; const o = p.owned[id];
  const lvl = o?.lvl ?? 1; const st = monsterStats(id, lvl); const nx = monsterStats(id, Math.min(MAX_MONSTER_LVL, lvl + 1));
  const cost = o ? upgradeCost(def.rarity, o.lvl, o.shards) : 0;
  const inSquad = p.squad.includes(id);
  const need = o ? shardsRequired(o.lvl) : 0; const ok = canUpgrade(p, id);
  const [flash, setFlash] = useState(0);
  useEffect(() => { setFlash(0); }, [id]);
  const rows: [string, number, number, number][] = [
    ["Здоровье", st.hp, nx.hp, 3000], ["Урон/с", st.dps, nx.dps, 80], ["Броня %", Math.round(st.armor * 100), Math.round(nx.armor * 100), 80], ["Скорость", st.speed, nx.speed, 120],
  ];
  return (
    <Panel className="h-fit lg:sticky lg:top-20">
      <div className="flex gap-3">
        <div className="relative">
          <MonsterPortrait id={id} size={120} animate silhouette={!o} lvl={lvl} />
          {flash > 0 && <div key={flash} className="animate-level-flash pointer-events-none absolute inset-0 rounded-full bg-gold/70 blur-md" />}
          {flash > 0 && <div key={flash + 1} className="animate-float-up pointer-events-none absolute inset-x-0 top-2 text-center font-display text-lg text-gold">Ур.{lvl}!</div>}
        </div>
        <div className="flex-1">
          <RarityBadge rarity={def.rarity} />
          <h3 className="mt-1 font-display text-lg">{o ? def.name : "Не открыт"}</h3>
          <div className="text-xs text-muted-foreground">{def.role}</div>
          {o && <div className="mt-1 text-sm font-bold text-gold">Уровень {o.lvl}/{MAX_MONSTER_LVL}</div>}
          {o && <div className="text-xs text-muted-foreground">Осколки: {o.shards}{need > 0 ? ` · нужно ${need} для улучшения` : ` (−${Math.min(o.shards, MAX_SHARDS_USED) * 10}% к цене)`}</div>}
          {o && <div className="text-[10px] text-muted-foreground">Снаряжение: {GEAR_LEVELS.map((gl, i) => <span key={gl} className={lvl >= gl ? "text-gold" : ""}>{i ? " · " : ""}{GEAR_NAMES[id][i]} ({gl})</span>)}</div>}
        </div>
      </div>
      <p className="mt-3 rounded-md border border-border bg-muted p-2 text-sm">{def.ability}{lvl >= 5 ? " Способность усилена." : ""}</p>
      <div className="mt-3 space-y-2">
        {rows.map(([n, v, nv, max]) => (
          <div key={n}>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">{n}</span><span>{v}{o && lvl < MAX_MONSTER_LVL && nv !== v && <span className="text-poison"> → {nv}</span>}</span></div>
            <StatBar value={v} max={max} tone="primary" />
          </div>
        ))}
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Призыв / перезарядка</span><span><Currency kind="essence" value={st.cost} className="text-xs" /> · {st.cooldown}с</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Сила способности</span><span>×{st.ability}{o && lvl < MAX_MONSTER_LVL && nx.ability !== st.ability && <span className="text-poison"> → ×{nx.ability}</span>}</span></div>
      </div>
      {o ? (
        <div className="mt-4 flex flex-col gap-2">
          <GameButton variant="gold" className={cn(ok && "animate-soft-pulse")} disabled={!ok} onClick={() => { const n = upgradeMonster(p, id); if (n) { setProgress(n); const nl = n.owned[id]?.lvl ?? 0; if ((GEAR_LEVELS as readonly number[]).includes(nl)) sfx.gearUp(); else sfx.levelUp(); setFlash(performance.now()); } }}>
            {lvl >= MAX_MONSTER_LVL ? "Максимум" : o.shards < need ? `Нужно осколков: ${o.shards}/${need}` : <>Улучшить · <Currency kind="gold" value={cost} className="text-primary-foreground" />{need > 0 && <span>· {need}🧩</span>}</>}
          </GameButton>
          <GameButton variant={inSquad ? "secondary" : "primary"} disabled={!inSquad && p.squad.length >= squadLimit(p)} onClick={() => setProgress(toggleSquad(p, id))}>
            {inSquad ? "Убрать из отряда" : p.squad.length >= squadLimit(p) ? "Отряд полон" : "Взять в отряд"}
          </GameButton>
        </div>
      ) : <p className="mt-4 text-center text-sm text-muted-foreground">Найди этого монстра в кейсах магазина.</p>}
    </Panel>
  );
}
