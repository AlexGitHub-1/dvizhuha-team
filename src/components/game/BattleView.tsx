import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Currency, GameButton, gameButton, Modal, MonsterPortrait, Panel, StatBar } from "@/components/ui-kit";
import type { LevelDef } from "@/game/data/levels";
import { MONSTERS, type MonsterId } from "@/game/data/monsters";
import { SPELLS, type SpellId } from "@/game/data/shop";
import { canSummon, castSpell, createBattle, H, outcome, summon, update, W, type Battle } from "@/game/engine/battle";
import { renderBattle } from "@/game/render/battle";
import { applyBattle } from "@/game/meta/progress";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";
import { setIntensity, startScene, stopScene, unlockAudio, sfx } from "@/game/audio";

interface Reward { gold: number; skulls: number; stars: number; firstWin: boolean }

export function BattleView({ level, squad, spell, onRetry }: { level: LevelDef; squad: { kind: MonsterId; lvl: number }[]; spell: SpellId; onRetry: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<Battle | null>(null);
  if (!bRef.current) bRef.current = createBattle(level, squad, spell);
  const [, force] = useState(0);
  const [reward, setReward] = useState<{ won: boolean; r: Reward } | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false); pausedRef.current = paused;
  const p = useProgress();

  const doSummon = useCallback((i: number) => { const b = bRef.current!; if (!pausedRef.current) summon(b, i); }, []);
  const doSpell = useCallback(() => { const b = bRef.current!; if (!pausedRef.current) castSpell(b); }, []);

  useEffect(() => { unlockAudio(); startScene(bRef.current!.theme, true); return () => { stopScene(); setIntensity(0); }; }, []);

  useEffect(() => {
    unlockAudio();
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key); if (n >= 1 && n <= 6) doSummon(n - 1);
      if (e.code === "Space") { e.preventDefault(); doSpell(); }
      if (e.code === "Escape" || e.code === "KeyP") setPaused((x) => !x);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [doSummon, doSpell]);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current, w = wrapRef.current; if (!c || !w) return;
      const scale = Math.min(w.clientWidth / W, w.clientHeight / H); const dpr = window.devicePixelRatio || 1;
      c.style.width = `${W * scale}px`; c.style.height = `${H * scale}px`;
      c.width = Math.round(W * scale * dpr); c.height = Math.round(H * scale * dpr);
      c.getContext("2d")!.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    };
    resize(); const ro = new ResizeObserver(resize); if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0, last = performance.now(), hud = 0, done = false;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const b = bRef.current!;
      if (!pausedRef.current) update(b, dt);
      setIntensity(1 - b.gateHp / b.gateMax);
      const ctx = canvasRef.current?.getContext("2d"); if (ctx) renderBattle(ctx, b);
      if (b.result && !done) {
        done = true;
        setTimeout(() => {
          const r = applyBattle(getProgress(), level, outcome(b)); setProgress(r.p); sfx.coin();
          setReward({ won: b.result === "won", r: r.reward });
        }, 1500);
      }
      hud += dt; if (hud > 0.1) { hud = 0; force((x) => x + 1); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [level]);

  const b = bRef.current;
  const left = Math.max(0, level.timeLimit - b.time);
  const sp = SPELLS[spell];
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card/90 px-3 py-2">
        <div className="flex items-center gap-2">
          <GameButton size="sm" variant="ghost" onClick={() => setPaused(true)}>⏸ Пауза</GameButton>
          <span className="font-display text-sm uppercase text-primary">Ур. {level.id} · {level.name}</span>
        </div>
        <div className="flex w-[min(380px,40%)] flex-col">
          <div className="flex justify-between text-[10px] tracking-widest text-muted-foreground"><span>ВОРОТА</span><span>{Math.ceil(b.gateHp)}/{b.gateMax}</span></div>
          <StatBar value={b.gateHp} max={b.gateMax} tone="blood" className="h-3" />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Currency kind="essence" value={b.essence} className="text-lg" />
          <span className={cn("font-display", left < 30 && "text-blood")}>{Math.floor(left / 60)}:{String(Math.floor(left % 60)).padStart(2, "0")}</span>
          <button className="text-xs" onClick={() => setProgress((x) => ({ ...x, muted: !x.muted }))}>{p.muted ? "🔇" : "🔊"}</button>
        </div>
      </header>
      <div ref={wrapRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"><canvas ref={canvasRef} className="rounded-sm" /></div>
      <footer className="flex flex-wrap items-stretch justify-center gap-2 border-t border-border bg-card/90 p-2">
        {b.squad.map((s, i) => {
          const def = MONSTERS[s.kind]; const ok = canSummon(b, i);
          return (
            <button key={s.kind} onClick={() => doSummon(i)} className={cn("relative flex w-32 items-center gap-2 overflow-hidden rounded-lg border p-1.5 text-left transition sm:w-40", ok ? "border-primary/60 bg-secondary hover:-translate-y-0.5" : "border-border bg-muted opacity-60")}>
              {s.cd > 0 && <div className="absolute inset-x-0 bottom-0 z-10 bg-background/70" style={{ height: `${(s.cd / def.cooldown) * 100}%` }} />}
              <MonsterPortrait id={s.kind} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between"><kbd className="rounded border border-border bg-background px-1 text-[10px]">{i + 1}</kbd><span className="text-[10px] text-gold">Ур.{s.lvl}</span></div>
                <div className="truncate text-[11px] font-semibold">{def.name}</div>
                <Currency kind="essence" value={def.cost} className="text-xs" />
              </div>
            </button>
          );
        })}
        <button onClick={doSpell} className={cn("relative w-32 overflow-hidden rounded-lg border p-1.5 text-left sm:w-40", b.spellCd <= 0 ? "border-blood bg-blood/20 hover:bg-blood/30" : "border-border bg-muted opacity-60")}>
          {b.spellCd > 0 && <div className="absolute inset-x-0 bottom-0 bg-background/70" style={{ height: `${(b.spellCd / sp.cooldown) * 100}%` }} />}
          <div className="relative flex justify-between"><span className="text-2xl">{sp.icon}</span><kbd className="h-fit rounded border border-border bg-background px-1 text-[10px]">Space</kbd></div>
          <div className="relative text-[11px] font-semibold">{sp.name}</div>
          <div className="relative text-[10px] text-muted-foreground">{b.spellCd > 0 ? `${b.spellCd.toFixed(1)}с` : "Готово"}</div>
        </button>
      </footer>

      <Modal open={paused && !reward}>
        <Panel title="Пауза" className="text-center">
          <div className="flex flex-col gap-2">
            <GameButton variant="primary" onClick={() => setPaused(false)}>Продолжить</GameButton>
            <GameButton onClick={onRetry}>Начать заново</GameButton>
            <Link to="/campaign" className={gameButton({ variant: "ghost" })}>Сдаться и выйти</Link>
          </div>
        </Panel>
      </Modal>
      <Modal open={!!reward}>
        {reward && (
          <Panel className="text-center">
            <h2 className={cn("font-display text-4xl", reward.won ? "text-primary" : "text-blood")}>{reward.won ? "ПОБЕДА!" : "ПОРАЖЕНИЕ"}</h2>
            {reward.won && <div className="mt-2 text-4xl">{[1, 2, 3].map((s) => <span key={s} className={cn("inline-block", s <= reward.r.stars ? "animate-pop-in text-gold" : "text-muted-foreground/30")} style={{ animationDelay: `${s * 250}ms` }}>★</span>)}</div>}
            {reward.r.firstWin && <p className="animate-pop-in mt-1 font-display text-sm text-poison">Первая победа: ×1.5 золота</p>}
            <p className="mt-2 text-sm text-muted-foreground">{reward.won ? "Ворота пали, Цитадель в огне." : `Ворота выстояли (${Math.ceil(b.gateHp)} HP). Прокачай монстров и возвращайся.`}</p>
            <div className="my-4 flex justify-center gap-6 text-xl"><Currency kind="gold" value={reward.r.gold} />{reward.r.skulls > 0 && <Currency kind="skulls" value={reward.r.skulls} />}</div>
            <p className="text-xs text-muted-foreground">Башен разрушено: {b.stats.towersDown} · призвано: {b.stats.summoned}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <GameButton onClick={onRetry}>Ещё раз</GameButton>
              <Link to="/squad" className={gameButton({ variant: "gold" })}>Прокачка</Link>
              <Link to="/campaign" className={gameButton({ variant: "primary" })}>Кампания</Link>
            </div>
          </Panel>
        )}
      </Modal>
    </div>
  );
}
