import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Currency, gameButton, MonsterPortrait } from "@/components/ui-kit";
import { Wallet } from "@/components/ui-kit/MonsterCard";
import { LEVELS, recLabel } from "@/game/data/levels";
import { LOCATIONS } from "@/game/data/locations";
import { TOWERS } from "@/game/data/towers";
import { isLevelUnlocked, markScene, pendingEpilogue, requiredPower, squadPower } from "@/game/meta/progress";
import { setProgress, useProgress } from "@/game/meta/store";
import { Cutscene } from "@/components/ui-kit/Cutscene";
import { hitNode, NODES, renderWorld, WORLD_H, WORLD_W, type MapState } from "@/game/render/worldmap";
import { sfx, startScene, stopScene, unlockAudio } from "@/game/audio";

export const Route = createFileRoute("/campaign")({
  head: () => ({
    meta: [
      { title: "Карта похода — SIEGE: March of Doom" },
      { name: "description", content: "Интерактивная карта: 6 земель и 24 крепости — от Мёртвых полей до Стен столицы." },
      { property: "og:title", content: "Карта похода — SIEGE: March of Doom" },
      { property: "og:description", content: "Веди орду по карте и выбирай крепость для штурма." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Campaign,
});

const REVEAL_KEY = "siege-map-revealed";
const MAX_Z = 1.8;
let MIN_Z = 0.35;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function Campaign() {
  const p = useProgress();
  const nav = useNavigate();
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const pRef = useRef(p); pRef.current = p;
  const furthest = (() => { let f = 0; for (const l of LEVELS) if (isLevelUnlocked(p, l.id)) f = l.id - 1; return f; })();
  const st = useRef<MapState>({ time: 0, view: { x: 0, y: 0, z: 0.6 }, stars: {}, unlocked: () => false, locOpen: () => false, fog: LOCATIONS.map(() => 1), hover: null, selected: null, banner: -1 });
  const target = useRef<{ x: number; y: number; z: number } | null>(null);
  const bannerTo = useRef(furthest);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  const centerOn = (wx: number, wy: number, z?: number) => {
    const el = wrap.current; if (!el) return; const zz = z ?? st.current.view.z;
    target.current = { x: el.clientWidth / 2 - wx * zz, y: el.clientHeight / 2 - wy * zz, z: zz };
  };

  // initial camera + ambient
  useEffect(() => {
    const n = NODES[furthest]!; const el = wrap.current;
    if (el) {
      const z = Math.max(clamp(el.clientWidth / 1500, 0.45, 1), el.clientWidth / WORLD_W, el.clientHeight / WORLD_H);
      // start a step back (previous level) and glide the camera to the current one
      const from = NODES[Math.max(0, furthest - 1)]!; const z0 = Math.max(z * 0.85, el.clientWidth / WORLD_W, el.clientHeight / WORLD_H);
      st.current.view = { x: el.clientWidth / 2 - from.x * z0, y: el.clientHeight / 2 - from.y * z0, z: z0 };
      setTimeout(() => centerOn(n.x, n.y, z), 250);
    }
    st.current.banner = Math.max(-1, furthest - 1);
    const startAudio = () => { unlockAudio(); startScene("map", false); };
    startAudio(); window.addEventListener("pointerdown", startAudio, { once: true });
    return () => { stopScene(); window.removeEventListener("pointerdown", startAudio); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fog reveal for newly opened locations
  useEffect(() => {
    let seen = 0; try { seen = Number(localStorage.getItem(REVEAL_KEY) ?? 0); } catch { /* ignore */ }
    const open = LOCATIONS.filter((l) => isLevelUnlocked(p, l.id * 4 + 1)).length - 1;
    LOCATIONS.forEach((l) => { st.current.fog[l.id] = l.id <= Math.max(seen, 0) && l.id <= open ? 0 : l.id <= open ? 1 : 1; });
    if (open > seen) {
      const loc = LOCATIONS[open]!; centerOn(loc.cx, loc.cy);
      setTimeout(() => sfx.unlock(), 300);
      try { localStorage.setItem(REVEAL_KEY, String(open)); } catch { /* ignore */ }
    }
    bannerTo.current = furthest;
  }, [p, furthest]);

  // render loop
  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = st.current; const pr = pRef.current;
      s.time += dt; s.stars = pr.stars; s.unlocked = (id) => isLevelUnlocked(pr, id); s.locOpen = (loc) => isLevelUnlocked(pr, loc * 4 + 1);
      LOCATIONS.forEach((l) => { if (s.locOpen(l.id) && s.fog[l.id]! > 0) s.fog[l.id] = Math.max(0, s.fog[l.id]! - dt * 0.6); });
      const bt = bannerTo.current; if (Math.abs(s.banner - bt) > 0.001) s.banner += Math.sign(bt - s.banner) * Math.min(Math.abs(bt - s.banner), dt * 2.2);
      const tg = target.current; if (tg) { const k = 1 - Math.exp(-dt * 6); s.view.x += (tg.x - s.view.x) * k; s.view.y += (tg.y - s.view.y) * k; s.view.z += (tg.z - s.view.z) * k; if (Math.abs(tg.x - s.view.x) < 0.5 && Math.abs(tg.y - s.view.y) < 0.5) target.current = null; }
      const c = cv.current, el = wrap.current;
      if (c && el) {
        const dpr = window.devicePixelRatio || 1; const w = el.clientWidth, h = el.clientHeight;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = `${w}px`; c.style.height = `${h}px`; }
        // keep the world on screen
        MIN_Z = Math.max(w / WORLD_W, h / WORLD_H);
        if (s.view.z < MIN_Z) s.view.z = MIN_Z; if (target.current && target.current.z < MIN_Z) target.current.z = MIN_Z;
        const z = s.view.z; s.view.x = clamp(s.view.x, w - WORLD_W * z, 0); s.view.y = clamp(s.view.y, h - WORLD_H * z, 0);
        const g = c.getContext("2d")!; g.setTransform(dpr, 0, 0, dpr, 0, 0); renderWorld(g, w, h, s);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, []);

  // wheel zoom (non-passive) anchored at cursor
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); target.current = null;
      const v = st.current.view; const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const next = clamp(v.z * Math.exp(-dy * 0.0015), MIN_Z, MAX_Z); const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top; const k = next / v.z;
      v.x = px - (px - v.x) * k; v.y = py - (py - v.y) * k; v.z = next;
    };
    el.addEventListener("wheel", onWheel, { passive: false }); return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // drag pan + pinch + click
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: 0, pinch: 0 });
  const local = (e: React.PointerEvent) => { const r = wrap.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: React.PointerEvent) => { if (e.target !== cv.current) return; (e.target as Element).setPointerCapture(e.pointerId); ptrs.current.set(e.pointerId, local(e)); drag.current.moved = 0; target.current = null; if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; drag.current.pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y); } };
  const onMove = (e: React.PointerEvent) => {
    const pt = local(e); const prev = ptrs.current.get(e.pointerId); const v = st.current.view;
    if (prev) {
      if (ptrs.current.size === 2) {
        ptrs.current.set(e.pointerId, pt); const [a, b] = [...ptrs.current.values()]; const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const mx = (a!.x + b!.x) / 2, my = (a!.y + b!.y) / 2; const next = clamp(v.z * (d / (drag.current.pinch || d)), MIN_Z, MAX_Z); const k = next / v.z;
        v.x = mx - (mx - v.x) * k; v.y = my - (my - v.y) * k; v.z = next; drag.current.pinch = d; drag.current.moved += 10; return;
      }
      v.x += pt.x - prev.x; v.y += pt.y - prev.y; drag.current.moved += Math.abs(pt.x - prev.x) + Math.abs(pt.y - prev.y); ptrs.current.set(e.pointerId, pt);
    }
    const h = hitNode(v, pt.x, pt.y); st.current.hover = h;
    setHover((old) => { if (h === null) return null; if (old?.i !== h) sfx.hover(); return { i: h, x: pt.x, y: pt.y }; });
  };
  const onUp = (e: React.PointerEvent) => {
    const pt = local(e); const had = ptrs.current.delete(e.pointerId);
    if (!had || e.target !== cv.current || drag.current.moved > 6) return;
    const h = hitNode(st.current.view, pt.x, pt.y);
    if (h !== null && isLevelUnlocked(p, h + 1)) { sfx.click(); setSelected(h); st.current.selected = h; bannerTo.current = h; }
    else if (h === null) { setSelected(null); st.current.selected = null; }
  };

  const jump = (loc: number) => { const l = LOCATIONS[loc]!; sfx.pageTurn(); centerOn(l.cx, l.cy, clamp((wrap.current?.clientWidth ?? 1200) / 1100, 0.6, 1.2)); };
  const zoomBy = (k: number) => { const el = wrap.current; if (!el) return; const v = st.current.view; const next = clamp(v.z * k, MIN_Z, MAX_Z); const px = el.clientWidth / 2, py = el.clientHeight / 2; target.current = { x: px - (px - v.x) * (next / v.z), y: py - (py - v.y) * (next / v.z), z: next }; };

  const lvl = selected !== null ? LEVELS[selected]! : null;
  const hl = hover ? LEVELS[hover.i]! : null;
  const epi = pendingEpilogue(p);
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {epi && <Cutscene key={epi} sceneId={epi} onDone={() => setProgress((q) => markScene(q, epi))} />}
      <header className="z-10 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-3 py-2">
        <div className="flex items-center gap-3">
          <Link to="/" className={gameButton({ variant: "ghost", size: "sm" })}>← Меню</Link>
          <h1 className="font-display text-lg uppercase tracking-wider text-primary">Карта похода</h1>
        </div>
        <Wallet />
      </header>
      <div ref={wrap} className="relative flex-1 touch-none select-none overflow-hidden" style={{ cursor: hover ? "pointer" : "grab" }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={(e) => ptrs.current.delete(e.pointerId)} onPointerLeave={() => { setHover(null); st.current.hover = null; }}>
        <canvas ref={cv} className="absolute inset-0" />
        {hl && hover && selected !== hover.i && (
          <div className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 rounded-lg border border-border bg-card/95 p-2 text-xs shadow-lg" style={{ left: hover.x, top: hover.y + 24 }}>
            <div className="text-muted-foreground">{LOCATIONS[hl.loc]!.name} · ур. {hl.id}{hl.boss ? " · БОСС" : ""}</div>
            <div className="font-display text-sm">{isLevelUnlocked(p, hl.id) ? hl.name : "Закрыто"}</div>
            {isLevelUnlocked(p, hl.id) && <div className="text-muted-foreground">Ворота {hl.gateHp} · башен {hl.towers.length} · {hl.gold} золота</div>}
          </div>
        )}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
          <button className={gameButton({ size: "sm" })} onClick={() => zoomBy(1.25)} aria-label="Приблизить">＋</button>
          <button className={gameButton({ size: "sm" })} onClick={() => zoomBy(0.8)} aria-label="Отдалить">－</button>
        </div>
        <div className="absolute inset-x-0 bottom-3 z-10 flex flex-wrap justify-center gap-1 px-3">
          {LOCATIONS.map((l) => {
            const open = isLevelUnlocked(p, l.id * 4 + 1);
            return <button key={l.id} onClick={() => jump(l.id)} className={cn(gameButton({ size: "sm", variant: open ? "secondary" : "ghost" }), !open && "opacity-50")}>{open ? "" : "🔒 "}{l.name}</button>;
          })}
        </div>
        {lvl && (() => {
          const loc = LOCATIONS[lvl.loc]!; const rec = requiredPower(lvl.id);
          const avg = squadPower(p);
          const ok = avg >= rec, near = avg >= rec * 0.85; const stars = p.stars[lvl.id] ?? 0;
          const tone = ok ? "poison" : near ? "gold" : "blood";
          return (
          <div key={lvl.id} className="panel-texture absolute left-4 top-4 z-10 w-[22rem] overflow-hidden rounded-2xl border-2 border-gold/60 bg-card/95 shadow-2xl backdrop-blur animate-screen-in">
            <div className={cn("relative px-4 pb-3 pt-4", lvl.boss ? "bg-blood/20" : "bg-primary/10")}>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
              <button aria-label="Закрыть" onClick={() => { setSelected(null); st.current.selected = null; }} className="absolute right-2 top-2 h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">✕</button>
              <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{loc.name} · ур. {lvl.id}</div>
              <div className="mt-0.5 flex items-center gap-2">
                {lvl.boss && <span className="text-2xl" title="Босс">👑</span>}
                <h3 className="font-display text-2xl uppercase leading-tight">{lvl.name}</h3>
              </div>
              <div className="mt-1 flex gap-1 text-2xl leading-none">{[1, 2, 3].map((s) => <span key={s} className={cn("transition", s <= stars ? "text-gold drop-shadow-[0_0_8px_var(--gold)]" : "text-muted-foreground/25")}>★</span>)}</div>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-xs italic text-muted-foreground">{loc.blurb}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border bg-background/40 p-2"><div className="text-lg">🏰</div><div className="font-display text-sm">{lvl.gateHp}</div><div className="text-[10px] text-muted-foreground">ворота</div></div>
                <div className="rounded-lg border border-border bg-background/40 p-2"><div className="text-lg">🗼</div><div className="font-display text-sm">{lvl.towers.length}{lvl.elite ? <span className="text-blood"> +{lvl.elite}★</span> : null}</div><div className="text-[10px] text-muted-foreground">башен</div></div>
                <div className="rounded-lg border border-border bg-background/40 p-2"><div className="text-lg">⏳</div><div className="font-display text-sm">{Math.floor(lvl.timeLimit / 60)}:{String(lvl.timeLimit % 60).padStart(2, "0")}</div><div className="text-[10px] text-muted-foreground">время</div></div>
              </div>
              <div>
                <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Сила отряда</span><span className={`text-${tone}`}><b>{avg}</b> / нужно <b>{rec}</b> · {recLabel(lvl.id)}</span></div>
                <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-[width]", ok ? "bg-poison" : near ? "bg-gold" : "bg-blood")} style={{ width: `${Math.min(100, (avg / Math.max(rec, 1)) * 100)}%` }} />
                </div>
                <div className={cn("mt-1 text-[11px]", `text-${tone}`)}>{ok ? "Отряд готов к штурму" : near ? "Будет тяжело — стоит прокачаться" : "Слишком сильная оборона — прокачай отряд"}</div>
              </div>
              <div className="flex flex-wrap gap-1">{[...new Set(lvl.towers)].map((k) => <span key={k} className={cn("rounded-full border px-2 py-0.5 text-[10px]", k === loc.newTower ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{k === loc.newTower ? "✦ " : ""}{TOWERS[k].name}</span>)}</div>
              <div className="flex items-center justify-between rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Награда</span>
                <span className="flex items-center gap-2"><Currency kind="gold" value={lvl.gold} className="text-sm" />{!stars && <>+ <Currency kind="skulls" value={3} className="text-sm" /></>}</span>
              </div>
              <div className="flex items-stretch gap-2">
                <button className={cn(gameButton({ variant: "primary", size: "lg" }), "flex-1 text-lg shadow-[var(--shadow-glow)] animate-soft-pulse")} onClick={() => { sfx.warcry(); nav({ to: "/play/$levelId", params: { levelId: String(lvl.id) } }); }}>⚔ Штурм</button>
                <Link to="/squad" className={cn(gameButton({ variant: "secondary", size: "lg" }), "px-3")} title="Отряд"><MonsterPortrait id={p.squad[0] ?? "troll"} size={36} /></Link>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
