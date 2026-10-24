import { MONSTERS } from "../data/monsters";
import { RARITY_INFO } from "../data/rarity";
import { TOWERS, towerScale } from "../data/towers";
import { GATE, H, W, type Battle, type Tower, type Unit } from "../engine/battle";
import { drawCreature, FLOATERS } from "./creatures";

type G = CanvasRenderingContext2D;
const bgCache = new Map<string, HTMLCanvasElement>();

type ThemeArt = { a: string; b: string; tint: string; mark: string; road: [string, string, string]; props: string[] };
const THEMES: Record<string, ThemeArt> = {
  dead: { a: "#2c3123", b: "#121510", tint: "rgba(70,85,50,0.22)", mark: "rgba(140,150,100,0.18)", road: ["#18130d", "#46382a", "#574634"], props: ["grave", "tree", "bones", "rock", "grave"] },
  ice: { a: "#3b4c5a", b: "#141c24", tint: "rgba(220,240,255,0.14)", mark: "rgba(230,245,255,0.25)", road: ["#1a2028", "#56626c", "#707c86"], props: ["pine", "pine", "drift", "crack", "rock"] },
  swamp: { a: "#28331f", b: "#0e140c", tint: "rgba(90,130,60,0.2)", mark: "rgba(140,190,90,0.2)", road: ["#141209", "#3b3622", "#4a4430"], props: ["bog", "reed", "mush", "bog", "tree"] },
  forest: { a: "#1f2a26", b: "#0b100e", tint: "rgba(60,110,90,0.2)", mark: "rgba(120,180,150,0.18)", road: ["#13110c", "#3a3426", "#4a4232"], props: ["oak", "oak", "stone", "mush", "oak"] },
  forge: { a: "#33221c", b: "#120a08", tint: "rgba(255,90,30,0.12)", mark: "rgba(255,140,60,0.18)", road: ["#120c0a", "#3e3430", "#4c403a"], props: ["lava", "rock", "anvil", "rock", "lava"] },
  capital: { a: "#3a2e26", b: "#140f0c", tint: "rgba(120,90,60,0.18)", mark: "rgba(200,170,130,0.15)", road: ["#1a1410", "#5a5048", "#6e645a"], props: ["house", "banner", "well", "house", "rock"] },
};

function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

function prop(g: G, kind: string, x: number, y: number, r: () => number) {
  switch (kind) {
    case "grave": g.fillStyle = "#4a4a4c"; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x - 6, y - 12); g.arc(x, y - 12, 6, Math.PI, 0); g.lineTo(x + 6, y); g.fill(); g.fillStyle = "#2a2a2c"; g.fillRect(x - 1, y - 14, 2, 8); g.fillRect(x - 3, y - 12, 6, 2); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x - 8, y, 16, 3); break;
    case "tree": g.strokeStyle = "#0b0a08"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 24); g.moveTo(x, y - 14); g.lineTo(x - 9, y - 26); g.moveTo(x, y - 19); g.lineTo(x + 10, y - 30); g.moveTo(x + 5, y - 24); g.lineTo(x + 3, y - 32); g.stroke(); break;
    case "bones": g.fillStyle = "#d8d0bc"; g.fillRect(x, y, 8, 2); g.beginPath(); g.arc(x + 11, y + 1, 3, 0, Math.PI * 2); g.fill(); break;
    case "rock": g.fillStyle = "#3a3a38"; g.beginPath(); g.ellipse(x, y, 8 + r() * 6, 5 + r() * 3, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,255,255,0.06)"; g.beginPath(); g.ellipse(x - 2, y - 2, 4, 2, 0, 0, Math.PI * 2); g.fill(); break;
    case "pine": g.fillStyle = "#1e3a2e"; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x, y - 30 + i * 8); g.lineTo(x - 11 + i * 2, y - 8 + i * 4); g.lineTo(x + 11 - i * 2, y - 8 + i * 4); g.fill(); } g.fillStyle = "#e8f4ff"; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x - 4, y - 20); g.lineTo(x + 4, y - 20); g.fill(); g.fillStyle = "#3a2a1a"; g.fillRect(x - 2, y - 4, 4, 5); break;
    case "drift": g.fillStyle = "rgba(235,245,255,0.55)"; g.beginPath(); g.ellipse(x, y, 18, 6, 0, Math.PI, 0); g.fill(); break;
    case "crack": g.strokeStyle = "rgba(200,235,255,0.35)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y - 4); g.lineTo(x + 16, y + 3); g.moveTo(x + 10, y - 4); g.lineTo(x + 12, y - 12); g.stroke(); break;
    case "bog": { const gr = g.createRadialGradient(x, y, 2, x, y, 22); gr.addColorStop(0, "rgba(90,140,60,0.55)"); gr.addColorStop(1, "rgba(30,50,20,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 24, 10, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(160,220,100,0.4)"; g.beginPath(); g.arc(x + 5, y - 1, 1.6, 0, Math.PI * 2); g.fill(); break; }
    case "reed": g.strokeStyle = "#5a6a2a"; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + i * 3, y); g.lineTo(x + i * 3 + (i - 1.5) * 2, y - 14 - i * 2); g.stroke(); } g.fillStyle = "#4a2e1a"; g.fillRect(x + 2, y - 18, 2, 5); break;
    case "mush": g.fillStyle = "#d8d0bc"; g.fillRect(x - 1, y - 6, 2, 6); g.fillStyle = "#6ad0c0"; g.beginPath(); g.ellipse(x, y - 6, 5, 3, 0, Math.PI, 0); g.fill(); g.fillStyle = "rgba(106,208,192,0.18)"; g.beginPath(); g.arc(x, y - 5, 10, 0, Math.PI * 2); g.fill(); break;
    case "oak": g.fillStyle = "#2a1e14"; g.fillRect(x - 3, y - 14, 6, 14); g.fillStyle = "#1c3328"; g.beginPath(); g.arc(x, y - 22, 13, 0, Math.PI * 2); g.arc(x - 9, y - 16, 8, 0, Math.PI * 2); g.arc(x + 9, y - 16, 8, 0, Math.PI * 2); g.fill(); break;
    case "stone": g.fillStyle = "#4a4e50"; g.fillRect(x - 4, y - 20, 8, 20); g.fillStyle = "rgba(120,220,200,0.5)"; g.fillRect(x - 1, y - 16, 2, 8); break;
    case "lava": { const gr = g.createRadialGradient(x, y, 1, x, y, 20); gr.addColorStop(0, "rgba(255,160,60,0.8)"); gr.addColorStop(0.5, "rgba(220,60,20,0.45)"); gr.addColorStop(1, "rgba(60,10,0,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 22, 9, 0, 0, Math.PI * 2); g.fill(); break; }
    case "anvil": g.fillStyle = "#2a2a30"; g.fillRect(x - 8, y - 9, 16, 4); g.fillRect(x - 3, y - 5, 6, 5); g.fillRect(x - 6, y, 12, 2); break;
    case "house": g.fillStyle = "#4a4038"; g.fillRect(x - 10, y - 14, 20, 14); g.fillStyle = "#6a2020"; g.beginPath(); g.moveTo(x - 12, y - 14); g.lineTo(x, y - 24); g.lineTo(x + 12, y - 14); g.fill(); g.fillStyle = "rgba(255,190,90,0.5)"; g.fillRect(x - 2, y - 9, 4, 4); break;
    case "banner": g.fillStyle = "#222"; g.fillRect(x, y - 30, 2, 30); g.fillStyle = "#8a1a1a"; g.fillRect(x + 2, y - 28, 10, 14); g.fillStyle = "#c9a227"; g.fillRect(x + 5, y - 24, 4, 4); break;
    case "well": g.fillStyle = "#5a5048"; g.beginPath(); g.ellipse(x, y, 9, 4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#14100c"; g.beginPath(); g.ellipse(x, y - 1, 6, 2.5, 0, 0, Math.PI * 2); g.fill(); break;
  }
}

function buildBg(b: Battle) {
  const key = b.theme + b.level.map;
  const hit = bgCache.get(key); if (hit) return hit;
  const th = THEMES[b.theme] ?? THEMES["dead"]!;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!; const r = rng(42 + b.level.map * 31);
  const grd = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 800); grd.addColorStop(0, th.a); grd.addColorStop(1, th.b);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // soft ground patches + tiny marks (grass/snow/ash)
  for (let i = 0; i < 18; i++) { const x = r() * W, y = r() * H, rad = 80 + r() * 160; const pg = g.createRadialGradient(x, y, 0, x, y, rad); pg.addColorStop(0, th.tint); pg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = pg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.strokeStyle = th.mark; g.lineWidth = 1; for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 4); g.moveTo(x, y); g.lineTo(x + 2, y - 5); g.stroke(); }
  // road: shoulder, bed, worn centre, ruts and pebbles
  const pts = b.path.pts;
  const road = (w: number, col: string, dash?: number[]) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; if (dash) g.setLineDash(dash); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]); };
  g.save(); g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 18; road(70, th.road[0]); g.restore();
  road(58, th.road[1]); road(42, th.road[2]);
  g.save(); g.globalAlpha = 0.35; road(46, th.road[1], [2, 9, 1, 14]); g.restore();
  for (const off of [-10, 10]) { g.save(); g.translate(0, off * 0.35); g.globalAlpha = 0.28; road(3, th.road[0], [26, 8]); g.restore(); }
  for (let i = 0; i < 260; i++) { const d = r() * b.path.len; const [px, py, ang] = b.path.posAt(d); const o = (r() - 0.5) * 60; const x = px + Math.cos(ang + Math.PI / 2) * o, y = py + Math.sin(ang + Math.PI / 2) * o; g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.08)"; g.fillRect(x, y, 2 + r() * 2, 1.5 + r()); }
  // tower pads
  for (const s of b.slots) { g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(s.x, s.y + 3, 34, 13, 0, 0, Math.PI * 2); g.fill(); }
  // props
  for (let i = 0; i < 170; i++) {
    const x = r() * W, y = r() * H; if (b.path.dist(x, y) < 58 || x > 1105 || b.slots.some((s) => Math.hypot(s.x - x, s.y - y) < 42)) continue;
    prop(g, th.props[Math.floor(r() * th.props.length)]!, x, y, r);
  }
  const p0 = pts[0]!; const sg = g.createRadialGradient(20, p0[1], 5, 20, p0[1], 90); sg.addColorStop(0, "rgba(160,60,255,0.6)"); sg.addColorStop(1, "rgba(160,60,255,0)"); g.fillStyle = sg; g.fillRect(0, p0[1] - 100, 120, 200);
  g.fillStyle = "#3b3a40"; g.fillRect(1160, 0, 120, H); g.fillStyle = "#2c2b30"; for (let y = 0; y < H; y += 24) g.fillRect(1160, y, 120, 2); for (let y = 0; y < H; y += 30) g.fillRect(1150, y, 14, 16);
  const v = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 820); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.65)"); g.fillStyle = v; g.fillRect(0, 0, W, H);
  bgCache.set(key, c); return c;
}

/** Stateless ambient life per theme: snow, ash, fireflies, spores, crows. */
function ambient(g: G, theme: string, time: number) {
  const n = 40;
  for (let i = 0; i < n; i++) {
    const s = i * 97.13;
    if (theme === "ice") { const x = (s * 13 + time * (20 + (i % 5) * 6)) % W, y = (s * 7 + time * (40 + (i % 4) * 12)) % H; g.fillStyle = "rgba(240,250,255,0.7)"; g.fillRect(x, y, 2, 2); }
    else if (theme === "forge") { const x = (s * 11 + Math.sin(time + i) * 20) % W, y = H - ((s * 5 + time * (25 + (i % 4) * 8)) % H); g.fillStyle = i % 3 ? "rgba(255,140,60,0.6)" : "rgba(120,110,110,0.5)"; g.fillRect(x, y, 2, 2); }
    else if (theme === "forest" || theme === "swamp") { if (i > 24) continue; const x = (s * 17) % W + Math.sin(time * 0.7 + i) * 30, y = (s * 9) % H + Math.cos(time * 0.9 + i * 2) * 20; const a = 0.3 + Math.sin(time * 3 + i) * 0.3; g.fillStyle = theme === "forest" ? `rgba(220,255,140,${a})` : `rgba(140,230,90,${a})`; g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill(); }
    else if (theme === "dead" || theme === "capital") { if (i > 3) continue; const x = ((s * 29 + time * 60) % (W + 200)) - 100, y = 60 + ((s * 3) % 300) + Math.sin(time * 2 + i) * 10; const f = Math.sin(time * 10 + i) * 4; g.strokeStyle = "rgba(10,8,8,0.8)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 6, y - f); g.lineTo(x, y); g.lineTo(x + 6, y - f); g.stroke(); }
  }
}

function bar(g: G, x: number, y: number, w: number, frac: number, col: string) {
  g.fillStyle = "rgba(0,0,0,0.7)"; g.fillRect(x - w / 2 - 1, y - 1, w + 2, 5); g.fillStyle = col; g.fillRect(x - w / 2, y, w * Math.max(0, frac), 3);
}

const BODY: Record<string, string> = { archer: "#6b5a44", cannon: "#5a5a60", mage: "#2c3550", frost: "#5a7a90", censer: "#4a4a2e", bell: "#8a7a5a", ballista: "#5a4a38", flame: "#4a3a34" };
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
/** Stacked floor block with windows. */
function floor(g: G, y: number, w: number, h: number, col: string, time: number, lit: boolean) {
  g.fillStyle = col; g.fillRect(-w / 2, y - h, w, h);
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(-w / 2, y - 3, w, 3);
  g.fillStyle = shade("#6b5a44", 0.55); for (let i = 0; i < 4; i++) g.fillRect(-w / 2 - 2 + i * ((w + 4) / 4), y - h - 5, (w + 4) / 4 - 3, 5);
  const glow = lit ? 0.6 + Math.sin(time * 5) * 0.2 : 0.15;
  g.fillStyle = `rgba(255,190,90,${glow})`; g.fillRect(-w / 4 - 2, y - h + 4, 4, 6); g.fillRect(w / 4 - 2, y - h + 4, 4, 6);
}
function fence(g: G) {
  g.fillStyle = "#5a3e22"; g.strokeStyle = "rgba(10,6,4,0.7)"; g.lineWidth = 1;
  for (let i = -5; i <= 5; i++) { const a = (i / 5) * 1.25; const x = Math.sin(a) * 30, y = Math.cos(a) * 9 + 2; g.beginPath(); g.moveTo(x - 2.5, y); g.lineTo(x - 2.5, y - 11); g.lineTo(x, y - 15); g.lineTo(x + 2.5, y - 11); g.lineTo(x + 2.5, y); g.closePath(); g.fill(); g.stroke(); }
  g.strokeStyle = "#3a2814"; g.lineWidth = 2; g.beginPath(); g.ellipse(0, -4, 30, 9, 0, 0.35, Math.PI - 0.35); g.stroke();
}

function drawTower(g: G, t: Tower, time: number) {
  g.save(); g.translate(t.x, t.y);
  g.fillStyle = "rgba(0,0,0,0.4)"; g.beginPath(); g.ellipse(0, 4, 26 + (t.lvl >= 3 ? 8 : 0), 10, 0, 0, Math.PI * 2); g.fill();
  if (t.alive) {
    g.fillStyle = "#3a3734"; g.beginPath(); g.ellipse(0, 2, 24, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#4e4a45"; g.beginPath(); g.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 12, Math.sin(a) * 4); g.lineTo(Math.cos(a) * 22, Math.sin(a) * 8); g.stroke(); }
    if (t.elite) { g.strokeStyle = `rgba(232,65,58,${0.6 + Math.sin(time * 4) * 0.3})`; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 1, 28, 11, 0, 0, Math.PI * 2); g.stroke(); }
  }
  if (!t.alive) { g.fillStyle = "#3a352e"; for (let i = 0; i < 6; i++) g.fillRect(-18 + i * 6, -6 + ((i * 7) % 5), 8, 7); if (t.ruinT > 0) bar(g, 0, 10, 36, t.ruinT / 12, "#6fa0d0"); g.restore(); return; }
  if (t.building) { g.globalAlpha = 0.55; g.strokeStyle = "#8a6a40"; g.lineWidth = 2; g.strokeRect(-16, -40, 32, 42); g.beginPath(); g.moveTo(-16, -40); g.lineTo(16, 2); g.moveTo(16, -40); g.lineTo(-16, 2); g.stroke(); }
  // super wind-up jitter & glow
  if (t.superT > 0) { g.translate((Math.random() - 0.5) * 3, 0); const k = 0.4 + Math.sin(time * 30) * 0.2; const sg = g.createRadialGradient(0, -40, 4, 0, -40, 60); sg.addColorStop(0, `rgba(255,233,160,${k})`); sg.addColorStop(1, "rgba(255,233,160,0)"); g.fillStyle = sg; g.beginPath(); g.arc(0, -40, 60, 0, Math.PI * 2); g.fill(); }
  // level-up "grow" pop
  if (t.growT > 0) { const s = 1 + Math.sin((t.growT / 0.6) * Math.PI) * 0.12; g.scale(1 / s, s); }
  const fl = t.flash > 0;
  const base = BODY[t.kind]!;
  const stone = (c: string) => (fl ? "#fff" : t.frozenT > 0 ? "#a8d8f0" : c);
  if (t.kind === "archer") {
    g.fillStyle = stone(base); g.fillRect(-14, -36, 28, 38); g.fillStyle = "#4a3c2c"; for (let i = 0; i < 4; i++) g.fillRect(-16 + i * 9, -44, 6, 8);
    g.fillStyle = "#111"; g.fillRect(-3, -26, 6, 10);
  } else if (t.kind === "cannon") {
    g.fillStyle = stone(base); g.beginPath(); g.moveTo(-24, 2); g.lineTo(-20, -28); g.lineTo(20, -28); g.lineTo(24, 2); g.fill(); g.fillStyle = "#44444a"; g.fillRect(-22, -32, 44, 6);
  } else if (t.kind === "mage") {
    g.fillStyle = stone(base); g.beginPath(); g.moveTo(-12, 2); g.lineTo(-6, -44); g.lineTo(6, -44); g.lineTo(12, 2); g.fill();
    g.strokeStyle = `rgba(140,230,255,${t.disabled ? 0.1 : 0.5})`; g.lineWidth = 1; g.beginPath(); g.moveTo(-3, -8); g.lineTo(0, -16); g.lineTo(3, -10); g.lineTo(0, -26); g.lineTo(-2, -32); g.stroke();
  } else if (t.kind === "frost") {
    g.fillStyle = stone(base); g.beginPath(); g.moveTo(-14, 2); g.lineTo(-10, -30); g.lineTo(10, -30); g.lineTo(14, 2); g.fill();
    g.fillStyle = stone("#cfefff"); for (const [x, h] of [[-12, 14], [12, 12], [-6, 8], [6, 9]] as const) { g.beginPath(); g.moveTo(x - 3, -2); g.lineTo(x, -2 - h); g.lineTo(x + 3, -2); g.fill(); }
    g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(-11, -31, 22, 3);
  } else if (t.kind === "censer") {
    g.strokeStyle = stone("#3a3020"); g.lineWidth = 3; g.beginPath(); g.moveTo(-14, 2); g.lineTo(0, -26); g.lineTo(14, 2); g.moveTo(0, -26); g.lineTo(0, 2); g.stroke();
    g.fillStyle = stone("#8a6a2a"); g.beginPath(); g.moveTo(-11, -26); g.quadraticCurveTo(-12, -12, 0, -10); g.quadraticCurveTo(12, -12, 11, -26); g.closePath(); g.fill();
    g.fillStyle = "#5a4418"; g.fillRect(-12, -29, 24, 4); g.fillStyle = "rgba(143,224,74,0.8)"; g.fillRect(-8, -27, 16, 2);
  } else if (t.kind === "bell") {
    g.fillStyle = stone(base); g.fillRect(-16, -50, 4, 52); g.fillRect(12, -50, 4, 52); g.fillRect(-18, -54, 36, 6);
  } else if (t.kind === "ballista") {
    g.fillStyle = stone(base); g.fillRect(-18, -20, 36, 22); g.fillStyle = "#3a2e22"; g.fillRect(-20, -24, 40, 5);
  } else {
    g.fillStyle = stone(base); g.beginPath(); g.moveTo(-16, 2); g.lineTo(-12, -34); g.lineTo(12, -34); g.lineTo(16, 2); g.fill(); g.fillStyle = "#2a1e1a"; g.fillRect(-14, -38, 28, 5);
  }
  // stacked floors: lvl2 second floor, lvl4 third floor
  const baseTop = t.kind === "ballista" ? -24 : t.kind === "cannon" ? -32 : t.kind === "flame" ? -38 : t.kind === "bell" ? -54 : t.kind === "frost" ? -31 : t.kind === "censer" ? -29 : -44;
  let top = baseTop;
  const lit = t.superT > 0 || t.charge > 0.8;
  const upFrac = t.upgradeT > 0 && !t.building ? 1 - t.upgradeT / 6 : 0;
  const stages: { lvl: number; w: number; h: number; k: number }[] = [{ lvl: 2, w: 24, h: 16, k: 0.85 }, { lvl: 4, w: 18, h: 14, k: 0.72 }];
  for (const st of stages) {
    if (t.lvl >= st.lvl) { floor(g, top, st.w, st.h, stone(shade(base, st.k)), time, lit); top -= st.h + 5; }
    else if (t.lvl + 1 === st.lvl && upFrac > 0) {
      // under construction: rising ghost + scaffolding
      g.save(); g.globalAlpha = 0.5; floor(g, top, st.w, st.h * upFrac, shade(base, st.k), time, false); g.restore();
      g.strokeStyle = "#a07a48"; g.lineWidth = 1.5; g.beginPath();
      for (const x of [-st.w / 2 - 4, st.w / 2 + 4]) { g.moveTo(x, top + 4); g.lineTo(x, top - st.h - 6); }
      for (let y = top; y > top - st.h - 6; y -= 7) { g.moveTo(-st.w / 2 - 4, y); g.lineTo(st.w / 2 + 4, y - 3); }
      g.stroke();
    }
  }
  if (t.lvl >= 3) fence(g);
  else if (t.lvl === 2 && upFrac > 0) { g.save(); g.globalAlpha = upFrac; fence(g); g.restore(); }
  const h = 1; const off = top - baseTop;
  g.save(); g.translate(0, off);
  // turrets / heads (positions relative to base, shifted by floors)
  const btop = -44 * h;
  if (t.kind === "archer") { g.fillStyle = "#8a2020"; g.beginPath(); g.moveTo(0, btop - 16); g.lineTo(10, btop - 10); g.lineTo(0, btop - 6); g.fill(); g.fillStyle = "#222"; g.fillRect(-1, btop - 16, 2, 16); }
  if (t.kind === "cannon") { g.save(); g.translate(0, -34 * h); g.rotate(t.angle); g.fillStyle = "#1c1c1f"; g.fillRect(0, -5, 26 + t.lvl * 2, 10); g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill(); if (t.lvl >= 3) { g.fillRect(0, -10, 22, 4); g.fillRect(0, 6, 22, 4); } g.restore();
    const k = (time * 0.5 + t.id * 0.3) % 1; g.fillStyle = `rgba(160,160,160,${0.25 * (1 - k)})`; g.beginPath(); g.arc(Math.cos(t.angle) * 28, -34 - k * 20, 3 + k * 5, 0, Math.PI * 2); g.fill(); }
  if (t.kind === "mage") {
    const pulse = t.disabled ? 0.1 : 0.6 + Math.sin(time * 4 + t.id) * 0.3; const cy = btop - 8 + Math.sin(time * 2 + t.id) * 3;
    const cg = g.createRadialGradient(0, cy, 1, 0, cy, 20 + t.lvl * 3); cg.addColorStop(0, `rgba(140,230,255,${pulse})`); cg.addColorStop(1, "rgba(80,160,255,0)"); g.fillStyle = cg; g.beginPath(); g.arc(0, cy, 24, 0, Math.PI * 2); g.fill();
    g.fillStyle = t.disabled ? "#555" : "#bff3ff"; g.beginPath(); g.moveTo(0, cy - 10); g.lineTo(5, cy); g.lineTo(0, cy + 8); g.lineTo(-5, cy); g.fill();
  }
  if (t.kind === "frost") {
    const cy = -44 + Math.sin(time * 2.5 + t.id) * 2; const p = t.disabled ? 0.1 : 0.5 + Math.sin(time * 3 + t.id) * 0.25;
    const cg = g.createRadialGradient(0, cy, 1, 0, cy, 22); cg.addColorStop(0, `rgba(220,248,255,${p})`); cg.addColorStop(1, "rgba(160,220,255,0)"); g.fillStyle = cg; g.beginPath(); g.arc(0, cy, 22, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(0, cy); g.rotate(time * 0.8); g.fillStyle = t.disabled ? "#555" : "#e8fbff"; for (let i = 0; i < 3; i++) { g.rotate((Math.PI * 2) / 3); g.beginPath(); g.moveTo(0, -11); g.lineTo(3, 0); g.lineTo(0, 4); g.lineTo(-3, 0); g.fill(); } g.restore();
  }
  if (t.kind === "censer") {
    for (let i = 0; i < 4; i++) { const k = (time * 0.6 + i / 4 + t.id * 0.13) % 1; g.fillStyle = `rgba(130,210,70,${0.35 * (1 - k)})`; g.beginPath(); g.arc(Math.sin(time * 2 + i) * 6 * k, -32 - k * 30, 4 + k * 8, 0, Math.PI * 2); g.fill(); }
  }
  if (t.kind === "bell") { const sw = Math.sin(time * 3) * 0.3; g.save(); g.translate(0, -48 * h); g.rotate(sw); g.fillStyle = t.disabled ? "#555" : "#d9b040"; g.beginPath(); g.moveTo(-9, 16); g.quadraticCurveTo(-8, 0, 0, 0); g.quadraticCurveTo(8, 0, 9, 16); g.fill(); g.restore(); }
  if (t.kind === "ballista") { g.save(); g.translate(0, -26 * h); g.rotate(t.angle); g.strokeStyle = "#3a2410"; g.lineWidth = 3; g.beginPath(); g.arc(4, 0, 14, -1.2, 1.2); g.stroke(); g.fillStyle = "#6a5030"; g.fillRect(-6, -2.5, 30, 5); g.fillStyle = "#ccc"; g.fillRect(22, -1.5, 8, 3); g.restore(); }
  if (t.kind === "flame") { g.save(); g.translate(0, -38 * h); g.rotate(t.angle); g.fillStyle = "#2a2a2a"; g.fillRect(0, -4, 20, 8); g.fillStyle = `rgba(255,${120 + Math.random() * 80},40,0.9)`; g.beginPath(); g.arc(22, 0, 3, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.restore();
  // lvl4 flag, lvl5 spire with brazier + aura
  const peak = top - (t.kind === "bell" ? 4 : t.kind === "mage" ? 18 : 10);
  if (t.lvl >= 4) { const fx = t.kind === "archer" || t.kind === "mage" ? -12 : 0; g.fillStyle = "#222"; g.fillRect(fx - 1, peak - 22, 2, 22); const wv = Math.sin(time * 6 + t.id) * 2; g.fillStyle = "#c9a227"; g.beginPath(); g.moveTo(fx + 1, peak - 22); g.lineTo(fx + 14, peak - 18 + wv); g.lineTo(fx + 1, peak - 13); g.fill(); }
  if (t.lvl >= 5) {
    const ag = g.createRadialGradient(0, -10, 10, 0, -10, 46); ag.addColorStop(0, "rgba(255,200,90,0)"); ag.addColorStop(0.7, `rgba(255,200,90,${0.1 + Math.sin(time * 3) * 0.05})`); ag.addColorStop(1, "rgba(255,200,90,0)");
    g.fillStyle = ag; g.beginPath(); g.arc(0, -10, 46, 0, Math.PI * 2); g.fill();
    const sx = t.kind === "archer" || t.kind === "mage" ? 12 : 0;
    g.fillStyle = "#3a3540"; g.beginPath(); g.moveTo(sx - 4, peak); g.lineTo(sx, peak - 18); g.lineTo(sx + 4, peak); g.fill();
    for (let i = 0; i < 3; i++) { const fh = 6 + Math.sin(time * 14 + i * 2) * 2; g.fillStyle = i ? "#ffc040" : "#ff6a1a"; g.beginPath(); g.moveTo(sx - 3 + i, peak - 18); g.lineTo(sx - 1 + i, peak - 18 - fh); g.lineTo(sx + 1 + i, peak - 18); g.fill(); }
  }
  // status overlays
  if (t.frozenT > 0) { g.fillStyle = "rgba(170,230,255,0.45)"; g.fillRect(-20, top - 4, 40, -top + 6); g.strokeStyle = "#e0faff"; g.strokeRect(-20, top - 4, 40, -top + 6); }
  if (t.blindT > 0) { g.fillStyle = "rgba(60,0,80,0.55)"; g.beginPath(); g.arc(0, top / 2, 26, 0, Math.PI * 2); g.fill(); }
  if (t.disabled) { g.strokeStyle = "#5ff0ff"; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, top - 20); g.lineTo(8, top - 4); g.moveTo(8, top - 20); g.lineTo(-8, top - 4); g.stroke(); }
  g.globalAlpha = 1;
  if (t.upgradeT > 0) {
    const f = 1 - t.upgradeT / 6; g.strokeStyle = "#ffd060"; g.lineWidth = 3; g.beginPath(); g.arc(0, top - 30, 9, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); g.stroke();
    g.fillStyle = "#ffd060"; g.font = "bold 11px sans-serif"; g.textAlign = "center"; g.fillText(t.building ? "⚒" : "▲", 0, top - 26);
  }
  g.restore();
  if (t.hp < t.maxHp) bar(g, t.x, t.y + 12, 40, t.hp / t.maxHp, "#d9a43a");
  if (!t.building) {
    const full = t.charge >= 1 || t.superT > 0;
    bar(g, t.x, t.y + 17, 40, full ? 1 : t.charge, full ? (Math.sin(time * 20) > 0 ? "#fff3b0" : "#6fd0ff") : "#6fa0d0");
  }
}

function drawUnit(g: G, u: Unit, time: number) {
  const def = MONSTERS[u.kind];
  const float = FLOATERS.has(u.kind);
  g.save(); g.translate(u.x, u.y);
  g.fillStyle = "rgba(0,0,0,0.4)"; g.beginPath(); g.ellipse(0, float ? 8 : 1, u.radius, u.radius * 0.35, 0, 0, Math.PI * 2); g.fill();
  if (!u.minion && def.rarity !== "common") { g.strokeStyle = RARITY_INFO[def.rarity].color; g.globalAlpha = 0.7; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, float ? 8 : 1, u.radius + 3, u.radius * 0.45 + 1, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
  if (u.buffed) { g.strokeStyle = "rgba(190,120,255,0.7)"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, 1, u.radius + 6, u.radius * 0.5 + 3, 0, 0, Math.PI * 2); g.stroke(); }
  if (u.shield > 0) { g.strokeStyle = "rgba(230,190,80,0.55)"; g.lineWidth = 1; g.beginPath(); g.arc(0, -u.radius, u.radius * 1.4, 0, Math.PI * 2); g.stroke(); }
  if (def.aura) { g.fillStyle = `rgba(140,80,220,${0.08 + Math.sin(time * 3) * 0.03})`; g.beginPath(); g.arc(0, 0, def.aura.radius, 0, Math.PI * 2); g.fill(); }
  if (def.runeAura) { g.strokeStyle = "rgba(95,240,255,0.18)"; g.setLineDash([6, 6]); g.beginPath(); g.arc(0, 0, def.runeAura * u.abil, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
  if (def.shieldAura) { g.fillStyle = "rgba(230,190,80,0.06)"; g.beginPath(); g.arc(0, 0, def.shieldAura.radius, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = u.stealthT > 0 ? 0.28 : u.hurtT > 0 ? 0.6 : 1;
  const sc = u.kind === "abyss" ? 1 : u.radius / (def.radius || 1);
  const pop = u.spawnT > 0 ? 1 - u.spawnT / 0.35 : 1;
  g.scale(sc * pop, sc * (pop < 1 ? pop * (1 + Math.sin(pop * Math.PI) * 0.3) : 1));
  if (u.stunT > 0) { g.fillStyle = "#ffe08a"; for (let i = 0; i < 3; i++) { const a = time * 6 + (i * Math.PI * 2) / 3; g.beginPath(); g.arc(Math.cos(a) * 8, -def.radius * 2.4 + Math.sin(a) * 3, 2, 0, Math.PI * 2); g.fill(); } }
  drawCreature(g, u.kind, u.bob / 1.5 + time * 0.1, u.attacking, u.minion ? 1 : u.lvl);
  g.restore();
  if (u.poisonT > 0) { g.fillStyle = "rgba(130,210,70,0.3)"; g.beginPath(); g.arc(u.x, u.y - u.radius, u.radius * 1.15, 0, Math.PI * 2); g.fill(); }
  if (u.slowT > 0) { g.fillStyle = "rgba(160,220,255,0.35)"; g.beginPath(); g.arc(u.x, u.y - u.radius, u.radius * 1.1, 0, Math.PI * 2); g.fill(); }
  if (u.stealthT <= 0) bar(g, u.x, u.y - u.radius * 2.6 - (float ? 14 : 0), Math.max(18, u.radius * 2.2), u.hp / u.maxHp, "#c0392b");
}

function drawGate(g: G, b: Battle, time: number) {
  const { x, y } = GATE; const frac = b.gateHp / b.gateMax;
  g.fillStyle = "#2a292e"; g.fillRect(x - 40, y - 110, 80, 160);
  g.fillStyle = "#1c1b20"; g.fillRect(x - 54, y - 140, 28, 200); g.fillRect(x + 26, y - 140, 28, 200);
  for (let i = 0; i < 3; i++) { g.fillRect(x - 58 + i * 10, y - 152, 7, 12); g.fillRect(x + 22 + i * 10, y - 152, 7, 12); }
  g.fillStyle = frac > 0 ? "#4a2f1a" : "#140d08"; g.beginPath(); g.moveTo(x - 26, y + 45); g.lineTo(x - 26, y - 40); g.arc(x, y - 40, 26, Math.PI, 0); g.lineTo(x + 26, y + 45); g.fill();
  if (frac > 0) {
    g.strokeStyle = "#222"; g.lineWidth = 3; for (let i = -18; i <= 18; i += 12) { g.beginPath(); g.moveTo(x + i, y - 60); g.lineTo(x + i, y + 45); g.stroke(); }
    g.beginPath(); g.moveTo(x - 26, y - 20); g.lineTo(x + 26, y - 20); g.moveTo(x - 26, y + 20); g.lineTo(x + 26, y + 20); g.stroke();
    g.strokeStyle = "#000"; g.lineWidth = 2;
    if (frac < 0.66) { g.beginPath(); g.moveTo(x - 10, y - 30); g.lineTo(x, y); g.lineTo(x - 6, y + 25); g.stroke(); }
    if (frac < 0.33) { g.beginPath(); g.moveTo(x + 15, y - 50); g.lineTo(x + 5, y - 10); g.lineTo(x + 18, y + 30); g.stroke(); }
  }
  if (frac < 0.33 && frac > 0) {
    for (let i = 0; i < 4; i++) { const k = (time * 1.3 + i / 4) % 1; g.fillStyle = `rgba(255,${180 - k * 120},60,${1 - k})`; g.fillRect(x - 20 + i * 12, y - 10 - k * 40, 2, 2); }
    g.fillStyle = "#140d08"; g.beginPath(); g.moveTo(x - 8, y - 40); g.lineTo(x + 6, y - 10); g.lineTo(x - 4, y + 20); g.lineTo(x - 14, y - 4); g.closePath(); g.fill();
  }
  if (frac < 0.66) { g.fillStyle = "#2a292e"; g.fillRect(x - 60, y - 160, 9, 8); g.fillRect(x + 40, y + 30, 14, 10); }
  if (b.gateHitT > 0) { g.fillStyle = `rgba(255,220,150,${b.gateHitT})`; g.fillRect(x - 26, y - 66, 52, 111); }
  g.fillStyle = "#8a1a1a"; g.fillRect(x - 50, y - 200, 22, 34); g.fillRect(x + 30, y - 200, 22, 34);
}

export function renderBattle(g: G, b: Battle) {
  const bg = buildBg(b);
  g.save();
  if (b.shake > 0) g.translate((Math.random() - 0.5) * b.shake * 2, (Math.random() - 0.5) * b.shake * 2);
  g.drawImage(bg, 0, 0);
  for (const t of b.towers) if (t.alive && !t.building) { g.strokeStyle = "rgba(255,80,60,0.07)"; g.beginPath(); g.arc(t.x, t.y, TOWERS[t.kind].range * towerScale(t.lvl).range, 0, Math.PI * 2); g.stroke(); }
  drawGate(g, b, b.time);
  const ents: { y: number; draw: () => void }[] = [];
  for (const t of b.towers) ents.push({ y: t.y, draw: () => drawTower(g, t, b.time) });
  for (const u of b.units) ents.push({ y: u.y + (FLOATERS.has(u.kind) ? 60 : 0), draw: () => drawUnit(g, u, b.time) });
  ents.sort((a, c) => a.y - c.y).forEach((e) => e.draw());
  for (const p of b.projs) {
    if (p.kind === "arrow") { const a = Math.atan2(p.ty - p.y, p.tx - p.x); g.strokeStyle = p.lvl >= 3 ? "#ff9a3a" : "#e8d8b0"; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - Math.cos(a) * 12, p.y - Math.sin(a) * 12); g.stroke(); }
    else { g.fillStyle = "#111"; g.beginPath(); g.arc(p.x, p.y, p.kind === "mini" ? 3.5 : 6, 0, Math.PI * 2); g.fill(); }
  }
  for (const be of b.beams) {
    g.strokeStyle = be.color; g.globalAlpha = Math.min(1, be.life * 4); g.lineWidth = 3;
    if (be.x1 === be.x2 && be.y1 === be.y2) { g.lineWidth = 2; g.beginPath(); g.arc(be.x1, be.y1, (0.6 - be.life) * 220, 0, Math.PI * 2); g.stroke(); }
    else { g.beginPath(); g.moveTo(be.x1, be.y1); if (be.jag) for (let i = 1; i < 6; i++) { const k = i / 6; g.lineTo(be.x1 + (be.x2 - be.x1) * k + (Math.random() - 0.5) * 14, be.y1 + (be.y2 - be.y1) * k + (Math.random() - 0.5) * 14); } g.lineTo(be.x2, be.y2); g.stroke(); }
    g.globalAlpha = 1;
  }
  g.globalCompositeOperation = "lighter";
  for (const p of b.parts) { g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.color; g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  ambient(g, b.theme, b.time);
  g.textAlign = "center"; g.font = "15px 'Russo One', sans-serif";
  for (const t of b.texts) { g.globalAlpha = Math.min(1, t.life); g.fillStyle = "#000"; g.fillText(t.text, t.x + 1, t.y + 1); g.fillStyle = t.color; g.fillText(t.text, t.x, t.y); }
  g.globalAlpha = 1;
  if (b.marchT > 0) { g.fillStyle = `rgba(200,30,20,${0.12 * (b.marchT / 3)})`; g.fillRect(0, 0, W, H); }
  if (b.darkT > 0) { g.fillStyle = `rgba(10,0,20,${0.35 * Math.min(1, b.darkT)})`; g.fillRect(0, 0, W, H); }
  g.restore();
}
