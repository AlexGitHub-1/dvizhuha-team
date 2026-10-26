import { describe, expect, it } from "vitest";
import { createBattle, defenseAI, spawnUnit, ADAPT } from "@/game/engine/battle";
import { LEVELS } from "@/game/data/levels";
import { applyBattle, defaultProgress, defenseMemory, LEGEND_PITY_AT, maxLvl, openCase, battleReward, canUpgrade, squadKey, upgradeCost, NO_MODS } from "@/game/meta/progress";
import { MONSTERS } from "@/game/data/monsters";

describe("rarity caps", () => {
  it("commons cap at 6, rares at 8, epics and above at 10", () => {
    expect(maxLvl("troll")).toBe(6); expect(maxLvl("golem")).toBe(8); expect(maxLvl("vampire")).toBe(10); expect(maxLvl("dragon")).toBe(10);
    const b = defaultProgress(); expect(canUpgrade({ ...b, gold: 1e6, owned: { ...b.owned, troll: { lvl: 6, shards: 99 } } }, "troll")).toBe(false);
  });
  it("each upgrade costs 1.6x the previous one", () => {
    expect(upgradeCost("rare", 3, 0) / upgradeCost("rare", 2, 0)).toBeCloseTo(1.6, 2);
  });
});
describe("economy", () => {
  it("a repeat win pays 32% of level gold", () => {
    const w = { won: true, gateFrac: 1, towersDown: 0, timeLeftFrac: 0.6 };
    expect(battleReward(LEVELS[5]!, 1, w).gold).toBe(Math.round(LEVELS[5]!.gold * 0.32));
  });
  it("the 40th case without a legendary is legendary", () => {
    const p = { ...defaultProgress(), gold: 220, pity: 0, pityLeg: LEGEND_PITY_AT - 1 };
    const r = openCase(p, "rusty", () => 0)!;
    expect(MONSTERS[r.result.id].rarity).toBe("legendary"); expect(r.p.pityLeg).toBe(0);
  });
});
describe("smart towers", () => {
  const battle = () => createBattle(LEVELS[8]!, [{ kind: "troll", lvl: 1 }], "march");
  it("switch to armour-piercing against an armoured army", () => {
    const b = battle(); for (let i = 0; i < 4; i++) spawnUnit(b, "golem", 1, i * 10); defenseAI(b, ADAPT.every);
    expect(b.ai.modes.has("pierce")).toBe(true);
  });
  it("switch to splash against a swarm", () => {
    const b = battle(); for (let i = 0; i < 8; i++) spawnUnit(b, "rat", 1, i * 5); defenseAI(b, ADAPT.every);
    expect(b.ai.modes.has("splash")).toBe(true);
  });
  it("turn on searchlights after two invisible units", () => {
    const b = battle(); b.ai.seen.ghost = 2; defenseAI(b, ADAPT.every);
    expect(b.ai.modes.has("reveal")).toBe(true);
  });
  it("remember a squad that lost and start the rematch adapted; a different squad starts clean", () => {
    const lv = LEVELS[8]!; const p = defaultProgress();
    const lost = applyBattle(p, lv, { won: false, gateFrac: 0.3, towersDown: 0, timeLeftFrac: 0, adapt: ["pierce"], squadKey: squadKey(p.squad) }).p;
    expect(defenseMemory(lost, lv.id, p.squad)).toEqual(["pierce"]);
    expect(defenseMemory(lost, lv.id, ["troll"])).toEqual([]);
    expect(createBattle(lv, [{ kind: "troll", lvl: 1 }], "march", { ...NO_MODS, adapt: ["pierce"] }).ai.modes.has("pierce")).toBe(true);
  });
});
