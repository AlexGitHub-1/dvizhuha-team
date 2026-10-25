import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GEAR_LEVELS, GEAR_NAMES } from "@/game/render/gear";
import { cn } from "@/lib/utils";
import { Currency, GameButton, MonsterPortrait, Panel, RARITY_BORDER, RarityBadge, ScreenShell, StatBar, Tabs } from "@/components/ui-kit";
import { Tutorial } from "@/components/ui-kit/Tutorial";

const RARITY_BG: Record<Rarity, string> = { common: "bg-rarity-common", rare: "bg-rarity-rare", epic: "bg-rarity-epic", legendary: "bg-rarity-legendary", mythic: "bg-rarity-mythic" };
import { Wallet } from "@/components/ui-kit/MonsterCard";
import { PoolCard, PoolZone, SquadDnd, SquadRow } from "@/components/ui-kit/SquadDnd";
import { COLLECTIBLE, MONSTERS, type MonsterId } from "@/game/data/monsters";
import { RARITIES, RARITY_INFO, type Rarity } from "@/game/data/rarity";
import { SPELLS, SPELL_ORDER } from "@/game/data/shop";
import { SynergyList } from "@/components/ui-kit/SynergyList";
import { MONSTER_LORE } from "@/game/data/story";
import { abilityText, canUpgrade, isSpellUnlocked, MAX_MONSTER_LVL, maxLvl, MAX_SHARDS_USED, monsterStats, shardsRequired, squadLimit, toggleSquad, upgradeAll, upgradeCost, upgradePrice, upgradeMonster } from "@/game/meta/progress";
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

type Sort = "rarity" | "level" | "cost";
const RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };

function Squad() {
  const p = useProgress();
  const [filter, setFilter] = useState<Rarity | "all">("all");
  const [sort, setSort] = useState<Sort>("rarity");
  const [sel, setSel] = useState<MonsterId>("goblin");
  const [readyFirst, setReadyFirst] = useState(false);
  const readyN = COLLECTIBLE.filter((m) => canUpgrade(p, m)).length;
  const list = COLLECTIBLE.filter((m) => filter === "all" || MONSTERS[m].rarity === filter).sort((a, b) => {
    const oa = p.owned[a], ob = p.owned[b];
    if (!!oa !== !!ob) return oa ? -1 : 1;
    if (readyFirst) { const ra = canUpgrade(p, a), rb = canUpgrade(p, b); if (ra !== rb) return ra ? -1 : 1; }
    if (sort === "level") return (ob?.lvl ?? 0) - (oa?.lvl ?? 0);
    if (sort === "cost") return MONSTERS[a].cost - MONSTERS[b].cost;
    return RANK[MONSTERS[b].rarity] - RANK[MONSTERS[a].rarity];
  });
  const ownedN = COLLECTIBLE.filter((m) => p.owned[m]).length;
  const avg = p.squad.length ? p.squad.reduce((t, m) => t + (p.owned[m]?.lvl ?? 1), 0) / p.squad.length : 0;
  return (
    <SquadDnd>
    <ScreenShell title="Военный лагерь" right={<div className="flex items-center gap-3">{(() => { const r = upgradeAll(p); return (
      <GameButton variant="gold" size="sm" disabled={!r.count} className={cn(r.count > 0 && "animate-soft-pulse")} onClick={() => { const n = upgradeAll(p); if (n.count) { setProgress(n.p); sfx.levelUp(); } }}>⬆ Улучшить всех{r.count > 0 && ` (${r.count})`}</GameButton>); })()}<Wallet /></div>}>
      <Tutorial id="squad" />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <section data-tut="squad-row" className="panel-texture relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-card/90 p-4 shadow-[var(--shadow-glow)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Отряд в бой</div>
                <h2 className="font-display text-2xl uppercase text-primary">{p.squad.length}/{squadLimit(p)} бойцов</h2>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Сила отряда</div>
                <div className="font-display text-2xl text-gold">{avg.toFixed(1)}★</div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-2"><SquadRow selected={sel} onSelect={setSel} /></div>
            <p className="mt-3 text-xs text-muted-foreground">Перетаскивай монстров между отрядом и коллекцией. Порядок = клавиши 1–6. Слот 6 открывается после уровня 8.</p>
          </section>
          <div data-tut="synergies"><Panel title="Синергии отряда"><SynergyList squad={p.squad} /></Panel></div>
          <div data-tut="collection">
          <Panel title={<span>Коллекция <span className="text-xs text-muted-foreground">· открыто {ownedN}/{COLLECTIBLE.length}</span></span>}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs value={filter} onChange={setFilter} items={[{ value: "all" as const, label: "Все" }, ...RARITIES.map((r) => ({ value: r, label: RARITY_INFO[r].name }))]} />
              <button onClick={() => { sfx.stone(); setReadyFirst((x) => !x); }} className={cn("flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-display text-xs uppercase transition", readyFirst ? "border-gold bg-gold/20 text-gold shadow-[0_0_14px_color-mix(in_oklab,var(--gold)_45%,transparent)]" : "border-border bg-secondary text-muted-foreground hover:border-gold/60")}>
                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[10px]", readyFirst ? "bg-gold text-background" : "bg-muted")}>↑</span>Можно улучшить <span className="rounded-full bg-background/60 px-1.5">{readyN}</span>
              </button>
              <Tabs value={sort} onChange={setSort} items={[{ value: "rarity" as const, label: "Редкость" }, { value: "level" as const, label: "Уровень" }, { value: "cost" as const, label: "Цена" }]} />
            </div>
            <PoolZone className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
              {list.map((id) => <PoolCard key={id} id={id} selected={id === sel} partnerOf={sel} onSelect={() => setSel(id)} />)}
            </PoolZone>
          </Panel>
          </div>
          <Panel title="Заклинание командира">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {SPELL_ORDER.map((s) => {
                const open = isSpellUnlocked(p, s); const on = p.spell === s;
                return (
                  <button key={s} disabled={!open} onClick={() => setProgress((x) => ({ ...x, spell: s }))} className={cn("relative rounded-xl border-2 p-3 text-left text-xs transition hover:-translate-y-0.5", on ? "border-primary bg-primary/15 shadow-[var(--shadow-glow)]" : "border-border bg-secondary", !open && "opacity-40 hover:translate-y-0")}>
                    <div className="text-3xl">{open ? SPELLS[s].icon : "🔒"}</div>
                    <div className="mt-1 font-display text-sm uppercase">{SPELLS[s].name}</div>
                    <div className="text-muted-foreground">{open ? SPELLS[s].desc : `Откроется после уровня ${SPELLS[s].unlockAfter}`}</div>
                    {on && <span className="absolute right-2 top-2 rounded-full bg-primary px-2 text-[10px] font-bold text-primary-foreground">ВЫБРАНО</span>}
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
        <div data-tut="detail" className="h-fit lg:sticky lg:top-20"><Detail id={sel} /></div>
      </div>
    </ScreenShell>
    </SquadDnd>
  );
}

function Detail({ id }: { id: MonsterId }) {
  const p = useProgress(); const def = MONSTERS[id]; const o = p.owned[id]; const MAX_LVL = maxLvl(id);
  const lvl = o?.lvl ?? 1; const st = monsterStats(id, lvl); const nx = monsterStats(id, Math.min(MAX_LVL, lvl + 1));
  const cost = o ? upgradePrice(p, id) : 0;
  const inSquad = p.squad.includes(id);
  const need = o ? shardsRequired(o.lvl) : 0; const ok = canUpgrade(p, id);
  const [flash, setFlash] = useState(0);
  useEffect(() => { setFlash(0); }, [id]);
  const rows: [string, number, number, number][] = [
    ["Здоровье", st.hp, nx.hp, 3000], st.blast ? ["Урон взрыва", st.blast, nx.blast, 1500] : ["Урон/с", st.dps, nx.dps, 80], ["Броня %", Math.round(st.armor * 100), Math.round(nx.armor * 100), 80], ["Скорость", st.speed, nx.speed, 120],
  ];
  return (
    <Panel className="overflow-hidden">
      <div className={cn("relative -mx-4 -mt-4 mb-3 flex flex-col items-center border-b-2 bg-background/40 px-4 pb-3 pt-5", RARITY_BORDER[def.rarity])}>
        <div className={cn("pointer-events-none absolute left-1/2 top-6 h-40 w-40 -translate-x-1/2 rounded-full opacity-40 blur-2xl", RARITY_BG[def.rarity])} />
        <div className="relative">
          <MonsterPortrait id={id} size={170} animate silhouette={!o} lvl={lvl} />
          {flash > 0 && <div key={flash} className="animate-level-flash pointer-events-none absolute inset-0 rounded-full bg-gold/70 blur-md" />}
          {flash > 0 && <div key={flash + 1} className="animate-float-up pointer-events-none absolute inset-x-0 top-2 text-center font-display text-2xl text-gold">Ур.{lvl}!</div>}
          {o && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border-2 border-gold bg-card px-3 font-display text-sm text-gold">{o.lvl}/{MAX_LVL}</span>}
        </div>
        <RarityBadge rarity={def.rarity} className="mt-3" />
        <h3 className="mt-1 font-display text-2xl uppercase">{o ? def.name : "Не открыт"}</h3>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{def.role}</div>
        {o && (o.lvl < 5 && o.shards === 0
          ? <div className="mt-1 text-xs text-muted-foreground">Осколки нужны с ур. 5</div>
          : <div className="mt-1 text-xs text-muted-foreground">🧩 {o.shards}{need > 0 ? ` · нужно ${need} для улучшения` : ` (−${Math.min(o.shards, MAX_SHARDS_USED) * 10}% к цене)`}</div>)}
      </div>
      {o && <div className="grid grid-cols-4 gap-1.5">{GEAR_LEVELS.map((gl, i) => { const has = lvl >= gl; return (
        <div key={gl} title={GEAR_NAMES[id][i]} className={cn("rounded-lg border p-1.5 text-center", has ? "border-gold/70 bg-gold/10" : "border-border bg-muted/50 opacity-60")}>
          <div className="text-lg">{has ? "🎖" : "🔒"}</div>
          <div className="truncate text-[10px] leading-tight">{GEAR_NAMES[id][i]}</div>
          <div className={cn("text-[10px] font-bold", has ? "text-gold" : "text-muted-foreground")}>ур. {gl}</div>
        </div>); })}</div>}
      {MONSTER_LORE[id] && <p className="mt-3 border-l-2 border-gold/60 pl-2 text-xs italic text-muted-foreground">«{MONSTER_LORE[id]}» <span className="not-italic text-gold/80">— Владыка</span></p>}
      <div className="mt-3 rounded-md border border-border bg-muted p-2 text-sm">
        <p>{def.ability}</p>
        {abilityText(id, lvl).length > 0 && <ul className="mt-2 space-y-1 border-t border-border/70 pt-2">{abilityText(id, lvl).map((t) => <li key={t} className="flex gap-1.5 text-xs"><span className="text-gold">◆</span><span>{t}</span></li>)}</ul>}
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(([n, v, nv, max]) => (
          <div key={n}>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">{n}</span><span>{v}{o && lvl < MAX_LVL && nv !== v && <span className="text-poison"> → {nv} (+{Math.round((nv - v) * 10) / 10})</span>}</span></div>
            <StatBar value={v} max={max} tone="primary" />
          </div>
        ))}
        {st.blast > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Радиус взрыва · по воротам ×2.2</span><span>{st.blastRadius}</span></div>}
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Призыв / перезарядка</span><span><Currency kind="essence" value={st.cost} className="text-xs" /> · {st.cooldown}с</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Сила способности</span><span>×{st.ability}{o && lvl < MAX_LVL && nx.ability !== st.ability && <span className="text-poison"> → ×{nx.ability}</span>}</span></div>
      </div>
      {o ? (
        <div className="mt-4 flex flex-col gap-2">
          <GameButton variant="gold" className={cn(ok && "animate-soft-pulse")} disabled={!ok} onClick={() => { const n = upgradeMonster(p, id); if (n) { setProgress(n); const nl = n.owned[id]?.lvl ?? 0; if ((GEAR_LEVELS as readonly number[]).includes(nl)) sfx.gearUp(); else sfx.levelUp(); setFlash(performance.now()); } }}>
            {lvl >= MAX_LVL ? `Потолок: ур. ${MAX_LVL}` : o.shards < need ? `Нужно осколков: ${o.shards}/${need}` : p.gold < cost ? <>Не хватает <Currency kind="gold" value={cost - p.gold} className="text-primary-foreground" /></> : <>Улучшить · <Currency kind="gold" value={cost} className="text-primary-foreground" />{need > 0 && <span>· {need}🧩</span>}</>}
          </GameButton>
          {lvl < MAX_LVL && o.shards < need && <p className="rounded-md border border-rarity-epic/40 bg-rarity-epic/10 px-2 py-1.5 text-center text-[11px] leading-snug">🧩 Где взять: первая победа на уровнях 5+ (+1 всему отряду), первые 3★ (+2) и кейсы в Сокровищнице.</p>}
          <GameButton variant={inSquad ? "secondary" : "primary"} disabled={!inSquad && p.squad.length >= squadLimit(p)} onClick={() => setProgress(toggleSquad(p, id))}>
            {inSquad ? "Убрать из отряда" : p.squad.length >= squadLimit(p) ? "Отряд полон" : "Взять в отряд"}
          </GameButton>
        </div>
      ) : <p className="mt-4 text-center text-sm text-muted-foreground">Найди этого монстра в кейсах магазина.</p>}
    </Panel>
  );
}
