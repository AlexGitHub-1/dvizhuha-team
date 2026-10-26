import { MONSTERS } from "../data/monsters";
import { RARITY_INFO } from "../data/rarity";
import { TOWERS, towerScale } from "../data/towers";
import { ADAPT, GATE, H, inCover, STANCE_NAME, W, type Battle, type Champion, type Corpse, type Tower, type Unit } from "../engine/battle";
import { drawCreature, FLOATERS } from "./creatures";

type G = CanvasRenderingContext2D;
const bgCache = new Map<string, HTMLCanvasElement>();

type ThemeArt = { a: string; b: string; tint: string; mark: string; road: [string, string, string]; props: string[] };
const THEMES: Record<string, ThemeArt> = {
  dead: { a: "#2c3123", b: "#121510", tint: "rgba(70,85,50,0.22)", mark: "rgba(140,150,100,0.18)", road: ["#18130d", "#46382a", "#574634"], props: ["grave", "tree", "rock", "grave"] },
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

/** Larger, detailed set pieces (drawn once into the cached background). Origin = ground point. */
function detail(g: G, kind: string) {
  const sh = (w: number, h = w * 0.3) => { g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(0, 2, w, h, 0, 0, Math.PI * 2); g.fill(); };
  const rect = (c: string, x: number, y: number, w: number, h: number) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const poly = (c: string, pts: number[]) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < pts.length; i += 2) (i ? g.lineTo(pts[i]!, pts[i + 1]!) : g.moveTo(pts[i]!, pts[i + 1]!)); g.closePath(); g.fill(); };
  const circ = (c: string, x: number, y: number, r: number) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const line = (c: string, w: number, ...pts: number[]) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); for (let i = 0; i < pts.length; i += 2) (i ? g.lineTo(pts[i]!, pts[i + 1]!) : g.moveTo(pts[i]!, pts[i + 1]!)); g.stroke(); };
  const glow = (c: string, x: number, y: number, r: number) => { const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
  switch (kind) {
    // dead lands
    case "crypt": sh(34); rect("#3e3e42", -26, -34, 52, 34); poly("#2e2e32", [-30, -34, 0, -52, 30, -34]); rect("#0c0c10", -8, -22, 16, 22); g.fillStyle = "#0c0c10"; g.beginPath(); g.arc(0, -22, 8, Math.PI, 0); g.fill(); rect("#55555a", -30, -36, 60, 3); line("#1a1a1e", 1, -18, -30, -14, -18, -16, -10); rect("#4a4a50", 30, -26, 8, 26); circ("#4a4a50", 34, -30, 5); poly("#55555a", [28, -28, 22, -38, 30, -32]); poly("#55555a", [40, -28, 46, -38, 38, -32]); break;
    case "opengrave": sh(26); rect("#0d0a07", -16, -6, 32, 12); poly("#3a2c1e", [18, 4, 24, -10, 36, -14, 44, 4]); line("#6a5a40", 2, 30, -14, 22, -34); rect("#8a8a90", 18, -38, 8, 6); rect("#4a4a4c", -10, -24, 14, 16); break;
    case "gallows": sh(26); rect("#3a2a1a", -18, -60, 5, 60); rect("#3a2a1a", -20, -62, 36, 5); line("#3a2a1a", 3, -14, -44, -2, -58); line("#c8b890", 1.2, 12, -58, 12, -38); g.strokeStyle = "#c8b890"; g.beginPath(); g.arc(12, -34, 4, 0, Math.PI * 2); g.stroke(); rect("#2a1e12", -24, -2, 44, 4); break;
    case "crosses": for (const [x, k] of [[-18, 0.9], [0, 1.1], [18, 0.8]] as const) { g.save(); g.translate(x, 0); g.rotate((x % 7) * 0.02); rect("#4a3624", -2, -26 * k, 4, 26 * k); rect("#4a3624", -8, -20 * k, 16, 3); g.restore(); } sh(26, 5); break;
    case "crowtree": sh(18); line("#0b0a08", 5, 0, 0, 0, -44); line("#0b0a08", 3, 0, -26, -22, -46, 0, -34, 20, -52); for (const [x, y] of [[-20, -48], [16, -54], [6, -40]]) { circ("#08080a", x!, y! - 3, 3.4); poly("#08080a", [x! - 4, y!, x! + 5, y!, x!, y! - 4]); poly("#c9a227", [x! + 3, y! - 4, x! + 6, y! - 3, x! + 3, y! - 2]); } break;
    // ice
    case "pond": { g.fillStyle = "rgba(150,200,230,0.55)"; g.beginPath(); g.ellipse(0, 0, 46, 18, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = "rgba(240,250,255,0.7)"; g.lineWidth = 2; g.stroke(); line("rgba(255,255,255,0.5)", 1, -20, -4, -4, 2, 8, -6, 22, 4); line("rgba(255,255,255,0.35)", 3, -30, -6, -14, -10); break; }
    case "crystals": sh(22); for (const [x, h, a] of [[-12, 34, -0.3], [0, 48, 0], [12, 30, 0.35], [6, 20, 0.6]] as const) { g.save(); g.translate(x, 0); g.rotate(a); poly("#9fd8f0", [-5, 0, 0, -h, 5, 0]); poly("#e8f8ff", [0, 0, 0, -h, 5, 0]); g.restore(); } glow("rgba(160,220,255,0.35)", 0, -20, 40); break;
    case "mammoth": sh(40, 8); for (let i = 0; i < 6; i++) { g.strokeStyle = "#e8e0cc"; g.lineWidth = 3; g.beginPath(); g.arc(-22 + i * 9, 0, 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } line("#e8e0cc", 4, -30, -4, 30, -4); circ("#ddd5c0", 34, -10, 10); g.strokeStyle = "#f0e8d6"; g.lineWidth = 4; g.beginPath(); g.arc(46, -2, 14, Math.PI, Math.PI * 1.8, true); g.stroke(); g.fillStyle = "rgba(235,245,255,0.85)"; g.beginPath(); g.ellipse(0, 4, 48, 8, 0, Math.PI, 0); g.fill(); break;
    case "tent": sh(30); poly("#6a5a46", [-26, 0, 0, -34, 26, 0]); poly("#2a2016", [-6, 0, 0, -16, 6, 0]); poly("#eef6ff", [-20, -8, 0, -34, 6, -28, -14, -4]); circ("#2a2420", 38, -2, 7); line("#3a2a1a", 2, 32, -2, 44, -6, 34, -6, 42, 0); break;
    case "icicles": sh(26); poly("#4a5560", [-26, 0, -18, -24, 6, -30, 24, -14, 26, 0]); poly("#eef6ff", [-20, -20, -18, -24, 6, -30, 20, -18, 6, -22]); for (let i = 0; i < 5; i++) poly("#bfe4f6", [-14 + i * 8, -16 + (i % 2) * 4, -11 + i * 8, -2, -9 + i * 8, -16 + (i % 2) * 4]); break;
    // swamp
    case "stilthut": g.fillStyle = "rgba(60,90,40,0.5)"; g.beginPath(); g.ellipse(0, 4, 40, 10, 0, 0, Math.PI * 2); g.fill(); for (const x of [-18, -6, 6, 18]) line("#2a1e12", 3, x, 6, x, -18); rect("#4a3824", -24, -40, 48, 22); poly("#3a3a1a", [-30, -40, 0, -62, 30, -40]); rect("#ffcc66", -6, -34, 8, 8); glow("rgba(255,200,90,0.35)", -2, -30, 22); break;
    case "boardwalk": for (let i = 0; i < 7; i++) { g.save(); g.translate(-36 + i * 12, (i % 3) - 1); g.rotate((i % 2 ? 1 : -1) * 0.06); rect(i === 3 ? "#2a1e12" : "#5a4630", -5, -9, 10, 18); g.restore(); } line("#2a1e12", 2, -40, -10, 44, -12); break;
    case "log": sh(36, 6); g.fillStyle = "#3a2a1a"; g.beginPath(); g.ellipse(0, -6, 38, 8, -0.1, 0, Math.PI * 2); g.fill(); circ("#6a5034", 36, -10, 7); circ("#3a2a1a", 36, -10, 3); g.fillStyle = "#4a6a2a"; g.beginPath(); g.ellipse(-8, -12, 18, 4, -0.1, 0, Math.PI * 2); g.fill(); break;
    case "lilies": for (const [x, y, r2] of [[-16, 0, 12], [8, -6, 10], [20, 6, 8], [-2, 10, 7]] as const) { g.fillStyle = "#3a6a2a"; g.beginPath(); g.arc(x, y, r2, 0.3, Math.PI * 2); g.lineTo(x, y); g.fill(); } circ("#f0a0d0", 8, -8, 3.5); circ("#fff0f8", 8, -8, 1.5); glow("rgba(240,160,220,0.4)", 8, -8, 16); circ("#f0a0d0", -16, -2, 3); break;
    case "cauldron": sh(20); line("#2a1e12", 3, -16, 0, -6, -26, 4, 0); line("#2a1e12", 3, 16, 0, 6, -26); circ("#1a1a1e", 0, -10, 14); g.fillStyle = "#6ad040"; g.beginPath(); g.ellipse(0, -20, 12, 4, 0, 0, Math.PI * 2); g.fill(); glow("rgba(120,230,80,0.5)", 0, -28, 30); circ("#ff8a2a", 0, 2, 4); break;
    // forest
    case "bigtree": sh(42, 10); poly("#2a1e14", [-12, 0, -8, -40, 8, -40, 12, 0]); line("#2a1e14", 4, -12, 0, -26, 6); line("#2a1e14", 4, 12, 0, 28, 6); g.fillStyle = "#0a0806"; g.beginPath(); g.ellipse(0, -16, 4, 7, 0, 0, Math.PI * 2); g.fill(); for (const [x, y, r2, c] of [[0, -60, 30, "#183026"], [-22, -48, 20, "#1c3328"], [22, -48, 20, "#1c3328"], [6, -70, 18, "#22402f"]] as const) circ(c, x, y, r2); break;
    case "fairyring": for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const x = Math.cos(a) * 28, y = Math.sin(a) * 12; rect("#e8e0cc", x - 1, y - 6, 2, 6); g.fillStyle = "#e05040"; g.beginPath(); g.ellipse(x, y - 6, 5, 3, 0, Math.PI, 0); g.fill(); circ("#fff", x - 1, y - 7, 0.9); } glow("rgba(200,255,180,0.25)", 0, -4, 40); break;
    case "trunk": sh(40, 6); g.fillStyle = "#3a2a1a"; g.beginPath(); g.ellipse(0, -7, 42, 9, 0.05, 0, Math.PI * 2); g.fill(); circ("#6a5034", -40, -9, 8); g.strokeStyle = "#4a3624"; g.lineWidth = 1; g.beginPath(); g.arc(-40, -9, 4, 0, Math.PI * 2); g.stroke(); g.fillStyle = "#3a6a3a"; g.beginPath(); g.ellipse(6, -14, 24, 5, 0.05, 0, Math.PI * 2); g.fill(); break;
    case "lodge": sh(36); rect("#4a3220", -28, -28, 56, 28); for (let y = -24; y < 0; y += 6) line("#2a1c10", 1, -28, y, 28, y); poly("#2a3a22", [-34, -28, 0, -50, 34, -28]); rect("#1a120a", -6, -18, 12, 18); rect("#ffcc66", 14, -20, 8, 7); rect("#4a4a4c", 18, -56, 7, 14); break;
    case "statue": sh(18); rect("#5a5e5a", -12, -10, 24, 10); poly("#6a6e68", [-8, -10, -6, -42, 6, -42, 8, -10]); circ("#6a6e68", 0, -48, 7); g.fillStyle = "#3e6a3a"; g.beginPath(); g.ellipse(-4, -14, 10, 4, 0, 0, Math.PI * 2); g.ellipse(4, -46, 6, 3, 0, 0, Math.PI * 2); g.fill(); break;
    // forge
    case "mine": sh(40); poly("#2e2420", [-34, 0, -26, -40, 26, -40, 34, 0]); g.fillStyle = "#060404"; g.beginPath(); g.moveTo(-16, 0); g.lineTo(-16, -22); g.arc(0, -22, 16, Math.PI, 0); g.lineTo(16, 0); g.fill(); rect("#5a3a20", -20, -40, 4, 40); rect("#5a3a20", 16, -40, 4, 40); rect("#5a3a20", -22, -42, 44, 5); line("#6a6a70", 2, -10, 0, -14, 30); line("#6a6a70", 2, 10, 0, 14, 30); rect("#3a3a40", -10, 14, 22, 10); circ("#1a1a1e", -6, 25, 3); circ("#1a1a1e", 8, 25, 3); glow("rgba(255,140,60,0.3)", 0, -14, 22); break;
    case "weapons": sh(28); for (let i = 0; i < 5; i++) { g.save(); g.rotate(-0.8 + i * 0.4); line("#9a9aa4", 3, 0, 0, 0, -30); rect("#5a3a20", -5, -6, 10, 3); g.restore(); } circ("#6a2a1a", -16, -4, 9); circ("#c9a227", -16, -4, 3); circ("#4a4a54", 18, -4, 8); break;
    case "slag": sh(32); poly("#2a2220", [-32, 0, -18, -20, -4, -28, 14, -18, 30, 0]); glow("rgba(255,100,30,0.4)", 2, -10, 24); line("rgba(255,140,60,0.8)", 1.5, -10, -8, 2, -14, 12, -6); glow("rgba(120,110,110,0.35)", 0, -40, 22); break;
    case "furnace": sh(30); rect("#3a2e2a", -22, -40, 44, 40); for (let y = -36; y < 0; y += 8) line("#1a1210", 1, -22, y, 22, y); rect("#140a06", -10, -22, 20, 16); rect("#ff8a2a", -8, -16, 16, 10); glow("rgba(255,140,60,0.55)", 0, -12, 36); rect("#3a2e2a", -6, -58, 12, 18); poly("#5a3a20", [24, -6, 44, -12, 44, -2, 24, -2]); break;
    case "gears": g.strokeStyle = "#5a5a62"; g.lineWidth = 4; g.beginPath(); g.arc(-10, -4, 12, 0, Math.PI * 1.6); g.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; rect("#5a5a62", -10 + Math.cos(a) * 14 - 2, -4 + Math.sin(a) * 6 - 2, 4, 4); } circ("#4a4a52", 16, 0, 7); for (let i = 0; i < 6; i++) { g.strokeStyle = "#6a6a72"; g.lineWidth = 2; g.beginPath(); g.ellipse(24 + i * 6, 2, 3.5, 2, 0, 0, Math.PI * 2); g.stroke(); } break;
    // capital
    case "stall": sh(30); rect("#5a3a20", -24, -26, 3, 26); rect("#5a3a20", 21, -26, 3, 26); for (let i = 0; i < 6; i++) poly(i % 2 ? "#e8d8b0" : "#a02020", [-28 + i * 9.3, -34, -18.7 + i * 9.3, -34, -20 + i * 9.3, -26, -28 + i * 9.3, -26]); rect("#6a4a2a", -24, -10, 48, 10); circ("#d04030", -12, -12, 3); circ("#e0a020", -4, -12, 3); circ("#60a030", 4, -12, 3); rect("#7a5a34", 26, -10, 12, 10); break;
    case "fountain": sh(34, 10); g.fillStyle = "#6e645a"; g.beginPath(); g.ellipse(0, -4, 32, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#4a7a9a"; g.beginPath(); g.ellipse(0, -6, 26, 9, 0, 0, Math.PI * 2); g.fill(); rect("#7e746a", -4, -30, 8, 24); circ("#7e746a", 0, -32, 7); line("rgba(200,230,255,0.7)", 1.5, 0, -36, -10, -24, -14, -10); line("rgba(200,230,255,0.7)", 1.5, 0, -36, 10, -24, 14, -10); break;
    case "haycart": sh(34); poly("#c9a840", [-26, -12, -20, -36, 20, -38, 28, -12]); rect("#5a3a20", -30, -14, 60, 6); g.strokeStyle = "#3a2410"; g.lineWidth = 3; g.beginPath(); g.arc(-16, -4, 9, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(16, -4, 9, 0, Math.PI * 2); g.stroke(); line("#5a3a20", 3, 30, -10, 50, -4); break;
    case "guardpost": sh(26); rect("#4a3a2a", -18, -46, 36, 46); poly("#6a2020", [-22, -46, 0, -64, 22, -46]); rect("#1a120a", -6, -24, 12, 24); for (const x of [26, 32]) { line("#5a3a20", 2, x, 0, x, -44); poly("#a0a0aa", [x - 3, -44, x, -52, x + 3, -44]); } break;
    case "garden": g.strokeStyle = "#5a3a20"; g.lineWidth = 2; g.strokeRect(-30, -14, 60, 24); for (let x = -30; x <= 30; x += 8) line("#5a3a20", 2, x, 10, x, 4); for (let i = 0; i < 3; i++) { rect("#3a2a1a", -24, -8 + i * 7, 48, 3); for (let j = 0; j < 6; j++) circ(j % 2 ? "#3a7a2a" : "#5a9a3a", -20 + j * 8, -9 + i * 7, 2.6); } break;
  }
}

/** Extra ground drawn around the field so wide/tall screens never show empty edges. */
export const BX = 700, BY = 450;
function buildBg(b: Battle) {
  const key = b.theme + b.level.map;
  const hit = bgCache.get(key); if (hit) return hit;
  const th = THEMES[b.theme] ?? THEMES["dead"]!;
  const c = document.createElement("canvas"); c.width = W + BX * 2; c.height = H + BY * 2; const g = c.getContext("2d")!; const r = rng(42 + b.level.map * 31);
  g.translate(BX, BY);
  /** random point anywhere in the extended (bleed) area */
  const rx = () => -BX + r() * (W + BX * 2), ry = () => -BY + r() * (H + BY * 2);
  const grd = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 800); grd.addColorStop(0, th.a); grd.addColorStop(1, th.b);
  g.fillStyle = grd; g.fillRect(-BX, -BY, W + BX * 2, H + BY * 2);
  // soft ground patches + tiny marks (grass/snow/ash)
  for (let i = 0; i < 40; i++) { const x = rx(), y = ry(), rad = 80 + r() * 160; const pg = g.createRadialGradient(x, y, 0, x, y, rad); pg.addColorStop(0, th.tint); pg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = pg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.strokeStyle = th.mark; g.lineWidth = 1; for (let i = 0; i < 700; i++) { const x = rx(), y = ry(); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 4); g.moveTo(x, y); g.lineTo(x + 2, y - 5); g.stroke(); }
  // road: shoulder, bed, worn centre, ruts and pebbles
  const pts: [number, number][] = [[-BX - 40, b.path.pts[0]![1]], ...b.path.pts];
  const road = (w: number, col: string, dash?: number[]) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; if (dash) g.setLineDash(dash); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]); };
  g.save(); g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 18; road(70, th.road[0]); g.restore();
  road(58, th.road[1]); road(42, th.road[2]);
  g.save(); g.globalAlpha = 0.35; road(46, th.road[1], [2, 9, 1, 14]); g.restore();
  for (const off of [-10, 10]) { g.save(); g.translate(0, off * 0.35); g.globalAlpha = 0.28; road(3, th.road[0], [26, 8]); g.restore(); }
  for (let i = 0; i < 260; i++) { const d = r() * b.path.len; const [px, py, ang] = b.path.posAt(d); const o = (r() - 0.5) * 60; const x = px + Math.cos(ang + Math.PI / 2) * o, y = py + Math.sin(ang + Math.PI / 2) * o; g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.08)"; g.fillRect(x, y, 2 + r() * 2, 1.5 + r()); }
  // tower pads
  for (const s of b.slots) { g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(s.x, s.y + 3, 34, 13, 0, 0, Math.PI * 2); g.fill(); }
  // props: themed clusters placed away from the road, denser at the edges
  // detailed set-piece spots are chosen first (own random source) so ordinary props can avoid them
  const pieceSpots: [number, number][] = [];
  { const r2 = rng(777 + b.level.map * 53); const ok = (x: number, y: number) => b.path.dist(x, y) >= 95 && !(x < 0 && Math.abs(y - pts[0]![1]) < 95) && x <= 1105 && !b.slots.some((s) => Math.hypot(s.x - x, s.y - y) < 44);
    for (let t = 0; t < 600 && pieceSpots.length < 9; t++) { const x = -200 + r2() * (W + 140), y = -120 + r2() * (H + 240); if (!ok(x, y) || pieceSpots.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < 140)) continue; pieceSpots.push([x, y]); } }
  const free = (x: number, y: number, m: number) => !pieceSpots.some(([cx, cy]) => Math.hypot(cx - x, (cy - y) * 1.3) < 62) && b.path.dist(x, y) >= m && !(x < 0 && Math.abs(y - pts[0]![1]) < m) && x <= 1105 && !b.slots.some((s) => Math.hypot(s.x - x, s.y - y) < 44);
  const put = (kind: string, x: number, y: number, k = 1) => { if (!free(x, y, 50)) return; g.save(); g.translate(x, y); g.scale(k, k); prop(g, kind, 0, 0, r); g.restore(); };
  const centres: [number, number][] = [];
  const centre = (minRoad: number, sep: number): [number, number] | null => {
    for (let t = 0; t < 160; t++) { const near = r() < 0.75; const x = near ? -260 + r() * (W + 260) : rx(), y = near ? -160 + r() * (H + 320) : ry(); const d = b.path.dist(x, y); if (!free(x, y, minRoad) || r() > Math.min(1, (d - minRoad + 80) / 200)) continue; if (centres.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < sep) || pieceSpots.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < sep * 0.5 + 70)) continue; centres.push([x, y]); return [x, y]; }
    return null;
  };
  const grove = (kind: string, n: number, rad: number, k = 1.25) => { const c = centre(80, rad * 2.2); if (!c) return; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad; put(kind, c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d * 0.7, k * (0.8 + r() * 0.4)); } };
  const ring = (kind: string, n: number, rad: number, mid?: string, k = 1.2) => { const c = centre(85, rad * 2.6); if (!c) return; if (mid) put(mid, c[0], c[1], 1.6); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; put(kind, c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad * 0.6, k); } };
  const rows = (kind: string, cols: number, rws: number, dx: number, dy: number, fence: boolean, extra?: string) => {
    const c = centre(100, 180); if (!c) return; const x0 = c[0] - ((cols - 1) * dx) / 2, y0 = c[1] - ((rws - 1) * dy) / 2;
    if (fence) { g.strokeStyle = "rgba(20,16,12,0.85)"; g.lineWidth = 2; g.strokeRect(x0 - 18, y0 - 26, (cols - 1) * dx + 36, (rws - 1) * dy + 36); g.fillStyle = "rgba(20,16,12,0.85)"; for (let x = x0 - 18; x <= x0 + (cols - 1) * dx + 18; x += 10) { g.fillRect(x - 1, y0 - 30, 2, 6); g.fillRect(x - 1, y0 + (rws - 1) * dy + 6, 2, 6); } }
    for (let j = 0; j < rws; j++) for (let i = 0; i < cols; i++) if (r() > 0.12) put(kind, x0 + i * dx + (r() - 0.5) * 3, y0 + j * dy, 1.15);
    if (extra) put(extra, x0 + (cols - 1) * dx + 30, y0 - 4, 1.5);
  };
  const lone = (kind: string, n: number, k = 1.1) => { for (let i = 0; i < n * 6 && n > 0; i++) { const x = rx(), y = ry(), d = b.path.dist(x, y); if (d > 60 && d < 110 && free(x, y, 60)) { put(kind, x, y, k); n--; } } };
  const plan: Record<string, () => void> = {
    dead: () => { for (let i = 0; i < 8; i++) rows("grave", 4, 3, 26, 26, true, "tree"); for (let i = 0; i < 16; i++) grove("tree", 5, 46, 1.4); lone("grave", 10); for (let i = 0; i < 6; i++) grove("rock", 3, 24, 1.1); },
    ice: () => { for (let i = 0; i < 14; i++) grove("pine", 8, 60, 1.4); for (let i = 0; i < 6; i++) grove("drift", 3, 40, 1.3); for (let i = 0; i < 6; i++) grove("crack", 3, 40, 1.4); lone("rock", 5); },
    swamp: () => { for (let i = 0; i < 8; i++) ring("reed", 7, 30, "bog"); for (let i = 0; i < 6; i++) ring("mush", 7, 20); for (let i = 0; i < 8; i++) grove("tree", 3, 30, 1.4); },
    forest: () => { for (let i = 0; i < 14; i++) grove("oak", 9, 64, 1.4); for (let i = 0; i < 3; i++) ring("stone", 7, 34); for (let i = 0; i < 6; i++) grove("mush", 5, 26); },
    forge: () => { for (let i = 0; i < 8; i++) ring("rock", 6, 34, "lava"); for (let i = 0; i < 5; i++) rows("anvil", 2, 2, 30, 24, false); for (let i = 0; i < 8; i++) grove("rock", 4, 30, 1.3); },
    capital: () => { for (let i = 0; i < 6; i++) rows("house", 4, 2, 34, 40, false, "banner"); for (let i = 0; i < 5; i++) ring("house", 5, 44, "well", 1.15); lone("banner", 5); for (let i = 0; i < 5; i++) grove("rock", 3, 24); },
  };
  (plan[b.theme] ?? plan["dead"]!)();
  // detailed set pieces (own random source so the groups above keep their places)
  const PIECES: Record<string, string[]> = { dead: ["crypt", "opengrave", "gallows", "crosses", "crowtree"], ice: ["pond", "crystals", "mammoth", "tent", "icicles"], swamp: ["stilthut", "boardwalk", "log", "lilies", "cauldron"], forest: ["bigtree", "fairyring", "trunk", "lodge", "statue"], forge: ["mine", "weapons", "slag", "furnace", "gears"], capital: ["stall", "fountain", "haycart", "guardpost", "garden"] };
  const kinds = PIECES[b.theme] ?? PIECES["dead"]!;
  pieceSpots.forEach(([x, y], i) => { g.save(); g.translate(x, y); g.scale(1.1, 1.1); detail(g, kinds[i % kinds.length]!); g.restore(); });
  const p0 = pts[0]!; const sg = g.createRadialGradient(20, p0[1], 5, 20, p0[1], 90); sg.addColorStop(0, "rgba(160,60,255,0.6)"); sg.addColorStop(1, "rgba(160,60,255,0)"); g.fillStyle = sg; g.fillRect(-70, p0[1] - 100, 180, 200);
  const v = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 820 + BX); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.75)"); g.fillStyle = v; g.fillRect(-BX, -BY, W + BX * 2, H + BY * 2);
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

/** Shared polish on tower bodies: side shading, stonework, lit windows, base rune circle. */
/** Lightens a #rrggbb colour toward warm white by k (hit flash keeps the texture). */
function warm(c: string, k: number) {
  if (!/^#[0-9a-f]{6}$/i.test(c)) return c;
  const n = parseInt(c.slice(1), 16); const m = (v: number, w: number) => Math.round(v + (w - v) * k);
  return `rgb(${m(n >> 16, 255)},${m((n >> 8) & 255, 226)},${m(n & 255, 180)})`;
}
function towerDetail(g: G, t: Tower, time: number, _fl: boolean) {
  const box: Partial<Record<Tower["kind"], [number, number, number, number]>> = { archer: [-14, -36, 28, 38], cannon: [-22, -28, 44, 30], frost: [-12, -30, 24, 32], flame: [-14, -34, 28, 36], ballista: [-18, -20, 36, 22], mage: [-10, -44, 20, 46] };
  const r = box[t.kind];
  if (r) {
    const [x, y, w, h] = r;
    const sg = g.createLinearGradient(x, 0, x + w, 0); sg.addColorStop(0, "rgba(255,240,210,0.16)"); sg.addColorStop(0.45, "rgba(0,0,0,0)"); sg.addColorStop(1, "rgba(0,0,0,0.38)");
    g.fillStyle = sg; g.fillRect(x, y, w, h);
    if (t.kind !== "mage" && t.kind !== "frost") bricks(g, x, y, w, h, "rgba(255,255,255,0.04)", t.id * 11);
    if (t.kind === "archer" || t.kind === "flame") { const k = 0.45 + Math.sin(time * 2.5 + t.id) * 0.15; g.fillStyle = "#120c08"; g.beginPath(); g.moveTo(-4, -12); g.lineTo(-4, -20); g.arc(0, -20, 4, Math.PI, 0); g.lineTo(4, -12); g.fill(); g.fillStyle = `rgba(255,180,80,${k})`; g.fillRect(-2, -19, 4, 6); }
    if (t.kind === "mage") { g.fillStyle = `rgba(140,230,255,${t.disabled ? 0.1 : 0.4 + Math.sin(time * 3 + t.id) * 0.25})`; g.font = "bold 8px sans-serif"; g.textAlign = "center"; ["ᚱ", "ᛟ", "ᚦ"].forEach((s, i) => g.fillText(s, 0, -10 - i * 11)); }
  }
  if (t.kind === "frost") { g.fillStyle = "rgba(220,245,255,0.5)"; g.beginPath(); g.ellipse(0, 1, 22, 6, 0, 0, Math.PI * 2); g.fill(); }
  if (t.kind === "flame") { const k = 0.25 + Math.sin(time * 9 + t.id) * 0.1; const fg = g.createRadialGradient(0, 0, 2, 0, 0, 30); fg.addColorStop(0, `rgba(255,120,30,${k})`); fg.addColorStop(1, "rgba(255,80,20,0)"); g.fillStyle = fg; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill(); }
  // super charge full: pulsing rune ring on the ground
  if (t.charge >= 1 || t.superT > 0) {
    g.save(); g.scale(1, 0.36); g.rotate(time * 0.8); g.strokeStyle = `rgba(255,220,120,${0.55 + Math.sin(time * 6) * 0.3})`; g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, 32, 0, Math.PI * 2); g.stroke(); g.setLineDash([4, 6]); g.beginPath(); g.arc(0, 0, 38, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillStyle = "rgba(255,230,150,0.8)"; g.fillRect(Math.cos(a) * 35 - 2, Math.sin(a) * 35 - 2, 4, 4); }
    g.restore();
  }
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
  if (fl) g.translate((Math.random() - 0.5) * 2.4, 0);
  const stone = (c: string) => (t.frozenT > 0 ? "#a8d8f0" : fl ? warm(c, 0.3) : c);
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
  towerDetail(g, t, time, fl);
  if (fl) { const hg = g.createRadialGradient(0, -22, 2, 0, -22, 30); hg.addColorStop(0, "rgba(255,200,130,0.28)"); hg.addColorStop(1, "rgba(255,170,90,0)"); g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = hg; g.beginPath(); g.arc(0, -22, 30, 0, Math.PI * 2); g.fill(); g.restore(); }
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
  const rate = TOWERS[t.kind].rate * towerScale(t.lvl).rate; const recoil = Math.max(0, Math.min(1, (t.cd - (rate - 0.18)) / 0.18));
  if (t.kind === "archer") {
    // pointed roof + archer who turns toward the target
    g.fillStyle = "#5a2a1e"; g.beginPath(); g.moveTo(-18, btop + 2); g.lineTo(0, btop - 20); g.lineTo(18, btop + 2); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,0.1)"; g.beginPath(); g.moveTo(-18, btop + 2); g.lineTo(0, btop - 20); g.lineTo(-3, btop + 2); g.fill();
    const face = Math.cos(t.angle) >= 0 ? 1 : -1; g.save(); g.translate(0, btop + 6); g.scale(face, 1);
    g.fillStyle = "#2a3a5a"; g.fillRect(-3, -2, 6, 8); g.fillStyle = "#e0b890"; g.beginPath(); g.arc(0, -5, 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#6a4a2a"; g.lineWidth = 1.5; g.beginPath(); g.arc(5, 1, 7, -1.2, 1.2); g.stroke(); g.strokeStyle = "rgba(230,220,200,0.7)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(5 + Math.cos(-1.2) * 7, 1 + Math.sin(-1.2) * 7); g.lineTo(5 - recoil * 3, 1); g.lineTo(5 + Math.cos(1.2) * 7, 1 + Math.sin(1.2) * 7); g.stroke();
    g.restore();
    g.strokeStyle = "#222"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, btop - 20); g.lineTo(0, btop - 32); g.stroke();
    const w = Math.sin(time * 4 + t.id) * 2; g.fillStyle = "#8a2020"; g.beginPath(); g.moveTo(0, btop - 32); g.quadraticCurveTo(6, btop - 30 + w, 12, btop - 28 + w); g.lineTo(0, btop - 24); g.fill();
  }
  if (t.kind === "cannon") { g.save(); g.translate(0, -34 * h); g.rotate(t.angle); g.translate(-recoil * 6, 0); g.fillStyle = "#1c1c1f"; g.fillRect(0, -5, 26 + t.lvl * 2, 10); g.fillStyle = "#3a3a42"; g.fillRect(22 + t.lvl * 2, -6, 5, 12); g.fillStyle = "#1c1c1f"; g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(2, -4, 22, 2); if (t.lvl >= 3) { g.fillRect(0, -10, 22, 4); g.fillRect(0, 6, 22, 4); } if (recoil > 0.6) { g.fillStyle = `rgba(255,190,90,${recoil})`; g.beginPath(); g.arc(32 + t.lvl * 2, 0, 7 * recoil, 0, Math.PI * 2); g.fill(); } g.restore();
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

const GATE_TINT: Record<string, { stone: string; dark: string; cap: string | null; glow: string }> = {
  dead: { stone: "#55525a", dark: "#2b2a30", cap: null, glow: "#ffb85a" },
  ice: { stone: "#6c7a88", dark: "#323c48", cap: "#e8f4ff", glow: "#bfe8ff" },
  swamp: { stone: "#4e5a48", dark: "#262d22", cap: "#4f7a32", glow: "#c8ff7a" },
  forest: { stone: "#4c5552", dark: "#242a28", cap: "#3d6a4a", glow: "#a8ffd8" },
  forge: { stone: "#5a4640", dark: "#2a1e1a", cap: null, glow: "#ff6a2a" },
  capital: { stone: "#6e645a", dark: "#36302a", cap: null, glow: "#ffd27a" },
};
function bricks(g: G, x: number, y: number, w: number, h: number, light: string, seed: number) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 1;
  for (let r = 0, yy = y; yy < y + h; r++, yy += 9) {
    g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
    for (let xx = x + (r % 2 ? 7 : 0); xx < x + w; xx += 14) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 9); g.stroke(); if (((xx * 7 + yy * 3 + seed) | 0) % 5 === 0) { g.fillStyle = light; g.fillRect(xx + 1, yy + 1, 12, 7); } }
  }
  g.restore();
}
function torch(g: G, x: number, y: number, time: number, glow: string, k: number) {
  const fl = 0.75 + Math.sin(time * 13 + x) * 0.15 + Math.sin(time * 7.3 + y) * 0.1;
  const rg = g.createRadialGradient(x, y - 6, 1, x, y - 6, 34 * fl); rg.addColorStop(0, `${glow}88`); rg.addColorStop(1, `${glow}00`);
  g.fillStyle = rg; g.beginPath(); g.arc(x, y - 6, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2a1c10"; g.fillRect(x - 2, y - 2, 4, 12);
  g.fillStyle = "#ff8a2a"; g.beginPath(); g.moveTo(x - 4, y - 2); g.quadraticCurveTo(x, y - 16 * fl * k, x + 4, y - 2); g.fill();
  g.fillStyle = "#ffe08a"; g.beginPath(); g.moveTo(x - 2, y - 2); g.quadraticCurveTo(x, y - 9 * fl * k, x + 2, y - 2); g.fill();
}
/** Torch mounted on the wall face: plate and shaft follow the wall's height axis (P); the flame rises straight up. */
/** Torch painted onto the wall face: the whole torch (bracket, shaft, flame, glow) lives in the wall's sheared frame. */
function wallTorch(g: G, s: number, time: number, glow: string) {
  const [x, y] = P(s, 60);
  g.save(); g.transform(0, 1, -LEAN, VERT, x, y); // local x → along the wall, local -y → up the wall
  g.fillStyle = "#1e1e24"; g.fillRect(-6, -2, 12, 9);
  torch(g, 0, -6, time, glow, 1.2);
  g.restore();
}
// ---------- Monolithic Bastion: a wall at the right edge whose face points LEFT, towards the field.
// Face coordinates: s = position along the wall (screen y at ground), h = height above ground.
const FX = 1150, LEAN = 0.75, VERT = 0.55, WH = 150;
const S0 = 335, S1 = 425, SC = 380, AW = 45, AH0 = 62;
const P = (s: number, h: number): [number, number] => [FX + LEAN * h, s - VERT * h];
function facePoly(g: G, pts: [number, number][]) { g.beginPath(); pts.forEach(([s, h], i) => { const [x, y] = P(s, h); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }
const archTop = (s: number) => AH0 + 30 * Math.sqrt(Math.max(0, 1 - ((s - SC) / AW) ** 2));
function archPts(inset = 0): [number, number][] {
  const pts: [number, number][] = [[S0 + inset, 0]];
  for (let i = 0; i <= 16; i++) { const s = S0 + inset + ((S1 - S0 - inset * 2) * i) / 16; pts.push([s, archTop(s) - inset]); }
  pts.push([S1 - inset, 0]); return pts;
}
function seg(g: G, a: [number, number], b: [number, number]) { const p = P(a[0], a[1]), q = P(b[0], b[1]); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }

/** Round flanking tower built into the wall: its axis follows the wall's height direction (P), its round side bulges towards the field. */
function bastionTower(g: G, s: number, c: typeof GATE_TINT[string], time: number, broken: boolean) {
  const r = 34, rx = r * 0.55, TH = broken ? 150 : 175, out = 14;
  const at = (h: number): [number, number] => { const [x, y] = P(s, h); return [x - out, y]; };
  const ux = LEAN, uy = -VERT; // screen step per unit of height
  const [bx, by] = at(0), [tx, ty] = at(TH);
  // shadow on the ground towards the field
  g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(bx - 8, by, rx + 8, r + 2, 0, 0, Math.PI * 2); g.fill();
  // body: left (field-facing) half of the cylinder
  const gr = g.createLinearGradient(0, by - r, 0, by + r); gr.addColorStop(0, shade(c.stone, 1.12)); gr.addColorStop(0.45, c.stone); gr.addColorStop(1, c.dark);
  g.fillStyle = gr; g.beginPath(); g.moveTo(bx, by - r); g.lineTo(tx, ty - r); g.ellipse(tx, ty, rx, r, 0, -Math.PI / 2, Math.PI / 2); g.lineTo(bx, by + r); g.ellipse(bx, by, rx, r, 0, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill();
  // side shading on the curved face
  const sg = g.createLinearGradient(bx - rx, 0, bx + rx * 0.2, 0); sg.addColorStop(0, "rgba(0,0,0,0.28)"); sg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = sg; g.beginPath(); g.moveTo(bx, by - r); g.lineTo(tx, ty - r); g.ellipse(tx, ty, rx, r, 0, -Math.PI / 2, -Math.PI * 1.5, true); g.lineTo(bx, by + r); g.ellipse(bx, by, rx, r, 0, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill();
  // stone courses (rings along the axis) and staggered joints
  g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 1;
  for (let h = 14; h < TH; h += 14) { const [x, y] = at(h); g.beginPath(); g.ellipse(x, y, rx, r, 0, Math.PI / 2 + 0.08, Math.PI * 1.5 - 0.08); g.stroke(); }
  for (let h = 0; h < TH - 1; h += 14) for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + 0.5 + k * 0.85 + ((h / 14) % 2) * 0.42; const [x, y] = at(h); const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * r; g.beginPath(); g.moveTo(px, py); g.lineTo(px + ux * 14, py + uy * 14); g.stroke(); }
  // arrow slits on the field side, with candlelight
  for (const h of [62, 128]) { const [x, y] = at(h); const px = x - rx * 0.92, py = y + 4; g.lineCap = "round"; g.strokeStyle = "#0b0a0c"; g.lineWidth = 4; g.beginPath(); g.moveTo(px, py); g.lineTo(px + ux * 16, py + uy * 16); g.stroke(); g.strokeStyle = `rgba(255,190,90,${0.35 + Math.sin(time * 3 + s + h) * 0.15})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px + ux * 3, py + uy * 3); g.lineTo(px + ux * 12, py + uy * 12); g.stroke(); g.lineCap = "butt"; }
  // machicolation ring + merlons around the top cap
  g.fillStyle = c.stone; g.beginPath(); g.ellipse(tx, ty, rx + 4, r + 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = shade(c.stone, 0.72); g.beginPath(); g.ellipse(tx + ux * 2, ty + uy * 2, rx - 3, r - 3, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 7; i++) {
    if (broken && (i === 2 || i === 5)) continue;
    const a = Math.PI / 2 + (i / 6) * Math.PI; const mx = tx + Math.cos(a) * (rx + 3), my = ty + Math.sin(a) * (r + 3);
    const mh = 12, hw = 4;
    g.fillStyle = c.stone; g.beginPath(); g.moveTo(mx, my - hw); g.lineTo(mx + ux * mh, my - hw + uy * mh); g.lineTo(mx + ux * mh, my + hw + uy * mh); g.lineTo(mx, my + hw); g.closePath(); g.fill();
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.moveTo(mx, my + hw - 2); g.lineTo(mx + ux * mh, my + hw - 2 + uy * mh); g.lineTo(mx + ux * mh, my + hw + uy * mh); g.lineTo(mx, my + hw); g.closePath(); g.fill();
    if (c.cap) { g.fillStyle = c.cap; g.beginPath(); g.moveTo(mx + ux * mh, my - hw + uy * mh); g.lineTo(mx + ux * (mh + 3), my - hw + uy * (mh + 3)); g.lineTo(mx + ux * (mh + 3), my + hw + uy * (mh + 3)); g.lineTo(mx + ux * mh, my + hw + uy * mh); g.fill(); }
  }
  if (!broken) {
    // conical roof along the tower axis
    const [rbx, rby] = at(TH + 8), [apx, apy] = at(TH + 84);
    g.fillStyle = "#3a1e1e"; g.beginPath(); g.moveTo(rbx, rby - r - 6); g.lineTo(apx, apy); g.lineTo(rbx, rby + r + 6); g.ellipse(rbx, rby, rx + 5, r + 6, 0, Math.PI / 2, Math.PI * 1.5); g.fill();
    g.fillStyle = "rgba(255,255,255,0.08)"; g.beginPath(); g.moveTo(rbx, rby - r - 6); g.lineTo(apx, apy); g.lineTo(rbx - rx * 0.4, rby - 4); g.fill();
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.moveTo(rbx, rby + r + 6); g.lineTo(apx, apy); g.lineTo(rbx - rx * 0.3, rby + 8); g.fill();
    if (c.cap) { g.fillStyle = c.cap; g.globalAlpha = 0.75; const [cx1, cy1] = at(TH + 62); g.beginPath(); g.moveTo(cx1, cy1 - 9); g.lineTo(apx, apy); g.lineTo(cx1, cy1 + 9); g.fill(); g.globalAlpha = 1; }
    const [fx, fy] = at(TH + 108);
    g.strokeStyle = "#222"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(apx, apy); g.lineTo(fx, fy); g.stroke();
    const w = Math.sin(time * 3 + s) * 3; g.fillStyle = "#a82020"; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx - 12, fy + 2 + w, fx - 24, fy + 6 + w); g.lineTo(fx - ux * 11, fy - uy * 11); g.fill();
  } else {
    const fg = g.createRadialGradient(tx, ty, 2, tx, ty, 36); fg.addColorStop(0, "rgba(255,150,50,0.7)"); fg.addColorStop(1, "rgba(255,80,20,0)"); g.fillStyle = fg; g.beginPath(); g.arc(tx, ty, 36, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 5; i++) { const k = (time * 1.2 + i / 5) % 1; g.fillStyle = `rgba(40,36,34,${0.4 * (1 - k)})`; g.beginPath(); g.arc(tx + Math.sin(time + i) * 8 - k * 20, ty - 10 - k * 80, 7 + k * 18, 0, Math.PI * 2); g.fill(); }
  }
}

function defender(g: G, x: number, y: number, time: number, i: number, mode: number, banner: boolean) {
  // mode 0 calm, 1 panic (running), 2 fleeing to the back
  let dx = 0, dy = 0, bob = 0;
  if (mode === 0) bob = Math.sin(time * 2 + i) * 0.6;
  if (mode === 1) { dy = Math.sin(time * 3.4 + i * 1.7) * 14; bob = Math.abs(Math.sin(time * 14 + i)) * 2; }
  if (mode === 2) { dx = ((time * 30 + i * 13) % 50); bob = Math.abs(Math.sin(time * 16 + i)) * 2; if (dx > 40) return; }
  g.save(); g.translate(x + dx, y + dy - bob);
  g.fillStyle = "#1a1418"; g.fillRect(-2, -2, 1.6, 4); g.fillRect(0.6, -2, 1.6, 4);
  g.fillStyle = mode === 2 ? "#5a4a3a" : "#3a4a6a"; g.fillRect(-3, -10, 6, 8);
  g.fillStyle = "#d9b98a"; g.beginPath(); g.arc(0, -12.5, 2.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#8a8f98"; g.beginPath(); g.arc(0, -13.5, 2.8, Math.PI, 0); g.fill();
  if (banner) { g.strokeStyle = "#222"; g.lineWidth = 1; g.beginPath(); g.moveTo(3, -8); g.lineTo(3, -30); g.stroke(); const w = Math.sin(time * 3 + i) * 2; g.fillStyle = "#a82020"; g.fillRect(3, -30, -10 + w, 8); g.fillStyle = "#d9b040"; g.fillRect(-3 + w * 0.5, -28, 3, 3); }
  else if (mode === 0) { g.strokeStyle = "#6b4a2a"; g.lineWidth = 1.2; g.beginPath(); g.arc(-4, -9, 5, -1.2, 1.2, true); g.stroke(); }
  else if (mode === 1) { g.fillStyle = "#3a4a6a"; g.fillRect(-6, -15 - Math.abs(Math.sin(time * 12 + i)) * 3, 2, 5); g.fillRect(4, -15 - Math.abs(Math.cos(time * 12 + i)) * 3, 2, 5); }
  g.restore();
}

function drawGate(g: G, b: Battle, time: number) {
  const frac = Math.max(0, b.gateHp / b.gateMax); const c = GATE_TINT[b.theme] ?? GATE_TINT["dead"]!;
  const stage = frac <= 0 ? 3 : frac < 0.35 ? 2 : frac < 0.7 ? 1 : 0;
  // ground shadow cast towards the field
  const sh = g.createLinearGradient(FX - 70, 0, FX, 0); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = sh; g.fillRect(FX - 70, 0, 70, H);
  // walkway on top + inner wall
  const top = FX + LEAN * WH;
  // wall continues past the field edges (wide/tall screens)
  g.fillStyle = sh; g.fillRect(FX - 70, -BY, 70, BY); g.fillRect(FX - 70, H, 70, BY);
  { const fe = g.createLinearGradient(FX, 0, top, 0); fe.addColorStop(0, shade(c.stone, 1.05)); fe.addColorStop(0.6, c.stone); fe.addColorStop(1, c.dark); g.fillStyle = fe; g.fillRect(FX, -BY, top - FX, BY + 10); g.fillRect(FX, H, top - FX, BY); }
  g.fillStyle = shade(c.stone, 0.85); g.fillRect(top, -BY, W + BX - top, H + BY * 2);
  g.fillStyle = "rgba(0,0,0,0.25)"; for (let y = 8 - BY; y < H + BY; y += 26) g.fillRect(top, y, W + BX - top, 2);
  g.fillStyle = shade(c.stone, 0.6); g.fillRect(top + 30, -BY, W + BX - top - 30, H + BY * 2);
  { const ig = g.createLinearGradient(W - 20, 0, W + 260, 0); ig.addColorStop(0, "rgba(8,6,6,0)"); ig.addColorStop(1, "rgba(8,6,6,0.92)"); g.fillStyle = ig; g.fillRect(W - 20, -BY, BX + 20, H + BY * 2); }
  g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 1; for (let y = -BY; y < H + BY; y += 12) { if (y > -10 && y < H + 10) continue; g.beginPath(); g.moveTo(FX, y); g.lineTo(top, y); g.stroke(); }
  // face of the wall
  const fg = g.createLinearGradient(FX, 0, top, 0); fg.addColorStop(0, shade(c.stone, 1.05)); fg.addColorStop(0.6, c.stone); fg.addColorStop(1, c.dark);
  g.fillStyle = fg; g.beginPath(); g.moveTo(FX, -10); g.lineTo(FX, H + 160); g.lineTo(top, H + 160 - VERT * WH); g.lineTo(top, -10); g.closePath(); g.fill();
  // stone courses (constant height) and joints
  g.strokeStyle = "rgba(0,0,0,0.32)"; g.lineWidth = 1;
  for (let h = 12, row = 0; h < WH; h += 12, row++) {
    const [x] = P(0, h); g.beginPath(); g.moveTo(x, -10); g.lineTo(x, H + 10); g.stroke();
    for (let s = (row % 2) * 13; s < H + 160; s += 26) { if (s > S0 - 4 && s < S1 + 4 && h < archTop(s) + 4) continue; seg(g, [s, h - 12], [s, h]); }
  }
  g.fillStyle = "rgba(255,255,255,0.05)"; for (let i = 0; i < 40; i++) { const s = (i * 97) % (H + 140), h = ((i * 53) % 13) * 12 + 1; if (s > S0 - 4 && s < S1 + 4) continue; facePoly(g, [[s + 1, h], [s + 24, h], [s + 24, h + 10], [s + 1, h + 10]]); g.fill(); }
  // buttresses
  for (const s of [SC - 260, SC + 260]) {
    const k = WH * 0.75, d = 26;
    g.fillStyle = shade(c.stone, 0.9); g.beginPath(); g.moveTo(FX - d, s - 16); g.lineTo(FX - d, s + 16); const a = P(s + 16, k), bq = P(s - 16, k); g.lineTo(a[0], a[1]); g.lineTo(bq[0], bq[1]); g.closePath(); g.fill();
    g.fillStyle = c.dark; g.beginPath(); g.moveTo(FX - d, s + 16); g.lineTo(FX, s + 16); g.lineTo(a[0], a[1]); g.closePath(); g.fill();
    g.fillStyle = "rgba(0,0,0,0.4)"; g.beginPath(); g.ellipse(FX - d - 4, s + 16, 14, 4, 0, 0, Math.PI * 2); g.fill();
  }
  // soot when damaged
  if (stage >= 2) { const [x, y] = P(SC, 90); const sg = g.createRadialGradient(x, y, 10, x, y, 150); sg.addColorStop(0, "rgba(10,8,6,0.55)"); sg.addColorStop(1, "rgba(10,8,6,0)"); g.fillStyle = sg; g.fillRect(x - 150, y - 150, 300, 300); }
  // cracks
  g.strokeStyle = "rgba(8,6,4,0.85)"; g.lineWidth = 1.6;
  if (stage >= 1) { for (const [s, h, ds, dh] of [[S0 - 6, 60, -18, 30], [S1 + 8, 40, 22, 40], [SC - 10, 128, -14, 22]] as const) { seg(g, [s, h], [s + ds * 0.5, h + dh * 0.4]); seg(g, [s + ds * 0.5, h + dh * 0.4], [s + ds, h + dh]); seg(g, [s + ds * 0.5, h + dh * 0.4], [s + ds * 0.9, h + dh * 0.2]); } }
  if (stage >= 2) { for (const [s, h] of [[S0 - 30, 20], [S1 + 26, 110]] as const) { g.fillStyle = "#0b0908"; facePoly(g, [[s, h], [s + 14, h + 3], [s + 12, h + 13], [s - 2, h + 10]]); g.fill(); } }

  // gate opening: darkness, or the burning golden courtyard after the breach
  const [ox, oy] = P(SC, 40);
  if (stage === 3) {
    const cg = g.createRadialGradient(ox + 10, oy, 4, ox + 10, oy, 90); cg.addColorStop(0, "#fff2b0"); cg.addColorStop(0.4, "#ffb040"); cg.addColorStop(1, "#7a2a0a");
    g.fillStyle = cg; facePoly(g, archPts()); g.fill();
    for (let i = 0; i < 10; i++) { const k = (time * 1.3 + i / 10) % 1; const [fx, fy] = P(S0 + 8 + ((i * 37) % 80), k * 100); g.fillStyle = `rgba(255,${220 - k * 150},70,${1 - k})`; g.fillRect(fx, fy, 3, 3); }
  } else { g.fillStyle = "#0a0806"; facePoly(g, archPts()); g.fill(); }
  // voussoirs around the arch
  g.strokeStyle = shade(c.stone, 1.15); g.lineWidth = 6; g.beginPath(); archPts(-4).slice(1, -1).forEach(([s, h], i) => { const [x, y] = P(s, h); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 1; for (let i = 0; i <= 8; i++) { const s = S0 + ((S1 - S0) * i) / 8; seg(g, [s, archTop(s)], [s + (s - SC) * 0.08, archTop(s) + 7]); }
  { const [kx, ky] = P(SC, archTop(SC) + 4); g.fillStyle = "#c8b080"; g.beginPath(); g.moveTo(kx - 3, ky - 6); g.lineTo(kx + 4, ky - 6); g.lineTo(kx + 3, ky + 5); g.lineTo(kx - 2, ky + 5); g.fill(); }

  const dent = b.gateDent * 5;
  if (stage < 3) {
    // oak doors, recessed behind the portcullis
    g.save(); facePoly(g, archPts()); g.clip(); g.translate(7 + dent, 0);
    const dg = g.createLinearGradient(FX, 0, FX + 50, 0); dg.addColorStop(0, "#5a3a20"); dg.addColorStop(1, "#2a180c");
    g.fillStyle = dg; facePoly(g, archPts()); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 1.2; for (let s = S0 + 9; s < S1; s += 9) seg(g, [s, 0], [s, 120]);
    g.strokeStyle = "#0e0e10"; g.lineWidth = 2.5; seg(g, [SC, 0], [SC, 120]);
    for (const h of [14, 50, 86]) { g.strokeStyle = "#1e1e24"; g.lineWidth = 4; seg(g, [S0, h], [S1, h]); g.fillStyle = "#8a8a94"; for (let s = S0 + 5; s < S1; s += 10) { const [x, y] = P(s, h); g.fillRect(x - 1, y - 1, 2, 2); } }
    // crossbar
    g.strokeStyle = "#3a2414"; g.lineWidth = 7;
    if (stage === 0) seg(g, [S0 - 4, 36], [S1 + 4, 36]);
    else { seg(g, [S0 - 4, 36], [SC - 3, 33]); seg(g, [SC + 3, 40], [S1 + 4, 34]); g.fillStyle = "#c8a070"; const [x, y] = P(SC, 37); g.fillRect(x - 2, y - 3, 4, 6); }
    // holes with blinding light from inside
    if (stage >= 2) for (const [s, h, r] of [[SC - 20, 62, 8], [SC + 14, 26, 6], [SC + 22, 74, 5]] as const) {
      const [x, y] = P(s, h); const lg = g.createRadialGradient(x, y, 1, x, y, r * 3); lg.addColorStop(0, "rgba(255,240,180,0.95)"); lg.addColorStop(1, "rgba(255,180,60,0)");
      g.fillStyle = "#0a0604"; facePoly(g, [[s - r, h - r * 0.6], [s + r * 0.4, h - r], [s + r, h + r * 0.4], [s - r * 0.3, h + r]]); g.fill();
      g.fillStyle = lg; g.beginPath(); g.arc(x, y, r * 3, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    // portcullis in front: bends and sags as damage grows
    const sag = stage === 2 ? 22 : stage === 1 ? 9 : 0; const pBot = Math.max(10, 30 - sag);
    g.save(); facePoly(g, archPts()); g.clip(); g.translate(dent * 0.6, 0);
    g.strokeStyle = "#1a1a1e"; g.lineWidth = 3;
    for (let s = S0 + 6; s < S1; s += 10) { const bend = stage === 2 && Math.abs(s - SC) < 15 ? (s - SC) * 0.4 : 0; seg(g, [s, 130], [s + bend, pBot]); const [x, y] = P(s + bend, pBot); g.fillStyle = "#4a4a52"; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 0.5, y + 6); g.lineTo(x + 2, y); g.fill(); }
    g.lineWidth = 2.5; for (const h of [pBot + 14, pBot + 42, pBot + 72]) seg(g, [S0, h], [S1, h + (stage === 2 ? 4 : 0)]);
    g.restore();
    if (b.gateHitT > 0) { g.fillStyle = `rgba(255,220,150,${Math.min(0.5, b.gateHitT * 1.6)})`; facePoly(g, archPts()); g.fill(); }
  } else {
    // doors fall outwards onto the field, with a bounce
    const k = Math.min(1, b.breachT / 0.55); const th = (Math.PI / 2) * (k < 1 ? k * k : 1) - (k >= 1 ? Math.max(0, Math.sin(Math.min(1, (b.breachT - 0.55) / 0.3) * Math.PI)) * 0.08 : 0);
    const fall = (s: number, h: number): [number, number] => [FX - h * Math.sin(th) * 0.95 + LEAN * h * Math.cos(th), s - VERT * h * Math.cos(th) + h * Math.sin(th) * 0.05];
    for (const [a, z] of [[S0, SC], [SC, S1]] as const) {
      const pts: [number, number][] = [[a, 0], [a, archTop(a) - 2], [z, archTop(z) - 2], [z, 0]];
      g.fillStyle = "#4a2e18"; g.beginPath(); pts.forEach(([s, h], i) => { const [x, y] = fall(s, h); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fill();
      g.strokeStyle = "#1e1e24"; g.lineWidth = 3; for (const h of [14, 50, 86]) { const p = fall(a, h), q = fall(z, h); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }
    }
    if (b.breachT < 1.5) for (let i = 0; i < 14; i++) { const kk = (b.breachT * 1.2 + i / 14) % 1; g.fillStyle = `rgba(160,140,110,${0.5 * (1 - kk)})`; g.beginPath(); g.arc(FX - 20 - kk * 60 + Math.sin(i) * 10, SC - 40 + ((i * 23) % 90) - kk * 30, 8 + kk * 20, 0, Math.PI * 2); g.fill(); }
    // twisted portcullis bars on the ground
    g.strokeStyle = "#1a1a1e"; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(FX - 8 - i * 6, S0 + 10 + i * 18); g.lineTo(FX - 36 - i * 4, S0 + 4 + i * 20); g.stroke(); }
  }

  // boiling-oil chutes above the gate
  for (const s of [S0 + 12, S1 - 12]) {
    const [x, y] = P(s, WH - 18); g.fillStyle = "#2a2a30"; g.fillRect(x - 10, y - 4, 12, 7); g.fillStyle = "#14141a"; g.fillRect(x - 10, y + 1, 4, 2);
    if (b.oilT > 0 && stage < 3) {
      const a = Math.min(1, b.oilT * 2); g.strokeStyle = `rgba(255,170,50,${0.85 * a})`; g.lineWidth = 4 + Math.sin(time * 30) * 1;
      g.beginPath(); g.moveTo(x - 9, y + 2); g.quadraticCurveTo(x - 20, y + 30, FX - 14, s + 4); g.stroke();
      g.strokeStyle = `rgba(40,20,10,${0.6 * a})`; g.lineWidth = 1.5; g.stroke();
      for (let i = 0; i < 4; i++) { const kk = (time * 1.5 + i / 4) % 1; g.fillStyle = `rgba(220,220,220,${0.25 * (1 - kk) * a})`; g.beginPath(); g.arc(FX - 18 - kk * 10, s - kk * 30, 5 + kk * 10, 0, Math.PI * 2); g.fill(); }
    }
  }
  // hanging heraldic banners on the face
  for (const s of [SC - 200, SC + 200]) {
    if (stage >= 2 && s > SC) continue;
    const len = stage >= 1 ? 44 : 62; const sw = Math.sin(time * 1.8 + s) * 1.5;
    g.fillStyle = "#7a1414"; facePoly(g, [[s - 14, WH - 8], [s + 14, WH - 8], [s + 14 + sw, WH - 8 - len], [s + sw, WH - 16 - len], [s - 14 + sw, WH - 8 - len]]); g.fill();
    const [ex, ey] = P(s + sw * 0.5, WH - 30); g.fillStyle = "#d9b040"; g.beginPath(); g.arc(ex, ey, 4.5, 0, Math.PI * 2); g.fill();
    if (stage >= 1) for (let i = 0; i < 3; i++) { const [fx, fy] = P(s - 10 + i * 10 + sw, WH - 10 - len); flame(g, fx, fy, time + i, 5); }
  }
  // torches
  for (const s of [S0 - 22, S1 + 22]) wallTorch(g, s, time, c.glow);
  // parapet: merlons along the top front edge + defenders on the walkway
  const mode = stage >= 2 ? 2 : stage === 1 ? 1 : 0;
  const def: [number, boolean][] = [[SC - 120, false], [SC - 75, false], [SC - 30, false], [SC + 30, true], [SC + 75, false], [SC + 120, false]];
  def.forEach(([s, ban], i) => { if (stage === 3 || (mode === 2 && i % 2 && !ban)) return; const [x, y] = P(s, WH); g.save(); g.translate(x + 5, y + 2); g.scale(1.5, 1.5); defender(g, 0, 0, time, i, mode, ban); g.restore(); });
  for (let s = -20, i = 0; s < H + 160; s += 22, i++) {
    if (stage >= 1 && (i === 17 || i === 23)) continue; if (stage >= 2 && (i === 15 || i === 20 || i === 26)) continue;
    g.fillStyle = shade(c.stone, 1.1); facePoly(g, [[s, WH], [s + 13, WH], [s + 13, WH + 14], [s, WH + 14]]); g.fill();
    g.fillStyle = c.dark; const [x0, y0] = P(s + 13, WH + 14); const [x1, y1] = P(s + 13, WH); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 6, y0); g.lineTo(x1 + 6, y1); g.lineTo(x1, y1); g.fill();
    if (c.cap) { g.fillStyle = c.cap; facePoly(g, [[s, WH + 14], [s + 13, WH + 14], [s + 13, WH + 17], [s, WH + 17]]); g.fill(); }
  }
  g.fillStyle = shade(c.stone, 1.15); facePoly(g, [[-20, WH - 2], [H + 160, WH - 2], [H + 160, WH + 1], [-20, WH + 1]]); g.fill();
  // flanking round towers
  bastionTower(g, SC - 130, c, time, stage >= 2);
  bastionTower(g, SC + 130, c, time, stage >= 3);
  // falling stones while the wall cracks
  if (stage >= 1 && stage < 3) for (let i = 0; i < 3; i++) { const kk = (time * 0.6 + i / 3) % 1; const [x, y] = P(S0 - 10 + i * 50, WH - kk * WH); g.fillStyle = shade(c.stone, 0.9); g.fillRect(x - 3 - kk * 14, y, 5, 4); }
  // gate health is shown only in the top bar of the battle screen
}

function flame(g: G, x: number, y: number, t: number, s: number) {
  const f = 0.8 + Math.sin(t * 13) * 0.2;
  g.fillStyle = "#ff6a1a"; g.beginPath(); g.moveTo(x - s * 0.6, y); g.quadraticCurveTo(x, y - s * 2.4 * f, x + s * 0.6, y); g.fill();
  g.fillStyle = "#ffd040"; g.beginPath(); g.moveTo(x - s * 0.3, y); g.quadraticCurveTo(x, y - s * 1.3 * f, x + s * 0.3, y); g.fill();
}

function drawDecals(g: G, b: Battle) {
  for (const d of b.decals) {
    const a = Math.min(1, d.life / 12) * 0.75; g.save(); g.translate(d.x, d.y); g.globalAlpha = a;
    if (d.kind === "crater") { g.fillStyle = "rgba(15,10,8,0.8)"; g.beginPath(); g.ellipse(0, 0, d.size, d.size * 0.45, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = "rgba(120,100,80,0.4)"; g.lineWidth = 2; g.beginPath(); g.ellipse(0, -1, d.size * 1.05, d.size * 0.5, 0, Math.PI, 0); g.stroke(); }
    else if (d.kind === "soot") { const r = g.createRadialGradient(0, 0, 1, 0, 0, d.size); r.addColorStop(0, "rgba(10,8,6,0.8)"); r.addColorStop(1, "rgba(10,8,6,0)"); g.fillStyle = r; g.beginPath(); g.ellipse(0, 0, d.size, d.size * 0.55, 0, 0, Math.PI * 2); g.fill(); }
    else if (d.kind === "arrow") { g.rotate(d.rot); g.strokeStyle = "#6b4a2a"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -d.size); g.stroke(); g.fillStyle = "#e8d8b0"; g.fillRect(-1.5, -d.size - 2, 3, 3); }
    else if (d.kind === "slime") { g.fillStyle = "rgba(130,200,60,0.55)"; g.beginPath(); g.ellipse(0, 0, d.size, d.size * 0.4, d.rot * 0.2, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(d.size * 0.8, 2, d.size * 0.25, 0, Math.PI * 2); g.fill(); }
    else { g.fillStyle = "rgba(90,10,14,0.6)"; g.beginPath(); g.ellipse(0, 0, d.size, d.size * 0.4, d.rot * 0.2, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
}

function drawChampion(g: G, c: Champion, time: number) {
  const pal = c.kind === "paladin"; const step = Math.sin(time * 8 + c.id) * 1.5;
  g.save(); g.translate(c.x, c.y);
  const glw = g.createRadialGradient(0, -14, 2, 0, -14, 34); glw.addColorStop(0, pal ? "rgba(255,240,170,0.35)" : "rgba(255,120,80,0.25)"); glw.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = glw; g.beginPath(); g.arc(0, -14, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(0,0,0,0.45)"; g.beginPath(); g.ellipse(0, 1, 13, 4.5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#4a4e58"; g.fillRect(-5, -8, 4, 8 + step * 0.5); g.fillRect(1, -8, 4, 8 - step * 0.5);
  if (pal) { g.fillStyle = "#e8e0c8"; g.beginPath(); g.moveTo(-6, -24); g.lineTo(8, -24); g.lineTo(11, -4); g.lineTo(-9, -4); g.fill(); }
  g.fillStyle = "#b8bec8"; g.beginPath(); g.roundRect(-7, -24, 14, 17, 3); g.fill(); g.strokeStyle = "rgba(10,6,4,0.7)"; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = pal ? "#d9b040" : "#a82020"; g.fillRect(-7, -15, 14, 2);
  g.fillStyle = "#c8ccd4"; g.beginPath(); g.arc(0, -29, 6, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = "#14141a"; g.fillRect(-5, -30, 7, 1.6);
  if (!pal) { g.fillStyle = "#c01818"; g.beginPath(); g.moveTo(0, -35); g.quadraticCurveTo(8, -44, 12, -36); g.quadraticCurveTo(6, -38, 1, -33); g.fill(); }
  else { g.fillStyle = "#ffe9a0"; g.globalAlpha = 0.6 + Math.sin(time * 4) * 0.2; g.beginPath(); g.ellipse(0, -37, 7, 2, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  // shield facing the horde (left)
  g.fillStyle = pal ? "#e8e0c8" : "#7a1414"; g.beginPath(); g.moveTo(-15, -24); g.lineTo(-5, -24); g.lineTo(-5, -12); g.quadraticCurveTo(-10, -4, -15, -12); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#d9b040"; g.fillRect(-11, -22, 2, 12); g.fillRect(-14, -18, 8, 2);
  // sword
  g.save(); g.translate(7, -18); g.rotate(-0.6 - (c.swing > 0 ? Math.sin((c.swing / 0.25) * Math.PI) * 1.8 : 0) * -1); g.fillStyle = "#e0e4ea"; g.fillRect(-1.2, -20, 2.4, 20); g.fillStyle = "#d9b040"; g.fillRect(-4, -1, 8, 2); g.restore();
  g.restore();
  bar(g, c.x, c.y - 48, 30, c.hp / c.maxHp, "#e8b53a");
}

function drawCorpse(g: G, c: Corpse) {
  g.save(); g.translate(c.x, c.y - c.z); g.globalAlpha = Math.min(1, c.life * 2); g.rotate(c.rot);
  drawCreature(g, c.kind, 0, false, c.lvl);
  g.restore(); g.globalAlpha = 1;
}

export interface Aim { x: number; y: number; kind: "tower" | "area" }
/** Tower under the pointer (world coords), used to highlight its attack radius. */
export function towerAt(b: Battle, x: number, y: number) { return b.towers.find((t) => t.alive && !t.building && Math.hypot(t.x - x, t.y - 10 - y) < 30) ?? null; }
/** Visual comfort options set from player settings. */
export const RENDER = { shake: 1, particles: 1, numbers: true, marks: true, ambient: true, ranges: true };

export function renderBattle(g: G, b: Battle, aim: Aim | null = null, hover: { x: number; y: number } | null = null, danger = false) {
  const bg = buildBg(b);
  g.save();
  if (b.shake > 0 && RENDER.shake > 0) { const k = b.shake * 2 * RENDER.shake; g.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k); }
  g.drawImage(bg, -BX, -BY);
  if (RENDER.ranges) for (const t of b.towers) if (t.alive && !t.building) { g.fillStyle = "rgba(255,70,50,0.05)"; g.strokeStyle = "rgba(255,90,60,0.32)"; g.lineWidth = 1.5; g.beginPath(); g.arc(t.x, t.y, TOWERS[t.kind].range * towerScale(t.lvl).range, 0, Math.PI * 2); g.fill(); g.stroke(); }
  const ht = hover && !aim ? towerAt(b, hover.x, hover.y) : null;
  if (ht) {
    const r = TOWERS[ht.kind].range * towerScale(ht.lvl).range;
    g.fillStyle = "rgba(255,70,50,0.12)"; g.strokeStyle = "rgba(255,120,90,0.75)"; g.lineWidth = 2; g.setLineDash([8, 6]);
    g.beginPath(); g.arc(ht.x, ht.y, r, 0, Math.PI * 2); g.fill(); g.stroke(); g.setLineDash([]);
  }
  drawDecals(g, b);
  drawObstacles(g, b);
  drawTars(g, b);
  if (danger) drawDanger(g, b);
  drawGate(g, b, b.time);
  const ents: { y: number; draw: () => void }[] = [];
  for (const t of b.towers) ents.push({ y: t.y, draw: () => drawTower(g, t, b.time) });
  for (const u of b.units) ents.push({ y: u.y + (FLOATERS.has(u.kind) ? 60 : 0), draw: () => drawUnit(g, u, b.time) });
  for (const c of b.champs) ents.push({ y: c.y, draw: () => drawChampion(g, c, b.time) });
  for (const c of b.corpses) ents.push({ y: c.y, draw: () => drawCorpse(g, c) });
  ents.sort((a, c) => a.y - c.y).forEach((e) => e.draw());
  drawGarrisonFx(g, b);
  for (const p of b.projs) {
    if (p.kind === "arrow") { const a = Math.atan2(p.ty - p.y, p.tx - p.x); g.strokeStyle = p.lvl >= 3 ? "#ff9a3a" : "#e8d8b0"; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - Math.cos(a) * 12, p.y - Math.sin(a) * 12); g.stroke(); }
    else if (p.kind === "rock") { const fg = g.createRadialGradient(p.x, p.y, 1, p.x, p.y, 12); fg.addColorStop(0, "rgba(255,220,120,0.9)"); fg.addColorStop(1, "rgba(255,90,20,0)"); g.fillStyle = fg; g.beginPath(); g.arc(p.x, p.y, 12, 0, Math.PI * 2); g.fill(); g.fillStyle = "#3a2a1a"; g.beginPath(); g.arc(p.x, p.y, 5, 0, Math.PI * 2); g.fill(); }
    else { g.fillStyle = "#111"; g.beginPath(); g.arc(p.x, p.y, p.kind === "mini" ? 3.5 : 6, 0, Math.PI * 2); g.fill(); }
  }
  for (const be of b.beams) {
    g.strokeStyle = be.color; g.globalAlpha = Math.min(1, be.life * 4); g.lineWidth = 3;
    if (be.x1 === be.x2 && be.y1 === be.y2) { g.lineWidth = 2; g.beginPath(); g.arc(be.x1, be.y1, Math.max(1, (0.6 - be.life) * 220), 0, Math.PI * 2); g.stroke(); }
    else { g.beginPath(); g.moveTo(be.x1, be.y1); if (be.jag) for (let i = 1; i < 6; i++) { const k = i / 6; g.lineTo(be.x1 + (be.x2 - be.x1) * k + (Math.random() - 0.5) * 14, be.y1 + (be.y2 - be.y1) * k + (Math.random() - 0.5) * 14); } g.lineTo(be.x2, be.y2); g.stroke(); }
    g.globalAlpha = 1;
  }
  // faint aim thread from heavy towers
  for (const t of b.towers) {
    const u = t.aim; if (!t.alive || !u || u.dead || u.hp <= 0 || (t.kind !== "cannon" && t.kind !== "ballista") || Math.hypot(u.x - t.x, u.y - t.y) > TOWERS[t.kind].range * towerScale(t.lvl).range) continue;
    const sy = t.y - (t.kind === "cannon" ? 34 : 26);
    g.save(); g.strokeStyle = "rgba(255,70,50,0.28)"; g.lineWidth = 1.2; g.setLineDash([6, 8]); g.lineDashOffset = -b.time * 50; g.beginPath(); g.moveTo(t.x, sy); g.lineTo(u.x, u.y - 8); g.stroke(); g.restore();
  }
  g.globalCompositeOperation = "lighter";
  const pstep = RENDER.particles < 1 ? Math.round(1 / RENDER.particles) : 1;
  for (let pi = 0; pi < b.parts.length; pi += pstep) { const p = b.parts[pi]!; g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.color; g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  if (RENDER.ambient) ambient(g, b.theme, b.time);
  g.textAlign = "center"; g.font = "15px 'Russo One', sans-serif";
  for (const t of b.texts) { g.globalAlpha = Math.min(1, t.life); g.fillStyle = "#000"; g.fillText(t.text, t.x + 1, t.y + 1); g.fillStyle = t.color; g.fillText(t.text, t.x, t.y); }
  g.globalAlpha = 1;
  if (RENDER.marks) { drawTargetTags(g, b); drawMark(g, b); }
  drawStance(g, b);
  if (RENDER.numbers) drawNums(g, b);
  drawSuperWarn(g, b);
  drawSplinters(g, b);
  drawOrbs(g, b);
  if (b.marchT > 0) { g.fillStyle = `rgba(200,30,20,${0.12 * (b.marchT / 3)})`; g.fillRect(0, 0, W, H); }
  if (b.smoke) { const a = Math.min(1, b.smoke.t) * 0.7; for (let i = 0; i < 9; i++) { const ang = i * 0.7 + b.time * 0.3; const rx = b.smoke.x + Math.cos(ang) * 60 * ((i % 3) / 2), ry = b.smoke.y + Math.sin(ang) * 36 * ((i % 3) / 2); const r = 50 + (i % 3) * 14; const sg = g.createRadialGradient(rx, ry, 4, rx, ry, r); sg.addColorStop(0, `rgba(90,86,96,${a})`); sg.addColorStop(1, "rgba(90,86,96,0)"); g.fillStyle = sg; g.beginPath(); g.arc(rx, ry, r, 0, Math.PI * 2); g.fill(); } }
  if (b.berserkT > 0) { g.fillStyle = `rgba(220,20,10,${0.14 * Math.min(1, b.berserkT)})`; g.fillRect(0, 0, W, H); }
  if (aim) {
    g.save(); g.setLineDash([8, 6]); g.lineWidth = 2;
    if (aim.kind === "area") { g.strokeStyle = "rgba(200,190,220,0.9)"; g.beginPath(); g.arc(aim.x, aim.y, 120, 0, Math.PI * 2); g.stroke(); }
    else { const t = b.towers.filter((t) => t.alive && Math.hypot(t.x - aim.x, t.y - aim.y) < 90).sort((a, c) => Math.hypot(a.x - aim.x, a.y - aim.y) - Math.hypot(c.x - aim.x, c.y - aim.y))[0]; g.strokeStyle = t ? "rgba(255,70,50,0.95)" : "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(t ? t.x : aim.x, (t ? t.y : aim.y) - 20, t ? 40 : 24, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }
  if (b.darkT > 0) { g.fillStyle = `rgba(10,0,20,${0.35 * Math.min(1, b.darkT)})`; g.fillRect(0, 0, W, H); }
  g.restore();
}

const NUM_STYLE = {
  hit: { fill: ["#ffffff", "#d9d2c4"], size: 15, glow: "rgba(0,0,0,0)" },
  big: { fill: ["#fff3b0", "#ffb020"], size: 24, glow: "rgba(255,180,40,0.85)" },
  heal: { fill: ["#d8ffd0", "#5fe070"], size: 15, glow: "rgba(90,230,110,0.6)" },
  gate: { fill: ["#ffe0a0", "#ff4a1a"], size: 20, glow: "rgba(255,70,20,0.8)" },
} as const;
/** floating combat numbers: pop-in scale, arc, outline and fade */
function drawNums(g: G, b: Battle) {
  g.save(); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  for (const n of b.nums) {
    const st = NUM_STYLE[n.kind]; const age = n.max - n.life; const pop = age < 0.12 ? 0.6 + (age / 0.12) * 0.7 : age < 0.24 ? 1.3 - ((age - 0.12) / 0.12) * 0.3 : 1;
    const sz = st.size * pop * (n.kind === "hit" ? Math.min(1.25, 0.85 + n.v / 400) : 1);
    g.globalAlpha = Math.min(1, n.life / 0.35); g.font = `${Math.round(sz)}px 'Russo One', sans-serif`;
    const label = (n.kind === "heal" ? "+" : "-") + Math.round(n.v);
    const gr = g.createLinearGradient(0, n.y - sz / 2, 0, n.y + sz / 2); gr.addColorStop(0, st.fill[0]); gr.addColorStop(1, st.fill[1]);
    g.shadowColor = st.glow; g.shadowBlur = n.kind === "hit" ? 0 : 12;
    g.lineWidth = n.kind === "hit" ? 3 : 4; g.strokeStyle = "rgba(20,8,6,0.9)"; g.strokeText(label, n.x, n.y);
    g.shadowBlur = 0; g.fillStyle = gr; g.fillText(label, n.x, n.y);
  }
  g.restore(); g.globalAlpha = 1;
}

/** «ЦЕЛЬ» tag over every monster a tower is shooting at; counts towers, flashes before heavy shots */
function drawTargetTags(g: G, b: Battle) {
  const m = new Map<Battle["units"][number], { n: number; hot: number }>();
  for (const t of b.towers) {
    const u = t.aim; if (!t.alive || !u || u.dead || u.hp <= 0 || t.disabled || t.frozenT > 0 || t.blindT > 0) continue;
    if (Math.hypot(u.x - t.x, u.y - t.y) > TOWERS[t.kind].range * towerScale(t.lvl).range + 10) continue;
    const e = m.get(u) ?? { n: 0, hot: 0 }; e.n++;
    if (t.kind === "cannon" || t.kind === "ballista") { const rate = TOWERS[t.kind].rate * towerScale(t.lvl).rate; e.hot = Math.max(e.hot, 1 - Math.max(0, Math.min(1, t.cd / rate))); }
    m.set(u, e);
  }
  g.save(); g.textAlign = "center"; g.textBaseline = "middle"; g.font = "10px 'Russo One', sans-serif";
  for (const [u, e] of m) {
    const def = MONSTERS[u.kind]; const bob = Math.sin(b.time * 5 + u.id) * 1.5;
    const x = u.x, y = u.y - def.radius * 1.5 - 24 - (FLOATERS.has(u.kind) ? 30 : 0) + bob;
    const label = e.n > 1 ? `ЦЕЛЬ ×${e.n}` : "ЦЕЛЬ"; const w = g.measureText(label).width + 24, h = 15;
    const hot = e.hot > 0.75 ? (e.hot - 0.75) / 0.25 : 0; const pulse = 0.75 + Math.sin(b.time * 8 + u.id) * 0.25;
    g.shadowColor = "rgba(255,40,30,0.9)"; g.shadowBlur = 6 + hot * 12;
    g.fillStyle = `rgba(${150 + hot * 80},${18 + hot * 30},20,0.92)`; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 7); g.fill();
    g.shadowBlur = 0; g.strokeStyle = `rgba(255,${170 + hot * 70},${120 + hot * 100},${pulse})`; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = `rgba(150,20,20,0.92)`; g.beginPath(); g.moveTo(x - 4, y + h / 2); g.lineTo(x + 4, y + h / 2); g.lineTo(x, y + h / 2 + 5); g.fill();
    const cx = x - w / 2 + 9; g.strokeStyle = "#ffe0d0"; g.lineWidth = 1.3; g.beginPath(); g.arc(cx, y, 3.5, 0, Math.PI * 2); g.moveTo(cx - 6, y); g.lineTo(cx - 2, y); g.moveTo(cx + 2, y); g.lineTo(cx + 6, y); g.moveTo(cx, y - 6); g.lineTo(cx, y - 2); g.moveTo(cx, y + 2); g.lineTo(cx, y + 6); g.stroke();
    g.fillStyle = "#fff2ea"; g.fillText(label, x + 6, y + 0.5);
  }
  g.restore();
}

/** 1.5 s warning before a tower's super volley: shrinking red-gold ring and crackling sparks */
function drawSuperWarn(g: G, b: Battle) {
  for (const t of b.towers) {
    if (!t.alive || t.superT <= 0) continue;
    const k = Math.max(0, Math.min(1, t.superT / 1.5)); const blink = 0.55 + Math.sin(b.time * 26) * 0.45;
    g.save(); g.translate(t.x, t.y - 22);
    g.strokeStyle = `rgba(255,70,40,${0.35 + blink * 0.5})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 30 + k * 40, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255,225,140,0.95)"; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255,240,190,0.8)"; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const a = b.time * 9 + i * 2.1; g.beginPath(); let x = Math.cos(a) * 18, y = Math.sin(a) * 18; g.moveTo(x, y); for (let j = 0; j < 3; j++) { x += Math.cos(a) * 8 + (Math.random() - 0.5) * 10; y += Math.sin(a) * 8 + (Math.random() - 0.5) * 10; g.lineTo(x, y); } g.stroke(); }
    g.font = "bold 13px 'Russo One', sans-serif"; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText("!", 1, -44); g.fillStyle = `rgba(255,90,60,${0.6 + blink * 0.4})`; g.fillText("!", 0, -45);
    g.restore();
  }
}
/** wooden splinters knocked off the gate */
function drawSplinters(g: G, b: Battle) {
  for (const p of b.splinters) {
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, p.life * 2);
    g.fillStyle = "#6b4a2a"; g.fillRect(-p.len / 2, -1.5, p.len, 3); g.fillStyle = "#a07a4a"; g.fillRect(-p.len / 2, -1.5, p.len, 1);
    g.restore();
  }
  g.globalAlpha = 1;
}
/** essence orbs: burst out of tower ruins and fly to the essence bar (top bar) */
function drawOrbs(g: G, b: Battle) {
  g.save(); g.globalCompositeOperation = "lighter";
  for (const o of b.orbs) {
    const k = Math.min(1, o.t / 1.1), e = k * k * (3 - 2 * k);
    const tx = 300, ty = -50; const mx = (o.x + tx) / 2, my = o.y - 140;
    const x = (1 - e) * (1 - e) * o.x + 2 * (1 - e) * e * mx + e * e * tx, y = (1 - e) * (1 - e) * o.y + 2 * (1 - e) * e * my + e * e * ty;
    const r = 14 * (1 - k * 0.5); const gr = g.createRadialGradient(x, y, 1, x, y, r * 2.2);
    gr.addColorStop(0, "rgba(240,220,255,1)"); gr.addColorStop(0.35, "rgba(170,100,255,0.85)"); gr.addColorStop(1, "rgba(120,40,220,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.2, 0, Math.PI * 2); g.fill();
    for (let i = 1; i <= 4; i++) { const ke = Math.max(0, e - i * 0.04); const px = (1 - ke) * (1 - ke) * o.x + 2 * (1 - ke) * ke * mx + ke * ke * tx, py = (1 - ke) * (1 - ke) * o.y + 2 * (1 - ke) * ke * my + ke * ke * ty; g.fillStyle = `rgba(170,110,255,${0.4 - i * 0.08})`; g.beginPath(); g.arc(px, py, r * (1 - i * 0.15), 0, Math.PI * 2); g.fill(); }
    if (k < 0.45) { g.globalCompositeOperation = "source-over"; g.font = "bold 18px 'Russo One', sans-serif"; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText(`+${o.v}`, o.x + 1, o.y - 30 - k * 60 + 1); g.fillStyle = "#d8b0ff"; g.fillText(`+${o.v}`, o.x, o.y - 30 - k * 60); g.globalCompositeOperation = "lighter"; }
  }
  g.restore();
}

/** Road barricades (sharpened logs across the road) and a ruined wall that shields monsters from arrows. */
function drawObstacles(g: G, b: Battle) {
  for (const o of b.obstacles) {
    g.save(); g.translate(o.x, o.y);
    if (o.kind === "cover") {
      g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(0, 10, 46, 12, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(140,200,255,0.18)"; g.setLineDash([4, 6]); g.beginPath(); g.arc(0, 0, ADAPT.cover.radius, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      const blocks: [number, number, number, number][] = [[-38, -8, 22, 18], [-16, -22, 20, 32], [4, -14, 18, 24], [22, -4, 16, 14], [-26, -26, 12, 10]];
      for (const [x, y, w, h] of blocks) { g.fillStyle = "#6f6a62"; g.fillRect(x, y, w, h); g.fillStyle = "#8d877c"; g.fillRect(x, y, w, 4); g.strokeStyle = "#3e3a35"; g.lineWidth = 1; g.strokeRect(x, y, w, h); }
      g.fillStyle = "#4f6b3a"; g.beginPath(); g.ellipse(-20, 10, 12, 4, 0, 0, Math.PI * 2); g.ellipse(18, 10, 9, 3, 0, 0, Math.PI * 2); g.fill();
      g.font = "10px 'Russo One', sans-serif"; g.textAlign = "center"; g.fillStyle = "rgba(190,225,255,0.8)"; g.fillText("🛡 укрытие", 0, -34);
    } else if (o.hp > 0) {
      g.rotate(o.ang + Math.PI / 2); const shake = o.hitT > 0 ? (Math.random() - 0.5) * 3 : 0; g.translate(shake, 0);
      g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(0, 6, 40, 9, 0, 0, Math.PI * 2); g.fill();
      for (let i = -3; i <= 3; i++) {
        const x = i * 11; g.save(); g.translate(x, 0); g.rotate(i % 2 ? 0.35 : -0.35);
        g.fillStyle = o.hitT > 0 ? "#c09060" : "#7a5430"; g.fillRect(-3.5, -20, 7, 30);
        g.fillStyle = "#d8c49a"; g.beginPath(); g.moveTo(-3.5, -20); g.lineTo(0, -28); g.lineTo(3.5, -20); g.fill(); g.restore();
      }
      g.fillStyle = "#5a3c20"; g.fillRect(-38, -4, 76, 6); g.strokeStyle = "#2a1a0e"; g.lineWidth = 1.5; g.strokeRect(-38, -4, 76, 6);
      g.rotate(-(o.ang + Math.PI / 2));
      const k = o.hp / o.maxHp; g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(-24, -44, 48, 6); g.fillStyle = "#e8a040"; g.fillRect(-23, -43, 46 * k, 4);
    } else {
      g.rotate(o.ang + Math.PI / 2); g.fillStyle = "rgba(70,45,25,0.7)";
      for (let i = -3; i <= 3; i++) { g.save(); g.translate(i * 12, 4 + (i % 2) * 4); g.rotate(1.2 + i * 0.4); g.fillRect(-3, -8, 6, 16); g.restore(); }
    }
    g.restore();
  }
}
/** Spotter mark: rotating red crosshair over the unit the garrison focuses. */
function drawMark(g: G, b: Battle) {
  const u = b.mark.u; if (!u || u.dead || b.mark.t <= 0) return;
  const r = MONSTERS[u.kind].radius + 14 + Math.sin(b.time * 6) * 2; const y = u.y - (FLOATERS.has(u.kind) ? 30 : 0);
  g.save(); g.translate(u.x, y); g.rotate(b.time * 1.5); g.strokeStyle = `rgba(255,60,40,${0.5 + 0.4 * Math.min(1, b.mark.t)})`; g.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(0, 0, r, i * Math.PI / 2 + 0.25, i * Math.PI / 2 + 1.3); g.stroke(); g.beginPath(); g.moveTo(r - 5, 0); g.lineTo(r + 7, 0); g.stroke(); g.rotate(Math.PI / 2); }
  g.restore();
}
/** Garrison stance plaque above the gate. */
function drawStance(g: G, b: Battle) {
  const st = b.stance; const x = GATE.x - 60, y = GATE.y - 250; const label = `Гарнизон: ${STANCE_NAME[st]}`;
  g.save(); g.font = "11px 'Russo One', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  const w = g.measureText(label).width + 22; const hot = st !== "steady"; const pulse = hot ? 0.6 + Math.sin(b.time * 7) * 0.4 : 1;
  g.fillStyle = st === "panic" ? "rgba(30,60,90,0.9)" : st === "fury" ? "rgba(120,20,15,0.92)" : "rgba(30,24,20,0.82)";
  g.beginPath(); g.roundRect(x - w / 2, y - 10, w, 20, 6); g.fill();
  g.strokeStyle = st === "panic" ? `rgba(160,220,255,${pulse})` : st === "fury" ? `rgba(255,120,80,${pulse})` : "rgba(200,170,110,0.6)"; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = "#f2e6d0"; g.fillText(label, x, y + 0.5); g.restore();
}

/** Tar puddles on the road; burning ones glow and flicker. */
function drawTars(g: G, b: Battle) {
  for (const tr of b.tars) {
    const a = Math.min(1, tr.t); const r = ADAPT.tar.radius;
    g.save(); g.globalAlpha = 0.85 * a; g.translate(tr.x, tr.y); g.scale(1, 0.55);
    const tg = g.createRadialGradient(0, 0, 4, 0, 0, r); tg.addColorStop(0, "#120c06"); tg.addColorStop(0.75, "#2a1d10"); tg.addColorStop(1, "rgba(42,29,16,0)");
    g.fillStyle = tg; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,240,200,0.12)"; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.25, r * 0.25, r * 0.1, -0.3, 0, Math.PI * 2); g.fill();
    if (tr.fire > 0) { const f = 0.55 + Math.sin(b.time * 18) * 0.15; const fg = g.createRadialGradient(0, 0, 4, 0, 0, r * 1.1); fg.addColorStop(0, `rgba(255,200,80,${f})`); fg.addColorStop(1, "rgba(255,80,20,0)"); g.globalCompositeOperation = "lighter"; g.fillStyle = fg; g.beginPath(); g.arc(0, 0, r * 1.1, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
}
/** Summon button held: towers that cover the entry or the current front line glow red. */
function drawDanger(g: G, b: Battle) {
  const front = b.units.reduce((m, u) => (!u.dead && !MONSTERS[u.kind].flying ? Math.max(m, u.d) : m), 0);
  const pts: [number, number][] = []; for (let d = 0; d <= Math.max(b.path.len * 0.3, front + 60); d += 24) { const [x, y] = b.path.posAt(Math.min(d, b.path.len)); pts.push([x, y]); }
  g.save();
  for (const t of b.towers) {
    if (!t.alive || t.building || t.kind === "bell") continue; const r = TOWERS[t.kind].range * towerScale(t.lvl).range;
    if (!pts.some(([x, y]) => Math.hypot(x - t.x, y - t.y) < r)) continue;
    const pulse = 0.5 + Math.sin(b.time * 6) * 0.2;
    g.fillStyle = `rgba(255,50,40,${0.1 * pulse + 0.06})`; g.strokeStyle = `rgba(255,90,70,${pulse})`; g.lineWidth = 2.5; g.setLineDash([10, 6]); g.lineDashOffset = -b.time * 30;
    g.beginPath(); g.arc(t.x, t.y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  g.setLineDash([]); g.restore();
}
/** Aegis bubbles, the stone-drop shadow, "in cover" shields and breakthrough-wave trails. */
function drawGarrisonFx(g: G, b: Battle) {
  g.save();
  for (const t of b.towers) if (t.alive && t.aegis > 0) {
    const r = 34 + Math.sin(b.time * 4 + t.id) * 2; const ag = g.createRadialGradient(t.x, t.y - 30, r * 0.5, t.x, t.y - 30, r);
    ag.addColorStop(0, "rgba(160,215,255,0)"); ag.addColorStop(0.85, "rgba(160,215,255,0.22)"); ag.addColorStop(1, "rgba(200,235,255,0.7)");
    g.fillStyle = ag; g.beginPath(); g.arc(t.x, t.y - 30, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(200,235,255,0.6)"; g.lineWidth = 1.2; g.beginPath(); g.arc(t.x, t.y - 30, r, b.time * 2, b.time * 2 + 1.4); g.stroke();
  }
  if (b.stone) {
    const k = 1 - Math.max(0, b.stone.t) / ADAPT.stones.warn; const r = ADAPT.stones.radius;
    g.fillStyle = `rgba(0,0,0,${0.15 + 0.35 * k})`; g.beginPath(); g.ellipse(b.stone.x, b.stone.y, r * (0.4 + 0.6 * k), r * 0.45 * (0.4 + 0.6 * k), 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(255,120,80,${0.4 + 0.5 * k})`; g.lineWidth = 2; g.beginPath(); g.ellipse(b.stone.x, b.stone.y, r, r * 0.45, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#6b5a44"; g.beginPath(); g.arc(b.stone.x, b.stone.y - 220 * (1 - k) - 10, 9, 0, Math.PI * 2); g.fill();
  }
  for (const u of b.units) {
    if (u.dead) continue; const hy = u.y - u.radius - (FLOATERS.has(u.kind) ? 58 : 30);
    if (inCover(b, u)) {
      const x = u.x + u.radius + 4, y = hy + 6;
      g.fillStyle = "rgba(120,190,255,0.9)"; g.strokeStyle = "rgba(10,20,30,0.9)"; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y - 4); g.lineTo(x + 4.5, y + 2); g.lineTo(x, y + 6); g.lineTo(x - 4.5, y + 2); g.lineTo(x - 5, y - 4); g.closePath(); g.fill(); g.stroke();
    }
    if (u.rushT > 0 && Math.random() < 0.5) { g.fillStyle = "rgba(255,207,90,0.5)"; g.fillRect(u.x - u.radius - 8 - Math.random() * 10, u.y - 6 + (Math.random() - 0.5) * 10, 8, 2); }
    if (u.nolsT > 0 && MONSTERS[u.kind].lifesteal) { g.strokeStyle = "rgba(255,90,70,0.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(u.x - 6, hy - 6); g.lineTo(u.x + 6, hy + 6); g.moveTo(u.x + 6, hy - 6); g.lineTo(u.x - 6, hy + 6); g.stroke(); }
  }
  g.restore();
}
