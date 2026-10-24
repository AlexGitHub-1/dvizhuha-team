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

/** Snaking road from the horde spawn (left) to the gate (right, y=380). */
function makeRoad(seed: number): [number, number][] {
  const r = rng(seed * 7919 + 13);
  const n = 7 + Math.floor(r() * 4);
  const pts: [number, number][] = [];
  let top = r() < 0.5;
  pts.push([-30, top ? 130 + r() * 80 : 520 + r() * 90]);
  for (let i = 1; i <= n; i++) {
    const x = 60 + (i / (n + 1)) * 960 + (r() - 0.5) * 70 + (r() < 0.2 ? -90 : 0);
    top = !top;
    const y = top ? 90 + r() * 170 : 460 + r() * 190;
    pts.push([Math.round(Math.max(60, Math.min(1040, x))), Math.round(y)]);
  }
  pts.push([1075, 380], [1150, 380]);
  return pts;
}

export const MAPS: MapDef[] = NAMES.map((name, i) => ({ name, theme: LOCATIONS[Math.floor(i / 4)]!.theme, path: i === 0 ? [[-30, 120], [250, 120], [330, 320], [170, 520], [450, 630], [660, 430], [610, 190], [870, 130], [980, 380], [1150, 380]] : makeRoad(i + 1) }));

/** Tower strength per level, calibrated with the bot (engine/sim.ts) so each level needs a higher squad level than the last. */
const TOWER_MUL = [1.0, 1.22, 0.96, 0.63, 0.96, 0.89, 1.33, 1.4, 1.04, 0.73, 0.98, 0.78, 1.34, 1.36, 1.46, 0.98, 1.08, 0.92, 1.05, 0.79, 1.01, 1.09, 1.12, 0.89];

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
    gold: 140 + i * 24 + (boss ? 40 : 0),
    elite: boss ? 1 + Math.floor(loc / 2) : 0,
  };
}

export const LEVELS: LevelDef[] = NAMES.map((_, i) => buildLevel(i));

export function getLevel(id: number) { return LEVELS.find((l) => l.id === id); }
