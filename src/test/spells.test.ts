import { describe, expect, it } from "vitest";
import { LEVELS } from "@/game/data/levels";
import { createBattle, castSpell, spawnUnit, update } from "@/game/engine/battle";
import { SPELLS, SPELL_ORDER } from "@/game/data/shop";
import { MONSTERS } from "@/game/data/monsters";
import { TOWERS, towerScale } from "@/game/data/towers";

const sq = [{ kind: "troll" as const, lvl: 3 }, { kind: "skeleton" as const, lvl: 3 }];
const withTroll = (s: (typeof SPELL_ORDER)[number]) => { const b = createBattle(LEVELS[0]!, sq, s); spawnUnit(b, "troll", 1, 300); update(b, 1 / 30); return b; };

describe("commander spells", () => {
  it("every spell casts with troops on the field and starts its cooldown", () => {
    for (const s of SPELL_ORDER) { const b = withTroll(s); expect(castSpell(b), s).toBe(true); expect(b.spellCd, s).toBeCloseTo(SPELLS[s].cooldown); }
  });
  it("raise works on an empty field and raises at least 3 skeletons", () => {
    const b = createBattle(LEVELS[0]!, sq, "raise");
    expect(castSpell(b)).toBe(true);
    expect(b.units.filter((u) => u.minion && !u.dead).length).toBeGreaterThanOrEqual(3);
  });
  it("march speeds troops, darkness blinds, smoke clouds, berserk enrages", () => {
    let b = withTroll("march"); castSpell(b); expect(b.marchT).toBeGreaterThan(0);
    b = withTroll("darkness"); castSpell(b); expect(b.darkT).toBe(4);
    b = withTroll("smoke"); castSpell(b); expect(b.smoke).not.toBeNull();
    b = withTroll("berserk"); castSpell(b); expect(b.berserkT).toBe(5);
  });
  it("bloodrain and meteor damage towers", () => {
    for (const s of ["bloodrain", "meteor"] as const) { const b = withTroll(s); const hp = b.towers.reduce((a, t) => a + t.hp, 0); castSpell(b); expect(b.towers.reduce((a, t) => a + t.hp, 0), s).toBeLessThan(hp); }
  });
});

describe("balance fixes", () => {
  it("sapper blast hits towers at 75% strength", () => { expect(MONSTERS.sapper.explode!.towerMul).toBe(0.75); });
  it("towers reach the dragon from 1.8x their range, but not from 2.5x", () => {
    const b = createBattle(LEVELS[0]!, sq, "march"); const d = spawnUnit(b, "dragon", 1, 10); update(b, 1 / 30);
    const t = b.towers.find((x) => x.kind === "archer" || x.kind === "cannon")!; b.towers = [t]; t.cd = 0;
    const r = TOWERS[t.kind].range * towerScale(t.lvl).range;
    t.x = d.x + r * 1.7; t.y = d.y; t.aim = null; update(b, 1 / 60); expect(t.aim).toBe(d);
    t.x = d.x + r * 2.5; t.aim = null; update(b, 1 / 60); expect(t.aim).toBeNull();
  });
});

describe("catapult recoil", () => {
  it("each shot costs 8% of max health, so it falls apart after about 12 volleys", () => {
    const b = createBattle(LEVELS[0]!, sq, "march"); b.towers = b.towers.slice(0, 1); const t = b.towers[0]!; t.hp = 1e9; t.maxHp = 1e9; t.cd = 1e9;
    const c = spawnUnit(b, "catapult", 1, 10); t.x = c.x + 100; t.y = c.y; t.kind = "archer";
    update(b, 1 / 30); expect(c.hp).toBeCloseTo(c.maxHp * 0.92);
    for (let i = 0; i < 30 * 60; i++) update(b, 1 / 30);
    expect(c.dead).toBe(true);
  });
});
