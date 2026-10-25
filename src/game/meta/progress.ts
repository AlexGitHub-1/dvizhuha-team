import { COLLECTIBLE, MONSTERS, STARTERS, type MonsterId } from "../data/monsters";
import { RARITIES, type Rarity } from "../data/rarity";
import { CASES, SPELLS, type CaseId, type SpellId } from "../data/shop";
import { LEVELS, REC_TIER, type LevelDef } from "../data/levels";
import { ACCUSE_RIGHT, CLUES, SUSPECTS, type ClueId, type SuspectId, type SuspectStatus } from "../data/story";
import { SYNERGIES, TALENTS, type SynergyId, type TalentId } from "../data/synergies";

export const MAX_MONSTER_LVL = 10;
export interface Owned { lvl: number; shards: number }
export interface LifeStats { towers: number; wins: number; summoned: number; cases: number }
export interface Progress {
  v: 1; gold: number; skulls: number;
  owned: Partial<Record<MonsterId, Owned>>;
  squad: MonsterId[]; stars: Record<number, number>; spell: SpellId; muted: boolean; musicMuted: boolean;
  /** opens since last epic-or-better drop */
  pity: number;
  /** opens since last legendary-or-better drop */
  pityLeg?: number;
  /** what the defence learned from the last lost battle: squad key + adapted modes */
  defense?: { level: number; key: string; modes: string[] } | undefined;
  lastDaily: string | null; streak: number;
  stats: LifeStats; questClaims: Partial<Record<QuestId, number>>;
  talents: Partial<Record<TalentId, number>>;
  /** first-time hint sets already shown (battle, squad, talents, shop) */
  tutorials: Record<string, true>; speed?: 1 | 2;
  /** story cutscenes already watched */
  story?: Record<string, true>;
  /** story clues found in cutscenes */
  clues?: Record<string, true>;
  /** who the player accused on the clue board (once) */
  accusation?: SuspectId;
  /** losses in a row per level (reset by a win) — drives Horde Support */
  losses?: Record<number, number>;
  /** one-time 30% discount on the next upgrade (Horde Support tier 3) */
  mercyDiscount?: boolean;
}

export function defaultProgress(): Progress {
  const owned: Partial<Record<MonsterId, Owned>> = {};
  for (const id of STARTERS) owned[id] = { lvl: 1, shards: 0 };
  return { v: 1, gold: 0, skulls: 0, owned, squad: [...STARTERS], stars: {}, spell: "march", muted: false, musicMuted: false,
    pity: 0, lastDaily: null, streak: 0, stats: { towers: 0, wins: 0, summoned: 0, cases: 0 }, questClaims: {}, talents: {}, tutorials: {} };
}

// ---- monster stats
/** Per-level growth by rarity: rarer monsters grow faster and go higher. */
export const RARITY_GROWTH: Record<Rarity, number> = { common: 1, rare: 1.25, epic: 1.55, legendary: 1.9, mythic: 2.3 };
/** Level cap by rarity: commons stop at 6, rares at 8, epic+ at 10. */
export const RARITY_MAX_LVL: Record<Rarity, number> = { common: 6, rare: 8, epic: 10, legendary: 10, mythic: 10 };
export function maxLvl(id: MonsterId) { return RARITY_MAX_LVL[MONSTERS[id].rarity]; }
export function statMul(lvl: number, rarity: Rarity = "common") { return 1 + 0.12 * RARITY_GROWTH[rarity] * (lvl - 1); }
/** Base worth of one fighter of each rarity for the squad power number. */
export const RARITY_POWER: Record<Rarity, number> = { common: 1, rare: 1.35, epic: 1.8, legendary: 2.4, mythic: 3 };
export function unitPower(id: MonsterId, lvl: number) { const r = MONSTERS[id].rarity; return Math.round(100 * RARITY_POWER[r] * statMul(Math.min(lvl, RARITY_MAX_LVL[r]), r)); }
export function squadPowerOf(squad: { kind: MonsterId; lvl: number }[]) { return squad.reduce((s, m) => s + unitPower(m.kind, m.lvl), 0); }
/** Power of the squad a level is calibrated against (5 fighters of REC_TIER). */
export function requiredPower(levelId: number) { const t = REC_TIER[levelId - 1] ?? REC_TIER[0]!; return 5 * Math.round(100 * RARITY_POWER[t.rarity] * statMul(t.lvl, t.rarity)); }
export function squadPower(p: Progress) { return squadPowerOf(p.squad.filter((id) => p.owned[id]).map((id) => ({ kind: id, lvl: p.owned[id]!.lvl }))); }
export function abilityMul(lvl: number) { return 1 + (lvl >= 5 ? 0.25 : 0) + (lvl >= 10 ? 0.25 : 0); }
export function monsterStats(id: MonsterId, lvl: number) {
  const d = MONSTERS[id]; const m = statMul(lvl, d.rarity);
  return {
    hp: Math.round(d.hp * m), dps: Math.round(d.dps * m * 10) / 10,
    armor: Math.min(0.75, d.armor + 0.01 * (lvl - 1)),
    speed: Math.round(d.speed * (1 + 0.02 * (lvl - 1))),
    cost: d.cost, cooldown: d.cooldown, ability: abilityMul(lvl),
    /** blast damage for explode monsters (same formula as the battle engine) */
    blast: d.explode ? Math.round(d.explode.dmg * abilityMul(lvl) * m) : 0, blastRadius: d.explode?.radius ?? 0,
  };
}

// ---- upgrades
const UPGRADE_BASE: Record<Rarity, number> = { common: 50, rare: 90, epic: 160, legendary: 260, mythic: 400 };
/** each level costs this much more gold than the previous one */
export const UPGRADE_GROWTH = 1.6;
export const SHARD_DISCOUNT = 0.1;
export const MAX_SHARDS_USED = 5;
/** From level 5 onward each upgrade also needs shards (duplicates from cases). */
export function shardsRequired(lvl: number) { return lvl >= 5 ? Math.ceil((lvl - 4) / 3) : 0; }
/** Shard-gated upgrades are 20% cheaper in gold. */
export const SHARD_GATE_DISCOUNT = 0.2;
export function upgradeCost(rarity: Rarity, lvl: number, shards: number) {
  const base = UPGRADE_BASE[rarity] * Math.pow(UPGRADE_GROWTH, lvl - 1) * (lvl >= 5 ? 1 - SHARD_GATE_DISCOUNT : 1);
  const spare = Math.max(0, shards - shardsRequired(lvl));
  const disc = Math.min(spare, MAX_SHARDS_USED) * SHARD_DISCOUNT;
  return Math.round(base * (1 - disc));
}
/** Gold price of the next upgrade for this player, including a pending Horde Support discount. */
export function upgradePrice(p: Progress, id: MonsterId) {
  const o = p.owned[id]; if (!o) return 0;
  const c = upgradeCost(MONSTERS[id].rarity, o.lvl, o.shards);
  return p.mercyDiscount ? Math.round(c * (1 - MERCY_DISCOUNT)) : c;
}
export function canUpgrade(p: Progress, id: MonsterId) {
  const o = p.owned[id]; if (!o || o.lvl >= maxLvl(id)) return false;
  return o.shards >= shardsRequired(o.lvl) && p.gold >= upgradePrice(p, id);
}
/** Spend gold on the squad, always raising the weakest monster that can be upgraded. */
export function upgradeAll(p: Progress): { p: Progress; count: number } {
  let count = 0;
  for (;;) {
    const id = p.squad.filter((m) => canUpgrade(p, m)).sort((a, b) => p.owned[a]!.lvl - p.owned[b]!.lvl)[0];
    if (!id) return { p, count };
    p = upgradeMonster(p, id)!; count++;
  }
}
export function upgradeMonster(p: Progress, id: MonsterId): Progress | null {
  if (!canUpgrade(p, id)) return null;
  const o = p.owned[id]!; const need = shardsRequired(o.lvl);
  const cost = upgradePrice(p, id);
  const used = need + Math.min(o.shards - need, MAX_SHARDS_USED);
  return { ...p, gold: p.gold - cost, mercyDiscount: false, owned: { ...p.owned, [id]: { lvl: o.lvl + 1, shards: o.shards - used } } };
}

// ---- squad
export function squadLimit(p: Progress) {
  return 5 + (p.stars[8] ? 1 : 0);
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
/** Every 40th open without legendary+ is guaranteed legendary. */
export const LEGEND_PITY_AT = 40;
/** Case odds improve with campaign progress: each cleared region moves weight from common to rare+. */
export function caseOdds(p: Progress, odds: Partial<Record<Rarity, number>>): Partial<Record<Rarity, number>> {
  const regions = LEVELS.filter((l) => (p.stars[l.id] ?? 0) > 0 && LEVELS.filter((x) => x.loc === l.loc).at(-1)!.id === l.id).length;
  if (!regions || !odds.common) return odds;
  const shift = Math.min(odds.common * 0.6, odds.common * 0.1 * regions);
  return { ...odds, common: odds.common - shift, rare: (odds.rare ?? 0) + shift * 0.7, epic: (odds.epic ?? 0) + shift * 0.25, legendary: (odds.legendary ?? 0) + shift * 0.05 };
}
const EPIC_PLUS: Rarity[] = ["epic", "legendary", "mythic"];
const LEG_PLUS: Rarity[] = ["legendary", "mythic"];
export interface CaseResult { id: MonsterId; isNew: boolean; shards: number; pity?: boolean }
export function openCase(p: Progress, caseId: CaseId, rand: () => number = Math.random): { p: Progress; result: CaseResult } | null {
  const c = CASES.find((x) => x.id === caseId)!;
  if (p[c.currency] < c.price) return null;
  let rarity = rollRarity(caseOdds(p, c.odds), rand());
  const legHit = (p.pityLeg ?? 0) + 1 >= LEGEND_PITY_AT && !LEG_PLUS.includes(rarity);
  if (legHit) rarity = "legendary";
  const pityHit = !legHit && p.pity + 1 >= PITY_AT && !EPIC_PLUS.includes(rarity);
  if (pityHit) rarity = "epic";
  const pity = EPIC_PLUS.includes(rarity) ? 0 : p.pity + 1;
  const pityLeg = LEG_PLUS.includes(rarity) ? 0 : (p.pityLeg ?? 0) + 1;
  const pool = COLLECTIBLE.filter((m) => MONSTERS[m].rarity === rarity);
  const id = pool[Math.floor(rand() * pool.length) % pool.length]!;
  const o = p.owned[id];
  const shards = o ? DUPLICATE_SHARDS[rarity] : 0;
  const owned = { ...p.owned, [id]: o ? { ...o, shards: o.shards + shards } : { lvl: 1, shards: 0 } };
  return { p: { ...p, [c.currency]: p[c.currency] - c.price, owned, pity, pityLeg, stats: { ...p.stats, cases: p.stats.cases + 1 } }, result: { id, isNew: !o, shards, pity: pityHit || legHit } };
}

// ---- battle rewards
export interface BattleOutcome { won: boolean; gateFrac: number; towersDown: number; timeLeftFrac: number; summoned?: number; adapt?: string[]; squadKey?: string }
export const squadKey = (kinds: string[]) => [...kinds].sort().join(",");
// ---- Horde Support (mercy after repeated losses)
export const MERCY_AT = [3, 5, 8] as const;
export const MERCY_DISCOUNT = 0.3;
export function lossStreak(p: Progress, levelId: number) { return p.losses?.[levelId] ?? 0; }
export function mercyTier(streak: number) { return streak >= MERCY_AT[2] ? 3 : streak >= MERCY_AT[1] ? 2 : streak >= MERCY_AT[0] ? 1 : 0; }
/** What each support tier gives: start essence, shards per loss, minimum loss-gold share, forgetting the squad. */
export function mercyBonuses(tier: number) {
  return { startEssenceMul: tier >= 2 ? 1.25 : tier >= 1 ? 1.15 : 1, lossShards: tier >= 2 ? 2 : tier >= 1 ? 1 : 0,
    lossGoldK: tier >= 2 ? 0.8 : 0, memoryShare: tier >= 2 ? 0 : tier >= 1 ? 0.5 : 1 };
}
/** The defence remembers a squad that lost on this level; changing 2+ fighters makes it forget, and Horde Support weakens the memory. */
export function defenseMemory(p: Progress, levelId: number, kinds: string[]): string[] {
  const d = p.defense; if (!d || d.level !== levelId) return [];
  const old = d.key.split(","); const changed = Math.max(kinds.filter((k) => !old.includes(k)).length, old.filter((k) => !kinds.includes(k)).length);
  if (changed >= 2) return [];
  const share = mercyBonuses(mercyTier(lossStreak(p, levelId))).memoryShare;
  return d.modes.slice(0, Math.floor(d.modes.length * share));
}
export function starsFor(o: BattleOutcome) { return !o.won ? 0 : o.timeLeftFrac > 0.5 ? 3 : o.timeLeftFrac > 0.25 ? 2 : 1; }
/** First win pays 1.35x, repeat wins 0.5x, losses 0.45x–0.65x by gate damage; +3 per tower destroyed. */
export function battleReward(level: LevelDef, prevStars: number, o: BattleOutcome, streak = 0) {
  const stars = starsFor(o);
  const k = o.won ? (prevStars === 0 ? 1.35 : 0.5) : Math.max(0.45 + 0.2 * o.gateFrac, mercyBonuses(mercyTier(streak)).lossGoldK);
  const gold = Math.round(level.gold * k + o.towersDown * 3);
  const newStars = Math.max(0, stars - prevStars);
  const skulls = o.won ? newStars * 2 + (prevStars === 0 ? 3 : 0) : 0;
  return { gold, skulls, stars, firstWin: o.won && prevStars === 0 };
}
export function applyBattle(p: Progress, level: LevelDef, o: BattleOutcome) {
  const prev = p.stars[level.id] ?? 0;
  const streak = lossStreak(p, level.id); const tier = mercyTier(streak);
  const r = battleReward(level, prev, o, streak);
  const stats = { ...p.stats, towers: p.stats.towers + o.towersDown, wins: p.stats.wins + (o.won ? 1 : 0), summoned: p.stats.summoned + (o.summoned ?? 0) };
  const owned = { ...p.owned }; const shardGifts = battleShards(p, level, prev, r.stars);
  const ms = o.won ? 0 : mercyBonuses(tier).lossShards;
  if (ms) { const w = p.squad.filter((id) => owned[id]).sort((a, b) => owned[a]!.lvl - owned[b]!.lvl)[0]; if (w) shardGifts.push({ id: w, n: ms }); }
  for (const g of shardGifts) { const o = owned[g.id]; if (o) owned[g.id] = { ...o, shards: o.shards + g.n }; }
  const nextStreak = o.won ? 0 : streak + 1;
  const mercyDiscount = p.mercyDiscount || (!o.won && nextStreak === MERCY_AT[2]);
  return { p: { ...p, owned, losses: { ...p.losses, [level.id]: nextStreak }, mercyDiscount, gold: p.gold + r.gold, skulls: p.skulls + r.skulls, stars: { ...p.stars, [level.id]: Math.max(prev, r.stars) }, stats,
    defense: o.won ? (p.defense?.level === level.id ? undefined : p.defense) : o.adapt?.length && o.squadKey ? { level: level.id, key: o.squadKey, modes: o.adapt } : p.defense }, reward: { ...r, shardGifts } };
}
/** From level SHARD_FROM_LEVEL on: first win gives +1 shard to every squad monster; first 3★ adds +2 to the weakest. Repeats give no shards (cases do). */
export const SHARD_FROM_LEVEL = 5;
export function battleShards(p: Progress, level: LevelDef, prevStars: number, stars: number): { id: MonsterId; n: number }[] {
  const out: { id: MonsterId; n: number }[] = [];
  const squad = p.squad.filter((id) => p.owned[id]);
  if (stars > 0 && prevStars === 0 && level.id >= SHARD_FROM_LEVEL) for (const id of squad) out.push({ id, n: 1 });
  if (!squad.length || stars === 0) return out;
  const weak = [...squad].sort((a, b) => p.owned[a]!.lvl - p.owned[b]!.lvl)[0]!;
  const add = (n: number) => { const e = out.find((x) => x.id === weak); if (e) e.n += n; else out.push({ id: weak, n }); };
  if (stars === 3 && prevStars < 3) add(2);
  return out;
}

// ---- daily reward (7-day streak, missing a day resets)
export const DAILY: { gold: number; skulls: number }[] = [
  { gold: 50, skulls: 0 }, { gold: 70, skulls: 0 }, { gold: 90, skulls: 2 }, { gold: 110, skulls: 0 },
  { gold: 140, skulls: 0 }, { gold: 170, skulls: 3 }, { gold: 220, skulls: 6 },
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

// ---- squad synergies
export function activeSynergies(squad: MonsterId[]): SynergyId[] {
  return SYNERGIES.filter((s) => squad.filter((m) => s.members.includes(m)).length >= s.need).map((s) => s.id);
}
export function synergyCount(squad: MonsterId[], id: SynergyId) { const s = SYNERGIES.find((x) => x.id === id)!; return squad.filter((m) => s.members.includes(m)).length; }

// ---- talents (paid with stars)
export function totalStars(p: Progress) { return Object.values(p.stars).reduce((a, b) => a + b, 0); }
export function spentStars(p: Progress) {
  let n = 0; for (const t of TALENTS) { const r = p.talents?.[t.id] ?? 0; for (let i = 0; i < r; i++) n += t.costs[i]!; } return n;
}
export function freeStars(p: Progress) { return totalStars(p) - spentStars(p); }
export function talentCost(p: Progress, id: TalentId) { const t = TALENTS.find((x) => x.id === id)!; return t.costs[p.talents?.[id] ?? 0] ?? null; }
export function buyTalent(p: Progress, id: TalentId): Progress | null {
  const c = talentCost(p, id); if (c === null || freeStars(p) < c) return null;
  return { ...p, talents: { ...p.talents, [id]: (p.talents?.[id] ?? 0) + 1 } };
}
export function resetTalents(p: Progress): Progress { return { ...p, talents: {} }; }
export interface BattleMods { adapt?: string[]; startEssenceMul?: number; essenceMul: number; armor: number; firstDiscount: number; statMul: number; towerDmgMul: number; speedMul: number; cooldownMul: number; spellCdMul: number }
export const NO_MODS: BattleMods = { essenceMul: 1, armor: 0, firstDiscount: 0, statMul: 1, towerDmgMul: 1, speedMul: 1, cooldownMul: 1, spellCdMul: 1 };
export function talentBonuses(p: Progress): BattleMods {
  const r = (id: TalentId) => p.talents?.[id] ?? 0;
  return { essenceMul: 1 + 0.05 * r("essence"), armor: 0.04 * r("armor"), firstDiscount: 0.4 * r("first"), statMul: 1 + 0.04 * r("gear"),
    towerDmgMul: 1 + 0.06 * r("fury"), speedMul: 1 + 0.05 * r("march"), cooldownMul: 1 - 0.06 * r("call"), spellCdMul: 1 - 0.1 * r("magic") };
}

// ---- menu attention badges
/** Some squad monster can be upgraded right now. */
export function squadUpgradeReady(p: Progress) { return p.squad.some((id) => canUpgrade(p, id)); }
/** Daily reward or any quest is ready to claim. */
export function rewardsReady(p: Progress, today: string) { return dailyAvailable(p, today) || QUESTS.some((q) => questState(p, q.id).done); }
/** Next level to play: the first unlocked level without stars, else the last one. */
export function nextLevelId(p: Progress) { const l = LEVELS.find((x) => isLevelUnlocked(p, x.id) && !(p.stars[x.id] ?? 0)); return (l ?? LEVELS[LEVELS.length - 1]!).id; }

// ---- story cutscenes
/** Prologue shown before the first level of a region, else null. */
export function prologueFor(p: Progress, levelId: number): string | null {
  const lv = LEVELS.find((l) => l.id === levelId); if (!lv) return null;
  const first = LEVELS.find((l) => l.loc === lv.loc)!;
  const id = "p" + lv.loc;
  return first.id === levelId && !p.story?.[id] ? id : null;
}
/** Epilogue due after beating a region's last level, then the final scene after the last region's epilogue. */
export function pendingEpilogue(p: Progress): string | null {
  const locs = [...new Set(LEVELS.map((l) => l.loc))];
  for (const loc of locs) {
    const last = LEVELS.filter((l) => l.loc === loc).at(-1)!;
    if ((p.stars[last.id] ?? 0) > 0 && !p.story?.["e" + loc]) return "e" + loc;
  }
  const lastLoc = locs.at(-1)!;
  if (p.story?.["e" + lastLoc] && !p.story?.["final"]) return "final";
  return null;
}
export function markClue(p: Progress, id: ClueId): Progress { return p.clues?.[id] ? p : { ...p, clues: { ...p.clues, [id]: true } }; }
export function foundClues(p: Progress): ClueId[] { return (Object.keys(CLUES) as ClueId[]).filter((c) => p.clues?.[c]); }
/** Latest status of a suspect, from the scenes already watched. */
export function suspectStatus(p: Progress, id: SuspectId): SuspectStatus {
  let st: SuspectStatus = "unknown";
  for (const s of SUSPECTS[id].status) if (p.story?.[s.after]) st = s.is;
  return st;
}
export function sceneUnlocked(p: Progress, id: string) { return !!p.story?.[id]; }
export function markScene(p: Progress, id: string): Progress { return { ...p, story: { ...p.story, [id]: true } }; }

// ---- first-time tutorials
export function tutorialDone(p: Progress, id: string) { return !!p.tutorials?.[id]; }
export function markTutorial(p: Progress, id: string): Progress { return { ...p, tutorials: { ...p.tutorials, [id]: true } }; }
export function resetTutorials(p: Progress): Progress { return { ...p, tutorials: {} }; }

/** Old saves: give missing starter monsters (and put them in the squad if there is room). */
export function migrateStarters(p: Progress): Progress {
  const owned = { ...p.owned }; let squad = [...p.squad];
  for (const id of STARTERS) if (!owned[id]) { owned[id] = { lvl: 1, shards: 0 }; if (squad.length < squadLimit(p)) squad = [...squad, id]; }
  return { ...p, owned, squad };
}

// ---- defeat advice
export interface DefeatInfo { gateFrac: number; towersDown: number; summoned: number; reached?: number; timeOut?: boolean }
/** One tip for the defeat screen, chosen from what most likely went wrong. */
export function defeatTip(p: Progress, d: DefeatInfo): string {
  const up = p.squad.filter((id) => canUpgrade(p, id)).sort((a, b) => (p.owned[a]?.lvl ?? 0) - (p.owned[b]?.lvl ?? 0))[0];
  if (d.reached !== undefined && d.summoned >= 6 && d.reached / d.summoned < 0.2) return "Отряд выкосили на подходе. Пусти вперёд танка (Тролль, Голем, Щитоносец): башни держат первую цель, а хрупкие бойцы проходят за ним.";
  if (up) return `Улучши «${MONSTERS[up].name}» в лагере — золота уже хватает.`;
  if (d.timeOut && d.gateFrac < 0.6 && (d.reached ?? 0) >= 5) return "Бойцы дошли, но не хватило осадного урона. Возьми Таран или Подрывника для решающего удара.";
  if (d.gateFrac < 0.3) return "Совсем чуть-чуть! Копи эссенцию и выпускай всех разом в конце.";
  if (activeSynergies(p.squad).length === 0) return "Собери синергию в отряде — например, 2 нежити дают Легион Тьмы.";
  if (d.towersDown === 0) return "Башни целы: отправь подрывников и троллей ломать их по пути.";
  if (d.summoned < 15) return "Призывай чаще: удерживай кнопку бойца для автопризыва.";
  return "Проходи прошлые уровни на 3★ и открывай кейсы, чтобы усилить Орду.";
}

// ---- exact ability numbers shown on monster cards (values mirror the battle engine)
export function abilityText(id: MonsterId, lvl: number): string[] {
  const d = MONSTERS[id]; const k = abilityMul(lvl); const r1 = (v: number) => Math.round(v * 10) / 10; const out: string[] = [];
  if (d.decoy) out.push("Башни в радиусе выбирают его целью первым");
  if (d.siege && d.siege !== 1) out.push(`Урон по воротам ×${d.siege}`);
  if (d.explode) out.push(`Взрыв: ${Math.round(d.explode.dmg * k * statMul(lvl, d.rarity))} урона в радиусе ${d.explode.radius}`);
  if (d.aura) out.push(`Лечит союзников на ${d.aura.heal} HP/с и ускоряет ×${d.aura.speed} в радиусе ${d.aura.radius}`);
  if (d.revive) out.push(`Встаёт один раз с ${Math.round(d.revive * k * 100)}% здоровья`);
  if (d.swarm) out.push(`Призывается стаей из ${d.swarm}`);
  if (d.stealth) out.push(`Невидим ${r1(d.stealth.dur * k)} с при появлении, после попадания снова на ${r1(1.5 * k)} с (раз в ${d.stealth.recloak} с)`);
  if (d.freeze) out.push(`Замораживает башню на ${r1(d.freeze.dur * k)} с каждые ${d.freeze.every} с`);
  if (d.deathBurst) out.push(`После смерти: ${Math.round(d.deathBurst.dmg * k)} урона в радиусе ${d.deathBurst.radius} и ${d.deathBurst.count} × ${MONSTERS[d.deathBurst.spawn].name}`);
  if (d.shieldAura) out.push(`Союзники в радиусе ${d.shieldAura.radius} получают на ${Math.round(Math.min(0.6, d.shieldAura.reduce * k) * 100)}% меньше урона`);
  if (d.lifesteal) out.push(`Лечится на ${Math.round(d.lifesteal * k * 100)}% нанесённого урона`);
  if (d.deathSpawn) out.push(`После смерти превращается в: ${MONSTERS[d.deathSpawn].name}`);
  if (d.rebirth) out.push(`Возрождается с полным здоровьем, невидим ${r1(d.rebirth.stealth * k)} с`);
  if (d.raise) out.push(`Поднимает скелета из павшего в радиусе ${d.raise.radius} каждые ${r1(d.raise.every / k)} с`);
  if (d.runeAura) out.push(`Отключает обелиски и колокола в радиусе ${d.runeAura}`);
  if (d.fireBreath) out.push("Жжёт огнём все башни в радиусе удара");
  if (d.blindOnSpawn) out.push(`Ослепляет все башни на ${r1(d.blindOnSpawn * k)} с`);
  if (d.arrowWeak) out.push(`Получает ×${d.arrowWeak} урона от стрел`);
  if (d.ranged) out.push(`Бьёт с ${d.ranged.range} px: ${Math.round(d.ranged.dmg * k * statMul(lvl, d.rarity))} урона каждые ${d.ranged.every} с, площадь ${d.ranged.splash}`);
  return out;
}

// ---- accusation on the clue board
/** Offered once, after the forest epilogue (Grosh cleared) and until the player chooses. */
export function accusationOpen(p: Progress) { return !!p.story?.["e3"] && !p.accusation; }
export function accuse(p: Progress, s: SuspectId): Progress { return p.accusation ? p : { ...p, accusation: s }; }
export function accusationScene(s: SuspectId) { return s === ACCUSE_RIGHT ? "acc_right" : "acc_" + s; }
export function accusedRight(p: Progress) { return p.accusation === ACCUSE_RIGHT; }
