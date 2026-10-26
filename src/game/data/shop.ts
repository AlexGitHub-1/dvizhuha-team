import type { Rarity } from "./rarity";

export type SpellId = "march" | "bloodrain" | "darkness" | "raise" | "meteor" | "smoke" | "berserk";
export interface SpellDef { id: SpellId; name: string; desc: string; cooldown: number; unlockAfter: number; icon: string; /** click on the field to aim */ target?: "tower" | "area" }
export const SPELLS: Record<SpellId, SpellDef> = {
  march: { id: "march", name: "Боевой марш", desc: "Все войска ускоряются в 1.8 раза на 3 с.", cooldown: 15, unlockAfter: 0, icon: "🥁" },
  bloodrain: { id: "bloodrain", name: "Кровавый дождь", desc: "180 урона трём башням у передовой.", cooldown: 20, unlockAfter: 2, icon: "🩸" },
  darkness: { id: "darkness", name: "Тьма", desc: "Башни промахиваются в 70% случаев 4 с.", cooldown: 22, unlockAfter: 4, icon: "🌑" },
  raise: { id: "raise", name: "Загробный призыв", desc: "Поднимает павших монстров скелетами у передовой (до 6).", cooldown: 25, unlockAfter: 6, icon: "💀" },
  meteor: { id: "meteor", name: "Кровавый метеорит", desc: "Кликни по башне: 380 урона и оглушение соседей.", cooldown: 18, unlockAfter: 8, icon: "☄️", target: "tower" },
  smoke: { id: "smoke", name: "Дымовая завеса", desc: "Кликни по полю: башни в облаке слепнут на 3.5 с.", cooldown: 20, unlockAfter: 10, icon: "🌫️", target: "area" },
  berserk: { id: "berserk", name: "Ярость берсерка", desc: "Войска теряют 20% здоровья, но 5 с бьют вдвое сильнее и не замерзают.", cooldown: 24, unlockAfter: 12, icon: "🪓" },
};
export const SPELL_ORDER: SpellId[] = ["march", "bloodrain", "darkness", "raise", "meteor", "smoke", "berserk"];

export type CaseId = "rusty" | "cursed" | "legend";
export interface CaseDef { id: CaseId; name: string; desc: string; price: number; currency: "gold" | "skulls"; odds: Partial<Record<Rarity, number>> }
export const CASES: CaseDef[] = [
  { id: "rusty", name: "Ржавый сундук", desc: "Старый сундук с поля боя.", price: 180, currency: "gold", odds: { common: 54, rare: 36, epic: 9, legendary: 1 } },
  { id: "cursed", name: "Проклятый ларец", desc: "Шепчет по ночам.", price: 18, currency: "skulls", odds: { rare: 50, epic: 38, legendary: 10, mythic: 2 } },
  { id: "legend", name: "Реликварий Бездны", desc: "Только для истинных владык.", price: 60, currency: "skulls", odds: { epic: 60, legendary: 32, mythic: 8 } },
];
