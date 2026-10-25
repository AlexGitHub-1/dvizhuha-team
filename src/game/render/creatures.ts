import { MONSTERS, type MonsterId } from "../data/monsters";
import { AURA, drawGear } from "./gear";

type G = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function el(g: G, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); }
function outline(g: G) { g.strokeStyle = "rgba(10,6,4,0.75)"; g.lineWidth = 1.6; g.stroke(); }
function blob(g: G, x: number, y: number, rx: number, ry: number, fill: string) { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); outline(g); }
function eyes(g: G, x: number, y: number, gap: number, size: number, color: string, angry = true) {
  for (const dx of [0, gap]) { g.fillStyle = color; g.beginPath(); g.arc(x + dx, y, size, 0, TAU); g.fill(); g.fillStyle = "#111"; g.beginPath(); g.arc(x + dx + size * 0.3, y, size * 0.45, 0, TAU); g.fill(); }
  if (angry) { g.strokeStyle = "#111"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - size, y - size * 1.4); g.lineTo(x + size, y - size * 0.8); g.moveTo(x + gap + size, y - size * 1.4); g.lineTo(x + gap - size, y - size * 0.8); g.stroke(); }
}
function legs(g: G, t: number, x: number, w: number, len: number, thick: number, color: string, n = 2) {
  g.strokeStyle = color; g.lineWidth = thick; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const ph = Math.sin(t * 9 + i * Math.PI) * len * 0.45;
    const lx = x + (n === 2 ? (i ? w : -w) : -w + (i * 2 * w) / (n - 1));
    g.beginPath(); g.moveTo(lx, -len); g.lineTo(lx + ph, 0); g.stroke();
  }
}
function teeth(g: G, x: number, y: number, n: number, s: number) { g.fillStyle = "#f2ead2"; for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(x + i * s, y); g.lineTo(x + i * s + s / 2, y + s); g.lineTo(x + i * s + s, y); g.fill(); } }
function pointyEar(g: G, x: number, y: number, dx: number, dy: number, fill: string) { g.fillStyle = fill; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.lineTo(x + dx * 0.2, y + 4); g.closePath(); g.fill(); outline(g); }
function horn(g: G, x: number, y: number, dir: number, len: number, fill = "#e8dcc0") { g.fillStyle = fill; g.beginPath(); g.moveTo(x - 2.5, y); g.quadraticCurveTo(x + dir * len * 0.6, y - len * 0.5, x + dir * len * 0.4, y - len); g.lineTo(x + 2.5, y); g.fill(); outline(g); }
function wing(g: G, x: number, y: number, span: number, flap: number, fill: string, bone = false) {
  g.fillStyle = fill; g.beginPath(); g.moveTo(x, y);
  g.lineTo(x - span * 0.5, y - span * (0.7 + flap)); g.lineTo(x - span, y - span * (0.3 + flap * 0.5));
  g.lineTo(x - span * 0.75, y - span * 0.05); g.lineTo(x - span * 0.45, y - span * 0.15); g.lineTo(x - span * 0.25, y + 2); g.closePath(); g.fill(); outline(g);
  if (bone) { g.strokeStyle = "#e8dcc0"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - span * 0.5, y - span * (0.7 + flap)); g.lineTo(x - span, y - span * (0.3 + flap * 0.5)); g.stroke(); }
}

/** Draw a creature with feet at (0,0), facing right. Units are in world px (radius ~ def.radius). */
export function drawCreature(g: G, kind: MonsterId, t: number, attacking = false, lvl = 1) {
  if (lvl >= 9) levelAura(g, kind, t);
  drawBody(g, kind, t, attacking);
  if (lvl >= 3) drawGear(g, kind, t, lvl);
}

function levelAura(g: G, kind: MonsterId, t: number) {
  const r = MONSTERS[kind].radius; const y = -(r * 1.5) - (FLOATERS.has(kind) ? 10 : 0); const a = 0.2 + Math.sin(t * 4) * 0.07;
  const col = AURA[kind];
  const grd = g.createRadialGradient(0, y, r * 0.4, 0, y, r * 2.4); grd.addColorStop(0, col.replace("A", a.toFixed(2))); grd.addColorStop(1, col.replace("A", "0"));
  g.fillStyle = grd; g.beginPath(); g.arc(0, y, r * 2.4, 0, TAU); g.fill();
}

function drawBody(g: G, kind: MonsterId, t: number, attacking: boolean) {
  const atk = attacking ? Math.sin(t * 14) * 0.5 : 0;
  const bob = Math.abs(Math.sin(t * 9)) * 1.5;
  switch (kind) {
    case "goblin": {
      legs(g, t, 0, 3, 7, 3, "#4d6b22");
      g.save(); g.translate(0, -bob);
      blob(g, 0, -11, 6, 6, "#7fb03a"); el(g, 1, -9, 3.5, 3, "#a8cf62");
      blob(g, 2, -21, 7, 6, "#86b840"); pointyEar(g, -4, -23, -10, -6, "#86b840"); pointyEar(g, 6, -24, 9, -9, "#86b840");
      eyes(g, 1, -22, 5, 1.8, "#ffe23a"); teeth(g, 2, -18, 3, 2);
      g.save(); g.translate(6, -12); g.rotate(-0.4 + atk); g.fillStyle = "#cfd3d8"; g.fillRect(0, -1.5, 11, 3); g.fillStyle = "#5a3a1a"; g.fillRect(-3, -2, 4, 4); g.restore();
      g.restore(); break;
    }
    case "troll": {
      legs(g, t * 0.6, 0, 7, 9, 7, "#3f5560");
      g.save(); g.translate(0, -bob);
      blob(g, 0, -22, 15, 14, "#5f7d8c"); el(g, 3, -18, 9, 8, "#7d9aa6");
      blob(g, 7, -36, 8, 7, "#6a8a99"); eyes(g, 5, -38, 6, 1.7, "#ffb43a");
      horn(g, 4, -31, -1, 5, "#f2ead2"); horn(g, 12, -31, 1, 5, "#f2ead2");
      g.fillStyle = "#4a6470"; g.beginPath(); g.arc(-11, -30, 4, 0, TAU); g.fill();
      g.save(); g.translate(13, -24); g.rotate(-0.9 + atk * 1.4); g.fillStyle = "#5a3a1a"; g.fillRect(-2, -22, 5, 24); blob(g, 0.5, -24, 5, 6, "#6b4322");
      g.fillStyle = "#bbb"; g.fillRect(-4, -28, 2, 3); g.fillRect(3, -26, 2, 3); g.restore();
      g.restore(); break;
    }
    case "sapper": {
      legs(g, t, 0, 3, 7, 3, "#6b5a22");
      g.save(); g.translate(0, -bob);
      g.fillStyle = "#6b3f1a"; g.fillRect(-14, -24, 11, 15); g.strokeStyle = "#2a1808"; g.lineWidth = 2; g.strokeRect(-14, -24, 11, 15); g.fillStyle = "#2a1808"; g.fillRect(-14, -18, 11, 2);
      g.strokeStyle = "#999"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-8, -24); g.quadraticCurveTo(-6, -32, -2, -30); g.stroke();
      g.fillStyle = Math.sin(t * 25) > 0 ? "#ffea60" : "#ff6a00"; g.beginPath(); g.arc(-2, -31, 2.4, 0, TAU); g.fill();
      blob(g, 1, -11, 6, 6, "#9aa63a"); blob(g, 3, -21, 6.5, 6, "#a0ad44");
      pointyEar(g, 7, -23, 8, -7, "#a0ad44"); g.fillStyle = "#3a2a1a"; g.fillRect(-2, -28, 10, 3);
      eyes(g, 2, -21, 5, 1.7, "#ffe23a"); teeth(g, 3, -17, 2, 2.2);
      g.restore(); break;
    }
    case "shaman": {
      g.save(); g.translate(0, -bob * 0.6);
      g.fillStyle = "#5a2e8a"; g.beginPath(); g.moveTo(-9, 0); g.lineTo(-6, -24); g.lineTo(6, -24); g.lineTo(9, 0); g.closePath(); g.fill(); outline(g);
      g.fillStyle = "#3e1d63"; g.beginPath(); g.moveTo(-8, -20); g.quadraticCurveTo(0, -42, 9, -22); g.lineTo(4, -28); g.closePath(); g.fill(); outline(g);
      el(g, 2, -24, 4.5, 4, "#1a0d2a"); eyes(g, -0.5, -25, 4, 1.2, "#e0a0ff", false);
      g.strokeStyle = "#3a2410"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(11, 2); g.lineTo(13, -34); g.stroke();
      g.fillStyle = "#d48cff"; g.shadowColor = "#d48cff"; g.shadowBlur = 10; g.beginPath(); g.arc(13, -36, 3.5 + Math.sin(t * 5), 0, TAU); g.fill(); g.shadowBlur = 0;
      g.fillStyle = "#e8dcc0"; g.beginPath(); g.arc(-4, -10, 1.6, 0, TAU); g.arc(3, -8, 1.6, 0, TAU); g.fill();
      g.restore(); break;
    }
    case "skeleton": case "minion": {
      const bone = kind === "minion" ? "#bfe8c8" : "#e2d9c2";
      legs(g, t, 0, 3, 8, 2, bone);
      g.save(); g.translate(0, -bob);
      g.strokeStyle = bone; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -8); g.lineTo(0, -20); for (let i = 0; i < 3; i++) { g.moveTo(-5, -11 - i * 3); g.lineTo(5, -11 - i * 3); } g.stroke();
      blob(g, 1, -26, 6.5, 6, bone); g.fillStyle = "#1a1410"; g.beginPath(); g.arc(-1, -26, 1.8, 0, TAU); g.arc(4, -26, 1.8, 0, TAU); g.fill();
      g.fillStyle = kind === "minion" ? "#7dff9a" : "#ff4a2a"; g.beginPath(); g.arc(-1, -26, 0.8, 0, TAU); g.arc(4, -26, 0.8, 0, TAU); g.fill();
      g.fillRect(0, -22, 4, 1);
      g.save(); g.translate(5, -16); g.rotate(-0.6 + atk); g.fillStyle = "#9aa"; g.fillRect(0, -1.5, 13, 3); g.restore();
      if (kind === "skeleton") { g.fillStyle = "#6b5a44"; g.beginPath(); g.arc(-6, -15, 5, 0, TAU); g.fill(); outline(g); }
      g.restore(); break;
    }
    case "rat": {
      g.strokeStyle = "#c8909a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-7, -4); g.quadraticCurveTo(-14, -8 + Math.sin(t * 8) * 3, -18, -2); g.stroke();
      legs(g, t * 1.5, 0, 5, 3, 2, "#4a3528", 4);
      blob(g, 0, -6, 8, 4.5, "#7a5a44"); blob(g, 8, -8, 4.5, 3.8, "#86644c");
      el(g, 6, -12, 2.2, 2.2, "#c8909a"); el(g, 12.5, -7.5, 1.2, 1.2, "#2a1a14");
      g.fillStyle = "#b8ff4a"; g.beginPath(); g.arc(9, -9, 1.3, 0, TAU); g.fill();
      for (let i = 0; i < 3; i++) el(g, -3 + i * 3, -10, 1, 1, "#9acc3a");
      break;
    }
    case "ghost": {
      const fy = Math.sin(t * 3) * 3;
      g.save(); g.translate(0, -8 + fy);
      g.fillStyle = "rgba(200,235,255,0.85)"; g.beginPath(); g.moveTo(-9, 0);
      for (let i = 0; i <= 6; i++) g.lineTo(-9 + i * 3, 4 + Math.sin(t * 8 + i) * 2.5 * (i % 2 ? 1 : -1));
      g.lineTo(9, -14); g.quadraticCurveTo(0, -30, -9, -14); g.closePath(); g.fill(); outline(g);
      el(g, -2, -14, 2.3, 3.4, "#0a1420"); el(g, 4, -14, 2.3, 3.4, "#0a1420"); el(g, 1, -6, 2.5, 3, "#0a1420");
      g.strokeStyle = "rgba(200,235,255,0.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(8, -10); g.lineTo(14 + atk * 4, -12); g.stroke();
      g.restore(); break;
    }
    case "golem": {
      legs(g, t * 0.6, 0, 6, 8, 7, "#4f8aa8");
      g.save(); g.translate(0, -bob);
      g.fillStyle = "#7fc4e0"; g.beginPath(); g.moveTo(-14, -8); g.lineTo(-12, -30); g.lineTo(12, -32); g.lineTo(14, -8); g.closePath(); g.fill(); outline(g);
      g.fillStyle = "#bfeaff"; for (const [x, y, h] of [[-8, -30, 9], [0, -32, 13], [8, -31, 8]] as const) { g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x, y - h); g.lineTo(x + 3, y); g.fill(); outline(g); }
      g.fillStyle = "#e0faff"; g.shadowColor = "#7fe0ff"; g.shadowBlur = 8; g.fillRect(-1, -24, 4, 3); g.fillRect(6, -24, 4, 3); g.shadowBlur = 0;
      g.save(); g.translate(14, -20); g.rotate(atk); g.fillStyle = "#6fb0d0"; g.fillRect(0, -4, 9, 9); outline(g); g.restore();
      g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-8, -12); g.lineTo(-3, -20); g.lineTo(2, -14); g.stroke();
      g.restore(); break;
    }
    case "fatty": {
      legs(g, t * 0.7, 0, 6, 6, 5, "#5a6a2a");
      g.save(); g.translate(0, -bob);
      blob(g, 0, -17, 15, 13, "#9aaa5a"); el(g, 2, -14, 10, 8, "#b8c47a");
      for (const [x, y] of [[-8, -20], [6, -10], [-2, -25]] as const) el(g, x, y, 2.4, 2, "#6a8a2a");
      blob(g, 5, -31, 6.5, 5.5, "#a4b464"); eyes(g, 3, -32, 5, 1.4, "#e8ff6a");
      g.fillStyle = "#7fd040"; g.beginPath(); g.ellipse(8, -26 + Math.sin(t * 4) * 1.5, 1.5, 3, 0, 0, TAU); g.fill();
      g.strokeStyle = "#3a2a1a"; g.lineWidth = 1; g.beginPath(); g.moveTo(-6, -8); g.lineTo(-2, -5); g.moveTo(4, -22); g.lineTo(8, -19); g.stroke();
      g.restore(); break;
    }
    case "orc": {
      legs(g, t, 0, 4, 8, 4, "#2f4022");
      g.save(); g.translate(0, -bob);
      blob(g, 0, -17, 10, 10, "#4f6b3a"); g.fillStyle = "#5a4a3a"; g.fillRect(-9, -15, 18, 4);
      blob(g, 3, -30, 7, 6, "#5a7a44"); g.fillStyle = "#6a6a70"; g.beginPath(); g.arc(3, -31, 7.5, Math.PI, 0); g.fill(); outline(g);
      horn(g, -3, -34, -1, 7); horn(g, 9, -34, 1, 7); eyes(g, 1, -29, 5, 1.4, "#ff3a2a"); teeth(g, 2, -25, 2, 2.5);
      g.save(); g.translate(10, -18); g.rotate(atk * 0.4);
      g.fillStyle = "#6b4322"; g.beginPath(); g.ellipse(0, 0, 6, 11, 0, 0, TAU); g.fill(); outline(g);
      g.strokeStyle = "#c9a227"; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 4, 8.5, 0, 0, TAU); g.stroke(); el(g, 0, 0, 2, 2, "#c9a227");
      g.restore(); g.restore(); break;
    }
    case "vampire": {
      legs(g, t, 0, 3, 8, 2.5, "#1a1018");
      g.save(); g.translate(0, -bob);
      g.fillStyle = "#7a0c18"; g.beginPath(); g.moveTo(-3, -28); g.quadraticCurveTo(-16, -12 + Math.sin(t * 6) * 2, -12, -2); g.lineTo(6, -6); g.closePath(); g.fill(); outline(g);
      blob(g, 0, -17, 7, 10, "#2a1a2a"); g.fillStyle = "#e8e0e8"; g.beginPath(); g.moveTo(-2, -26); g.lineTo(2, -16); g.lineTo(5, -26); g.fill();
      blob(g, 2, -31, 6, 6.5, "#d8d0dc"); g.fillStyle = "#1a0a14"; g.beginPath(); g.moveTo(-4, -35); g.lineTo(2, -32); g.lineTo(8, -35); g.lineTo(8, -39); g.lineTo(-4, -39); g.fill();
      pointyEar(g, -3, -32, -6, -4, "#d8d0dc"); eyes(g, 0, -31, 5, 1.3, "#ff2030");
      g.fillStyle = "#fff"; g.fillRect(1, -27, 1.2, 2.5); g.fillRect(4, -27, 1.2, 2.5);
      g.restore(); break;
    }
    case "phoenix": {
      const fy = Math.sin(t * 4) * 3; const flap = Math.sin(t * 10) * 0.3;
      g.save(); g.translate(0, -14 + fy);
      wing(g, -2, -8, 18, flap, "#ff6a1a"); wing(g, 2, -8, 14, -flap, "#ffb040");
      blob(g, 0, -6, 7, 8, "#ff8a2a"); el(g, 1, -4, 4, 5, "#ffd060");
      blob(g, 4, -17, 5.5, 5, "#ff6a1a"); horn(g, 1, -20, -1, 5, "#ffd060"); horn(g, 7, -20, 1, 5, "#ffd060");
      eyes(g, 2, -17, 4, 1.2, "#fff6a0");
      for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? "#ffd060" : "#ff4a10"; g.beginPath(); g.moveTo(-3 + i * 3, 2); g.lineTo(-1 + i * 3, 9 + Math.sin(t * 12 + i) * 3); g.lineTo(1 + i * 3, 2); g.fill(); }
      g.restore(); break;
    }
    case "necro": {
      g.save(); g.translate(0, -bob * 0.5);
      g.fillStyle = "#1e1e2a"; g.beginPath(); g.moveTo(-10, 0); g.lineTo(-7, -26); g.lineTo(7, -26); g.lineTo(10, 0); g.closePath(); g.fill(); outline(g);
      g.fillStyle = "#2a2a3a"; g.beginPath(); g.moveTo(-9, -22); g.quadraticCurveTo(0, -46, 10, -22); g.closePath(); g.fill(); outline(g);
      blob(g, 2, -26, 4.5, 4.5, "#d8d0bc"); g.fillStyle = "#7dff9a"; g.shadowColor = "#7dff9a"; g.shadowBlur = 8; g.beginPath(); g.arc(0.5, -26.5, 1.3, 0, TAU); g.arc(4, -26.5, 1.3, 0, TAU); g.fill(); g.shadowBlur = 0;
      g.strokeStyle = "#5a5a6a"; g.lineWidth = 2; g.beginPath(); g.moveTo(12, 2); g.lineTo(13, -36); g.stroke();
      blob(g, 13, -39, 4, 3.5, "#d8d0bc"); g.fillStyle = "#7dff9a"; g.beginPath(); g.arc(12, -39, 1, 0, TAU); g.arc(14.5, -39, 1, 0, TAU); g.fill();
      g.fillStyle = "rgba(125,255,154,0.3)"; g.beginPath(); g.arc(13, -39, 7 + Math.sin(t * 4) * 2, 0, TAU); g.fill();
      g.restore(); break;
    }
    case "runebreaker": {
      legs(g, t, 0, 4, 8, 4, "#3a3a4a");
      g.save(); g.translate(0, -bob);
      blob(g, 0, -18, 11, 11, "#6a6a80"); blob(g, 3, -32, 7, 6.5, "#7a7a90");
      horn(g, -2, -36, -1, 8, "#4a4a5a"); horn(g, 8, -36, 1, 8, "#4a4a5a");
      g.strokeStyle = "#5ff0ff"; g.shadowColor = "#5ff0ff"; g.shadowBlur = 8; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-5, -24); g.lineTo(3, -12); g.moveTo(3, -24); g.lineTo(-5, -12); g.moveTo(-1, -26); g.lineTo(-1, -10); g.stroke();
      g.fillStyle = "#5ff0ff"; g.fillRect(1, -33, 2.5, 2); g.fillRect(6, -33, 2.5, 2); g.shadowBlur = 0;
      g.save(); g.translate(11, -20); g.rotate(-0.5 + atk); g.fillStyle = "#3a2410"; g.fillRect(-1, -14, 3, 18); g.fillStyle = "#8a8aa0"; g.fillRect(-4, -18, 9, 6); outline(g); g.restore();
      g.restore(); break;
    }
    case "dragon": {
      const flap = Math.sin(t * 5) * 0.35;
      g.save(); g.translate(0, -6);
      g.strokeStyle = "#cfc4a8"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(-14, -14); g.quadraticCurveTo(-30, -6 + Math.sin(t * 3) * 4, -40, -18); g.stroke();
      wing(g, -4, -22, 34, flap, "rgba(70,60,60,0.85)", true);
      blob(g, 0, -16, 18, 10, "#d8ccb0");
      g.strokeStyle = "#8a7f6a"; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-8 + i * 5, -24); g.lineTo(-8 + i * 5, -9); g.stroke(); }
      legs(g, t * 0.5, 0, 10, 0.1, 4, "#cfc4a8", 2);
      g.strokeStyle = "#d8ccb0"; g.lineWidth = 6; g.beginPath(); g.moveTo(14, -18); g.quadraticCurveTo(22, -30, 26, -30); g.stroke();
      blob(g, 30, -31, 9, 6, "#e2d8be"); g.fillStyle = "#1a1410"; g.beginPath(); g.arc(31, -33, 2.2, 0, TAU); g.fill();
      g.fillStyle = "#ff8a2a"; g.beginPath(); g.arc(31, -33, 1, 0, TAU); g.fill();
      horn(g, 26, -36, -1, 8); horn(g, 30, -36, -1, 6);
      teeth(g, 32, -28, 3, 2.5);
      if (attacking) { g.fillStyle = "rgba(255,140,40,0.7)"; g.beginPath(); g.moveTo(38, -30); g.lineTo(60, -40 + Math.sin(t * 20) * 4); g.lineTo(60, -20); g.closePath(); g.fill(); }
      wing(g, 4, -22, 30, -flap * 0.8, "rgba(90,80,80,0.9)", true);
      g.restore(); break;
    }
    case "abyss": {
      const fy = Math.sin(t * 2) * 3;
      g.save(); g.translate(0, -6 + fy);
      for (let i = 0; i < 6; i++) { g.strokeStyle = "#3a1240"; g.lineWidth = 4; g.lineCap = "round"; const x = -20 + i * 8; g.beginPath(); g.moveTo(x, -6); g.quadraticCurveTo(x + Math.sin(t * 4 + i) * 8, 4, x + Math.sin(t * 3 + i) * 6, 10); g.stroke(); }
      blob(g, 0, -26, 26, 24, "#2a0d2e"); el(g, 0, -20, 18, 14, "#3e1446");
      for (const [x, y, s] of [[-10, -32, 3], [6, -36, 3.5], [14, -24, 2.5], [-2, -20, 4], [-16, -20, 2]] as const) {
        g.fillStyle = "#ff2040"; g.shadowColor = "#ff2040"; g.shadowBlur = 10; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); g.shadowBlur = 0;
        g.fillStyle = "#000"; g.fillRect(x - 0.6, y - s * 0.8, 1.2, s * 1.6);
      }
      g.fillStyle = "#c9a227"; g.beginPath(); g.moveTo(-14, -46); for (let i = 0; i < 5; i++) { g.lineTo(-14 + i * 7 + 3.5, -60 + (i % 2) * 4); g.lineTo(-14 + (i + 1) * 7, -48); } g.lineTo(21, -44); g.lineTo(-14, -44); g.fill(); outline(g);
      horn(g, -22, -38, -1, 16, "#1a0a1e"); horn(g, 22, -38, 1, 16, "#1a0a1e");
      teeth(g, -8, -10, 6, 3);
      g.restore(); break;
    }
    case "ram": {
      // two goblins pushing an iron-headed log on wheels
      const push = Math.sin(t * 9) * 1.5 + atk * 4;
      for (const wx of [-8, 8]) { g.fillStyle = "#3a2414"; g.beginPath(); g.arc(wx + push * 0.3, -4, 4.5, 0, TAU); g.fill(); outline(g); g.fillStyle = "#6b4a2a"; g.beginPath(); g.arc(wx + push * 0.3, -4, 1.6, 0, TAU); g.fill(); }
      g.save(); g.translate(push, 0);
      g.fillStyle = "#6b4322"; g.beginPath(); g.roundRect(-18, -15, 34, 9, 4); g.fill(); outline(g);
      g.strokeStyle = "#3a2414"; g.lineWidth = 1; for (const x of [-12, -4, 4]) { g.beginPath(); g.moveTo(x, -15); g.lineTo(x, -6); g.stroke(); }
      g.fillStyle = "#4a4a52"; g.beginPath(); g.moveTo(16, -16); g.lineTo(24, -12.5); g.lineTo(24, -8.5); g.lineTo(16, -5); g.closePath(); g.fill(); outline(g);
      g.fillStyle = "#8a8f98"; g.beginPath(); g.arc(22, -12, 1.4, 0, TAU); g.arc(22, -9, 1.4, 0, TAU); g.fill();
      g.fillStyle = "#2a2a30"; for (const x of [-15, 10]) g.fillRect(x, -16, 3, 11);
      g.restore();
      for (const [gx, ph] of [[-20, 0], [-27, 1.5]] as const) {
        const bb = Math.abs(Math.sin(t * 9 + ph)) * 1.2;
        g.save(); g.translate(gx, -bb);
        legs(g, t + ph, 0, 2.5, 6, 2.5, "#4d6b22");
        blob(g, 1, -10, 5, 5, "#7fb03a"); blob(g, 4, -17, 5, 4.5, "#86b840"); pointyEar(g, 1, -19, -6, -4, "#86b840");
        eyes(g, 5, -18, 3, 1.3, "#ffe23a");
        g.strokeStyle = "#86b840"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(4, -11); g.lineTo(9 + push * 0.5, -11); g.stroke();
        g.restore();
      }
      break;
    }
    case "catapult": {
      const fire = attacking ? (Math.sin(t * 3) + 1) / 2 : 0;
      for (const wx of [-9, 9]) { g.fillStyle = "#3a2414"; g.beginPath(); g.arc(wx, -5, 5, 0, TAU); g.fill(); outline(g); g.strokeStyle = "#6b4a2a"; g.lineWidth = 1; g.beginPath(); g.moveTo(wx - 4, -5); g.lineTo(wx + 4, -5); g.moveTo(wx, -9); g.lineTo(wx, -1); g.stroke(); }
      g.fillStyle = "#6b4322"; g.fillRect(-14, -12, 28, 5); g.strokeStyle = "rgba(10,6,4,0.75)"; g.lineWidth = 1.2; g.strokeRect(-14, -12, 28, 5);
      g.fillStyle = "#5a3a1a"; g.beginPath(); g.moveTo(-3, -12); g.lineTo(0, -26); g.lineTo(3, -12); g.fill(); outline(g);
      g.save(); g.translate(0, -24); g.rotate(-0.5 - fire * 1.6);
      g.fillStyle = "#7a5030"; g.fillRect(-20, -1.5, 26, 3); outline(g);
      g.fillStyle = "#3a2414"; g.beginPath(); g.arc(-20, -2, 4, 0, Math.PI); g.fill();
      if (fire < 0.6) { g.fillStyle = "#ff6a1a"; g.beginPath(); g.arc(-20, -4, 3, 0, TAU); g.fill(); g.fillStyle = "#ffd040"; g.beginPath(); g.arc(-20, -5, 1.5, 0, TAU); g.fill(); }
      g.fillStyle = "#2a2a30"; g.fillRect(4, -4, 6, 6);
      g.restore();
      // goblin crew
      g.save(); g.translate(-18, 0); legs(g, t, 0, 2.5, 6, 2.5, "#4d6b22"); blob(g, 0, -10, 5, 5, "#7fb03a"); blob(g, 2, -17, 5, 4.5, "#86b840"); pointyEar(g, -2, -19, -6, -4, "#86b840"); eyes(g, 3, -18, 3, 1.3, "#ffe23a"); g.restore();
      break;
    }
    case "larva": {
      for (let i = 0; i < 4; i++) blob(g, -6 + i * 3.5, -3 - Math.abs(Math.sin(t * 8 + i)) * 2, 3.2, 3, i === 3 ? "#d8e8a0" : "#c4d88a");
      g.fillStyle = "#111"; g.beginPath(); g.arc(6.5, -5, 0.9, 0, TAU); g.fill(); break;
    }
    case "bat": {
      const flap = Math.sin(t * 16) * 0.5;
      g.save(); g.translate(0, -16 + Math.sin(t * 5) * 3);
      wing(g, -1, -3, 13, flap, "#3a1a30"); g.save(); g.scale(-1, 1); wing(g, -1, -3, 13, flap, "#3a1a30"); g.restore();
      blob(g, 0, -3, 4.5, 5, "#2a1020"); pointyEar(g, -2, -7, -2, -5, "#2a1020"); pointyEar(g, 2, -7, 2, -5, "#2a1020");
      g.fillStyle = "#ff2030"; g.fillRect(-2.5, -5, 1.5, 1.5); g.fillRect(1, -5, 1.5, 1.5);
      g.restore(); break;
    }
  }
}

/** Whether a creature hovers (no ground contact) — used for shadow offset. */
export const FLOATERS = new Set<MonsterId>(["ghost", "phoenix", "dragon", "abyss", "bat"]);
