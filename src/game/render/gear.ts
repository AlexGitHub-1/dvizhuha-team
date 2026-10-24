import type { MonsterId } from "../data/monsters";

type G = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const ol = (g: G, w = 1.3) => { g.strokeStyle = "rgba(10,6,4,0.8)"; g.lineWidth = w; g.stroke(); };
const poly = (g: G, pts: number[], fill: string, outline = true) => { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0]!, pts[1]!); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!); g.closePath(); g.fill(); if (outline) ol(g); };
const circ = (g: G, x: number, y: number, r: number, fill: string, outline = true) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); if (outline) ol(g); };
const glow = (g: G, x: number, y: number, r: number, col: string, a: number) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace("A", String(a))); gr.addColorStop(1, col.replace("A", "0")); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
const line = (g: G, pts: number[], col: string, w: number) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(pts[0]!, pts[1]!); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!); g.stroke(); };
function crown(g: G, x: number, y: number, w: number, h: number, fill = "#e8b53a", gem = "#e8413a") {
  poly(g, [x - w, y, x - w, y - h * 0.7, x - w / 2, y - h * 0.3, x, y - h, x + w / 2, y - h * 0.3, x + w, y - h * 0.7, x + w, y], fill);
  circ(g, x, y - h * 0.35, Math.max(0.8, w * 0.18), gem, false);
}
function flameTip(g: G, x: number, y: number, s: number, t: number, a = "#ff6a1a", b = "#ffd040") {
  const h = s * (1 + Math.sin(t * 14) * 0.2);
  poly(g, [x - s * 0.5, y, x, y - h * 2, x + s * 0.5, y], a, false); poly(g, [x - s * 0.25, y, x, y - h * 1.2, x + s * 0.25, y], b, false);
}
function embers(g: G, t: number, x: number, y: number, spread: number, col: string) {
  for (let i = 0; i < 3; i++) { const k = (t * 0.7 + i / 3) % 1; g.globalAlpha = 1 - k; g.fillStyle = col; g.fillRect(x + Math.sin(i * 2.3 + t) * spread, y - k * spread * 2, 1.6, 1.6); }
  g.globalAlpha = 1;
}

/** Per-monster bob so gear stays glued to the body (mirrors drawBody offsets). */
export function gearLift(kind: MonsterId, t: number) {
  const bob = Math.abs(Math.sin(t * 9)) * 1.5;
  switch (kind) {
    case "shaman": return -bob * 0.6;
    case "necro": return -bob * 0.5;
    case "ghost": return -8 + Math.sin(t * 3) * 3;
    case "phoenix": return -14 + Math.sin(t * 4) * 3;
    case "dragon": return -6;
    case "abyss": return -6 + Math.sin(t * 2) * 3;
    case "bat": return -16 + Math.sin(t * 5) * 3;
    case "rat": case "larva": return 0;
    default: return -bob;
  }
}

/** Glow colour for level 9+ aura (matches the monster's palette). */
export const AURA: Record<MonsterId, string> = {
  goblin: "rgba(160,230,80,A)", troll: "rgba(120,200,255,A)", sapper: "rgba(255,150,40,A)", shaman: "rgba(210,140,255,A)", skeleton: "rgba(255,80,50,A)",
  rat: "rgba(184,255,74,A)", ghost: "rgba(170,230,255,A)", golem: "rgba(127,224,255,A)", fatty: "rgba(127,208,64,A)", orc: "rgba(230,190,80,A)",
  vampire: "rgba(255,30,60,A)", phoenix: "rgba(255,170,50,A)", necro: "rgba(125,255,154,A)", runebreaker: "rgba(95,240,255,A)",
  dragon: "rgba(90,255,130,A)", abyss: "rgba(255,40,80,A)", larva: "rgba(200,230,140,A)", bat: "rgba(255,30,60,A)", minion: "rgba(125,255,154,A)",
};

type Tier = (g: G, t: number) => void;
/** Four gear pieces per monster: unlocked at levels 3, 6, 9 and 10. Coordinates match each body in creatures.ts. */
const GEAR: Record<MonsterId, [Tier, Tier, Tier, Tier]> = {
  goblin: [
    (g) => { poly(g, [-5, -25, 9, -25, 7, -30, 2, -32, -3, -30], "#7a4a24"); line(g, [-4, -26, 8, -26], "#4a2a10", 1.4); },
    (g) => { circ(g, 0.5, -22.5, 2.6, "#c9a227"); circ(g, 6, -22.5, 2.6, "#c9a227"); circ(g, 0.5, -22.5, 1.5, "#9fe6ff", false); circ(g, 6, -22.5, 1.5, "#9fe6ff", false); },
    (g) => { g.save(); g.translate(-6, -13); g.rotate(0.6); g.fillStyle = "#e0e4ea"; g.fillRect(-1.2, -9, 2.4, 9); ol(g); g.fillStyle = "#5a3a1a"; g.fillRect(-2.5, 0, 5, 2); g.restore(); },
    (g, t) => { crown(g, 2, -30, 5, 5); line(g, [-2, -31, -8, -38 + Math.sin(t * 5)], "#e8413a", 1.8); },
  ],
  troll: [
    (g) => { for (const [x, y] of [[-11, -27], [-7, -22], [16, -22]] as const) circ(g, x, y, 2, "#8a8f98"); line(g, [-14, -24, 16, -24], "#5a5048", 2.4); },
    (g) => { poly(g, [-16, -30, -6, -36, 2, -32, -2, -24, -14, -22], "#8a8f98"); for (let i = 0; i < 3; i++) poly(g, [-14 + i * 5, -31 - i, -12 + i * 5, -38 - i, -10 + i * 5, -32 - i], "#cfc6b0"); },
    (g, t) => { glow(g, 7, -38, 10, "rgba(120,200,255,A)", 0.25 + Math.sin(t * 4) * 0.1); line(g, [2, -40, 12, -40], "#2a3a44", 2.2); },
    (g) => { poly(g, [1, -42, 1, -48, 4, -45, 7, -50, 10, -45, 13, -48, 13, -42], "#e8dcc0"); circ(g, 7, -44, 1.2, "#7fe0ff", false); },
  ],
  sapper: [
    (g) => { g.strokeStyle = "#3a2a1a"; g.lineWidth = 1.5; g.strokeRect(-14.5, -24.5, 12, 16); line(g, [-14, -14, -3, -14], "#c9a227", 1.6); },
    (g) => { line(g, [-6, -10, 6, -20], "#5a3a1a", 2.4); for (let i = 0; i < 3; i++) circ(g, -4 + i * 4, -12 - i * 3.3, 2.2, "#2a2a30"); },
    (g, t) => { for (let i = 0; i < 3; i++) flameTip(g, -2 + i, -32, 2.2, t + i); glow(g, -2, -31, 9, "rgba(255,170,60,A)", 0.4); },
    (g) => { poly(g, [-1, -27, 9, -27, 8, -31, 0, -31], "#4a4a52"); circ(g, 2, -29, 1.8, "#9fe6ff"); circ(g, 6.5, -29, 1.8, "#9fe6ff"); crown(g, 4, -31, 4, 4); },
  ],
  shaman: [
    (g) => { for (let i = 0; i < 5; i++) circ(g, -4 + i * 2.2, -19 + Math.abs(i - 2) * -0.8, 1.2, "#e8dcc0"); },
    (g) => { circ(g, 13, -38, 3.6, "#d8d0bc"); circ(g, 12, -38.5, 0.9, "#1a1410", false); circ(g, 14.2, -38.5, 0.9, "#1a1410", false); line(g, [10, -40, 7, -44], "#e8dcc0", 1.2); line(g, [16, -40, 19, -44], "#e8dcc0", 1.2); },
    (g, t) => { poly(g, [-2, -28, 6, -28, 5, -21, 2, -19, -1, -21], "#6a3a20"); circ(g, 0.5, -25, 1, `rgba(224,160,255,${0.7 + Math.sin(t * 6) * 0.3})`, false); circ(g, 3.5, -25, 1, `rgba(224,160,255,${0.7 + Math.sin(t * 6) * 0.3})`, false); },
    (g, t) => { for (let i = 0; i < 4; i++) { const a = t * 2 + (i * TAU) / 4; circ(g, Math.cos(a) * 12, -24 + Math.sin(a) * 4, 1.6, "#d48cff", false); } crown(g, 1, -34, 4, 4, "#8a4ad0", "#ffe9a0"); },
  ],
  skeleton: [
    (g) => { poly(g, [-6, -28, 8, -28, 7, -33, 1, -35, -5, -33], "#6a6a70"); line(g, [1, -35, 1, -38], "#c9a227", 1.5); },
    (g) => { line(g, [-6, -20, 4, -10], "#7a1a1a", 2.2); line(g, [-6, -15, 6, -15], "#4a3a2a", 1.2); },
    (g, t) => { glow(g, 1, -26, 11, "rgba(255,80,50,A)", 0.3 + Math.sin(t * 5) * 0.1); flameTip(g, -1, -27, 1.5, t, "#ff4a2a", "#ffd040"); flameTip(g, 4, -27, 1.5, t + 1, "#ff4a2a", "#ffd040"); },
    (g) => { crown(g, 1, -32, 5, 5, "#9aa0a8", "#ff4a2a"); },
  ],
  minion: [
    (g) => { line(g, [-5, -14, 5, -14], "#3a5a3a", 1.5); },
    (g) => { circ(g, -6, -15, 4, "#4a5a4a"); },
    (g, t) => { glow(g, 1, -26, 9, "rgba(125,255,154,A)", 0.3 + Math.sin(t * 5) * 0.1); },
    (g) => { crown(g, 1, -32, 4, 4, "#7dff9a", "#1a3a20"); },
  ],
  rat: [
    (g) => { line(g, [3, -10, 7, -10], "#c9a227", 1.6); circ(g, 5, -9, 1, "#c9a227", false); },
    (g) => { for (let i = 0; i < 3; i++) poly(g, [-6 + i * 4, -10, -4 + i * 4, -14, -2 + i * 4, -10], "#e8dcc0"); },
    (g, t) => { glow(g, -2, -6, 12, "rgba(184,255,74,A)", 0.25 + Math.sin(t * 5) * 0.1); line(g, [-7, -4, -16, -2 + Math.sin(t * 8) * 3], "#9acc3a", 1.5); },
    (g) => { crown(g, 8, -12, 3, 3); },
  ],
  ghost: [
    (g, t) => { line(g, [-8, -4, -12, 2 + Math.sin(t * 4) * 2, -9, 8], "#8a8f98", 1.6); circ(g, -9, 8, 1.8, "#5a5a60"); },
    (g, t) => { line(g, [14, -12, 16, -6], "#5a4a3a", 1.2); g.fillStyle = "#3a3a40"; g.fillRect(14, -6, 5, 6); glow(g, 16.5, -3, 8, "rgba(140,255,200,A)", 0.5 + Math.sin(t * 7) * 0.2); circ(g, 16.5, -3, 1.5, "#bfffe0", false); },
    (g, t) => { for (let i = 0; i < 3; i++) { const a = t * 1.5 + (i * TAU) / 3; circ(g, Math.cos(a) * 14, -12 + Math.sin(a) * 5, 1.4, "rgba(200,235,255,0.8)", false); } },
    (g) => { g.strokeStyle = "#e8b53a"; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, -30, 6, 2, 0, 0, TAU); g.stroke(); },
  ],
  golem: [
    (g) => { poly(g, [-14, -14, 14, -14, 14, -10, -14, -10], "#5a6a78"); for (const x of [-9, 0, 9]) circ(g, x, -12, 1.2, "#cfd8e0", false); },
    (g) => { for (const [x, h] of [[-12, 9], [12, 9]] as const) poly(g, [x - 3, -28, x, -28 - h, x + 3, -28], "#e0faff"); },
    (g, t) => { glow(g, 0, -20, 14, "rgba(127,224,255,A)", 0.3 + Math.sin(t * 3) * 0.1); line(g, [-6, -18, -2, -12, 3, -18], "#e0faff", 1.2); },
    (g) => { poly(g, [-7, -46, -7, -51, -3.5, -48, 0, -54, 3.5, -48, 7, -51, 7, -46], "#bfeaff"); circ(g, 0, -48, 1.3, "#5ff0ff", false); },
  ],
  fatty: [
    (g) => { line(g, [-12, -16, 12, -12], "#5a3a1a", 2.2); circ(g, 0, -14, 2, "#8a8f98"); },
    (g, t) => { for (const [x, y] of [[-10, -24], [8, -16], [-4, -10]] as const) { circ(g, x, y, 2.4, "#7fd040"); circ(g, x - 0.6, y - 0.6, 0.8, "#e8ff6a", false); } line(g, [9, -21, 9, -19 + Math.sin(t * 5) * 2], "#7fd040", 1.4); },
    (g, t) => { for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; g.globalAlpha = 0.5 * (1 - k); circ(g, -6 + i * 6, -30 - k * 14, 3 + k * 4, "#7fd040", false); } g.globalAlpha = 1; },
    (g) => { crown(g, 5, -36, 4.5, 4.5, "#9aaa5a", "#e8ff6a"); },
  ],
  orc: [
    (g) => { line(g, [-1, -38, -5, -43], "#7a1a1a", 2); line(g, [7, -38, 11, -43], "#7a1a1a", 2); },
    (g) => { poly(g, [-11, -24, -4, -28, -2, -20, -10, -18], "#6a6a70"); poly(g, [-11, -24, -15, -28, -11, -27], "#cfc6b0"); },
    (g, t) => { line(g, [-8, -10, -8, -40], "#3a2a1a", 1.4); poly(g, [-8, -40, -1, -38 + Math.sin(t * 6), -8, -34], "#8a1a1a"); circ(g, -5, -37.5, 0.9, "#e8b53a", false); },
    (g) => { crown(g, 3, -37, 5, 4); },
  ],
  vampire: [
    (g) => { poly(g, [-5, -27, -8, -33, -3, -29], "#7a0c18"); poly(g, [9, -27, 12, -33, 7, -29], "#7a0c18"); },
    (g, t) => { g.fillStyle = "#4a0612"; g.beginPath(); g.moveTo(-4, -26); g.quadraticCurveTo(-18, -8 + Math.sin(t * 6) * 3, -14, 2); g.lineTo(-6, -2); g.closePath(); g.fill(); ol(g); },
    (g, t) => { circ(g, 2, -22, 2.2, "#c9a227"); circ(g, 2, -22, 1.2, `rgba(255,30,60,${0.7 + Math.sin(t * 6) * 0.3})`, false); },
    (g) => { crown(g, 2, -39, 5, 4, "#c0c4cc", "#ff2030"); },
  ],
  phoenix: [
    (g) => { for (let i = 0; i < 3; i++) poly(g, [-2 + i * 3, -21, -1 + i * 3, -27 - (i % 2) * 2, i * 3, -21], "#ffd060"); },
    (g, t) => { for (let i = 0; i < 3; i++) flameTip(g, -6 + i * 2, 5, 2, t + i, "#ff3a10", "#ffd060"); },
    (g, t) => { glow(g, 0, -8, 18, "rgba(255,170,50,A)", 0.3 + Math.sin(t * 6) * 0.1); embers(g, t, 0, -4, 12, "#ffd060"); },
    (g) => { g.strokeStyle = "#fff6a0"; g.lineWidth = 1.5; g.beginPath(); g.ellipse(4, -26, 6, 2, 0, 0, TAU); g.stroke(); },
  ],
  necro: [
    (g) => { for (let i = 0; i < 4; i++) circ(g, -4 + i * 2.5, -18, 1.2, "#d8d0bc"); },
    (g) => { poly(g, [-11, -24, -8, -20, -14, -16], "#d8d0bc"); poly(g, [9, -24, 12, -20, 6, -18], "#d8d0bc"); },
    (g, t) => { glow(g, 13, -39, 13, "rgba(125,255,154,A)", 0.4 + Math.sin(t * 4) * 0.15); for (let i = 0; i < 3; i++) { const a = t * 3 + (i * TAU) / 3; circ(g, 13 + Math.cos(a) * 8, -39 + Math.sin(a) * 8, 1.1, "#7dff9a", false); } },
    (g) => { crown(g, 0, -39, 5, 5, "#3a3a4a", "#7dff9a"); },
  ],
  runebreaker: [
    (g) => { line(g, [-8, -14, 8, -14], "#4a4a5a", 2.4); circ(g, 0, -14, 1.6, "#5ff0ff", false); },
    (g) => { for (const [x, y] of [[-10, -24], [10, -22]] as const) { poly(g, [x - 3, y, x, y - 4, x + 3, y, x, y + 4], "#8a8aa0"); circ(g, x, y, 1, "#5ff0ff", false); } },
    (g, t) => { for (let i = 0; i < 3; i++) { const a = t * 2 + (i * TAU) / 3; g.fillStyle = "#5ff0ff"; g.fillRect(Math.cos(a) * 14 - 1, -22 + Math.sin(a) * 5 - 2, 2, 4); } },
    (g) => { crown(g, 3, -40, 5, 4, "#6a6a80", "#5ff0ff"); },
  ],
  dragon: [
    (g) => { poly(g, [-10, -25, 6, -25, 4, -19, -8, -19], "#5a2a1a"); line(g, [-2, -19, -2, -10], "#3a1a0a", 1.6); },
    (g) => { for (let i = 0; i < 5; i++) poly(g, [-14 + i * 6, -25, -11 + i * 6, -32, -8 + i * 6, -25], "#e8dcc0"); },
    (g, t) => { glow(g, 32, -30, 14, "rgba(90,255,130,A)", 0.35 + Math.sin(t * 5) * 0.1); circ(g, 31, -33, 1.2, "#5aff82", false); embers(g, t, 34, -28, 8, "#5aff82"); },
    (g) => { crown(g, 29, -38, 5, 5, "#e8b53a", "#5aff82"); },
  ],
  abyss: [
    (g) => { for (const x of [-21, 21]) { g.strokeStyle = "#c9a227"; g.lineWidth = 2; g.beginPath(); g.ellipse(x + (x > 0 ? 3 : -3), -46, 3, 1.4, 0, 0, TAU); g.stroke(); } },
    (g) => { for (let i = 0; i < 4; i++) line(g, [-16 + i * 10, -8, -18 + i * 10, 6], "#5a5a60", 1.5); },
    (g, t) => { glow(g, 0, -26, 34, "rgba(255,40,80,A)", 0.25 + Math.sin(t * 3) * 0.08); },
    (g, t) => { g.strokeStyle = `rgba(255,${120 + Math.sin(t * 8) * 60},40,0.9)`; g.lineWidth = 2.5; g.beginPath(); g.ellipse(3, -64, 16, 4, 0, 0, TAU); g.stroke(); for (let i = 0; i < 5; i++) flameTip(g, -11 + i * 7, -66, 2, t + i); },
  ],
  larva: [
    (g) => { circ(g, 7, -7, 1, "#c9a227", false); },
    (g) => { for (let i = 0; i < 3; i++) poly(g, [-6 + i * 3.5, -6, -5 + i * 3.5, -9, -4 + i * 3.5, -6], "#8aa04a", false); },
    (g, t) => { glow(g, 0, -4, 8, "rgba(200,230,140,A)", 0.3 + Math.sin(t * 5) * 0.1); },
    (g) => { crown(g, 5, -7, 2, 2); },
  ],
  bat: [
    (g) => { line(g, [-2, 1, 2, 1], "#c9a227", 1.4); },
    (g) => { poly(g, [-1, -9, 0, -12, 1, -9], "#e8dcc0"); },
    (g, t) => { glow(g, 0, -3, 10, "rgba(255,30,60,A)", 0.3 + Math.sin(t * 6) * 0.1); },
    (g) => { crown(g, 0, -8, 2.5, 2.5, "#c0c4cc", "#ff2030"); },
  ],
};

export const GEAR_LEVELS = [3, 6, 9, 10] as const;

/** Names shown in the squad screen for the next gear piece. */
export const GEAR_NAMES: Record<MonsterId, [string, string, string, string]> = {
  goblin: ["кожаная шапка", "очки-гоглы", "кинжал за спиной", "корона с пером"],
  troll: ["кастет с заклёпками", "наплечник с шипами", "ледяной взгляд", "костяная корона"],
  sapper: ["окованная бочка", "патронташ бомб", "яростный фитиль", "шлем-маска с короной"],
  shaman: ["костяное ожерелье", "череп на посохе", "ритуальная маска", "кружащие духи"],
  skeleton: ["шлем рыцаря", "кровавая перевязь", "пылающие глазницы", "железная корона"],
  minion: ["пояс", "щит", "зелёное сияние", "корона"],
  rat: ["золотая серьга", "костяные шипы", "чумной хвост", "крохотная корона"],
  ghost: ["кандалы с цепью", "фонарь душ", "блуждающие огоньки", "золотой нимб"],
  golem: ["железный пояс", "ледяные пики", "морозное ядро", "хрустальная корона"],
  fatty: ["ремень", "гнойные пузыри", "ядовитый пар", "гнилая корона"],
  orc: ["боевые ленты", "стальной наплечник", "знамя клана", "корона вождя"],
  vampire: ["высокий воротник", "плащ ночи", "кровавый амулет", "серебряная корона"],
  phoenix: ["огненный гребень", "пылающий хвост", "аура жара", "солнечный нимб"],
  necro: ["чётки из костей", "костяные наплечники", "души вокруг посоха", "корона мёртвых"],
  runebreaker: ["рунный пояс", "рунические камни", "кружащие руны", "корона глушителя"],
  dragon: ["седло", "костяные шипы", "зелёное пламя", "корона драконов"],
  abyss: ["кольца на рогах", "цепи", "аура ужаса", "горящий нимб"],
  larva: ["серьга", "шипики", "сияние", "корона"],
  bat: ["ошейник", "клык", "алое сияние", "корона"],
};

export function gearTier(lvl: number) { return lvl >= 10 ? 4 : lvl >= 9 ? 3 : lvl >= 6 ? 2 : lvl >= 3 ? 1 : 0; }

export function drawGear(g: G, kind: MonsterId, t: number, lvl: number) {
  const n = gearTier(lvl); if (!n) return;
  const set = GEAR[kind]; g.save(); g.translate(0, gearLift(kind, t));
  for (let i = 0; i < n; i++) set[i]!(g, t);
  g.restore();
}
