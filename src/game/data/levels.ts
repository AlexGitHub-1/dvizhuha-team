import type { TowerKind } from "./towers";
import { LOCATIONS, towerPool, type Theme } from "./locations";

export interface MapDef { name: string; path: [number, number][]; theme: Theme }

export interface LevelDef {
  id: number; name: string; map: number; loc: number; boss: boolean; gateHp: number; towers: TowerKind[]; emptySlots: number;
  towerMul: number; upgradeEvery: number; buildEvery: number; buildKinds: TowerKind[]; repair: boolean;
  timeLimit: number; essenceRate: number; gold: number;
  /** number of towers that start at level 3 (boss levels) */
  elite: number;
}

const NAMES = [
  "Первая кровь", "Дозорные огни", "Кладбище рыцарей", "Склеп Стража",
  "Замёрзший брод", "Ледяные зубья", "Перевал Шторма", "Ледяная крепость",
  "Гнилая гать", "Грибной омут", "Чумной хутор", "Трясина Ведьмы",
  "Шепчущая чаща", "Поляна светлячков", "Кольцо друидов", "Храм Колокола",
  "Пепельный тракт", "Лавовые копи", "Наковальня", "Горн Королей",
  "Предместья", "Ров и решётки", "Королевская стража", "Падение Цитадели",
];

function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

export type RoadShape = "serpent" | "hairpin" | "gorge" | "terraces" | "encircle" | "encircleLow";
/** Tactical road shape per level (loc by loc; bosses get the trickiest). */
export const ROAD_SHAPES: RoadShape[] = [
  "serpent", "serpent", "hairpin", "encircle",
  "terraces", "serpent", "gorge", "encircleLow",
  "gorge", "hairpin", "terraces", "encircle",
  "serpent", "encircleLow", "terraces", "hairpin",
  "gorge", "terraces", "hairpin", "encircle",
  "serpent", "gorge", "terraces", "encircleLow",
];
const END: [number, number][] = [[1075, 380], [1150, 380]];
type R = () => number;
const j = (r: R, a: number) => Math.round((r() - 0.5) * 2 * a);
const SHAPES: Record<RoadShape, (r: R) => [number, number][]> = {
  /** wide S-curves: many corners, long exposure */
  serpent: (r) => {
    const n = 4 + Math.floor(r() * 2); let top = r() < 0.5; const pts: [number, number][] = [[-30, top ? 150 : 600]];
    for (let i = 1; i <= n; i++) { top = !top; pts.push([Math.round(80 + (i / (n + 1)) * 920 + j(r, 25)), top ? 130 + j(r, 30) : 610 + j(r, 30)]); }
    return [...pts, ...END];
  },
  /** long sprint along one edge, then a sharp switch-back zone near the gate */
  hairpin: (r) => { const lo = r() < 0.5; const f = (y: number) => (lo ? y : 760 - y);
    return [[-30, f(620)], [740 + j(r, 30), f(620 + j(r, 15))], [880 + j(r, 20), f(500)], [560 + j(r, 30), f(300)], [300 + j(r, 30), f(140)], [700 + j(r, 30), f(110)], [930 + j(r, 15), f(210)], ...END]; },
  /** tight wiggles through the middle: short exposure, towers bunched */
  gorge: (r) => { const pts: [number, number][] = [[-30, 380 + j(r, 30)]]; const n = 5; const a = 85 + r() * 25; let up = r() < 0.5;
    for (let i = 1; i <= n; i++) { up = !up; pts.push([Math.round((i / (n + 1)) * 1040), Math.round(380 + (up ? -a : a) + j(r, 15))]); } return [...pts, ...END]; },
  /** flat steps with short ramps between three heights */
  terraces: (r) => { const lv = [140, 380, 620]; let k = Math.floor(r() * 3); const pts: [number, number][] = [[-30, lv[k]!]]; let x = 120 + j(r, 30);
    while (x < 900) { pts.push([x, lv[k]!]); const nk = k === 1 ? (r() < 0.5 ? 0 : 2) : 1; x += 70; k = nk; pts.push([x, lv[k]!]); x += 150 + Math.round(r() * 60); }
    return [...pts, ...END]; },
  /** enter low, climb the left side, wrap over the top around a central hill */
  encircle: (r) => [[-30, 610 + j(r, 20)], [250 + j(r, 25), 620], [190 + j(r, 25), 170 + j(r, 20)], [560 + j(r, 30), 100 + j(r, 15)], [900 + j(r, 20), 170 + j(r, 20)], [960, 380], ...END],
  /** enter high, wrap under the hill */
  encircleLow: (r) => [[-30, 140 + j(r, 20)], [250 + j(r, 25), 130], [190 + j(r, 25), 580 + j(r, 20)], [560 + j(r, 30), 650 + j(r, 10)], [900 + j(r, 20), 590 + j(r, 20)], [960, 380], ...END],
};

function segDist(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
  const cr = (o: [number, number], p: [number, number], q: [number, number]) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  if (cr(a, b, c) * cr(a, b, d) < 0 && cr(c, d, a) * cr(c, d, b) < 0) return 0;
  const pd = (p: [number, number], s: [number, number], e: [number, number]) => { const dx = e[0] - s[0], dy = e[1] - s[1], l = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / l)); return Math.hypot(p[0] - s[0] - dx * t, p[1] - s[1] - dy * t); };
  return Math.min(pd(a, c, d), pd(b, c, d), pd(c, a, b), pd(d, a, b));
}
export const ROAD_GAP = 100;
/** Problems that make a road unfair or ugly: overlapping sections, leaving the field. Empty = OK. */
export function roadProblems(pts: [number, number][]): string[] {
  const out: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = i + 2; k < pts.length - 1; k++) {
    const d = segDist(pts[i]!, pts[i + 1]!, pts[k]!, pts[k + 1]!); if (d < ROAD_GAP) out.push(`sections ${i} and ${k} are ${Math.round(d)}px apart`);
  }
  pts.forEach(([x, y], i) => { if (i > 0 && i < pts.length - 2 && (x < 40 || x > 1040 || y < 90 || y > 670)) out.push(`point ${i} off field`); });
  return out;
}
export function roadLength(pts: [number, number][]) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]); return l; }
function makeRoad(i: number): [number, number][] {
  const shape = SHAPES[ROAD_SHAPES[i]!];
  for (let a = 0; a < 60; a++) { const pts = shape(rng(i * 7919 + 13 + a * 101)); if (!roadProblems(pts).length && roadLength(pts) < 2900) return pts; }
  return shape(() => 0.5);
}

export const MAPS: MapDef[] = NAMES.map((name, i) => ({ name, theme: LOCATIONS[Math.floor(i / 4)]!.theme, path: makeRoad(i) }));

/** Tower strength per level: bot with the REC_TIER squad (no talents, smart towers on) wins 4 of 10 seeds (bosses 3 of 10), region puzzle on. */
const TOWER_MUL_BOT = [1.281, 1.406, 1.078, 1.016, 1.063, 1.375, 1.750, 1.813, 0.984, 0.938, 1.313, 1.172, 1.484, 2.438, 2.000, 1.078, 2.625, 2.297, 2.750, 2.375, 1.297, 1.219, 0.859, 0.953];
/** Real players play better than the bot (spell timing, tank + damage combos): regions III–V get this extra edge; I–II stay gentle and VI is already at the edge of the best squad. */
export const HUMAN_EDGE = 1.1;
const TOWER_MUL = TOWER_MUL_BOT.map((m, i) => +(m * (i >= 8 && i < 20 ? HUMAN_EDGE : 1)).toFixed(3));
/** Squad the level is calibrated against (rarity + level of all 5 fighters); same bot run as TOWER_MUL_BOT. */
export const REC_TIER: { rarity: "common" | "rare" | "epic"; lvl: number }[] = ["c2","c3","c3","c4","c4","c5","c5","c6","r4","r5","r6","r6","r7","r8","r8","e6","e7","e8","e9","e9","e10","e10","e10","e10"]
  .map((t) => ({ rarity: (({ c: "common", r: "rare", e: "epic" }) as const)[t[0] as "c" | "r" | "e"], lvl: +t.slice(1) }));
export const RECOMMENDED_LVL = REC_TIER.map((t) => t.lvl);
const TIER_NAME = { common: "обычные", rare: "редкие", epic: "эпические" } as const;
export const recLabel = (levelId: number) => { const t = REC_TIER[levelId - 1]!; return `${TIER_NAME[t.rarity]} ур. ${t.lvl}`; };

function buildLevel(i: number): LevelDef {
  const loc = Math.floor(i / 4), j = i % 4, boss = j === 3;
  const r = rng(i * 104729 + 7);
  const pool = towerPool(loc);
  const fresh = LOCATIONS[loc]!.newTower;
  const count = Math.min(13, 6 + Math.floor(i / 2.5));
  const towers: TowerKind[] = [];
  for (let k = 0; k < count; k++) {
    if (fresh && (k % 3 === 1 || (j >= 2 && k % 4 === 2))) towers.push(fresh);
    else towers.push(pool[Math.floor(r() * pool.length)]!);
  }
  if (i === 0) towers.splice(0, towers.length, "archer", "cannon", "archer", "mage", "archer", "cannon");
  return {
    id: i + 1, name: NAMES[i]!, map: i, loc, boss,
    gateHp: Math.round(((1200 + i * 170) * (boss ? 1.15 : 1)) / 50) * 50,
    towers, emptySlots: Math.min(3, Math.floor(i / 3)),
    towerMul: TOWER_MUL[i]!,
    upgradeEvery: i === 0 ? 0 : Math.max(9, Math.round(22 - i * 0.55)),
    buildEvery: i < 2 ? 0 : Math.max(16, Math.round(40 - i)),
    buildKinds: i < 2 ? [] : pool.slice(-3),
    repair: i >= 4,
    timeLimit: 180 + loc * 8,
    essenceRate: +(18 + i * 0.28).toFixed(1),
    gold: 110 + i * 16 + (boss ? 30 : 0),
    elite: boss ? 1 + Math.floor(loc / 2) : 0,
  };
}

export const LEVELS: LevelDef[] = NAMES.map((_, i) => buildLevel(i));

export function getLevel(id: number) { return LEVELS.find((l) => l.id === id); }
