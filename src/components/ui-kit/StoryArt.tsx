import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MonsterPortrait } from "@/components/ui-kit";
import { CHARS, type BustKind, type CharDef, type CharId, type SceneBg } from "@/game/data/story";
import { drawStoryBg } from "@/game/render/story";

export const TONE_TEXT: Record<CharDef["tone"], string> = { blood: "text-blood", gold: "text-gold", poison: "text-poison", ice: "text-ice", muted: "text-muted-foreground", primary: "text-primary" };
export const TONE_BORDER: Record<CharDef["tone"], string> = { blood: "border-blood", gold: "border-gold", poison: "border-poison", ice: "border-ice", muted: "border-muted-foreground/60", primary: "border-primary" };
export const TONE_BG: Record<CharDef["tone"], string> = { blood: "bg-blood", gold: "bg-gold", poison: "bg-poison", ice: "bg-ice", muted: "bg-muted-foreground", primary: "bg-primary" };

/** Drawn bust for human characters; uses currentColor plus theme tokens. */
export function Bust({ kind, className }: { kind: BustKind; className?: string }) {
  const id = "b" + kind;
  return (
    <svg viewBox="0 0 200 240" className={cn("h-full w-full", className)}>
      <defs>
        <linearGradient id={id + "c"} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity="0.95" /><stop offset="1" stopColor="currentColor" stopOpacity="0.35" /></linearGradient>
        <radialGradient id={id + "f"} cx="0.5" cy="0.4" r="0.6"><stop offset="0" stopColor="var(--vellum)" /><stop offset="1" stopColor="var(--ink)" /></radialGradient>
      </defs>
      {/* shoulders / cloak */}
      <path d="M8 240 Q14 168 100 150 Q186 168 192 240Z" fill={`url(#${id}c)`} />
      {kind === "knight" && <>
        <path d="M30 240 Q36 176 100 164 Q164 176 170 240Z" fill="var(--muted-foreground)" opacity="0.7" />
        <path d="M60 190 L100 176 L140 190 L132 240 L68 240Z" fill="var(--vellum)" opacity="0.85" />
        <path d="M94 186 h12 v40 h-12z M82 198 h36 v10 h-36z" fill="var(--blood)" />
        <path d="M58 104 Q60 48 100 44 Q140 48 142 104 L142 132 Q120 150 100 152 Q80 150 58 132Z" fill="var(--muted-foreground)" />
        <path d="M58 104 Q60 48 100 44 Q140 48 142 104 L142 132 Q120 150 100 152 Q80 150 58 132Z" fill="none" stroke="var(--vellum)" strokeWidth="3" opacity="0.6" />
        <rect x="70" y="96" width="60" height="10" rx="3" fill="var(--background)" />
        <path d="M96 108 h8 v36 h-8z" fill="var(--background)" opacity="0.7" />
        <path d="M100 16 Q118 30 112 46 L88 46 Q82 30 100 16Z" fill="var(--blood)" />
      </>}
      {kind === "queen" && <>
        <path d="M54 110 Q40 190 28 232 L62 220 Q60 160 70 120Z M146 110 Q160 190 172 232 L138 220 Q140 160 130 120Z" fill="var(--gold)" opacity="0.55" />
        <ellipse cx="100" cy="108" rx="36" ry="44" fill={`url(#${id}f)`} />
        <path d="M66 96 Q70 56 100 54 Q130 56 134 96 Q120 74 100 74 Q80 74 66 96Z" fill="currentColor" />
        <path d="M66 62 L76 30 L88 52 L100 22 L112 52 L124 30 L134 62Z" fill="var(--gold)" stroke="var(--ink)" strokeWidth="2" />
        <circle cx="100" cy="40" r="5" fill="var(--blood)" /><circle cx="78" cy="48" r="3" fill="var(--ice)" /><circle cx="122" cy="48" r="3" fill="var(--ice)" />
        <path d="M84 104 q6 -4 12 0 M104 104 q6 -4 12 0" stroke="var(--ink)" strokeWidth="3" fill="none" />
        <path d="M92 132 q8 4 16 0" stroke="var(--blood)" strokeWidth="3" fill="none" />
        <path d="M72 160 Q100 176 128 160" stroke="var(--gold)" strokeWidth="4" fill="none" />
      </>}
      {kind === "hood" && <>
        <path d="M40 170 Q30 60 100 36 Q170 60 160 170 Q130 138 100 138 Q70 138 40 170Z" fill="currentColor" />
        <path d="M58 156 Q56 82 100 64 Q144 82 142 156 Q122 128 100 128 Q78 128 58 156Z" fill="var(--background)" />
        <circle cx="86" cy="104" r="4" fill="var(--gold)" className="animate-slow-glow" /><circle cx="114" cy="104" r="4" fill="var(--gold)" className="animate-slow-glow" />
        <path d="M150 200 l26 -60 l6 3 l-22 62z" fill="var(--vellum)" /><path d="M176 140 l10 -14 l-4 18z" fill="var(--ink)" />
      </>}
      {kind === "chancellor" && <>
        <path d="M40 240 Q46 170 100 160 Q154 170 160 240Z" fill="var(--muted-foreground)" opacity="0.6" />
        <ellipse cx="100" cy="106" rx="34" ry="44" fill={`url(#${id}f)`} />
        <path d="M66 92 Q68 58 100 56 Q132 58 134 92 L130 80 Q100 64 70 80Z" fill="var(--muted-foreground)" />
        <path d="M82 102 l12 3 M106 105 l12 -3" stroke="var(--ink)" strokeWidth="3" />
        <circle cx="88" cy="110" r="3" fill="var(--ice)" /><circle cx="112" cy="110" r="3" fill="var(--ice)" />
        <path d="M88 134 q12 6 24 -2" stroke="var(--ink)" strokeWidth="3" fill="none" />
        <path d="M70 168 L100 200 L130 168" stroke="var(--gold)" strokeWidth="5" fill="none" />
        <g transform="translate(140 196)"><circle r="12" fill="var(--gold)" /><path d="M-6 6 L-2 -10 M0 6 L2 -12 M6 6 L6 -10" stroke="var(--ink)" strokeWidth="2" /></g>
      </>}
      {kind === "veil" && <>
        <path d="M44 200 Q34 56 100 40 Q166 56 156 200 Q130 160 100 160 Q70 160 44 200Z" fill="currentColor" opacity="0.95" />
        <ellipse cx="100" cy="108" rx="30" ry="38" fill={`url(#${id}f)`} />
        <path d="M70 116 Q100 132 130 116 L126 150 Q100 162 74 150Z" fill="var(--background)" opacity="0.85" />
        <path d="M82 102 q6 -6 12 0 M106 102 q6 -6 12 0" stroke="var(--blood)" strokeWidth="4" fill="none" className="animate-slow-glow" />
        <circle cx="100" cy="64" r="5" fill="var(--blood)" />
        <path d="M150 150 q8 -14 0 -26 q-4 10 -10 6 q4 10 10 20z" fill="var(--gold)" className="animate-candle" />
      </>}
      {kind === "witch" && <>
        <ellipse cx="100" cy="116" rx="32" ry="40" fill={`url(#${id}f)`} />
        <path d="M30 86 L170 86 Q150 76 130 72 L112 4 L96 50 L72 72 Q50 76 30 86Z" fill="currentColor" />
        <path d="M70 80 h60" stroke="var(--gold)" strokeWidth="5" />
        <path d="M66 96 Q60 170 44 200 M134 96 Q140 170 156 200" stroke="var(--muted-foreground)" strokeWidth="8" fill="none" />
        <circle cx="88" cy="112" r="4" fill="var(--poison)" className="animate-slow-glow" /><circle cx="112" cy="112" r="4" fill="var(--poison)" className="animate-slow-glow" />
        <path d="M100 116 l6 14 h-10z" fill="var(--ink)" /><path d="M86 140 q14 10 28 0" stroke="var(--ink)" strokeWidth="3" fill="none" />
      </>}
      {kind === "guard" && <>
        <ellipse cx="100" cy="116" rx="32" ry="40" fill={`url(#${id}f)`} />
        <path d="M62 100 Q64 60 100 58 Q136 60 138 100Z" fill="var(--muted-foreground)" />
        <rect x="54" y="96" width="92" height="10" rx="4" fill="var(--muted-foreground)" />
        <circle cx="88" cy="118" r="3" fill="var(--ink)" /><circle cx="112" cy="118" r="3" fill="var(--ink)" />
        <path d="M88 142 q12 -6 24 0" stroke="var(--ink)" strokeWidth="3" fill="none" />
        <path d="M80 104 l-4 18 M120 104 l4 18" stroke="var(--ice)" strokeWidth="2" opacity="0.6" />
      </>}
    </svg>
  );
}

/** Square-ish character art (monster renderer or drawn bust). */
export function CharArt({ id, size, animate = false }: { id: CharId; size: number; animate?: boolean }) {
  const c = CHARS[id];
  if (c.monster) return <MonsterPortrait id={c.monster} size={size} animate={animate} lvl={10} />;
  return <div className={TONE_TEXT[c.tone]} style={{ width: size, height: size }}>{c.bust && <Bust kind={c.bust} />}</div>;
}

/** Full-screen animated backdrop canvas for a scene. */
export function StoryBackdrop({ bg, className }: { bg: SceneBg; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const g = c.getContext("2d")!; let raf = 0; const t0 = performance.now();
    let px = 0, py = 0, tx = 0, ty = 0;
    const mv = (e: PointerEvent) => { tx = e.clientX / window.innerWidth * 2 - 1; ty = e.clientY / window.innerHeight * 2 - 1; };
    window.addEventListener("pointermove", mv);
    const loop = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1); const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      px += (tx - px) * 0.04; py += (ty - py) * 0.04;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStoryBg(g, w, h, bg, (performance.now() - t0) / 1000, px, py);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", mv); };
  }, [bg]);
  return <canvas ref={ref} className={cn("absolute inset-0 h-full w-full", className)} />;
}
