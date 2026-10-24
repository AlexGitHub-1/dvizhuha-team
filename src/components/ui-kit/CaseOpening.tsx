import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { MONSTERS } from "@/game/data/monsters";
import { RARITIES, RARITY_INFO, type Rarity } from "@/game/data/rarity";
import type { CaseDef } from "@/game/data/shop";
import type { CaseResult } from "@/game/meta/progress";
import { sfx } from "@/game/audio";
import { GameButton, MonsterPortrait, RarityBadge, RARITY_BORDER, RARITY_TEXT } from "./index";

type Stage = "drop" | "shake" | "burst" | "card" | "flip" | "done";
const CHEST_TONE: Record<string, { body: string; band: string }> = {
  rusty: { body: "fill-primary", band: "fill-muted-foreground" },
  cursed: { body: "fill-rarity-epic", band: "fill-skull" },
  legend: { body: "fill-gold", band: "fill-blood" },
};
const GLOW: Record<Rarity, string> = { common: "bg-rarity-common", rare: "bg-rarity-rare", epic: "bg-rarity-epic", legendary: "bg-rarity-legendary", mythic: "bg-rarity-mythic" };

/** Multi-stage chest opening: drop → escalating shake with rarity light → lid pops → card rises and flips. */
export function CaseOpening({ chest, result, onDone, onAgain, canAgain }: { chest: CaseDef; result: CaseResult; onDone: () => void; onAgain: () => void; canAgain: boolean }) {
  const rarity = MONSTERS[result.id].rarity; const tier = RARITIES.indexOf(rarity);
  const [stage, setStage] = useState<Stage>("drop");
  const [shakeK, setShakeK] = useState(0.4);
  const [light, setLight] = useState<Rarity>("common");
  const timers = useRef<number[]>([]);
  const particles = useRef<HTMLCanvasElement>(null);

  const at = (ms: number, f: () => void) => { timers.current.push(window.setTimeout(f, ms)); };
  useEffect(() => {
    sfx.whoosh();
    at(650, () => { sfx.explosion(); });
    at(900, () => setStage("shake"));
    // escalating shake; light "teases" through the rarities up to the real one
    const shakeMs = 1500 + tier * 350;
    for (let i = 0; i < 10 + tier * 2; i++) at(900 + (i * shakeMs) / (10 + tier * 2), () => { sfx.caseShake(); setShakeK(0.4 + (i / (10 + tier * 2)) * 1.8); });
    for (let r = 0; r <= tier; r++) at(900 + (shakeMs * (r + 1)) / (tier + 2), () => setLight(RARITIES[r]!));
    const burstAt = 900 + shakeMs;
    at(burstAt, () => { setStage("burst"); sfx.lidPop(); if (tier >= 4) sfx.mythic(); });
    at(burstAt + 450, () => setStage("card"));
    at(burstAt + 1000, () => { setStage("flip"); sfx.flip(); });
    at(burstAt + 1000 + (tier >= 2 ? 1100 : 600), () => { setStage("done"); sfx.reveal(tier); });
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => { timers.current.forEach(clearTimeout); timers.current = []; setLight(rarity); setStage("done"); sfx.reveal(tier); };

  // particle burst on lid pop
  useEffect(() => {
    if (stage !== "burst") return;
    const c = particles.current; if (!c) return;
    const g = c.getContext("2d")!; const W = (c.width = c.clientWidth), H = (c.height = c.clientHeight);
    const color = RARITY_INFO[rarity].color;
    const ps = Array.from({ length: 90 + tier * 40 }, () => { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 200 + Math.random() * 520; return { x: W / 2, y: H * 0.62, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 + Math.random() * 0.8, s: 2 + Math.random() * 4, gold: Math.random() < 0.35 }; });
    let raf = 0, last = performance.now();
    const step = (n: number) => {
      const dt = Math.min(0.05, (n - last) / 1000); last = n; g.clearRect(0, 0, W, H); g.globalCompositeOperation = "lighter"; let alive = 0;
      for (const p of ps) { p.life -= dt; if (p.life <= 0) continue; alive++; p.vy += 600 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = Math.min(1, p.life); g.fillStyle = p.gold ? "#ffe08a" : color; g.fillRect(p.x, p.y, p.s, p.s); }
      if (alive) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [stage, rarity, tier]);

  const tone = CHEST_TONE[chest.id] ?? CHEST_TONE["rusty"]!;
  const opened = stage === "burst" || stage === "card" || stage === "flip" || stage === "done";
  const showCard = stage === "card" || stage === "flip" || stage === "done";
  const def = MONSTERS[result.id];

  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background/90 backdrop-blur-sm", stage === "burst" && tier >= 4 && "animate-big-shake")}>
      {/* rays */}
      {(opened || stage === "shake") && (
        <div className={cn("pointer-events-none absolute left-1/2 top-[58%] h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500", opened ? "opacity-60" : "opacity-20")}>
          <div className="animate-rays h-full w-full" style={{ background: `repeating-conic-gradient(from 0deg, ${RARITY_INFO[light].color}55 0deg 6deg, transparent 6deg 18deg)`, maskImage: "radial-gradient(circle, black 0%, transparent 55%)", WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 55%)" }} />
        </div>
      )}
      {stage === "burst" && <div className={cn("animate-screen-flash pointer-events-none absolute inset-0", tier >= 4 ? "bg-blood" : "bg-foreground")} />}
      {stage === "burst" && tier >= 4 && <MythicBolts />}
      <canvas ref={particles} className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative flex h-[420px] w-full max-w-md items-end justify-center">
        {/* chest */}
        {!showCard && (
          <div className={cn(stage === "drop" && "animate-chest-drop")}>
            <div className={cn(stage === "shake" && "animate-chest-shake")} style={{ ["--k" as string]: shakeK }}>
              <div className="relative h-48 w-60">
                {/* light leaking through */}
                <div className={cn("absolute inset-x-6 top-[38%] h-3 rounded-full blur-md transition-colors duration-300", GLOW[light], stage === "shake" ? "animate-glow-pulse" : "opacity-0")} />
                <svg viewBox="0 0 240 190" className="absolute inset-0 h-full w-full drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]">
                  <rect x="20" y="80" width="200" height="100" rx="10" className={tone.body} />
                  <rect x="20" y="80" width="200" height="100" rx="10" className="fill-background/30" />
                  <rect x="20" y="120" width="200" height="12" className={tone.band} />
                  <rect x="40" y="80" width="14" height="100" className={tone.band} /><rect x="186" y="80" width="14" height="100" className={tone.band} />
                  <rect x="106" y="108" width="28" height="34" rx="4" className="fill-gold" /><circle cx="120" cy="122" r="5" className="fill-background" />
                </svg>
                <svg viewBox="0 0 240 190" className={cn("absolute inset-0 h-full w-full origin-bottom-left", opened && "animate-lid-off")}>
                  <path d="M20 84 Q20 22 120 22 Q220 22 220 84 Z" className={tone.body} />
                  <path d="M20 84 Q20 22 120 22 Q220 22 220 84 Z" className="fill-foreground/10" />
                  <rect x="40" y="30" width="14" height="54" className={tone.band} /><rect x="186" y="30" width="14" height="54" className={tone.band} />
                  <rect x="18" y="76" width="204" height="10" rx="3" className={tone.band} />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* card */}
        {showCard && (
          <div className="animate-card-rise [perspective:900px]">
            <div className={cn("relative h-[360px] w-[250px] [transform-style:preserve-3d]", (stage === "flip" || stage === "done") && "animate-card-flip")} style={{ transform: stage === "card" ? "rotateY(180deg)" : undefined, ["--flip" as string]: tier >= 2 ? "1.1s" : "0.6s" }}>
              {/* back */}
              <div className="backface-hidden absolute inset-0 flex items-center justify-center rounded-2xl border-4 border-primary bg-card [transform:rotateY(180deg)]">
                <div className="font-display text-5xl text-primary">?</div>
              </div>
              {/* front */}
              <div className={cn("backface-hidden absolute inset-0 flex flex-col items-center rounded-2xl border-4 bg-card p-3 text-center shadow-[var(--shadow-deep)]", RARITY_BORDER[rarity])}>
                <div className={cn("absolute inset-0 rounded-xl opacity-25", GLOW[rarity], rarity === "mythic" && "mythic-shimmer")} />
                <MonsterPortrait id={result.id} size={190} animate className="relative" />
                <RarityBadge rarity={rarity} className="relative mt-2 text-xs" />
                <h3 className={cn("relative mt-1 font-display text-xl", RARITY_TEXT[rarity])}>{def.name}</h3>
                <p className="relative mt-1 line-clamp-3 text-xs text-muted-foreground">{def.ability}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-6 flex min-h-24 flex-col items-center gap-3">
        {stage === "done" ? (
          <>
            <p className={cn("animate-pop-in font-display text-2xl", result.isNew ? "text-poison" : "text-gold")}>{result.isNew ? "НОВЫЙ!" : `+${result.shards} осколков`}</p>
            {result.pity && <p className="text-xs text-muted-foreground">Сработала гарантия: эпический или выше каждые 10 кейсов.</p>}
            <div className="flex gap-2">
              <GameButton onClick={onDone}>Готово</GameButton>
              <GameButton variant="gold" disabled={!canAgain} onClick={onAgain}>Ещё раз</GameButton>
            </div>
          </>
        ) : (
          <GameButton variant="ghost" size="sm" onClick={skip}>Пропустить ⏭</GameButton>
        )}
      </div>
    </div>,
    document.body,
  );
}

function MythicBolts() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {[12, 38, 66, 88].map((x, i) => (
        <polyline key={i} className="animate-screen-flash stroke-rarity-mythic" fill="none" strokeWidth="0.6" points={`${x},0 ${x + 4},18 ${x - 3},30 ${x + 5},48 ${x - 2},62`} style={{ animationDelay: `${i * 0.07}s` }} />
      ))}
    </svg>
  );
}
