import type { Rarity } from "./rarity";

export type MonsterId =
  | "goblin" | "troll" | "sapper" | "shaman" | "skeleton"
  | "rat" | "ghost" | "golem" | "fatty" | "orc"
  | "vampire" | "phoenix" | "necro" | "runebreaker"
  | "dragon" | "abyss"
  | "ram" | "catapult"
  | "larva" | "bat" | "minion";

export interface MonsterDef {
  id: MonsterId; name: string; rarity: Rarity; collectible: boolean;
  cost: number; cooldown: number; hp: number; armor: number; speed: number; dps: number; reach: number; radius: number;
  role: string; ability: string;
  decoy?: boolean;
  explode?: { dmg: number; radius: number };
  aura?: { radius: number; heal: number; speed: number };
  revive?: number;
  swarm?: number;
  stealth?: { dur: number; recloak: number };
  freeze?: { dur: number; every: number };
  deathBurst?: { dmg: number; radius: number; spawn: MonsterId; count: number };
  shieldAura?: { radius: number; reduce: number };
  lifesteal?: number;
  deathSpawn?: MonsterId;
  rebirth?: { stealth: number };
  raise?: { radius: number; every: number };
  runeAura?: number;
  flying?: boolean;
  fireBreath?: boolean;
  blindOnSpawn?: number;
  /** multiplier for damage dealt to the gate */
  siege?: number;
  /** extra damage taken from arrows/bolts */
  arrowWeak?: number;
  /** stops at range and lobs shots at towers or the gate */
  ranged?: { range: number; dmg: number; every: number; splash: number };
}

const M = (d: MonsterDef) => d;

export const MONSTERS: Record<MonsterId, MonsterDef> = {
  goblin: M({ id: "goblin", name: "Гоблин-разведчик", rarity: "common", collectible: true, cost: 25, cooldown: 1, hp: 60, armor: 0, speed: 88, dps: 5, reach: 70, radius: 9, role: "Приманка", ability: "Быстрый. Башни в первую очередь стреляют по нему.", decoy: true }),
  troll: M({ id: "troll", name: "Осадный Тролль", rarity: "common", collectible: true, cost: 90, cooldown: 6, hp: 700, armor: 0.35, speed: 30, dps: 28, reach: 85, radius: 17, role: "Танк", ability: "Толстая броня. Крушит башни дубиной по пути.", siege: 2.2 }),
  sapper: M({ id: "sapper", name: "Гоблин-подрывник", rarity: "common", collectible: true, cost: 60, cooldown: 4, hp: 90, armor: 0, speed: 58, dps: 0, reach: 80, radius: 10, role: "Подрыв", ability: "Взрывается рядом с башней или воротами.", explode: { dmg: 230, radius: 90 } }),
  shaman: M({ id: "shaman", name: "Тёмный Шаман", rarity: "common", collectible: true, cost: 70, cooldown: 7, hp: 150, armor: 0.1, speed: 44, dps: 4, reach: 70, radius: 11, role: "Поддержка", ability: "Аура: лечит и ускоряет союзников рядом.", aura: { radius: 95, heal: 7, speed: 1.3 } }),
  skeleton: M({ id: "skeleton", name: "Скелет-воин", rarity: "common", collectible: true, cost: 35, cooldown: 2, hp: 110, armor: 0.1, speed: 55, dps: 8, reach: 70, radius: 10, role: "Нежить", ability: "Один раз встаёт после смерти с половиной здоровья.", revive: 0.5, siege: 1.2 }),
  rat: M({ id: "rat", name: "Чумная Крыса", rarity: "rare", collectible: true, cost: 50, cooldown: 4, hp: 35, armor: 0, speed: 95, dps: 3, reach: 60, radius: 7, role: "Стая", ability: "Призывается стаей из 4 крыс.", swarm: 4 }),
  ghost: M({ id: "ghost", name: "Призрак", rarity: "rare", collectible: true, cost: 55, cooldown: 5, hp: 120, armor: 0, speed: 62, dps: 10, reach: 70, radius: 10, role: "Скрытность", ability: "Невидим 3 с при появлении, снова исчезает после попадания.", stealth: { dur: 3, recloak: 4 } }),
  golem: M({ id: "golem", name: "Ледяной Голем", rarity: "rare", collectible: true, cost: 100, cooldown: 8, hp: 500, armor: 0.3, speed: 32, dps: 15, reach: 85, radius: 16, role: "Контроль", ability: "Удар замораживает башню на 2 с.", freeze: { dur: 2, every: 2.5 }, siege: 1.8 }),
  fatty: M({ id: "fatty", name: "Гнилой Толстяк", rarity: "rare", collectible: true, cost: 80, cooldown: 6, hp: 420, armor: 0.15, speed: 36, dps: 10, reach: 75, radius: 16, role: "Посмертие", ability: "После смерти взрывается ядом и рождает 3 личинки.", deathBurst: { dmg: 120, radius: 85, spawn: "larva", count: 3 }, siege: 1.3 }),
  orc: M({ id: "orc", name: "Щитоносец Орков", rarity: "rare", collectible: true, cost: 85, cooldown: 7, hp: 380, armor: 0.35, speed: 40, dps: 12, reach: 75, radius: 14, role: "Защита", ability: "Щит: союзники рядом получают на 35% меньше урона.", shieldAura: { radius: 90, reduce: 0.35 }, siege: 1.4 }),
  vampire: M({ id: "vampire", name: "Вампир", rarity: "epic", collectible: true, cost: 110, cooldown: 8, hp: 300, armor: 0.15, speed: 60, dps: 22, reach: 80, radius: 12, role: "Вампиризм", ability: "Лечится от нанесённого урона. При смерти становится летучей мышью.", lifesteal: 0.6, deathSpawn: "bat" }),
  phoenix: M({ id: "phoenix", name: "Феникс-бес", rarity: "epic", collectible: true, cost: 120, cooldown: 9, hp: 260, armor: 0.1, speed: 58, dps: 18, reach: 75, radius: 12, role: "Перерождение", ability: "Один раз возрождается из пепла и 2 с невидим.", rebirth: { stealth: 2 } }),
  necro: M({ id: "necro", name: "Некромант", rarity: "epic", collectible: true, cost: 130, cooldown: 10, hp: 220, armor: 0.1, speed: 42, dps: 6, reach: 70, radius: 12, role: "Призыв", ability: "Поднимает скелетов из павших союзников рядом.", raise: { radius: 140, every: 3 } }),
  runebreaker: M({ id: "runebreaker", name: "Глушитель Рун", rarity: "epic", collectible: true, cost: 115, cooldown: 9, hp: 280, armor: 0.2, speed: 46, dps: 10, reach: 75, radius: 12, role: "Подавление", ability: "Аура отключает магические обелиски и колокола рядом.", runeAura: 130 }),
  dragon: M({ id: "dragon", name: "Костяной Дракон", rarity: "legendary", collectible: true, cost: 220, cooldown: 15, hp: 900, armor: 0.3, speed: 48, dps: 45, reach: 110, radius: 22, role: "Полёт", ability: "Летит напрямую к воротам, сжигая башни огнём.", flying: true, fireBreath: true }),
  abyss: M({ id: "abyss", name: "Владыка Бездны", rarity: "mythic", collectible: true, cost: 350, cooldown: 25, hp: 2600, armor: 0.5, speed: 22, dps: 60, reach: 95, radius: 28, role: "Ужас", ability: "При появлении ослепляет все башни на 3 с.", blindOnSpawn: 3, siege: 2 }),
  ram: M({ id: "ram", name: "Осадный Таран", rarity: "rare", collectible: true, cost: 95, cooldown: 8, hp: 520, armor: 0.3, speed: 34, dps: 30, reach: 60, radius: 16, role: "Осада", ability: "Два гоблина толкают бревно: огромный урон воротам, но стрелы бьют его вдвое сильнее.", siege: 1.9, arrowWeak: 2 }),
  catapult: M({ id: "catapult", name: "Катапульта Орды", rarity: "epic", collectible: true, cost: 120, cooldown: 10, hp: 260, armor: 0.1, speed: 30, dps: 0, reach: 60, radius: 15, role: "Артиллерия", ability: "Останавливается вдали и забрасывает башни и ворота горящими снарядами.", ranged: { range: 200, dmg: 45, every: 3, splash: 45 } }),
  larva: M({ id: "larva", name: "Личинка", rarity: "common", collectible: false, cost: 0, cooldown: 0, hp: 40, armor: 0, speed: 70, dps: 3, reach: 55, radius: 6, role: "", ability: "" }),
  bat: M({ id: "bat", name: "Летучая мышь", rarity: "common", collectible: false, cost: 0, cooldown: 0, hp: 90, armor: 0, speed: 100, dps: 8, reach: 60, radius: 8, role: "", ability: "", lifesteal: 0.5 }),
  minion: M({ id: "minion", name: "Поднятый скелет", rarity: "common", collectible: false, cost: 0, cooldown: 0, hp: 60, armor: 0.1, speed: 55, dps: 5, reach: 60, radius: 9, role: "", ability: "" }),
};

export const COLLECTIBLE: MonsterId[] = (Object.keys(MONSTERS) as MonsterId[]).filter((k) => MONSTERS[k].collectible);
export const STARTERS: MonsterId[] = ["goblin", "troll", "sapper", "shaman", "skeleton"];
