import { LEVELS } from "../data/levels";
import { LOCATIONS, type Theme } from "../data/locations";

type G = CanvasRenderingContext2D;
export const WORLD_W = 2400, WORLD_H = 1400;
const TAU = Math.PI * 2;

function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

/** Level node positions: four per location on a small arc around the region centre. */
export const NODE_MIN_GAP = 100;
export const NODES: { x: number; y: number }[] = (() => {
  const ns = LEVELS.map((l) => {
    const loc = LOCATIONS[l.loc]!; const j = (l.id - 1) % 4;
    const dir = l.loc % 2 ? 1 : -1;
    const a = -2.4 + j * 0.85;
    return { x: loc.cx + Math.cos(a) * 200 + (j - 1.5) * 40, y: loc.cy + Math.sin(a) * 120 * dir + (j - 1.5) * -40 * dir };
  });
  // nodes of neighbouring regions can land on each other: push overlapping pairs apart
  for (let it = 0; it < 40; it++) for (let i = 0; i < ns.length; i++) for (let k = i + 1; k < ns.length; k++) {
    const a = ns[i]!, b = ns[k]!; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1;
    if (d < NODE_MIN_GAP + 10) { const push = (NODE_MIN_GAP + 10 - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }
  for (const n of ns) { n.x = Math.max(70, Math.min(WORLD_W - 70, n.x)); n.y = Math.max(70, Math.min(WORLD_H - 70, n.y)); }
  return ns;
})();

/** Smooth road samples through all nodes. */
export const ROAD: { x: number; y: number; node: number }[] = (() => {
  const out: { x: number; y: number; node: number }[] = [];
  const P = [{ x: 60, y: 1250 }, ...NODES];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)]!, p1 = P[i]!, p2 = P[i + 1]!, p3 = P[Math.min(P.length - 1, i + 2)]!;
    for (let k = 0; k < 24; k++) {
      const t = k / 24, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y), node: i - 1 + t });
    }
  }
  out.push({ ...NODES[NODES.length - 1]!, node: NODES.length - 1 });
  return out;
})();

/** Position on the road for a fractional node index (-1 = horde camp). */
export function roadAt(nodeF: number) {
  const idx = Math.max(0, Math.min(ROAD.length - 1, (nodeF + 1) * 24));
  const a = ROAD[Math.floor(idx)]!, b = ROAD[Math.min(ROAD.length - 1, Math.floor(idx) + 1)]!; const k = idx - Math.floor(idx);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

const BIOME: Record<Theme, { ground: string; edge: string }> = {
  dead: { ground: "#2c3123", edge: "#4a5236" }, ice: { ground: "#3e5262", edge: "#a8c4d8" }, swamp: { ground: "#24321e", edge: "#4a6a30" },
  forest: { ground: "#1b2a24", edge: "#2f5444" }, forge: { ground: "#3a1e16", edge: "#a04020" }, capital: { ground: "#3a3028", edge: "#8a7050" },
};

function icon(g: G, theme: Theme, x: number, y: number, s: number, r: () => number) {
  g.save(); g.translate(x, y); g.scale(s, s);
  switch (theme) {
    case "dead": g.fillStyle = "#4a4a4c"; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-6, -12); g.arc(0, -12, 6, Math.PI, 0); g.lineTo(6, 0); g.fill(); g.fillStyle = "#1a1a1c"; g.fillRect(-1, -14, 2, 8); g.fillRect(-3, -12, 6, 2); break;
    case "ice": g.fillStyle = "#6a8090"; g.beginPath(); g.moveTo(-26, 0); g.lineTo(0, -40 - r() * 16); g.lineTo(26, 0); g.fill(); g.fillStyle = "#eef8ff"; g.beginPath(); g.moveTo(-9, -26); g.lineTo(0, -40); g.lineTo(9, -26); g.lineTo(3, -29); g.lineTo(-3, -25); g.fill(); break;
    case "swamp": g.fillStyle = "rgba(90,140,60,0.55)"; g.beginPath(); g.ellipse(0, 0, 22, 8, 0, 0, TAU); g.fill(); g.strokeStyle = "#6a7a2a"; g.lineWidth = 1.5; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(10 + i * 3, 0); g.lineTo(12 + i * 4, -14); g.stroke(); } break;
    case "forest": g.fillStyle = "#2a1e14"; g.fillRect(-2, -10, 4, 10); g.fillStyle = "#183028"; g.beginPath(); g.moveTo(0, -38); g.lineTo(-13, -8); g.lineTo(13, -8); g.fill(); g.fillStyle = "#1f3c32"; g.beginPath(); g.moveTo(0, -46); g.lineTo(-9, -24); g.lineTo(9, -24); g.fill(); break;
    case "forge": g.fillStyle = "#2a1a16"; g.beginPath(); g.moveTo(-28, 0); g.lineTo(-6, -36); g.lineTo(6, -36); g.lineTo(28, 0); g.fill(); g.fillStyle = "#ff6a1a"; g.beginPath(); g.moveTo(-5, -36); g.lineTo(0, -28); g.lineTo(5, -36); g.fill(); break;
    case "capital": g.fillStyle = "#4a4048"; g.fillRect(-12, -24, 24, 24); g.fillRect(-16, -32, 8, 32); g.fillRect(8, -32, 8, 32); g.fillStyle = "#8a1a1a"; g.beginPath(); g.moveTo(-16, -32); g.lineTo(-12, -40); g.lineTo(-8, -32); g.moveTo(8, -32); g.lineTo(12, -40); g.lineTo(16, -32); g.fill(); g.fillStyle = "rgba(255,190,90,0.7)"; g.fillRect(-2, -16, 4, 6); break;
  }
  g.restore();
}

let terrain: HTMLCanvasElement | null = null;
function buildTerrain() {
  if (terrain) return terrain;
  const c = document.createElement("canvas"); c.width = WORLD_W; c.height = WORLD_H; const g = c.getContext("2d")!; const r = rng(7);
  // dark parchment ocean / void
  const bg = g.createRadialGradient(WORLD_W / 2, WORLD_H / 2, 200, WORLD_W / 2, WORLD_H / 2, 1500); bg.addColorStop(0, "#1c1712"); bg.addColorStop(1, "#08070a");
  g.fillStyle = bg; g.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(200,170,120,${r() * 0.04})`; g.fillRect(r() * WORLD_W, r() * WORLD_H, 2 + r() * 30, 1); }
  // regions as soft blobs
  for (const loc of LOCATIONS) {
    const b = BIOME[loc.theme];
    for (let k = 0; k < 9; k++) {
      const x = loc.cx + (r() - 0.5) * 380, y = loc.cy + (r() - 0.5) * 260, rad = 160 + r() * 140;
      const gr = g.createRadialGradient(x, y, 10, x, y, rad); gr.addColorStop(0, b.ground); gr.addColorStop(0.7, b.ground); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
  }
  // coast/edge ink lines
  for (const loc of LOCATIONS) {
    g.strokeStyle = BIOME[loc.theme].edge; g.globalAlpha = 0.25; g.lineWidth = 2; g.setLineDash([10, 8]);
    g.beginPath(); g.ellipse(loc.cx, loc.cy, 330, 220, (loc.id % 3) * 0.2, 0, TAU); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  }
  // icons scattered, away from nodes
  for (const loc of LOCATIONS) {
    for (let k = 0; k < 34; k++) {
      const a = r() * TAU, d = 60 + r() * 260; const x = loc.cx + Math.cos(a) * d * 1.2, y = loc.cy + Math.sin(a) * d * 0.75;
      if (NODES.some((n) => Math.hypot(n.x - x, n.y - y) < 60) || ROAD.some((p) => Math.hypot(p.x - x, p.y - y) < 32)) continue;
      icon(g, loc.theme, x, y, 0.8 + r() * 0.8, r);
    }
  }
  // horde camp
  g.fillStyle = "#3a1a40"; for (let i = 0; i < 4; i++) { const x = 40 + i * 30, y = 1250 + (i % 2) * 20; g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x, y - 24); g.lineTo(x + 14, y); g.fill(); }
  const cg = g.createRadialGradient(80, 1250, 5, 80, 1250, 120); cg.addColorStop(0, "rgba(160,60,255,0.45)"); cg.addColorStop(1, "rgba(160,60,255,0)"); g.fillStyle = cg; g.fillRect(-40, 1130, 240, 240);
  // road bed
  const stroke = (w: number, col: string, dash?: number[]) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; if (dash) g.setLineDash(dash); g.beginPath(); ROAD.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); g.setLineDash([]); };
  stroke(16, "rgba(0,0,0,0.5)"); stroke(10, "#4a3a2a"); stroke(4, "#6a5440", [8, 10]);
  // vignette
  const v = g.createRadialGradient(WORLD_W / 2, WORLD_H / 2, 600, WORLD_W / 2, WORLD_H / 2, 1500); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.75)"); g.fillStyle = v; g.fillRect(0, 0, WORLD_W, WORLD_H);
  terrain = c; return c;
}

export interface MapState {
  time: number; view: { x: number; y: number; z: number };
  stars: Record<number, number>; unlocked: (id: number) => boolean; locOpen: (loc: number) => boolean;
  /** 1 = fully fogged, 0 = clear */
  fog: number[]; hover: number | null; selected: number | null; banner: number;
}

export function renderWorld(g: G, w: number, h: number, s: MapState) {
  g.fillStyle = "#08070a"; g.fillRect(0, 0, w, h);
  g.save(); g.translate(s.view.x, s.view.y); g.scale(s.view.z, s.view.z);
  g.drawImage(buildTerrain(), 0, 0);
  const t = s.time;
  // glowing travelled road up to the furthest unlocked node
  let reach = -1; for (let i = 0; i < NODES.length; i++) if (s.unlocked(i + 1)) reach = i;
  g.save(); g.strokeStyle = "rgba(255,120,60,0.85)"; g.lineWidth = 3; g.setLineDash([6, 12]); g.lineDashOffset = -t * 30; g.shadowColor = "#ff5a2a"; g.shadowBlur = 10;
  g.beginPath(); let started = false; for (const p of ROAD) { if (p.node > reach) break; if (!started) { g.moveTo(p.x, p.y); started = true; } else g.lineTo(p.x, p.y); } g.stroke(); g.restore();
  // region titles
  g.textAlign = "center";
  for (const loc of LOCATIONS) {
    const open = s.locOpen(loc.id);
    g.font = "28px 'Russo One', sans-serif"; g.fillStyle = "rgba(0,0,0,0.7)"; g.fillText(loc.name.toUpperCase(), loc.cx + 2, loc.cy - 170 + 2);
    g.fillStyle = open ? "#e8d8b0" : "#6a6058"; g.fillText(loc.name.toUpperCase(), loc.cx, loc.cy - 170);
  }
  // nodes
  NODES.forEach((n, i) => {
    const id = i + 1, open = s.unlocked(id), stars = s.stars[id] ?? 0, boss = LEVELS[i]!.boss;
    const next = open && !stars; const hov = s.hover === i || s.selected === i;
    const R = (boss ? 22 : 17) * (hov ? 1.15 : 1);
    if (next) { const p = 0.5 + Math.sin(t * 4) * 0.5; g.strokeStyle = `rgba(255,90,40,${0.4 + p * 0.5})`; g.lineWidth = 3; g.beginPath(); g.arc(n.x, n.y, R + 6 + p * 6, 0, TAU); g.stroke(); }
    g.fillStyle = "rgba(0,0,0,0.55)"; g.beginPath(); g.ellipse(n.x, n.y + R * 0.8, R, R * 0.4, 0, 0, TAU); g.fill();
    g.fillStyle = !open ? "#2a2628" : stars ? "#6a1a14" : "#a02a1a"; g.beginPath(); g.arc(n.x, n.y, R, 0, TAU); g.fill();
    g.strokeStyle = boss ? "#e8b53a" : open ? "#e8d8b0" : "#4a4448"; g.lineWidth = boss ? 3 : 2; g.stroke();
    // skull
    g.fillStyle = open ? "#efe6d0" : "#5a5458"; g.beginPath(); g.arc(n.x, n.y - 2, R * 0.48, 0, TAU); g.fill(); g.fillRect(n.x - R * 0.28, n.y + R * 0.1, R * 0.56, R * 0.3);
    g.fillStyle = open ? "#1a0a08" : "#2a2628"; g.beginPath(); g.arc(n.x - R * 0.18, n.y - 3, R * 0.13, 0, TAU); g.arc(n.x + R * 0.18, n.y - 3, R * 0.13, 0, TAU); g.fill();
    if (boss) { g.fillStyle = "#e8b53a"; g.beginPath(); const y = n.y - R - 2; g.moveTo(n.x - 9, y); g.lineTo(n.x - 9, y - 8); g.lineTo(n.x - 4, y - 4); g.lineTo(n.x, y - 11); g.lineTo(n.x + 4, y - 4); g.lineTo(n.x + 9, y - 8); g.lineTo(n.x + 9, y); g.fill(); }
    if (open) { g.font = "14px 'Russo One', sans-serif"; for (let k = 0; k < 3; k++) { g.fillStyle = k < stars ? "#e8b53a" : "rgba(255,255,255,0.18)"; g.fillText("★", n.x - 14 + k * 14, n.y + R + 18); } }
    g.font = "12px 'Russo One', sans-serif"; g.fillStyle = open ? "#e8d8b0" : "#5a5458"; g.fillText(String(id), n.x, n.y + R + (open ? 32 : 16));
  });
  // horde banner
  const bp = roadAt(s.banner); const sway = Math.sin(t * 3) * 3;
  g.fillStyle = "rgba(0,0,0,0.5)"; g.beginPath(); g.ellipse(bp.x, bp.y + 2, 10, 4, 0, 0, TAU); g.fill();
  g.fillStyle = "#1a1418"; g.fillRect(bp.x - 1.5, bp.y - 52, 3, 52);
  g.fillStyle = "#8a1a1a"; g.beginPath(); g.moveTo(bp.x + 1.5, bp.y - 52); g.lineTo(bp.x + 30 + sway, bp.y - 46); g.lineTo(bp.x + 24 + sway, bp.y - 38); g.lineTo(bp.x + 30 + sway, bp.y - 30); g.lineTo(bp.x + 1.5, bp.y - 32); g.closePath(); g.fill();
  g.fillStyle = "#efe6d0"; g.beginPath(); g.arc(bp.x + 13 + sway * 0.5, bp.y - 43, 4, 0, TAU); g.fill();
  // fog over locked regions
  for (const loc of LOCATIONS) {
    const f = s.fog[loc.id] ?? 0; if (f <= 0.01) continue;
    for (let k = 0; k < 5; k++) {
      const x = loc.cx + Math.sin(t * 0.2 + k * 1.7) * 60 + (k - 2) * 80, y = loc.cy + Math.cos(t * 0.15 + k) * 30;
      const gr = g.createRadialGradient(x, y, 20, x, y, 300); gr.addColorStop(0, `rgba(14,12,16,${0.85 * f})`); gr.addColorStop(1, "rgba(14,12,16,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 300, 0, TAU); g.fill();
    }
  }
  // embers & drifting clouds
  for (let i = 0; i < 60; i++) { const x = (i * 211.7 + t * (10 + (i % 5) * 4)) % WORLD_W, y = WORLD_H - ((i * 97.3 + t * (14 + (i % 3) * 6)) % WORLD_H); g.fillStyle = `rgba(255,${120 + (i % 4) * 30},60,${0.25 + (i % 3) * 0.15})`; g.fillRect(x, y, 2.5, 2.5); }
  for (let i = 0; i < 6; i++) { const x = ((i * 520 + t * 12) % (WORLD_W + 600)) - 300, y = 150 + i * 210; const gr = g.createRadialGradient(x, y, 10, x, y, 220); gr.addColorStop(0, "rgba(200,190,200,0.06)"); gr.addColorStop(1, "rgba(200,190,200,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 260, 90, 0, 0, TAU); g.fill(); }
  g.restore();
}

/** Node under a screen point, or null. */
export function hitNode(view: MapState["view"], sx: number, sy: number) {
  const wx = (sx - view.x) / view.z, wy = (sy - view.y) / view.z;
  let best: number | null = null, bd = 30;
  NODES.forEach((n, i) => { const d = Math.hypot(n.x - wx, n.y - wy); if (d < bd) { bd = d; best = i; } });
  return best;
}
