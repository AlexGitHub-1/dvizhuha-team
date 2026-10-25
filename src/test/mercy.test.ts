import { describe, expect, it } from "vitest";
import { LEVELS } from "@/game/data/levels";
import { applyBattle, battleReward, defaultProgress, defenseMemory, lossStreak, mercyBonuses, mercyTier, squadKey, upgradeCost, upgradePrice, upgradeMonster, type Progress } from "@/game/meta/progress";

const L = LEVELS[2]!;
const loss = { won: false, gateFrac: 0, towersDown: 0, timeLeftFrac: 0 };
const loseN = (p: Progress, n: number) => { for (let i = 0; i < n; i++) p = applyBattle(p, L, loss).p; return p; };

describe("Horde Support", () => {
  it("tiers start at 3, 5 and 8 losses in a row", () => {
    expect([2, 3, 4, 5, 7, 8].map(mercyTier)).toEqual([0, 1, 1, 2, 2, 3]);
  });
  it("tier 1 gives +15% start essence and 1 shard, tier 2 gives +25% and 2 shards", () => {
    expect(mercyBonuses(1)).toMatchObject({ startEssenceMul: 1.15, lossShards: 1 });
    expect(mercyBonuses(2)).toMatchObject({ startEssenceMul: 1.25, lossShards: 2 });
  });
  it("a win resets the loss streak", () => {
    const p = applyBattle(loseN(defaultProgress(), 4), L, { won: true, gateFrac: 0, towersDown: 0, timeLeftFrac: 0.6 }).p;
    expect(lossStreak(p, L.id)).toBe(0);
  });
  it("from tier 2 a loss pays at least 80% of the level gold", () => {
    expect(battleReward(L, 0, loss, 5).gold).toBe(Math.round(L.gold * 0.8));
  });
  it("a loss at tier 1 gives one shard to the weakest squad fighter", () => {
    const p = loseN(defaultProgress(), 3); const total = (q: Progress) => Object.values(q.owned).reduce((s, o) => s + o!.shards, 0);
    expect(total(applyBattle(p, L, loss).p) - total(p)).toBe(1);
  });
  it("the 8th loss in a row grants a one-time 30% upgrade discount", () => {
    let p = { ...loseN(defaultProgress(), 8), gold: 10000 };
    expect(upgradePrice(p, "troll")).toBe(Math.round(upgradeCost("common", 1, p.owned.troll!.shards) * 0.7));
    p = upgradeMonster(p, "troll")!;
    expect(p.mercyDiscount).toBe(false);
  });
  it("defence memory halves at 3 losses and is gone at 5", () => {
    const squad = defaultProgress().squad;
    const base = { ...defaultProgress(), defense: { level: L.id, key: squadKey(squad), modes: ["pierce", "splash"] } };
    expect(defenseMemory(base, L.id, squad)).toEqual(["pierce", "splash"]);
    expect(defenseMemory({ ...base, losses: { [L.id]: 3 } }, L.id, squad)).toEqual(["pierce"]);
    expect(defenseMemory({ ...base, losses: { [L.id]: 5 } }, L.id, squad)).toEqual([]);
  });
  it("swapping 2 fighters makes the defence forget, swapping 1 does not", () => {
    const squad = defaultProgress().squad;
    const base = { ...defaultProgress(), defense: { level: L.id, key: squadKey(squad), modes: ["pierce"] } };
    expect(defenseMemory(base, L.id, [...squad.slice(0, 4), "orc"])).toEqual(["pierce"]);
    expect(defenseMemory(base, L.id, [...squad.slice(0, 3), "orc", "ram"])).toEqual([]);
  });
});
