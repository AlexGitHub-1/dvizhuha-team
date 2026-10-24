import { describe, expect, it } from "vitest";
import { LEVELS } from "@/game/data/levels";
import { applyBattle, battleReward, claimDaily, claimQuest, questState, shardsRequired, canUpgrade, PITY_AT, defaultProgress, isLevelUnlocked, monsterStats, openCase, rollRarity, squadLimit, toggleSquad, upgradeCost, upgradeMonster } from "@/game/meta/progress";

import { MONSTERS } from "@/game/data/monsters";
const MONSTERS_RARITY = (id: keyof typeof MONSTERS) => MONSTERS[id].rarity;
const L1 = LEVELS[0]!;

describe("monster upgrades", () => {
  it("each level adds 12% hp", () => {
    expect(monsterStats("troll", 1).hp).toBe(700);
    expect(monsterStats("troll", 2).hp).toBe(784);
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
  it("starts with 4 slots and refuses a 5th until level 4 cleared", () => {
    const p = { ...defaultProgress(), owned: { ...defaultProgress().owned, rat: { lvl: 1, shards: 0 } } };
    expect(squadLimit(p)).toBe(4);
    expect(toggleSquad(p, "rat").squad).toHaveLength(4);
    expect(toggleSquad({ ...p, stars: { 4: 1 } }, "rat").squad).toHaveLength(5);
  });
});

describe("cases", () => {
  it("rolls rarity by odds", () => {
    expect(rollRarity({ common: 70, rare: 30 }, 0.69)).toBe("common");
    expect(rollRarity({ common: 70, rare: 30 }, 0.71)).toBe("rare");
  });
  it("costs 300 gold for the rusty chest and duplicates become shards", () => {
    const p = { ...defaultProgress(), gold: 300 };
    const r = openCase(p, "rusty", () => 0)!; // common, first in pool = goblin (owned)
    expect(r.p.gold).toBe(0);
    expect(r.result.isNew).toBe(false);
    expect(r.p.owned.goblin!.shards).toBe(2);
    expect(openCase({ ...p, gold: 299 }, "rusty")).toBeNull();
  });
});

describe("battle rewards", () => {
  it("losing still pays gold based on gate damage", () => {
    expect(battleReward(L1, 0, { won: false, gateFrac: 0.5, towersDown: 2, timeLeftFrac: 0 }).gold).toBe(Math.round(140 * 0.5) + 10);
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
  it("first win pays 1.5x level gold, repeat wins 0.8x", () => {
    const win = { won: true, gateFrac: 1, towersDown: 0, timeLeftFrac: 0.6 };
    expect(battleReward(L1, 0, win).gold).toBe(210);
    expect(battleReward(L1, 3, win).gold).toBe(112);
  });
  it("upgrades from level 5 need shards and are 20% cheaper", () => {
    expect(shardsRequired(4)).toBe(0); expect(shardsRequired(5)).toBe(1); expect(shardsRequired(9)).toBe(3);
    const base = defaultProgress();
    const p = { ...base, gold: 99999, owned: { ...base.owned, goblin: { lvl: 5, shards: 0 } } };
    expect(canUpgrade(p, "goblin")).toBe(false);
    const n = upgradeMonster({ ...p, owned: { ...p.owned, goblin: { lvl: 5, shards: 1 } } }, "goblin")!;
    expect(n.owned.goblin).toEqual({ lvl: 6, shards: 0 });
    expect(upgradeCost("common", 5, 1)).toBe(Math.round(50 * Math.pow(1.45, 4) * 0.8));
  });
  it("pity guarantees epic on the 10th case", () => {
    const p = { ...defaultProgress(), gold: 300, pity: PITY_AT - 1 };
    const r = openCase(p, "rusty", () => 0)!;
    expect(MONSTERS_RARITY(r.result.id)).toBe("epic"); expect(r.p.pity).toBe(0); expect(r.result.pity).toBe(true);
  });
  it("daily streak grows on consecutive days and resets after a gap", () => {
    const a = claimDaily(defaultProgress(), "2026-10-01")!; expect(a.p.streak).toBe(1); expect(a.reward.gold).toBe(80);
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
    expect(place(p, "shaman", 0).squad).toEqual(["shaman", "goblin", "troll", "sapper"]);
  });
  it("refuses to add a 5th monster while only 4 slots are open", () => {
    const p = { ...fresh(), owned: { ...fresh().owned, skeleton: { lvl: 1, shards: 0 } } };
    expect(place(p, "skeleton", 1).squad).toEqual(p.squad);
  });
  it("adds at the dropped position when a slot is free", () => {
    const p = { ...fresh(), squad: ["goblin", "troll", "sapper"] as ReturnType<typeof fresh>["squad"] };
    expect(place(p, "shaman", 1).squad).toEqual(["goblin", "shaman", "troll", "sapper"]);
  });
});
