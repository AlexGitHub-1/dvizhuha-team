export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary", "mythic"];

/** Canvas colors mirror the --rarity-* tokens in styles.css (see BRANDBOOK.md). */
export const RARITY_INFO: Record<Rarity, { name: string; color: string }> = {
  common: { name: "Обычный", color: "#9a948a" },
  rare: { name: "Редкий", color: "#3f8fe0" },
  epic: { name: "Эпический", color: "#a45be8" },
  legendary: { name: "Легендарный", color: "#e8b53a" },
  mythic: { name: "Мифический", color: "#e8413a" },
};
