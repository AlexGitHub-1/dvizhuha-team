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
        {/* robe with a belt of scrolls */}
        <path d="M40 240 Q46 176 100 166 Q154 176 160 240Z" fill="var(--ink)" opacity="0.45" />
        <path d="M100 168 V240" stroke="var(--ink)" strokeWidth="3" opacity="0.5" />
        {/* deep hood: outer cloth, dark opening, no face — only eyes */}
        <path d="M38 176 Q28 58 100 32 Q172 58 162 176 Q132 146 100 146 Q68 146 38 176Z" fill="currentColor" stroke="var(--ink)" strokeWidth="3" />
        <path d="M100 34 Q86 90 92 146 M100 34 Q114 90 108 146" stroke="var(--ink)" strokeWidth="2" opacity="0.35" fill="none" />
        <path d="M58 158 Q54 84 100 64 Q146 84 142 158 Q122 134 100 134 Q78 134 58 158Z" fill="var(--background)" />
        <circle cx="86" cy="104" r="5" fill="var(--gold)" className="animate-slow-glow" /><circle cx="114" cy="104" r="5" fill="var(--gold)" className="animate-slow-glow" />
        {/* hand with quill and an open book */}
        <path d="M54 214 L100 200 L146 214 L146 240 L54 240Z" fill="var(--vellum)" stroke="var(--ink)" strokeWidth="2" />
        <path d="M100 200 V240" stroke="var(--ink)" strokeWidth="2" />
        <path d="M64 218 h28 M64 226 h24 M108 218 h28 M108 226 h22" stroke="var(--ink)" strokeWidth="1.5" opacity="0.5" />
        <ellipse cx="140" cy="206" rx="12" ry="9" fill="var(--muted-foreground)" stroke="var(--ink)" strokeWidth="2" />
        <path d="M140 204 L176 140 L182 144 L146 206Z" fill="var(--vellum)" stroke="var(--ink)" strokeWidth="1.5" />
        <path d="M176 140 L188 124 L182 146Z" fill="var(--ink)" />
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
        {/* Kaira: priestess in a hooded mantle, lower face hidden by a veil, holding a ritual candle */}
        {/* mantle over shoulders with folds and a clasp */}
        <path d="M8 240 Q16 170 100 156 Q184 170 192 240Z" fill="currentColor" stroke="var(--ink)" strokeWidth="3" />
        <path d="M52 240 Q58 200 72 176 M148 240 Q142 200 128 176 M100 186 V240" stroke="var(--ink)" strokeWidth="2.5" opacity="0.35" fill="none" />
        <path d="M70 172 Q100 196 130 172" stroke="var(--gold)" strokeWidth="4" fill="none" />
        <circle cx="100" cy="186" r="7" fill="var(--gold)" stroke="var(--ink)" strokeWidth="2" /><circle cx="100" cy="186" r="3" fill="var(--blood)" />
        {/* hood: outer cloth with a visible rim, dark inside */}
        <path d="M46 176 Q36 54 100 36 Q164 54 154 176 Q140 150 100 148 Q60 150 46 176Z" fill="currentColor" stroke="var(--ink)" strokeWidth="3" />
        <path d="M60 164 Q54 72 100 56 Q146 72 140 164 Q124 142 100 140 Q76 142 60 164Z" fill="var(--ink)" opacity="0.75" />
        <path d="M60 164 Q54 72 100 56 Q146 72 140 164" stroke="var(--gold)" strokeWidth="2" fill="none" opacity="0.6" />
        {/* face */}
        <ellipse cx="100" cy="106" rx="27" ry="34" fill={`url(#${id}f)`} />
        <path d="M80 94 q8 -5 15 -1 M105 93 q7 -4 15 1" stroke="var(--ink)" strokeWidth="3" fill="none" />
        <path d="M82 102 q6 -4 12 0 M106 102 q6 -4 12 0" stroke="var(--blood)" strokeWidth="3.5" fill="none" className="animate-slow-glow" />
        <path d="M100 104 v10" stroke="var(--ink)" strokeWidth="2" opacity="0.5" />
        {/* circlet and forehead gem */}
        <path d="M74 82 Q100 72 126 82" stroke="var(--gold)" strokeWidth="3" fill="none" />
        <circle cx="100" cy="76" r="5" fill="var(--blood)" stroke="var(--gold)" strokeWidth="2" />
        {/* veil over mouth and chin, hanging in folds */}
        <path d="M72 114 Q100 124 128 114 L124 148 Q100 158 76 148Z" fill="var(--vellum)" opacity="0.85" stroke="var(--ink)" strokeWidth="2" />
        <path d="M88 122 L86 150 M100 124 V154 M112 122 L114 150" stroke="var(--ink)" strokeWidth="1.5" opacity="0.35" />
        {/* hand holding a candle */}
        <path d="M144 196 h12 v-50 h-12z" fill="var(--vellum)" stroke="var(--ink)" strokeWidth="2" />
        <path d="M144 150 q2 6 0 12" stroke="var(--ink)" strokeWidth="1.5" opacity="0.4" fill="none" />
        <ellipse cx="150" cy="198" rx="16" ry="10" fill="var(--vellum)" stroke="var(--ink)" strokeWidth="2.5" />
        <path d="M138 196 q12 -6 24 0" stroke="var(--ink)" strokeWidth="1.5" opacity="0.5" fill="none" />
        <circle cx="150" cy="132" r="14" fill="var(--gold)" opacity="0.18" className="animate-slow-glow" />
        <path d="M150 144 q9 -10 0 -24 q-9 14 0 24z" fill="var(--gold)" stroke="var(--blood)" strokeWidth="1.5" className="animate-candle" />
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
