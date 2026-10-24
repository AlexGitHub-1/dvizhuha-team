import { COLLECTIBLE, MONSTERS, STARTERS, type MonsterId } from "../data/monsters";
import { RARITIES, type Rarity } from "../data/rarity";
import { CASES, SPELLS, type CaseId, type SpellId } from "../data/shop";
import { LEVELS, type LevelDef } from "../data/levels";

export const MAX_MONSTER_LVL = 10;
export interface Owned { lvl: number; shards: number }
export interface LifeStats { towers: number; wins: number; summoned: number; cases: number }
export interface Progress {
  v: 1; gold: number; skulls: number;
  owned: Partial<Record<MonsterId, Owned>>;
  squad: MonsterId[]; stars: Record<number, number>; spell: SpellId; muted: boolean; musicMuted: boolean;
  /** opens since last epic-or-better drop */
  pity: number;
  lastDaily: string | null; streak: number;
  stats: LifeStats; questClaims: Partial<Record<QuestId, number>>;
}

export function defaultProgress(): Progress {
  const owned: Partial<Record<MonsterId, Owned>> = {};
  for (const id of STARTERS) owned[id] = { lvl: 1, shards: 0 };
  return { v: 1, gold: 0, skulls: 0, owned, squad: [...STARTERS], stars: {}, spell: "march", muted: false, musicMuted: false,
    pity: 0, lastDaily: null, streak: 0, stats: { towers: 0, wins: 0, summoned: 0, cases: 0 }, questClaims: {} };
}

// ---- monster stats
export function statMul(lvl: number) { return 1 + 0.12 * (lvl - 1); }
export function abilityMul(lvl: number) { return 1 + (lvl >= 5 ? 0.25 : 0) + (lvl >= 10 ? 0.25 : 0); }
export function monsterStats(id: MonsterId, lvl: number) {
  const d = MONSTERS[id]; const m = statMul(lvl);
  return {
    hp: Math.round(d.hp * m), dps: Math.round(d.dps * m * 10) / 10,
    armor: Math.min(0.75, d.armor + 0.01 * (lvl - 1)),
    speed: Math.round(d.speed * (1 + 0.02 * (lvl - 1))),
    cost: d.cost, cooldown: d.cooldown, ability: abilityMul(lvl),
  };
}

// ---- upgrades
const UPGRADE_BASE: Record<Rarity, number> = { common: 50, rare: 90, epic: 160, legendary: 260, mythic: 400 };
export const SHARD_DISCOUNT = 0.1;
export const MAX_SHARDS_USED = 5;
/** From level 5 onward each upgrade also needs shards (duplicates from cases). */
export function shardsRequired(lvl: number) { return lvl >= 5 ? Math.ceil((lvl - 4) / 2) : 0; }
/** Shard-gated upgrades are 20% cheaper in gold. */
export const SHARD_GATE_DISCOUNT = 0.2;
export function upgradeCost(rarity: Rarity, lvl: number, shards: number) {
  const base = UPGRADE_BASE[rarity] * Math.pow(1.45, lvl - 1) * (lvl >= 5 ? 1 - SHARD_GATE_DISCOUNT : 1);
  const spare = Math.max(0, shards - shardsRequired(lvl));
  const disc = Math.min(spare, MAX_SHARDS_USED) * SHARD_DISCOUNT;
  return Math.round(base * (1 - disc));
}
export function canUpgrade(p: Progress, id: MonsterId) {
  const o = p.owned[id]; if (!o || o.lvl >= MAX_MONSTER_LVL) return false;
  return o.shards >= shardsRequired(o.lvl) && p.gold >= upgradeCost(MONSTERS[id].rarity, o.lvl, o.shards);
}
export function upgradeMonster(p: Progress, id: MonsterId): Progress | null {
  if (!canUpgrade(p, id)) return null;
  const o = p.owned[id]!; const need = shardsRequired(o.lvl);
  const cost = upgradeCost(MONSTERS[id].rarity, o.lvl, o.shards);
  const used = need + Math.min(o.shards - need, MAX_SHARDS_USED);
  return { ...p, gold: p.gold - cost, owned: { ...p.owned, [id]: { lvl: o.lvl + 1, shards: o.shards - used } } };
}

// ---- squad
export function squadLimit(p: Progress) {
  return 4 + (p.stars[4] ? 1 : 0) + (p.stars[8] ? 1 : 0);
}
/** Put a monster at a squad position (add or reorder). Refuses when the squad is full. */
export function placeInSquad(p: Progress, id: MonsterId, index: number): Progress {
  if (!p.owned[id]) return p;
  const had = p.squad.includes(id);
  const rest = p.squad.filter((s) => s !== id);
  if (!had && rest.length >= squadLimit(p)) return p;
  const i = Math.max(0, Math.min(rest.length, Math.round(index)));
  return { ...p, squad: [...rest.slice(0, i), id, ...rest.slice(i)] };
}
export function toggleSquad(p: Progress, id: MonsterId): Progress {
  if (!p.owned[id]) return p;
  if (p.squad.includes(id)) return p.squad.length <= 1 ? p : { ...p, squad: p.squad.filter((s) => s !== id) };
  if (p.squad.length >= squadLimit(p)) return p;
  return { ...p, squad: [...p.squad, id] };
}

// ---- levels / spells
export function isLevelUnlocked(p: Progress, id: number) { return id === 1 || (p.stars[id - 1] ?? 0) > 0; }
export function highestCleared(p: Progress) { let h = 0; for (const l of LEVELS) if ((p.stars[l.id] ?? 0) > 0) h = Math.max(h, l.id); return h; }
export function isSpellUnlocked(p: Progress, s: SpellId) { return highestCleared(p) >= SPELLS[s].unlockAfter; }

// ---- cases
export function rollRarity(odds: Partial<Record<Rarity, number>>, r: number): Rarity {
  const total = RARITIES.reduce((s, k) => s + (odds[k] ?? 0), 0);
  let x = r * total;
  for (const k of RARITIES) { const w = odds[k] ?? 0; if (w <= 0) continue; if (x < w) return k; x -= w; }
  return RARITIES.filter((k) => (odds[k] ?? 0) > 0).at(-1)!;
}
export const DUPLICATE_SHARDS: Record<Rarity, number> = { common: 2, rare: 2, epic: 3, legendary: 4, mythic: 5 };
/** Every 10th open without epic+ is guaranteed at least epic. */
export const PITY_AT = 10;
const EPIC_PLUS: Rarity[] = ["epic", "legendary", "mythic"];
export interface CaseResult { id: MonsterId; isNew: boolean; shards: number; pity?: boolean }
export function openCase(p: Progress, caseId: CaseId, rand: () => number = Math.random): { p: Progress; result: CaseResult } | null {
  const c = CASES.find((x) => x.id === caseId)!;
  if (p[c.currency] < c.price) return null;
  let rarity = rollRarity(c.odds, rand());
  const pityHit = p.pity + 1 >= PITY_AT && !EPIC_PLUS.includes(rarity);
  if (pityHit) rarity = "epic";
  const pity = EPIC_PLUS.includes(rarity) ? 0 : p.pity + 1;
  const pool = COLLECTIBLE.filter((m) => MONSTERS[m].rarity === rarity);
  const id = pool[Math.floor(rand() * pool.length) % pool.length]!;
  const o = p.owned[id];
  const shards = o ? DUPLICATE_SHARDS[rarity] : 0;
  const owned = { ...p.owned, [id]: o ? { ...o, shards: o.shards + shards } : { lvl: 1, shards: 0 } };
  return { p: { ...p, [c.currency]: p[c.currency] - c.price, owned, pity, stats: { ...p.stats, cases: p.stats.cases + 1 } }, result: { id, isNew: !o, shards, pity: pityHit } };
}

// ---- battle rewards
export interface BattleOutcome { won: boolean; gateFrac: number; towersDown: number; timeLeftFrac: number; summoned?: number }
export function starsFor(o: BattleOutcome) { return !o.won ? 0 : o.timeLeftFrac > 0.5 ? 3 : o.timeLeftFrac > 0.25 ? 2 : 1; }
/** First win pays 1.5x, repeat wins 0.8x, losses 0.3x–0.7x by gate damage; +5 per tower destroyed. */
export function battleReward(level: LevelDef, prevStars: number, o: BattleOutcome) {
  const stars = starsFor(o);
  const k = o.won ? (prevStars === 0 ? 1.5 : 0.8) : 0.3 + 0.4 * o.gateFrac;
  const gold = Math.round(level.gold * k + o.towersDown * 5);
  const newStars = Math.max(0, stars - prevStars);
  const skulls = o.won ? newStars * 2 + (prevStars === 0 ? 3 : 0) : 0;
  return { gold, skulls, stars, firstWin: o.won && prevStars === 0 };
}
export function applyBattle(p: Progress, level: LevelDef, o: BattleOutcome) {
  const prev = p.stars[level.id] ?? 0;
  const r = battleReward(level, prev, o);
  const stats = { ...p.stats, towers: p.stats.towers + o.towersDown, wins: p.stats.wins + (o.won ? 1 : 0), summoned: p.stats.summoned + (o.summoned ?? 0) };
  return { p: { ...p, gold: p.gold + r.gold, skulls: p.skulls + r.skulls, stars: { ...p.stars, [level.id]: Math.max(prev, r.stars) }, stats }, reward: r };
}

// ---- daily reward (7-day streak, missing a day resets)
export const DAILY: { gold: number; skulls: number }[] = [
  { gold: 80, skulls: 0 }, { gold: 120, skulls: 0 }, { gold: 160, skulls: 2 }, { gold: 200, skulls: 0 },
  { gold: 250, skulls: 0 }, { gold: 300, skulls: 3 }, { gold: 400, skulls: 6 },
];
export function dayKey(d: Date) { return d.toISOString().slice(0, 10); }
function prevDay(key: string) { const d = new Date(key + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return dayKey(d); }
export function dailyAvailable(p: Progress, today: string) { return p.lastDaily !== today; }
export function nextStreak(p: Progress, today: string) { return p.lastDaily === prevDay(today) ? (p.streak % DAILY.length) + 1 : 1; }
export function claimDaily(p: Progress, today: string) {
  if (!dailyAvailable(p, today)) return null;
  const streak = nextStreak(p, today); const r = DAILY[streak - 1]!;
  return { p: { ...p, gold: p.gold + r.gold, skulls: p.skulls + r.skulls, lastDaily: today, streak }, reward: r };
}

// ---- quests (endless tiers: each claim raises the target)
export type QuestId = "towers" | "wins" | "summoned" | "cases";
export const QUESTS: { id: QuestId; name: (n: number) => string; step: number; gold: number; skulls: number }[] = [
  { id: "towers", name: (n) => `Разрушь ${n} башен`, step: 20, gold: 150, skulls: 1 },
  { id: "wins", name: (n) => `Одержи ${n} побед`, step: 3, gold: 200, skulls: 2 },
  { id: "summoned", name: (n) => `Призови ${n} монстров`, step: 100, gold: 120, skulls: 0 },
  { id: "cases", name: (n) => `Открой ${n} кейсов`, step: 5, gold: 100, skulls: 2 },
];
export function questState(p: Progress, id: QuestId) {
  const q = QUESTS.find((x) => x.id === id)!; const tier = (p.questClaims[id] ?? 0) + 1;
  const target = q.step * tier; const value = p.stats[id];
  return { tier, target, value: Math.min(value, target), done: value >= target, gold: q.gold * tier, skulls: q.skulls * tier, name: q.name(target) };
}
export function claimQuest(p: Progress, id: QuestId) {
  const s = questState(p, id); if (!s.done) return null;
  return { ...p, gold: p.gold + s.gold, skulls: p.skulls + s.skulls, questClaims: { ...p.questClaims, [id]: s.tier } };
}
