import { describe, expect, it } from "vitest";
import { simulate } from "@/game/engine/sim";
import { LEVELS, REC_TIER, RECOMMENDED_LVL } from "@/game/data/levels";
import { battleReward, requiredPower, upgradeCost } from "@/game/meta/progress";
import { STARTERS } from "@/game/data/monsters";

const starters = (lvl: number) => STARTERS.map((kind) => ({ kind, lvl }));

describe("balance rules", () => {
  it("level 1 cannot be beaten by the un-upgraded starter squad", () => {
    expect(simulate(1, starters(1), 2).won).toBe(false);
  });
  it("level 1 is beatable after upgrading the squad to level 3", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].some((s) => simulate(1, starters(3), s).won)).toBe(true);
  });
  it("a total loss on level 1 still pays at least the cost of the first common upgrade", () => {
    const g = battleReward(LEVELS[0]!, 0, { won: false, gateFrac: 0, towersDown: 0, timeLeftFrac: 0 }).gold;
    expect(g).toBeGreaterThanOrEqual(upgradeCost("common", 1, 0));
  });
  it("required squad power never drops across the campaign", () => {
    expect(RECOMMENDED_LVL).toHaveLength(24);
    for (let i = 2; i <= 24; i++) expect(requiredPower(i)).toBeGreaterThanOrEqual(requiredPower(i - 1));
  });
  it("regions III+ ask for rares, the final region for max epics", () => {
    expect(REC_TIER[8]!.rarity).toBe("rare"); expect(REC_TIER[23]).toEqual({ rarity: "epic", lvl: 10 });
  });
  it("commons at their cap (6) lose the final level, a max legendary squad wins it", () => {
    const commons = STARTERS.map((kind) => ({ kind, lvl: 6 }));
    const rares = (["golem", "orc", "ram", "fatty", "ghost"] as const).map((kind) => ({ kind, lvl: 8 }));
    const best = (["dragon", "abyss", "vampire", "necro", "catapult"] as const).map((kind) => ({ kind, lvl: 10 }));
    expect([1, 2, 3].some((s) => simulate(24, commons, s).won)).toBe(false);
    expect([1, 2, 3].some((s) => simulate(24, rares, s).won)).toBe(false);
    expect([1, 2, 3].every((s) => simulate(24, best, s).won)).toBe(true);
  }, 60000);
});
