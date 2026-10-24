import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/game/data/rarity";
import { RARITY_INFO } from "@/game/data/rarity";
import type { MonsterId } from "@/game/data/monsters";
import { MONSTERS } from "@/game/data/monsters";
import { drawCreature, FLOATERS } from "@/game/render/creatures";
import { sfx, unlockAudio } from "@/game/audio";
import { LiveBackdrop } from "./LiveBackdrop";
export { LiveBackdrop };

// ---------- Button
export const gameButton = cva(
  "inline-flex select-none items-center justify-center gap-2 rounded-md border font-display uppercase tracking-wide transition active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110",
        secondary: "border-border bg-secondary text-secondary-foreground hover:border-primary/60",
        danger: "border-blood bg-blood/80 text-foreground hover:bg-blood",
        gold: "border-gold bg-gold/90 text-primary-foreground hover:bg-gold",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:text-foreground",
      },
      size: { sm: "h-8 px-3 text-xs", md: "h-10 px-5 text-sm", lg: "h-14 px-8 text-lg" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);
export function GameButton({ className, variant, size, onClick, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof gameButton>) {
  return <button {...p} onClick={(e) => { unlockAudio(); sfx.click(); onClick?.(e); }} className={cn(gameButton({ variant, size }), className)} />;
}

// ---------- Panel
export function Panel({ className, children, title }: { className?: string; children: ReactNode; title?: ReactNode }) {
  return (
    <section className={cn("panel-texture rounded-xl border border-border p-4 shadow-[var(--shadow-deep)]", className)}>
      {title && <h2 className="mb-3 font-display text-base uppercase tracking-wide text-primary">{title}</h2>}
      {children}
    </section>
  );
}

// ---------- Rarity
export const RARITY_TEXT: Record<Rarity, string> = { common: "text-rarity-common", rare: "text-rarity-rare", epic: "text-rarity-epic", legendary: "text-rarity-legendary", mythic: "text-rarity-mythic" };
export const RARITY_BORDER: Record<Rarity, string> = { common: "border-rarity-common/60", rare: "border-rarity-rare", epic: "border-rarity-epic", legendary: "border-rarity-legendary", mythic: "border-rarity-mythic" };
const RARITY_BG: Record<Rarity, string> = { common: "bg-rarity-common", rare: "bg-rarity-rare", epic: "bg-rarity-epic", legendary: "bg-rarity-legendary", mythic: "mythic-shimmer" };
export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background", RARITY_BG[rarity], className)}>{RARITY_INFO[rarity].name}</span>;
}

// ---------- Bars & currency
export function StatBar({ value, max, className, tone = "primary" }: { value: number; max: number; className?: string; tone?: "primary" | "blood" | "ice" | "gold" | "poison" }) {
  const tones = { primary: "bg-primary", blood: "bg-blood", ice: "bg-ice", gold: "bg-gold", poison: "bg-poison" };
  return <div className={cn("h-2 overflow-hidden rounded-full border border-border bg-muted", className)}><div className={cn("h-full transition-all", tones[tone])} style={{ width: `${Math.max(0, Math.min(1, value / max)) * 100}%` }} /></div>;
}
export function Currency({ kind, value, className, live }: { kind: "gold" | "skulls" | "essence"; value: number; className?: string; live?: boolean }) {
  const m = { gold: ["🪙", "text-gold"], skulls: ["💀", "text-skull"], essence: ["✦", "text-primary"] } as const;
  const shown = useCountUp(Math.floor(value), live ?? false);
  const prev = useRef(Math.floor(value)); const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    const v = Math.floor(value); const d = v - prev.current; prev.current = v;
    if (live && d !== 0) setGain({ n: d, key: performance.now() });
  }, [value, live]);
  return (
    <span className={cn("relative inline-flex items-center gap-1 font-display", m[kind][1], className)}>
      <span key={gain?.key} className={gain ? "animate-bump" : undefined}>{m[kind][0]}</span>{shown}
      {gain && <span key={`g${gain.key}`} className={cn("animate-float-up pointer-events-none absolute -top-3 right-0 text-xs", gain.n > 0 ? "text-poison" : "text-blood")}>{gain.n > 0 ? "+" : ""}{gain.n}</span>}
    </span>
  );
}
/** Smoothly counts toward the target when `on`. */
export function useCountUp(target: number, on: boolean) {
  const [v, setV] = useState(target); const cur = useRef(target);
  useEffect(() => {
    if (!on) { cur.current = target; setV(target); return; }
    const from = cur.current; const t0 = performance.now(); let raf = 0;
    const step = (n: number) => { const k = Math.min(1, (n - t0) / 600); const x = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3))); cur.current = x; setV(x); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [target, on]);
  return v;
}

// ---------- Modal
export function Modal({ open, children, onClose }: { open: boolean; children: ReactNode; onClose?: (() => void) | undefined }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-pop-in max-h-[90vh] w-full max-w-lg overflow-auto" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ---------- Tabs
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1">
      {items.map((i) => (
        <button key={i.value} onClick={() => onChange(i.value)} className={cn("rounded-md px-3 py-1 text-xs font-semibold transition", value === i.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{i.label}</button>
      ))}
    </div>
  );
}

export function Tooltip({ tip, children }: { tip: ReactNode; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-48 -translate-x-1/2 rounded-md border border-border bg-popover p-2 text-xs text-popover-foreground shadow-[var(--shadow-deep)] group-hover:block">{tip}</span>
    </span>
  );
}

// ---------- Portrait (same renderer as the battlefield)
export function MonsterPortrait({ id, size = 96, animate = false, silhouette = false, lvl = 1, className }: { id: MonsterId; size?: number; animate?: boolean; silhouette?: boolean; lvl?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1; c.width = size * dpr; c.height = size * dpr;
    const g = c.getContext("2d")!; const def = MONSTERS[id];
    const color = RARITY_INFO[def.rarity].color;
    const height = id === "dragon" ? 70 : id === "abyss" ? 75 : FLOATERS.has(id) ? 45 : def.radius * 2.6 + 12;
    const scale = (size * 0.72) / Math.max(height, id === "dragon" ? 90 : 30);
    let raf = 0; const t0 = performance.now();
    const draw = () => {
      const t = (performance.now() - t0) / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
      g.save(); g.translate(size / 2 - (id === "dragon" ? 4 : 0), size * 0.86); g.scale(scale, scale);
      drawCreature(g, id, animate ? t : 0.3, false, silhouette ? 1 : lvl); g.restore();
      if (silhouette) { g.globalCompositeOperation = "source-atop"; g.fillStyle = "#0c0a08"; g.fillRect(0, 0, size, size); }
      g.globalCompositeOperation = "destination-over";
      const grd = g.createRadialGradient(size / 2, size * 0.6, 4, size / 2, size * 0.6, size * 0.7);
      grd.addColorStop(0, silhouette ? "#2a2622" : color + "66"); grd.addColorStop(1, "#14100c");
      g.fillStyle = grd; g.fillRect(0, 0, size, size);
      g.globalCompositeOperation = "source-over";
      if (animate) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [id, size, animate, silhouette, lvl]);
  return <canvas ref={ref} className={cn("rounded-md", className)} style={{ width: size, height: size }} />;
}

// ---------- Screen shell
export function ScreenShell({ title, children, right, back = true }: { title: string; children: ReactNode; right?: ReactNode; back?: boolean }) {
  return (
    <div className="relative isolate min-h-screen">
      <LiveBackdrop />
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          {back && <Link to="/" className={gameButton({ variant: "ghost", size: "sm" })}>← Меню</Link>}
          <h1 className="font-display text-xl uppercase tracking-wide text-primary">{title}</h1>
        </div>
        <div className="flex items-center gap-4">{right}</div>
      </header>
      <main className="animate-screen-in mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
