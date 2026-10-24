import type { TowerKind } from "./towers";

export type Theme = "dead" | "ice" | "swamp" | "forest" | "forge" | "capital";

export interface LocationDef {
  id: number; name: string; theme: Theme; blurb: string;
  /** tower kind introduced here (null for the first location) */
  newTower: TowerKind | null;
  /** region centre on the world map (world map is 2400×1400) */
  cx: number; cy: number;
}

export const LOCATIONS: LocationDef[] = [
  { id: 0, name: "Мёртвые поля", theme: "dead", blurb: "Кладбища и кривые деревья. Первые дозорные башни.", newTower: null, cx: 330, cy: 1050 },
  { id: 1, name: "Ледяной перевал", theme: "ice", blurb: "Метель и трещины во льду. Ледяные шпили вмораживают орду.", newTower: "frost", cx: 700, cy: 430 },
  { id: 2, name: "Гнилые топи", theme: "swamp", blurb: "Болота и светящиеся грибы. Курильницы травят ядом.", newTower: "censer", cx: 1180, cy: 1000 },
  { id: 3, name: "Призрачный лес", theme: "forest", blurb: "Светлячки и шёпот. Святые колокола видят невидимых.", newTower: "bell", cx: 1520, cy: 420 },
  { id: 4, name: "Пылающая кузня", theme: "forge", blurb: "Лава и пепел. Огненные алтари жгут всё живое.", newTower: "flame", cx: 1880, cy: 1000 },
  { id: 5, name: "Стены столицы", theme: "capital", blurb: "Мостовые и знамёна. Осадные баллисты у последних ворот.", newTower: "ballista", cx: 2130, cy: 380 },
];

/** Towers available in a location: base three plus everything introduced so far. */
export function towerPool(loc: number): TowerKind[] {
  const pool: TowerKind[] = ["archer", "cannon", "mage"];
  for (let i = 1; i <= loc; i++) pool.push(LOCATIONS[i]!.newTower!);
  return pool;
}
