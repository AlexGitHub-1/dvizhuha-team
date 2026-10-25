export type TowerKind = "archer" | "cannon" | "mage" | "frost" | "censer" | "bell" | "flame" | "ballista";

export interface TowerDef { name: string; hp: number; range: number; rate: number; dmg: number; splash?: number; magic?: boolean; /** "weak": snipes the most fragile monster in range instead of the leader */ focus?: "weak"; desc: string }

export const TOWERS: Record<TowerKind, TowerDef> = {
  archer: { name: "Башня лучников", hp: 320, range: 175, rate: 0.45, dmg: 16, focus: "weak", desc: "Частые выстрелы. Ур.3: горящие стрелы." },
  cannon: { name: "Пушечный бастион", hp: 480, range: 195, rate: 2.2, dmg: 55, splash: 60, desc: "Урон по площади. Ур.3: кассетные ядра." },
  mage: { name: "Магический обелиск", hp: 360, range: 155, rate: 1.1, dmg: 20, magic: true, desc: "Замедляющие молнии. Ур.3: цепь на 3 цели." },
  frost: { name: "Ледяной шпиль", hp: 380, range: 165, rate: 1.5, dmg: 14, focus: "weak", magic: true, desc: "Замедляет, каждый 3-й выстрел вмораживает монстра." },
  censer: { name: "Ядовитая курильница", hp: 400, range: 150, rate: 2.6, dmg: 14, splash: 75, magic: true, desc: "Бросает облако яда: урон со временем по площади." },
  bell: { name: "Святой Колокол", hp: 400, range: 160, rate: 1, dmg: 0, magic: true, desc: "Лечит башни и раскрывает невидимых." },
  flame: { name: "Огненный алтарь", hp: 450, range: 110, rate: 0.15, dmg: 9, desc: "Поливает огнём всех рядом." },
  ballista: { name: "Осадная баллиста", hp: 420, range: 235, rate: 2.6, dmg: 140, desc: "Болт пробивает всех на линии." },
};

export const TOWER_MAX_LVL = 5;
export function towerScale(lvl: number) {
  return { dmg: 1 + 0.3 * (lvl - 1), range: 1 + 0.05 * (lvl - 1), rate: 1 - 0.05 * (lvl - 1) };
}
/** Super charge: seconds of active fighting to fill, wind-up before release, and name shown in battle. */
export const SUPER = { fill: 26, hurtFill: 0.6, windup: 1.5 } as const;
/** essence released when a tower collapses */
export const TOWER_ESSENCE = 30;
export const SUPER_NAME: Record<TowerKind, string> = {
  archer: "Дождь стрел!", cannon: "Тройной залп!", mage: "Цепная буря!", frost: "Ледяная буря!", censer: "Чумной туман!",
  bell: "Святой звон!", ballista: "Веер болтов!", flame: "Огненное кольцо!",
};

/** Per-region tower resistances (by location index): share of blast / melee damage ignored. */
export const REGION_GUARD: { blast: number; melee: number }[] = [
  { blast: 0, melee: 0 }, { blast: 0.3, melee: 0 }, { blast: 0, melee: 0.25 },
  { blast: 0.35, melee: 0 }, { blast: 0, melee: 0.3 }, { blast: 0.3, melee: 0.25 },
];
