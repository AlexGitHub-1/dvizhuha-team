import { MercyBadge } from "@/components/ui-kit/MercyBadge";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { Link } from "@tanstack/react-router";
import { SpellMedallion } from "@/components/ui-kit/SpellMedallion";
import { cn } from "@/lib/utils";
import { Currency, GameButton, gameButton, Modal, MonsterPortrait, Panel, RARITY_BORDER, StatBar, useCountUp } from "@/components/ui-kit";
import { recLabel, type LevelDef } from "@/game/data/levels";
import { MONSTERS, type MonsterId } from "@/game/data/monsters";
import { SPELLS, type SpellId } from "@/game/data/shop";
import { CHARS } from "@/game/data/story";
import { ADAPT_NAME, canSummon, castSpell, createBattle, requestSummon, H, MAX_ESSENCE, outcome, summon, summonCost, update, W, type Battle } from "@/game/engine/battle";
import { FightReport } from "./FightReport";
import { Tutorial } from "@/components/ui-kit/Tutorial";
import { renderBattle, towerAt, type Aim } from "@/game/render/battle";
import { SYNERGIES } from "@/game/data/synergies";
import { applyBattle, defeatTip, squadUpgradeReady, type BattleMods, requiredPower, squadPower } from "@/game/meta/progress";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";
import { setIntensity, startScene, stopScene, unlockAudio, sfx } from "@/game/audio";

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

interface Reward { gold: number; skulls: number; stars: number; firstWin: boolean; shardGifts?: { id: MonsterId; n: number }[] }

export function BattleView({ level, squad, spell, mods, onRetry }: { level: LevelDef; squad: { kind: MonsterId; lvl: number }[]; spell: SpellId; mods: BattleMods; onRetry: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<Battle | null>(null);
  if (!bRef.current) bRef.current = createBattle(level, squad, spell, mods);
  if (import.meta.env.DEV && typeof window !== "undefined") (window as unknown as { __battle?: Battle }).__battle = bRef.current;
  const p = useProgress();
  const [, force] = useState(0);
  const [reward, setReward] = useState<{ won: boolean; r: Reward } | null>(null);
  const [paused, setPaused] = useState(false);
  const [tut, setTut] = useState(false);
  const onTut = useCallback((on: boolean) => setTut(on), []);
  const pausedRef = useRef(false); pausedRef.current = paused || tut;
  const speed = p.speed ?? 1; const speedRef = useRef(1); speedRef.current = speed;
  const toggleSpeed = useCallback(() => { sfx.speed(); setProgress((x) => ({ ...x, speed: (x.speed ?? 1) === 2 ? 1 : 2 })); }, []);

  const doSummon = useCallback((i: number) => { const b = bRef.current!; if (!pausedRef.current) requestSummon(b, i); }, []);
  /** summon slots held down (button or key) — summoned again as soon as possible */
  const held = useRef(new Set<number>());
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const [overTower, setOverTower] = useState(false);
  const aimRef = useRef<Aim | null>(null);
  const [aiming, setAiming] = useState(false);
  const target = SPELLS[spell].target;
  const doSpell = useCallback(() => {
    const b = bRef.current!; if (pausedRef.current || b.spellCd > 0) return;
    if (target) { setAiming((a) => { const n = !a; if (!n) aimRef.current = null; return n; }); return; }
    castSpell(b);
  }, [target]);
  /** field placement inside the full-size canvas (CSS px) */
  const view = useRef({ scale: 1, ox: 0, oy: 0 });
  const toWorld = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); const v = view.current; return { x: (e.clientX - r.left - v.ox) / v.scale, y: (e.clientY - r.top - v.oy) / v.scale }; };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => { const w = toWorld(e); hoverRef.current = w; setOverTower(!!towerAt(bRef.current!, w.x, w.y)); if (aiming && target) aimRef.current = { ...w, kind: target }; };
  const onClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!aiming) return; const p = toWorld(e);
    if (castSpell(bRef.current!, p.x, p.y)) { setAiming(false); aimRef.current = null; }
  };

  useEffect(() => { unlockAudio(); startScene(bRef.current!.theme, true); return () => { stopScene(); setIntensity(0); }; }, []);

  useEffect(() => {
    unlockAudio();
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key); if (n >= 1 && n <= 6) { if (!e.repeat) doSummon(n - 1); held.current.add(n - 1); }
      if (e.code === "KeyF") toggleFullscreen();
      if (e.code === "Tab") { e.preventDefault(); toggleSpeed(); }
      if (e.code === "Space") { e.preventDefault(); doSpell(); }
      if (e.code === "Escape" || e.code === "KeyP") { setAiming((a) => { if (a) { aimRef.current = null; return false; } setPaused((x) => !x); return a; }); }
    };
    const onUp = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= 6) held.current.delete(n - 1); };
    const clear = () => held.current.clear();
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onUp); window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); window.removeEventListener("blur", clear); };
  }, [doSummon, doSpell, toggleSpeed]);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current, w = wrapRef.current; if (!c || !w) return;
      const cw = w.clientWidth, ch = w.clientHeight;
      const scale = Math.min(cw / W, ch / H); const dpr = window.devicePixelRatio || 1;
      const ox = (cw - W * scale) / 2, oy = (ch - H * scale) / 2; view.current = { scale, ox, oy };
      c.style.width = `${cw}px`; c.style.height = `${ch}px`;
      c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr);
      c.getContext("2d")!.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
    };
    resize(); const ro = new ResizeObserver(resize); if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0, last = performance.now(), hud = 0, done = false, lastTick = 99;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const b = bRef.current!;
      if (!pausedRef.current && b.hitStop > 0) b.hitStop -= dt;
      else if (!pausedRef.current) { for (const i of held.current) if (canSummon(b, i)) summon(b, i); for (let k = 0; k < speedRef.current; k++) { update(b, dt); if (b.result) break; } }
      setIntensity(1 - b.gateHp / b.gateMax);
      const ctx = canvasRef.current?.getContext("2d"); if (ctx) { try { renderBattle(ctx, b, aimRef.current, hoverRef.current); } catch (err) { ctx.reset?.(); console.error(err); } }
      if (b.result && !done) {
        done = true;
        setTimeout(() => {
          const r = applyBattle(getProgress(), level, outcome(b)); setProgress(r.p); sfx.coins();
          setReward({ won: b.result === "won", r: r.reward });
        }, 1500);
      }
      { const lf = Math.ceil(level.timeLimit - b.time); if (!b.result && lf <= 10 && lf > 0 && lf !== lastTick) { lastTick = lf; sfx.tick(lf); } }
      hud += dt; if (hud > 0.1) { hud = 0; force((x) => x + 1); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [level]);

  const b = bRef.current;
  const left = Math.max(0, level.timeLimit - b.time);
  const sp = SPELLS[spell];
  const final = !b.result && left > 0 && left <= 10;
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card/90 px-3 py-2">
        <div className="flex items-center gap-2">
          <GameButton size="sm" variant="ghost" onClick={() => setPaused(true)}>⏸ Пауза</GameButton>
          <GameButton size="sm" variant="ghost" title="Полный экран (F)" onClick={toggleFullscreen}>⛶</GameButton>
          <span className="font-display text-sm uppercase text-primary">Ур. {level.id} · {level.name}</span>
        </div>
        <div data-tut="gate" className="flex w-[min(380px,40%)] flex-col">
          <div className="flex justify-between text-[10px] tracking-widest text-muted-foreground"><span>ВОРОТА</span><span>{Math.ceil(b.gateHp)}/{b.gateMax}</span></div>
          <StatBar value={b.gateHp} max={b.gateMax} tone="blood" className="h-3" />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div data-tut="essence" className="flex w-36 flex-col gap-0.5">
            <Currency kind="essence" value={b.essence} className="text-lg" />
            <div className="relative h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(b.essence / MAX_ESSENCE) * 100}%` }} />
            </div>
          </div>
          <span key={final ? Math.ceil(left) : "t"} className={cn("font-display tabular-nums transition-all", left < 30 && "text-blood", final && "animate-big-shake text-2xl drop-shadow-[0_0_10px_var(--blood)]")}>{Math.floor(left / 60)}:{String(Math.floor(left % 60)).padStart(2, "0")}</span>
          <button onClick={toggleSpeed} title="Скорость боя (Tab)" className={cn("relative overflow-hidden rounded-full border-2 px-3 py-0.5 font-display text-sm transition", speed === 2 ? "border-gold bg-gold/20 text-gold shadow-[0_0_16px_color-mix(in_oklab,var(--gold)_60%,transparent)]" : "border-border bg-secondary text-muted-foreground hover:border-gold/60 hover:text-gold")}>
            {speed === 2 && <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 animate-speed-sweep bg-gradient-to-r from-transparent via-gold/40 to-transparent" />}
            <span className="relative">{speed === 2 ? "»» ×2" : "› ×1"}</span>
          </button>
          <button className="text-xs" onClick={() => setProgress((x) => ({ ...x, muted: !x.muted }))}>{p.muted ? "🔇" : "🔊"}</button>
        </div>
      </header>
      <div ref={wrapRef} data-tut="field" className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"><canvas ref={canvasRef} onPointerMove={onMove} onPointerLeave={() => { hoverRef.current = null; setOverTower(false); }} onPointerDown={onClick} className={cn("absolute inset-0", aiming ? "cursor-crosshair" : overTower && "cursor-help")} />
        {speed === 2 && !b.result && <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 70px color-mix(in oklab, var(--gold) 22%, transparent)" }}><div className="absolute inset-y-0 left-0 w-24 animate-speed-lines bg-[repeating-linear-gradient(0deg,transparent_0_18px,color-mix(in_oklab,var(--gold)_18%,transparent)_18px_20px)] opacity-50 [mask-image:linear-gradient(90deg,black,transparent)]" /><div className="absolute inset-y-0 right-0 w-24 animate-speed-lines bg-[repeating-linear-gradient(0deg,transparent_0_18px,color-mix(in_oklab,var(--gold)_18%,transparent)_18px_20px)] opacity-50 [mask-image:linear-gradient(270deg,black,transparent)]" /></div>}
        {final && <>
          <div className="pointer-events-none absolute inset-0 animate-soft-pulse" style={{ boxShadow: `inset 0 0 ${80 + (10 - left) * 14}px color-mix(in oklab, var(--blood) ${40 + (10 - left) * 5}%, transparent)` }} />
          <div key={Math.ceil(left)} className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="animate-pop-in font-display text-[12rem] leading-none text-blood opacity-25 drop-shadow-[0_0_30px_var(--blood)]">{Math.ceil(left)}</span></div>
          {left > 8 && <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 animate-pop-in rounded-lg border-2 border-blood bg-card/90 px-6 py-2 font-display text-2xl uppercase text-blood shadow-[0_0_30px_var(--blood)]">Время на исходе!</div>}
        </>}
        {aiming && <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-blood bg-card/90 px-4 py-1 font-display text-sm text-blood">{target === "tower" ? "Кликни по башне" : "Кликни по полю"} · Esc — отмена</div>}
        {b.shouts.map((s) => { const c = CHARS[s.who]; const a = Math.min(1, s.life, (s.max - s.life) * 3); return (
          <div key={s.text} className="pointer-events-none absolute right-[9%] top-[12%] z-10 max-w-sm" style={{ opacity: a, transform: `translateY(${(1 - a) * -12}px)` }}>
            <div className="panel-texture relative rounded-xl border-2 border-gold/70 bg-card/95 px-4 py-2.5 shadow-[var(--shadow-deep)]">
              <p className="font-display text-[11px] uppercase tracking-widest text-gold">{c.name}</p>
              <p className="mt-0.5 text-base italic leading-snug text-foreground">«{s.text}»</p>
              <span className="absolute -bottom-2 right-10 h-4 w-4 rotate-45 border-b-2 border-r-2 border-gold/70 bg-card" />
            </div>
          </div>); })}
        {b.syn.size > 0 && <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">{SYNERGIES.filter((s) => b.syn.has(s.id)).map((s) => <span key={s.id} className="rounded-md border border-poison/50 bg-card/80 px-2 py-0.5 text-[11px] text-poison">{s.icon} {s.name}</span>)}</div>}
      </div>
      <footer className="relative flex flex-wrap items-end justify-center gap-3 border-t-2 border-gold/50 bg-card px-3 pb-2 pt-3 shadow-[0_-10px_30px_color-mix(in_oklab,var(--background)_80%,transparent)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div data-tut="summon" className="flex flex-wrap gap-2">
        {b.squad.map((s, i) => {
          const def = MONSTERS[s.kind]; const ok = canSummon(b, i); const cost = summonCost(b, i); const poor = b.essence < cost;
          const cd = s.cd > 0 ? s.cd / (def.cooldown * b.mods.cooldownMul) : 0;
          return (
            <button key={s.kind} title="Удерживай для автопризыва"
              onClick={(e) => { if (e.detail === 0) doSummon(i); }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); doSummon(i); held.current.add(i); }}
              onPointerUp={() => held.current.delete(i)} onPointerCancel={() => held.current.delete(i)} onLostPointerCapture={() => held.current.delete(i)}
              className={cn("group relative flex w-24 flex-col items-center overflow-hidden rounded-xl border-2 bg-secondary pb-1.5 pt-2 transition", RARITY_BORDER[def.rarity],
                ok ? "-translate-y-1 shadow-[var(--shadow-glow)] hover:-translate-y-1.5" : b.queue === i ? "animate-soft-pulse border-gold" : "opacity-55 grayscale-[0.6]")}>
              {b.queue === i && <span className="absolute inset-x-0 bottom-0 z-20 bg-gold/90 py-px text-center font-display text-[10px] uppercase text-background">В очереди</span>}
              <kbd className="absolute left-1 top-1 z-20 rounded-md border border-gold/60 bg-background px-1.5 font-display text-[11px] text-gold">{i + 1}</kbd>
              <span className="absolute right-1 top-1 z-20 text-[10px] font-bold text-gold">Ур.{s.lvl}</span>
              <div className="relative">
                <MonsterPortrait id={s.kind} size={56} lvl={s.lvl} />
                {cd > 0 && <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(color-mix(in oklab, var(--background) 75%, transparent) ${cd * 360}deg, transparent 0)` }} />}
                {cd > 0 && <span className="absolute inset-0 flex items-center justify-center font-display text-sm">{s.cd.toFixed(1)}</span>}
              </div>
              <div className="mt-0.5 w-full truncate px-1 text-center text-[10px] font-semibold">{def.name}</div>
              <span className={cn("mt-0.5 rounded-full border px-2 font-display text-xs", poor ? "border-blood/60 bg-blood/15 text-blood" : "border-primary/60 bg-primary/15 text-primary")}>✦ {cost}</span>
            </button>
          );
        })}
        </div>
        <SpellMedallion icon={sp.icon} name={sp.name} cd={b.spellCd} max={sp.cooldown * b.mods.spellCdMul} aiming={aiming} onClick={doSpell} />
      </footer>

      <Tutorial id="battle" delay={300} onActive={onTut} />
      <Modal open={paused && !reward && !tut}>
        <Panel title="Пауза" className="text-center">
          <div className="flex flex-col gap-2">
            <GameButton variant="primary" onClick={() => setPaused(false)}>Продолжить</GameButton>
            <GameButton onClick={onRetry}>Начать заново</GameButton>
            <Link to="/campaign" className={gameButton({ variant: "ghost" })}>Сдаться и выйти</Link>
          </div>
        </Panel>
      </Modal>
      <Modal open={!!reward}>
        {reward && !reward.won && <Defeat b={b} level={level} r={reward.r} onRetry={onRetry} />}
        {reward && reward.won && (
          <Panel className="w-full text-center">
            <h2 className="font-display text-4xl text-primary">ПОБЕДА!</h2>
            <div className="mt-2 text-4xl">{[1, 2, 3].map((s) => <span key={s} className={cn("inline-block", s <= reward.r.stars ? "animate-pop-in text-gold" : "text-muted-foreground/30")} style={{ animationDelay: `${s * 250}ms` }}>★</span>)}</div>
            {reward.r.firstWin && <p className="animate-pop-in mt-1 font-display text-sm text-poison">Первая победа: ×1.2 золота</p>}
            <p className="mt-2 text-sm text-muted-foreground">Ворота пали, Цитадель в огне.</p>
            <div className="my-4 flex justify-center gap-6 text-xl"><Currency kind="gold" value={reward.r.gold} />{reward.r.skulls > 0 && <Currency kind="skulls" value={reward.r.skulls} />}</div>
            {!!reward.r.shardGifts?.length && <div className="mb-3 flex flex-wrap justify-center gap-2">{reward.r.shardGifts.map((g) => <span key={g.id} className="animate-pop-in rounded-full border border-rarity-epic/60 bg-rarity-epic/15 px-2.5 py-0.5 text-xs">🧩 {MONSTERS[g.id].name} <b className="text-rarity-epic">+{g.n}</b></span>)}</div>}
            <p className="text-xs text-muted-foreground">Башен разрушено: {b.stats.towersDown} · призвано: {b.stats.summoned}</p>
            <FightReport b={b} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <GameButton variant="primary" size="lg" onClick={onRetry}>⟳ Переиграть</GameButton>
              <Link to="/campaign" className={gameButton({ variant: "primary", size: "lg" })}>Кампания →</Link>
              <Link to="/squad" className={cn(gameButton({ variant: "gold" }), "col-span-2")}>Прокачка</Link>
            </div>
          </Panel>
        )}
      </Modal>
    </div>
  );
}

function Defeat({ b, level, r, onRetry }: { b: Battle; level: LevelDef; r: Reward; onRetry: () => void }) {
  const p = useProgress();
  const frac = Math.max(0, b.gateHp / b.gateMax);
  const gold = useCountUp(r.gold, true);
  const tip = defeatTip(p, { gateFrac: frac, towersDown: b.stats.towersDown, summoned: b.stats.summoned, reached: b.stats.reached, timeOut: b.time >= level.timeLimit });
  const canUp = squadUpgradeReady(p);
  const t = Math.min(b.time, level.timeLimit);
  return (
    <div className="panel-texture relative w-full overflow-hidden rounded-2xl border-2 border-blood/70 bg-card p-6 text-center shadow-[0_0_60px_color-mix(in_oklab,var(--blood)_45%,transparent)] animate-pop-in">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blood/25 via-transparent to-background/60" />
      {Array.from({ length: 14 }).map((_, i) => <span key={i} className="pointer-events-none absolute bottom-0 h-1.5 w-1.5 rounded-full bg-primary animate-ember" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.41) % 3}s` }} />)}
      <div className="relative">
        <svg viewBox="0 0 64 64" className="mx-auto h-16 w-16 drop-shadow-[0_0_14px_var(--blood)]" aria-hidden>
          <path d="M14 50 L50 14" stroke="var(--muted-foreground)" strokeWidth="4" strokeLinecap="round" /><path d="M46 10 l8 8 -4 2 -6 -6z" fill="var(--gold)" />
          <path d="M32 8c-11 0-19 8-19 18 0 6 3 10 7 13v7h24v-7c4-3 7-7 7-13 0-10-8-18-19-18z" fill="var(--blood)" stroke="var(--background)" strokeWidth="2" />
          <circle cx="25" cy="27" r="4.5" fill="var(--background)" /><circle cx="39" cy="27" r="4.5" fill="var(--background)" /><path d="M30 36h4l-2-4z" fill="var(--background)" />
          <path d="M26 46v-5M32 46v-5M38 46v-5" stroke="var(--background)" strokeWidth="2" /><path d="M33 8l-3 8 4 4-3 7" stroke="var(--background)" strokeWidth="1.6" fill="none" />
        </svg>
        <h2 className="animate-big-shake font-display text-5xl text-blood drop-shadow-[0_0_18px_var(--blood)]">ПОРАЖЕНИЕ</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ворота выстояли… на этот раз.</p>
        <div className="mt-4 text-left">
          <div className="flex justify-between text-xs"><span className="uppercase tracking-widest text-muted-foreground">Ворота</span><span><b className="text-blood">{Math.ceil(b.gateHp)} HP</b> · {Math.round(frac * 100)}%</span></div>
          <div className="relative mt-1 h-4 overflow-hidden rounded-full border border-border bg-muted">
            <div className="h-full bg-gradient-to-r from-blood to-primary transition-[width] duration-1000" style={{ width: `${frac * 100}%` }} />
            <div className="absolute inset-y-0 right-0 bg-poison/30" style={{ width: `${(1 - frac) * 100}%` }} />
          </div>
          <div className="mt-1 text-right text-[11px] text-poison">Пробито {Math.round((1 - frac) * 100)}%</div>
        </div>
        <MercyBadge p={p} levelId={level.id} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[["⏳", `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`, "в бою"], ["🗼", String(b.stats.towersDown), "башен снесено"], ["👹", String(b.stats.summoned), "призвано"]].map(([i, v, l]) => (
            <div key={l} className="rounded-lg border border-border bg-background/40 p-2"><div className="text-lg">{i}</div><div className="font-display">{v}</div><div className="text-[10px] text-muted-foreground">{l}</div></div>
          ))}
        </div>
        <FightReport b={b} />
        {(() => { const rec = requiredPower(level.id); const avg = squadPower(p); return (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Сила отряда</span>
            <span><b className={avg >= rec ? "text-poison" : "text-blood"}>{avg}</b> <span className="text-muted-foreground">/ нужно {rec} · {recLabel(level.id)}</span>{avg < rec && <span className="ml-2 text-xs text-blood">не хватает {rec - avg}</span>}</span>
          </div>); })()}
        <div className="mt-3 rounded-lg border border-gold/50 bg-gold/10 p-3 text-left text-sm"><span className="font-display text-xs uppercase text-gold">Совет · </span>{tip}</div>
        {b.ai.modes.size > 0 && <div className="mt-2 rounded-lg border border-blood/50 bg-blood/10 p-2 text-left text-xs"><span className="font-display uppercase text-blood">Защита запомнила отряд · </span>{[...b.ai.modes].map((m) => ADAPT_NAME[m]).join(", ")}. С тем же составом она встретит тебя готовой — попробуй сменить бойцов.</div>}
        <div className="mt-3 flex items-center justify-center gap-4 text-xl"><span className="text-xs text-muted-foreground">Утешительная добыча</span><Currency kind="gold" value={gold} />{r.skulls > 0 && <Currency kind="skulls" value={r.skulls} />}</div>
        <div className="mt-4 flex flex-col gap-2">
          <GameButton variant="primary" size="lg" onClick={onRetry}>⚔ Ещё раз</GameButton>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/squad" className={cn(gameButton({ variant: "gold" }), "relative", canUp && "animate-soft-pulse")}>В лагерь{canUp && <span className="ml-1">↑</span>}</Link>
            <Link to="/campaign" className={gameButton({ variant: "ghost" })}>На карту</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
