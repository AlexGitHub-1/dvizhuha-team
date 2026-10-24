import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { MonsterId } from "@/game/data/monsters";
import { placeInSquad, squadLimit, toggleSquad } from "@/game/meta/progress";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";
import { sfx } from "@/game/audio";
import { MonsterCard } from "./MonsterCard";

type From = "squad" | "pool";
interface DragState { id: MonsterId; from: From; x: number; y: number; ox: number; oy: number; w: number; h: number; zone: From | null; index: number; origin: DOMRect }
interface Fly { id: MonsterId; from: DOMRect; to: DOMRect; go: boolean; compact: boolean }
const Ctx = createContext<{ drag: DragState | null; start: (e: React.PointerEvent, id: MonsterId, from: From, onClick: () => void) => void; landing: MonsterId | null }>({ drag: null, start: () => {}, landing: null });

/** Wraps a screen; lets monster cards be dragged between the collection ("pool") and the squad. */
export function SquadDnd({ children }: { children: ReactNode }) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [fly, setFly] = useState<Fly | null>(null);
  const [landing, setLanding] = useState<MonsterId | null>(null);
  const dRef = useRef<DragState | null>(null);

  const zoneAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest("[data-drop]") as HTMLElement | null;
    return (el?.dataset["drop"] as From | undefined) ?? null;
  };
  /** Slot index under the pointer from the fixed slot grid (stable while cards slide). */
  const indexAt = (x: number, y: number) => {
    const box = document.querySelector<HTMLElement>('[data-drop="squad"]'); const card = box?.querySelector<HTMLElement>("[data-slot]");
    if (!box || !card) return 0;
    const r = box.getBoundingClientRect(); const cw = card.offsetWidth + 8, chh = card.offsetHeight + 8;
    const perRow = Math.max(1, Math.floor((box.clientWidth - 8) / cw));
    const col = Math.max(0, Math.min(perRow - 1, Math.floor((x - r.left - 8 + cw * 0.5) / cw)));
    const row = Math.max(0, Math.floor((y - r.top - 8) / chh));
    return row * perRow + col;
  };
  const start = (e: React.PointerEvent, id: MonsterId, from: From, onClick: () => void) => {
    if (e.button !== 0) return;
    const card = e.currentTarget as HTMLElement; const r = card.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY; let started = false;
    const move = (ev: PointerEvent) => {
      if (!started) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; started = true; sfx.whoosh(); }
      ev.preventDefault();
      const zone = zoneAt(ev.clientX, ev.clientY);
      const d: DragState = { id, from, x: ev.clientX, y: ev.clientY, ox: sx - r.left, oy: sy - r.top, w: r.width, h: r.height, zone, index: zone === "squad" ? indexAt(ev.clientX - (sx - r.left) + r.width / 2, ev.clientY) : -1, origin: r };
      dRef.current = d; setDrag(d);
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      const d = dRef.current; dRef.current = null;
      if (!started || !d) { onClick(); return; }
      const p = getProgress(); let next = p;
      if (d.zone === "squad") next = placeInSquad(p, id, d.index);
      else if (d.zone === "pool" && d.from === "squad") next = toggleSquad(p, id);
      const ok = next !== p;
      const ghost = new DOMRect(d.x - d.ox, d.y - d.oy, d.w, d.h);
      setDrag(null);
      if (ok) { setProgress(next); sfx.click(); } else if (d.zone === "squad" && !p.squad.includes(id)) sfx.hit();
      // glide the ghost to its final card (or back home)
      requestAnimationFrame(() => {
        const sel = ok && (d.zone === "squad" || d.from === "squad") ? `[data-${d.zone === "squad" ? "slot" : "pool"}="${id}"]` : null;
        const target = (sel && document.querySelector<HTMLElement>(sel)?.getBoundingClientRect()) || d.origin;
        setLanding(id);
        setFly({ id, from: ghost, to: target, go: false, compact: d.from === "squad" });
        requestAnimationFrame(() => requestAnimationFrame(() => setFly((f) => f && { ...f, go: true })));
        setTimeout(() => { setFly(null); setLanding(null); }, 300);
      });
    };
    window.addEventListener("pointermove", move, { passive: false }); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  };

  return (
    <Ctx.Provider value={{ drag, start, landing }}>
      {children}
      {typeof document !== "undefined" && (drag || fly) && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[90]">
          {drag && <div className="absolute left-0 top-0 drop-shadow-[0_18px_24px_rgba(0,0,0,0.6)]" style={{ width: drag.w, transform: `translate(${drag.x - drag.ox}px, ${drag.y - drag.oy}px) rotate(4deg) scale(1.08)` }}><MonsterCard id={drag.id} compact={drag.from === "squad"} /></div>}
          {fly && <div className="absolute left-0 top-0" style={{ width: fly.from.width, transition: fly.go ? "transform 260ms cubic-bezier(.2,1.4,.4,1)" : "none", transform: fly.go ? `translate(${fly.to.left}px, ${fly.to.top}px) scale(${fly.to.width / fly.from.width})` : `translate(${fly.from.left}px, ${fly.from.top}px) rotate(4deg) scale(1.08)`, transformOrigin: "0 0" }}><MonsterCard id={fly.id} compact={fly.compact} /></div>}
        </div>, document.body)}
    </Ctx.Provider>
  );
}

/** Squad row: drop zone + reorderable cards with FLIP slide animation. */
export function SquadRow({ selected, onSelect }: { selected?: MonsterId; onSelect: (id: MonsterId) => void }) {
  const p = useProgress(); const { drag, start, landing } = useContext(Ctx);
  const limit = squadLimit(p);
  let order: (MonsterId | "__gap")[] = [...p.squad];
  const over = drag?.zone === "squad";
  const full = over && !p.squad.includes(drag!.id) && p.squad.length >= limit;
  if (over && !full) { order = order.filter((x) => x !== drag!.id); order.splice(Math.min(drag!.index, order.length), 0, "__gap"); }
  else if (drag?.from === "squad") order = order.map((x) => (x === drag.id ? "__gap" : x));
  const refs = useRef(new Map<string, HTMLElement>()); const prev = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    refs.current.forEach((el, k) => {
      const r = el.getBoundingClientRect(); const o = prev.current.get(k);
      if (o && (o.left !== r.left || o.top !== r.top)) {
        el.style.transition = "none"; el.style.transform = `translate(${o.left - r.left}px, ${o.top - r.top}px)`;
        requestAnimationFrame(() => { el.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)"; el.style.transform = ""; });
      }
      prev.current.set(k, r);
    });
  });
  return (
    <div data-drop="squad" className={cn("relative flex min-h-[132px] flex-wrap gap-2 rounded-lg border-2 border-dashed p-2 transition", over ? (full ? "border-blood bg-blood/10" : "border-primary bg-primary/10 shadow-[var(--shadow-glow)]") : drag ? "border-primary/40" : "border-transparent")}>
      {order.map((id) => id === "__gap"
        ? <div key="__gap" style={{ width: drag?.from === "squad" ? drag.w : 120, height: drag?.from === "squad" ? drag.h : 136 }} ref={(el) => { if (el) refs.current.set("__gap", el); else refs.current.delete("__gap"); }} className="rounded-lg border-2 border-dashed border-primary/60 bg-primary/5" />
        : <div key={id} data-slot={id} ref={(el) => { if (el) refs.current.set(id, el); else refs.current.delete(id); }} onPointerDown={(e) => start(e, id, "squad", () => onSelect(id))} className={cn("touch-none", landing === id && "opacity-0")}>
            <MonsterCard id={id} compact selected={id === selected} />
          </div>)}
      {Array.from({ length: Math.max(0, limit - order.length) }).map((_, i) => <div key={`e${i}`} className="flex h-[124px] w-[96px] items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">Пусто</div>)}
      {full && <div className="absolute inset-x-0 -bottom-6 text-center text-xs font-bold text-blood">Отряд полон</div>}
    </div>
  );
}

/** A draggable card in the collection. */
export function PoolCard({ id, selected, onSelect, compact }: { id: MonsterId; selected?: boolean; onSelect: () => void; compact?: boolean }) {
  const p = useProgress(); const { start, drag, landing } = useContext(Ctx);
  const owned = !!p.owned[id];
  return (
    <div data-pool={id} onPointerDown={owned ? (e) => start(e, id, "pool", onSelect) : undefined} onClick={owned ? undefined : onSelect}
      className={cn("touch-none transition-opacity", drag?.id === id && drag.from === "pool" && "opacity-40", landing === id && "opacity-60")}>
      <MonsterCard id={id} compact={!!compact} selected={!!selected} inSquad={p.squad.includes(id)} />
    </div>
  );
}

/** Collection area as a drop zone (dropping a squad monster here removes it). */
export function PoolZone({ children, className }: { children: ReactNode; className?: string }) {
  const { drag } = useContext(Ctx);
  return <div data-drop="pool" className={cn("rounded-lg transition", drag?.from === "squad" && drag.zone === "pool" && "bg-blood/10 ring-2 ring-blood/50", className)}>{children}</div>;
}
