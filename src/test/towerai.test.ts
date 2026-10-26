import { describe, expect, it } from "vitest";
import { LEVELS } from "@/game/data/levels";
import { ADAPT, createBattle, launchWave, spawnUnit, threatScore, update } from "@/game/engine/battle";

const lvl = (id: number) => LEVELS[id - 1]!;
const squad = [{ kind: "troll" as const, lvl: 3 }, { kind: "skeleton" as const, lvl: 3 }, { kind: "rat" as const, lvl: 3 }];

describe("garrison AI", () => {
  it("region I has no obstacles; region II one barricade, region IV two", () => {
    expect(createBattle(lvl(1), squad, "march").obstacles).toHaveLength(0);
    expect(createBattle(lvl(5), squad, "march").obstacles.filter((o) => o.kind === "barricade")).toHaveLength(1);
    expect(createBattle(lvl(13), squad, "march").obstacles.filter((o) => o.kind === "barricade")).toHaveLength(2);
  });
  it("a barricade stops walkers until it is broken", () => {
    const b = createBattle(lvl(5), squad, "march"); b.towers = [];
    const bar = b.obstacles.find((o) => o.kind === "barricade")!;
    const u = spawnUnit(b, "troll", 1, bar.d - 20);
    for (let i = 0; i < 30; i++) update(b, 1 / 30);
    expect(u.d).toBeLessThan(bar.d);
    bar.hp = 0; for (let i = 0; i < 30; i++) update(b, 1 / 30);
    expect(u.d).toBeGreaterThan(bar.d);
  });
  it("a troll next to a charging tower breaks its super", () => {
    const b = createBattle(lvl(1), squad, "march"); const t = b.towers[0]!;
    t.superT = 1; t.charge = 1; const u = spawnUnit(b, "troll", 1, 200); t.x = u.x + 20; t.y = u.y;
    update(b, 1 / 30);
    expect(t.superT).toBe(0); expect(t.charge).toBe(ADAPT.breakKeep);
  });
  it("heavy guns prefer slowed targets; the marked unit is preferred", () => {
    const b = createBattle(lvl(1), squad, "march"); const cannon = b.towers.find((t) => t.kind === "cannon")!;
    const a = spawnUnit(b, "skeleton", 1, 100), c = spawnUnit(b, "skeleton", 1, 100);
    c.slowT = 1; expect(threatScore(b, cannon, c)).toBeGreaterThan(threatScore(b, cannon, a));
    c.slowT = 0; b.mark = { u: a, t: 2, cd: 5 }; expect(threatScore(b, cannon, a)).toBeGreaterThan(threatScore(b, cannon, c));
  });
  it("garrison panics below 30% gate and rages in the last 15 seconds", () => {
    const b = createBattle(lvl(1), squad, "march");
    b.gateHp = b.gateMax * 0.25; update(b, 1 / 30); expect(b.stance).toBe("panic");
    b.gateHp = b.gateMax; b.time = b.level.timeLimit - 10; update(b, 1 / 30); expect(b.stance).toBe("fury");
  });
  it("a wave waits for essence for all members, then releases all of them", () => {
    const b = createBattle(lvl(1), squad, "march"); b.towers = [];
    b.essence = 50; launchWave(b, [0, 1, 2]);
    update(b, 1 / 30); expect(b.stats.summoned).toBe(0);
    b.essence = 400; for (let i = 0; i < 60; i++) update(b, 1 / 30);
    expect(b.stats.summoned).toBe(3); expect(b.wave).toHaveLength(0);
  });
});
