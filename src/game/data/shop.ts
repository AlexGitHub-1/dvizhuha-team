import type { Rarity } from "./rarity";

export type SpellId = "march" | "bloodrain" | "darkness" | "raise";
export interface SpellDef { id: SpellId; name: string; desc: string; cooldown: number; unlockAfter: number; icon: string }
export const SPELLS: Record<SpellId, SpellDef> = {
  march: { id: "march", name: "Боевой марш", desc: "Все войска ускоряются в 1.8 раза на 3 с.", cooldown: 15, unlockAfter: 0, icon: "🥁" },
  bloodrain: { id: "bloodrain", name: "Кровавый дождь", desc: "180 урона трём башням у передовой.", cooldown: 20, unlockAfter: 2, icon: "🩸" },
  darkness: { id: "darkness", name: "Тьма", desc: "Башни промахиваются в 70% случаев 4 с.", cooldown: 22, unlockAfter: 4, icon: "🌑" },
  raise: { id: "raise", name: "Призыв мёртвых", desc: "Поднимает 4 скелета у передовой.", cooldown: 25, unlockAfter: 6, icon: "💀" },
};
export const SPELL_ORDER: SpellId[] = ["march", "bloodrain", "darkness", "raise"];

export type CaseId = "rusty" | "cursed" | "legend";
export interface CaseDef { id: CaseId; name: string; desc: string; price: number; currency: "gold" | "skulls"; odds: Partial<Record<Rarity, number>> }
export const CASES: CaseDef[] = [
  { id: "rusty", name: "Ржавый сундук", desc: "Старый сундук с поля боя.", price: 300, currency: "gold", odds: { common: 70, rare: 25, epic: 5 } },
  { id: "cursed", name: "Проклятый ларец", desc: "Шепчет по ночам.", price: 20, currency: "skulls", odds: { rare: 55, epic: 35, legendary: 9, mythic: 1 } },
  { id: "legend", name: "Реликварий Бездны", desc: "Только для истинных владык.", price: 60, currency: "skulls", odds: { epic: 60, legendary: 32, mythic: 8 } },
];
