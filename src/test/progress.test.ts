import { describe, expect, it } from "vitest";
import { LEVELS } from "@/game/data/levels";
import { upgradeAll, applyBattle, battleReward, claimDaily, claimQuest, questState, shardsRequired, canUpgrade, PITY_AT, defaultProgress, isLevelUnlocked, monsterStats, openCase, rollRarity, squadLimit, toggleSquad, upgradeCost, upgradeMonster } from "@/game/meta/progress";

import { MONSTERS } from "@/game/data/monsters";
const MONSTERS_RARITY = (id: keyof typeof MONSTERS) => MONSTERS[id].rarity;
const L1 = LEVELS[0]!;

describe("monster upgrades", () => {
  it("each level adds 9% hp for commons (troll 380)", () => {
    expect(monsterStats("troll", 1).hp).toBe(380);
    expect(monsterStats("troll", 2).hp).toBe(Math.round(380 * 1.09));
  });
  it("shards give 10% discount each, max 5", () => {
    expect(upgradeCost("common", 1, 0)).toBe(50);
    expect(upgradeCost("common", 1, 2)).toBe(40);
    expect(upgradeCost("common", 1, 9)).toBe(25);
  });
  it("upgrade spends gold and raises level, fails when poor", () => {
    const p = { ...defaultProgress(), gold: 100 };
    const n = upgradeMonster(p, "goblin")!;
    expect(n.gold).toBe(50); expect(n.owned.goblin!.lvl).toBe(2);
    expect(upgradeMonster({ ...p, gold: 10 }, "goblin")).toBeNull();
  });
});

describe("squad", () => {
  it("starts with 5 slots and refuses a 6th until level 8 cleared", () => {
    const p = { ...defaultProgress(), owned: { ...defaultProgress().owned, rat: { lvl: 1, shards: 0 } } };
    expect(squadLimit(p)).toBe(5);
    expect(toggleSquad(p, "rat").squad).toHaveLength(5);
    expect(toggleSquad({ ...p, stars: { 8: 1 } }, "rat").squad).toHaveLength(6);
  });
});

describe("cases", () => {
  it("rolls rarity by odds", () => {
    expect(rollRarity({ common: 70, rare: 30 }, 0.69)).toBe("common");
    expect(rollRarity({ common: 70, rare: 30 }, 0.71)).toBe("rare");
  });
  it("costs 180 gold for the rusty chest and duplicates become shards", () => {
    const p = { ...defaultProgress(), gold: 180 };
    const r = openCase(p, "rusty", () => 0)!; // common, first in pool = goblin (owned)
    expect(r.p.gold).toBe(0);
    expect(r.result.isNew).toBe(false);
    expect(r.p.owned.goblin!.shards).toBe(3);
    expect(openCase({ ...p, gold: 179 }, "rusty")).toBeNull();
  });
});

describe("battle rewards", () => {
  it("losing still pays gold based on gate damage", () => {
    expect(battleReward(L1, 0, { won: false, gateFrac: 0.5, towersDown: 2, timeLeftFrac: 0 }).gold).toBe(Math.round(110 * 0.55) + 6);
  });
  it("first win gives stars and skulls and unlocks next level", () => {
    const p = defaultProgress();
    expect(isLevelUnlocked(p, 2)).toBe(false);
    const r = applyBattle(p, L1, { won: true, gateFrac: 1, towersDown: 0, timeLeftFrac: 0.6 });
    expect(r.reward.stars).toBe(3); expect(r.reward.skulls).toBe(9);
    expect(isLevelUnlocked(r.p, 2)).toBe(true);
  });
});

describe("economy v2", () => {
  it("first win pays 1.2x level gold, repeat wins 0.5x", () => {
    const win = { won: true, gateFrac: 1, towersDown: 0, timeLeftFrac: 0.6 };
    expect(battleReward(L1, 0, win).gold).toBe(149);
    expect(battleReward(L1, 3, win).gold).toBe(35);
  });
  it("upgrades from level 5 need shards and are 20% cheaper", () => {
    expect(shardsRequired(4)).toBe(0); expect(shardsRequired(5)).toBe(1); expect(shardsRequired(7)).toBe(1); expect(shardsRequired(9)).toBe(2);
    const base = defaultProgress();
    const p = { ...base, gold: 99999, owned: { ...base.owned, goblin: { lvl: 5, shards: 0 } } };
    expect(canUpgrade(p, "goblin")).toBe(false);
    const n = upgradeMonster({ ...p, owned: { ...p.owned, goblin: { lvl: 5, shards: 1 } } }, "goblin")!;
    expect(n.owned.goblin).toEqual({ lvl: 6, shards: 0 });
    expect(upgradeCost("common", 5, 1)).toBe(Math.round(50 * Math.pow(1.6, 4) * 0.8));
  });
  it("pity guarantees epic on the 10th case", () => {
    const p = { ...defaultProgress(), gold: 300, pity: PITY_AT - 1 };
    const r = openCase(p, "rusty", () => 0)!;
    expect(MONSTERS_RARITY(r.result.id)).toBe("epic"); expect(r.p.pity).toBe(0); expect(r.result.pity).toBe(true);
  });
  it("daily streak grows on consecutive days and resets after a gap", () => {
    const a = claimDaily(defaultProgress(), "2026-10-01")!; expect(a.p.streak).toBe(1); expect(a.reward.gold).toBe(50);
    expect(claimDaily(a.p, "2026-10-01")).toBeNull();
    const b = claimDaily(a.p, "2026-10-02")!; expect(b.p.streak).toBe(2);
    expect(claimDaily(b.p, "2026-10-05")!.p.streak).toBe(1);
  });
  it("quest targets grow each claim", () => {
    const p = { ...defaultProgress(), stats: { towers: 20, wins: 0, summoned: 0, cases: 0 } };
    expect(questState(p, "towers").done).toBe(true);
    const n = claimQuest(p, "towers")!; expect(n.gold).toBe(150);
    expect(questState(n, "towers").target).toBe(40);
  });
});

import { placeInSquad as place } from "@/game/meta/progress";
import { defaultProgress as fresh } from "@/game/meta/progress";
describe("squad drag and drop", () => {
  it("reorders a squad member to a new position", () => {
    const p = fresh();
    expect(place(p, "shaman", 0).squad).toEqual(["shaman", "goblin", "troll", "sapper", "skeleton"]);
  });
  it("refuses to add a 6th monster while only 5 slots are open", () => {
    const p = { ...fresh(), owned: { ...fresh().owned, rat: { lvl: 1, shards: 0 } } };
    expect(place(p, "rat", 1).squad).toEqual(p.squad);
  });
  it("adds at the dropped position when a slot is free", () => {
    const p = { ...fresh(), squad: ["goblin", "troll", "sapper"] as ReturnType<typeof fresh>["squad"] };
    expect(place(p, "shaman", 1).squad).toEqual(["goblin", "shaman", "troll", "sapper"]);
  });
});

import { activeSynergies, buyTalent, freeStars, resetTalents, talentBonuses } from "@/game/meta/progress";
describe("synergies and talents", () => {
  it("goblin pack needs 3 goblin-kind monsters", () => {
    expect(activeSynergies(["goblin", "sapper"])).not.toContain("pack");
    expect(activeSynergies(["goblin", "sapper", "ram"])).toContain("pack");
  });
  it("siege fist needs 2 heavy monsters, dark legion 2 undead", () => {
    expect(activeSynergies(["troll", "golem"])).toContain("fist");
    expect(activeSynergies(["skeleton", "ghost"])).toContain("legion");
    expect(activeSynergies(["skeleton", "troll"])).toEqual([]);
  });
  it("talents cost stars and cannot overspend", () => {
    const p = { ...defaultProgress(), stars: { 1: 3 } };
    const a = buyTalent(p, "essence")!; expect(a.talents.essence).toBe(1); expect(freeStars(a)).toBe(0);
    expect(buyTalent(a, "armor")).toBeNull();
    expect(talentBonuses(a).essenceMul).toBeCloseTo(1.05);
    expect(freeStars(resetTalents(a))).toBe(3);
  });
});

import { nextLevelId, rewardsReady, squadUpgradeReady } from "@/game/meta/progress";
describe("menu badges", () => {
  it("upgrade badge shows only when gold covers a squad upgrade", () => {
    const p = fresh();
    expect(squadUpgradeReady({ ...p, gold: 49 })).toBe(false);
    expect(squadUpgradeReady({ ...p, gold: 50 })).toBe(true);
  });
  it("rewards badge shows when daily is unclaimed today", () => {
    const p = fresh();
    expect(rewardsReady(p, "2026-10-24")).toBe(true);
    expect(rewardsReady({ ...p, lastDaily: "2026-10-24" }, "2026-10-24")).toBe(false);
  });
  it("next level is the first unlocked level without stars", () => {
    expect(nextLevelId(fresh())).toBe(1);
    expect(nextLevelId({ ...fresh(), stars: { 1: 3, 2: 1 } })).toBe(3);
  });
});

import { defaultProgress as dp2, markTutorial, resetTutorials, tutorialDone } from "@/game/meta/progress";
describe("first-time tutorials", () => {
  it("a new player has not seen the battle tutorial", () => { expect(tutorialDone(dp2(), "battle")).toBe(false); });
  it("once shown, a tutorial stays done and others stay pending", () => {
    const p = markTutorial(dp2(), "squad");
    expect(tutorialDone(p, "squad")).toBe(true); expect(tutorialDone(p, "talents")).toBe(false);
  });
  it("reset shows all tutorials again", () => { expect(tutorialDone(resetTutorials(markTutorial(dp2(), "shop")), "shop")).toBe(false); });
});

describe("new talent branches", () => {
  it("fury, march, call and magic give their bonuses per rank", () => {
    const p = { ...defaultProgress(), talents: { fury: 2, march: 1, call: 3, magic: 2 } };
    const m = talentBonuses(p);
    expect(m.towerDmgMul).toBeCloseTo(1.12); expect(m.speedMul).toBeCloseTo(1.05);
    expect(m.cooldownMul).toBeCloseTo(0.82); expect(m.spellCdMul).toBeCloseTo(0.8);
  });
  it("a maxed talent cannot be bought further", () => {
    const p = { ...defaultProgress(), stars: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, 3])), talents: { march: 3 } };
    expect(buyTalent(p, "march")).toBeNull();
  });
});

import { migrateStarters, squadLimit as sl } from "@/game/meta/progress";
describe("squad of five", () => {
  it("new player owns 5 monsters, all in a 5-slot squad", () => {
    const p = fresh(); expect(Object.keys(p.owned)).toHaveLength(5); expect(p.squad).toHaveLength(5); expect(sl(p)).toBe(5);
    expect(p.owned.skeleton?.lvl).toBe(1);
  });
  it("slot 6 opens after level 8", () => { expect(sl({ ...fresh(), stars: { 8: 1 } })).toBe(6); });
  it("old save without skeleton gets it and a squad place", () => {
    const old = fresh(); delete old.owned.skeleton; old.squad = old.squad.filter((x) => x !== "skeleton");
    const m = migrateStarters(old); expect(m.owned.skeleton?.lvl).toBe(1); expect(m.squad).toContain("skeleton");
  });
});

describe("bomber stats", () => {
  it("sapper shows blast damage that grows with level", () => {
    expect(monsterStats("sapper", 1).blast).toBe(200);
    expect(monsterStats("sapper", 2).blast).toBeGreaterThan(200);
    expect(monsterStats("goblin", 1).blast).toBe(0);
  });
});

import { defeatTip } from "@/game/meta/progress";
describe("defeat tip", () => {
  it("suggests an affordable upgrade first", () => {
    expect(defeatTip({ ...fresh(), gold: 10000 }, { gateFrac: 0.5, towersDown: 3, summoned: 30 })).toContain("Улучши");
  });
  it("says it was close when the gate is almost down and nothing is affordable", () => {
    expect(defeatTip(fresh(), { gateFrac: 0.1, towersDown: 3, summoned: 30 })).toContain("чуть-чуть");
  });
});

import { abilityText as _abilityText } from "@/game/meta/progress";
describe("abilityText", () => {
  it("golem freezes towers for 2 s every 2.5 s at level 1", () => { expect(_abilityText("golem", 1)).toContain("Замораживает башню на 2 с каждые 2.5 с"); });
  it("shaman heals 10 HP/s in radius 110", () => { expect(_abilityText("shaman", 1)[0]).toBe("Лечит союзников на 10 HP/с и ускоряет ×1.3 в радиусе 110"); });
  it("ability strength grows at level 5", () => { expect(_abilityText("golem", 5)).toContain("Замораживает башню на 2.5 с каждые 2.5 с"); });
});

describe("shard rewards", () => {
  const L5 = LEVELS[4]!; const win = { won: true, gateFrac: 1, towersDown: 0, timeLeftFrac: 0.1 };
  it("first win from level 5 gives every squad monster 1 shard", () => {
    const p = defaultProgress(); const r = applyBattle(p, L5, win);
    for (const id of p.squad) expect(r.p.owned[id]!.shards).toBe(1);
  });
  it("no shards before level 5 or on a loss", () => {
    const p = defaultProgress();
    expect(applyBattle(p, LEVELS[3]!, win).reward.shardGifts).toEqual([]);
    expect(applyBattle(p, L5, { ...win, won: false }).reward.shardGifts).toEqual([]);
  });
  it("a repeat win gives no shards (they come from cases)", () => {
    const base = defaultProgress(); const p = { ...base, stars: { 5: 1 } };
    expect(applyBattle(p, L5, win).reward.shardGifts).toEqual([]);
  });
});

describe("upgrade all", () => {
  it("raises the weakest squad monsters first and stops when gold runs out", () => {
    const base = defaultProgress(); const [a, b] = base.squad;
    const p = { ...base, gold: 100, owned: { ...base.owned, [a!]: { lvl: 3, shards: 0 } } };
    const r = upgradeAll(p);
    expect(r.count).toBe(2);
    expect(r.p.owned[a!]!.lvl).toBe(3);
    expect(r.p.owned[b!]!.lvl).toBe(2);
    expect(r.p.gold).toBe(0);
  });
});
