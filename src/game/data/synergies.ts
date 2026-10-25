import type { MonsterId } from "./monsters";

export type SynergyId = "pack" | "legion" | "fist";
export interface SynergyDef { id: SynergyId; name: string; desc: string; need: number; members: MonsterId[]; icon: string }

export const SYNERGIES: SynergyDef[] = [
  { id: "pack", name: "Стая гоблинов", desc: "+25% к скорости гоблинов и рывок при призыве.", need: 3, members: ["goblin", "sapper", "ram"], icon: "🐺" },
  { id: "legion", name: "Легион Тьмы", desc: "Первый павший оставляет скелета-миньона; нежить с шансом 30% встаёт после смерти.", need: 2, members: ["skeleton", "ghost", "vampire", "necro", "dragon"], icon: "💀" },
  { id: "fist", name: "Осадный кулак", desc: "+25% к урону по башням; каждый 3-й удар по воротам оглушает башни у стены на 1,5 с.", need: 2, members: ["troll", "golem", "orc", "fatty", "abyss", "ram"], icon: "👊" },
];

export const SYN = { packSpeed: 1.25, legionChance: 0.3, fistDmg: 1.25, fistEvery: 3, fistStun: 1.5, fistRadius: 320, gateBeat: 1.2 } as const;

export type TalentId = "essence" | "armor" | "first" | "gear" | "fury" | "march" | "call" | "magic";
export interface TalentDef { id: TalentId; name: string; desc: (rank: number) => string; costs: number[]; icon: string }
/** Paid with campaign stars; cost per rank. */
export const TALENTS: TalentDef[] = [
  { id: "essence", name: "Приток эссенции", desc: (r) => `+${r * 5}% к накоплению эссенции`, costs: [3, 5, 8, 12], icon: "🔮" },
  { id: "fury", name: "Ярость осады", desc: (r) => `+${r * 6}% урона по башням`, costs: [3, 5, 8, 12], icon: "🔥" },
  { id: "armor", name: "Броня авангарда", desc: (r) => `+${r * 4}% брони всем монстрам`, costs: [3, 5, 8, 12], icon: "🛡️" },
  { id: "march", name: "Скорость марша", desc: (r) => `+${r * 5}% к скорости монстров`, costs: [3, 5, 8], icon: "🥾" },
  { id: "first", name: "Первый удар", desc: (r) => `Первый призыв в бою дешевле на ${Math.min(90, r * 40)}%`, costs: [2, 4, 7], icon: "⚡" },
  { id: "call", name: "Зов Орды", desc: (r) => `Перезарядка призыва короче на ${r * 6}%`, costs: [3, 5, 8], icon: "📯" },
  { id: "gear", name: "Доп. слот снаряжения", desc: (r) => `+${r * 4}% к здоровью и урону монстров`, costs: [4, 7, 10, 14], icon: "🎒" },
  { id: "magic", name: "Тёмная магия", desc: (r) => `Перезарядка заклинания короче на ${r * 10}%`, costs: [2, 4, 7], icon: "🌑" },
];
