import type { SceneBg } from "../data/story";

/** Procedural cutscene backdrops, one per region (+ the Heart chamber). Pure canvas drawing. */
type G = CanvasRenderingContext2D;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

interface Pal { sky: [string, string, string]; far: string; mid: string; near: string; glow: string; fog: string }
const PAL: Record<SceneBg, Pal> = {
  dead: { sky: ["#0d1410", "#1d2a1c", "#3a4a2a"], far: "#1a2218", mid: "#121912", near: "#0a0d09", glow: "#cfe8a0", fog: "rgba(150,190,140,0.10)" },
  ice: { sky: ["#0b1220", "#1c3350", "#5a7fa3"], far: "#2a405c", mid: "#1a2a40", near: "#0e1726", glow: "#dff3ff", fog: "rgba(220,240,255,0.12)" },
  swamp: { sky: ["#0a120c", "#16271a", "#2c4a2a"], far: "#17261a", mid: "#0f1a12", near: "#070d09", glow: "#a8ff7a", fog: "rgba(120,200,110,0.14)" },
  forest: { sky: ["#0a0f18", "#1a2638", "#34506a"], far: "#162232", mid: "#0e1824", near: "#070c12", glow: "#bfe6ff", fog: "rgba(170,210,255,0.10)" },
  forge: { sky: ["#140806", "#3a1208", "#8a2a0c"], far: "#2a0e08", mid: "#1a0805", near: "#0c0403", glow: "#ffb050", fog: "rgba(255,120,40,0.10)" },
  capital: { sky: ["#120c16", "#3a2030", "#a2563a"], far: "#2a1a24", mid: "#1c1218", near: "#0e080c", glow: "#ffd28a", fog: "rgba(255,200,150,0.08)" },
  heart: { sky: ["#0c0406", "#220a10", "#3a0c14"], far: "#1e0a0e", mid: "#14060a", near: "#0a0305", glow: "#ff3a4a", fog: "rgba(255,60,80,0.10)" },
};

function ridge(g: G, w: number, h: number, base: number, amp: number, seed: number, off: number, col: string, jag = false) {
  g.fillStyle = col; g.beginPath(); g.moveTo(-50, h);
  for (let x = -50; x <= w + 50; x += jag ? 60 : 24) {
    const k = (x + off) / w;
    const y = base - amp * (jag ? rnd(Math.floor((x + off) / 60) + seed) : 0.5 + 0.5 * Math.sin(k * 6 + seed) * Math.cos(k * 2.3 + seed * 2));
    g.lineTo(x, y);
  }
  g.lineTo(w + 50, h); g.closePath(); g.fill();
}
function deadTree(g: G, x: number, y: number, s: number, col: string) {
  g.strokeStyle = col; g.lineCap = "round"; g.lineWidth = 6 * s;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4 * s, y - 120 * s); g.stroke();
  g.lineWidth = 3 * s;
  for (const [a, b, c, d] of [[2, -70, -40, -110], [3, -90, 45, -130], [4, -110, -20, -160], [-20, -105, -50, -125]]) { g.beginPath(); g.moveTo(x + a! * s, y + b! * s); g.lineTo(x + c! * s, y + d! * s); g.stroke(); }
}
function pine(g: G, x: number, y: number, s: number, col: string) {
  g.fillStyle = col; g.beginPath(); g.moveTo(x, y - 150 * s);
  for (let i = 1; i <= 4; i++) { g.lineTo(x + (16 + i * 14) * s, y - (150 - i * 36) * s); g.lineTo(x + 6 * s, y - (150 - i * 36) * s); }
  g.lineTo(x + 6 * s, y); g.lineTo(x - 6 * s, y);
  for (let i = 4; i >= 1; i--) { g.lineTo(x - 6 * s, y - (150 - i * 36) * s); g.lineTo(x - (16 + i * 14) * s, y - (150 - i * 36) * s); }
  g.closePath(); g.fill();
}

/** Draw the backdrop. `t` seconds, `px` parallax in -1..1 from the pointer. */
export function drawStoryBg(g: G, w: number, h: number, bg: SceneBg, t: number, px: number, py: number) {
  const p = PAL[bg];
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, p.sky[0]); sky.addColorStop(0.6, p.sky[1]); sky.addColorStop(1, p.sky[2]);
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const drift = t * 6;

  // celestial body
  const mx = w * 0.72 - px * 10, my = h * 0.24 - py * 6;
  const mr = Math.min(w, h) * (bg === "forge" ? 0.16 : 0.09);
  const halo = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
  halo.addColorStop(0, p.glow + "55"); halo.addColorStop(1, p.glow + "00");
  g.fillStyle = halo; g.fillRect(0, 0, w, h);
  if (bg !== "heart" && bg !== "forest") { g.fillStyle = bg === "capital" || bg === "forge" ? "#ff8a4a" : p.glow; g.globalAlpha = 0.85; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill(); g.globalAlpha = 1; }

  // stars
  if (bg === "dead" || bg === "ice" || bg === "forest") for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(255,255,240,${0.2 + 0.5 * rnd(i) * (0.6 + 0.4 * Math.sin(t * 2 + i))})`;
    g.fillRect(rnd(i + 3) * w, rnd(i + 9) * h * 0.55, 1.5, 1.5);
  }

  const L = (k: number) => -px * k - drift * k * 0.02;
  // far & mid layers per theme
  ridge(g, w, h, h * 0.62 - py * 4, h * (bg === "ice" ? 0.32 : 0.14), 1, L(20) * -1, p.far, bg === "ice" || bg === "forge");
  if (bg === "capital") {
    // city walls & towers
    g.fillStyle = p.far; const base = h * 0.66 + L(0);
    g.fillRect(-20, base - h * 0.12, w + 40, h);
    for (let x = -20 + (L(30) % 40); x < w + 40; x += 40) g.fillRect(x, base - h * 0.12 - 16, 22, 16);
    for (let i = 0; i < 6; i++) {
      const tx = (i + 0.5) * w / 6 + L(30), th = h * (0.2 + 0.12 * rnd(i));
      g.fillRect(tx - 26, base - th, 52, th);
      g.beginPath(); g.moveTo(tx - 34, base - th); g.lineTo(tx, base - th - 60); g.lineTo(tx + 34, base - th); g.fill();
      // banner
      g.save(); g.fillStyle = "#c8a24a"; g.globalAlpha = 0.9;
      g.beginPath(); g.moveTo(tx + 2, base - th - 56);
      for (let k = 0; k <= 10; k++) g.lineTo(tx + 2 + k * 4, base - th - 56 + Math.sin(t * 3 + k * 0.6 + i) * 3);
      g.lineTo(tx + 42, base - th - 36); g.lineTo(tx + 2, base - th - 36); g.fill(); g.restore();
      g.fillStyle = "#ffcf7a"; for (let k = 0; k < 3; k++) if (rnd(i * 7 + k) > 0.4) g.fillRect(tx - 8 + k * 7, base - th * 0.6 + k * 14, 4, 7);
      g.fillStyle = p.far;
    }
  }
  if (bg === "heart") {
    // throne hall pillars & pulsing heart
    const cx = w / 2 - px * 12, cy = h * 0.58;
    const pulse = 0.75 + 0.25 * Math.sin(t * 3.2) ** 2;
    const hg = g.createRadialGradient(cx, cy, 10, cx, cy, h * 0.6 * pulse);
    hg.addColorStop(0, "rgba(255,80,90,0.9)"); hg.addColorStop(0.25, "rgba(200,20,40,0.45)"); hg.addColorStop(1, "rgba(80,0,10,0)");
    g.fillStyle = hg; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffd0d4"; g.beginPath(); g.ellipse(cx, cy, 34 * pulse, 46 * pulse, 0, 0, 7); g.fill();
    g.strokeStyle = "rgba(255,90,100,0.6)"; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const a = i * 0.785 + t * 0.2; g.beginPath(); g.moveTo(cx, cy); for (let r = 40; r < w; r += 40) g.lineTo(cx + Math.cos(a + Math.sin(r * 0.03) * 0.2) * r, cy + Math.sin(a) * r * 0.25 + 30); g.stroke(); }
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, k = i % 3;
      const x = w / 2 + side * (w * (0.18 + k * 0.13)) - px * (20 + k * 16);
      const pw = 50 + k * 26;
      const pg = g.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
      pg.addColorStop(0, "#0a0305"); pg.addColorStop(side < 0 ? 0.8 : 0.2, "#3a1218"); pg.addColorStop(1, "#0a0305");
      g.fillStyle = pg; g.fillRect(x - pw / 2, 0, pw, h);
    }
  }
  ridge(g, w, h, h * 0.76 - py * 8, h * 0.08, 4, L(45) * -1, p.mid);

  // near props
  const nb = h * 0.86;
  if (bg === "dead") {
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * w * 1.2 - w * 0.1 + L(70), s = 0.6 + rnd(i) * 0.5, ry = nb - 6 + rnd(i + 1) * 30;
      g.save(); g.translate(x, ry); g.rotate((rnd(i + 2) - 0.5) * 0.4); g.fillStyle = p.near;
      g.fillRect(-4 * s, -60 * s, 8 * s, 60 * s); g.fillRect(-20 * s, -46 * s, 40 * s, 8 * s); g.restore();
    }
    deadTree(g, w * 0.12 + L(90), nb + 20, 1.6, p.near); deadTree(g, w * 0.88 + L(90), nb + 30, 1.9, p.near);
  } else if (bg === "ice" || bg === "forest") {
    for (let i = 0; i < 14; i++) pine(g, (i / 14) * w * 1.3 - w * 0.15 + L(80), nb + 30 + rnd(i) * 30, 0.8 + rnd(i + 4) * 0.9, p.near);
    if (bg === "forest") {
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        const x = w * (0.2 + i * 0.2) + Math.sin(t * 0.3 + i) * 20;
        const rg = g.createLinearGradient(x, 0, x + 160, h); rg.addColorStop(0, "rgba(190,230,255,0.10)"); rg.addColorStop(1, "rgba(190,230,255,0)");
        g.fillStyle = rg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x + 260, h); g.lineTo(x + 120, h); g.fill();
      }
      g.restore();
      // hanging bells
      for (let i = 0; i < 3; i++) { const bx = w * (0.3 + i * 0.2) + L(60), by = h * 0.3 + rnd(i) * 40, sw = Math.sin(t * 1.6 + i) * 0.15;
        g.save(); g.translate(bx, 0); g.rotate(sw); g.strokeStyle = "#5a4a2a"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, by); g.stroke();
        g.fillStyle = "#c8a24a"; g.beginPath(); g.moveTo(-14, by + 26); g.quadraticCurveTo(-12, by, 0, by); g.quadraticCurveTo(12, by, 14, by + 26); g.fill(); g.restore(); }
    }
  } else if (bg === "swamp") {
    const wg = g.createLinearGradient(0, nb - 20, 0, h); wg.addColorStop(0, "#1a3a24"); wg.addColorStop(1, "#050a06");
    g.fillStyle = wg; g.fillRect(0, nb - 10, w, h);
    g.strokeStyle = "rgba(160,255,140,0.12)"; g.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(rnd(i) * w, nb + 20 + rnd(i + 1) * 60, 40 + 20 * Math.sin(t + i), 4, 0, 0, 7); g.stroke(); }
    g.strokeStyle = p.near; g.lineWidth = 3;
    for (let i = 0; i < 40; i++) { const x = rnd(i + 20) * w + L(60), y = nb + rnd(i) * 30, hh = 40 + rnd(i + 5) * 70, sw = Math.sin(t * 1.2 + i) * 6;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + sw * 0.5, y - hh * 0.5, x + sw, y - hh); g.stroke(); }
    deadTree(g, w * 0.08 + L(90), nb + 10, 1.7, p.near);
  } else if (bg === "forge") {
    const lv = g.createLinearGradient(0, nb - 10, 0, h); lv.addColorStop(0, "#ffb040"); lv.addColorStop(0.3, "#e0400c"); lv.addColorStop(1, "#3a0804");
    g.fillStyle = lv; g.beginPath(); g.moveTo(0, nb + 10);
    for (let x = 0; x <= w; x += 30) g.lineTo(x, nb + 10 + Math.sin(x * 0.02 + t * 1.5) * 6);
    g.lineTo(w, h); g.lineTo(0, h); g.fill();
    // anvil + chimney silhouettes
    g.fillStyle = p.near; const ax = w * 0.18 + L(80);
    g.fillRect(ax - 70, nb - 40, 140, 26); g.fillRect(ax - 30, nb - 14, 60, 40); g.beginPath(); g.moveTo(ax + 70, nb - 40); g.lineTo(ax + 110, nb - 34); g.lineTo(ax + 70, nb - 24); g.fill();
    const cx = w * 0.84 + L(80); g.fillRect(cx - 30, nb - 260, 60, 280);
    g.fillStyle = "rgba(60,30,25,0.5)"; for (let i = 0; i < 6; i++) { const k = (t * 0.15 + i / 6) % 1; g.beginPath(); g.arc(cx + Math.sin(k * 6 + i) * 30 * k, nb - 270 - k * 260, 20 + k * 50, 0, 7); g.fill(); }
  } else if (bg === "capital") {
    g.fillStyle = p.near; g.fillRect(0, nb, w, h);
    for (let x = -40 + (L(80) % 70); x < w; x += 70) g.fillRect(x, nb - 22, 40, 22);
  } else if (bg === "heart") {
    g.fillStyle = p.near; g.fillRect(0, nb + 20, w, h);
  }

  // fog bands
  for (let i = 0; i < 3; i++) {
    const y = h * (0.62 + i * 0.12), off = ((t * (8 + i * 5)) % (w * 2)) - w;
    const fg = g.createLinearGradient(0, y - 60, 0, y + 60); fg.addColorStop(0, "rgba(0,0,0,0)"); fg.addColorStop(0.5, p.fog); fg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = fg; g.fillRect(off, y - 60, w * 2, 120); g.fillRect(off - w * 2, y - 60, w * 2, 120);
  }

  // particles
  const n = 70;
  for (let i = 0; i < n; i++) {
    const r = rnd(i + 50), sp = 0.3 + rnd(i + 70) * 0.7;
    let x: number, y: number, size = 1.5 + r * 2.5;
    if (bg === "ice") { x = ((rnd(i) * w + t * 60 * sp + Math.sin(t + i) * 20) % (w + 40)) - 20; y = (rnd(i + 1) * h + t * 90 * sp) % h; g.fillStyle = "rgba(240,250,255,0.8)"; }
    else if (bg === "forge" || bg === "heart") { x = rnd(i) * w + Math.sin(t * 2 + i) * 15; y = h - ((rnd(i + 1) * h + t * 70 * sp) % h); g.fillStyle = bg === "forge" ? `rgba(255,${140 + 80 * r | 0},60,${0.4 + 0.5 * r})` : `rgba(255,80,90,${0.3 + 0.5 * r})`; size *= 0.8; }
    else if (bg === "swamp" || bg === "forest") { x = rnd(i) * w + Math.sin(t * 0.7 + i * 3) * 30; y = h * 0.35 + rnd(i + 1) * h * 0.55 + Math.cos(t * 0.9 + i) * 20; g.fillStyle = `rgba(${bg === "swamp" ? "190,255,120" : "200,240,255"},${0.25 + 0.6 * Math.max(0, Math.sin(t * 2 + i * 1.7))})`; }
    else { x = rnd(i) * w + Math.sin(t * 0.5 + i) * 30; y = h * 0.3 + rnd(i + 1) * h * 0.6 - ((t * 10 * sp) % 60); g.fillStyle = `rgba(210,230,170,${0.15 + 0.3 * r})`; }
    g.beginPath(); g.arc(x, y, size, 0, 7); g.fill();
  }

  // vignette
  const vg = g.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.85)");
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  // film grain
  g.fillStyle = "rgba(255,255,255,0.035)";
  const seed = Math.floor(t * 24);
  for (let i = 0; i < 260; i++) g.fillRect(rnd(i + seed * 3) * w, rnd(i * 2 + seed) * h, 1.5, 1.5);
}
