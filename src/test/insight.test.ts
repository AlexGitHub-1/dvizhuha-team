import { describe, expect, it } from "vitest";
import { LEVELS } from "@/game/data/levels";
import { ADAPT, createBattle, doomed, spawnUnit, summon, update, type Battle } from "@/game/engine/battle";
import { defeatBreakdown, garrisonScout } from "@/game/meta/progress";

const lvl = (id: number) => LEVELS[id - 1]!;
const squad = [{ kind: "troll" as const, lvl: 3 }, { kind: "shaman" as const, lvl: 3 }, { kind: "vampire" as const, lvl: 3 }];
const tick = (b: Battle, sec: number) => { for (let i = 0; i < sec * 30; i++) update(b, 1 / 30); };

describe("smart garrison", () => {
  it("a unit already hit by lethal shots in flight is doomed", () => {
    const b = createBattle(lvl(1), squad, "march"); const u = spawnUnit(b, "skeleton", 1, 100);
    expect(doomed(b, u)).toBe(false);
    b.projs.push({ kind: "arrow", x: 0, y: 0, sx: 0, sy: 0, tx: 0, ty: 0, t: 0, dur: 1, target: u, dmg: u.hp * 2, splash: 0, lvl: 1 });
    expect(doomed(b, u)).toBe(true);
  });
  it("a free ballista snipes the support when the tank is already under fire of 2 towers", () => {
    const b = createBattle(lvl(21), squad, "march"); b.towers = b.towers.slice(0, 3);
    const [a, c, bal] = b.towers as [typeof b.towers[0], typeof b.towers[0], typeof b.towers[0]]; bal.kind = "ballista";
    const tank = spawnUnit(b, "troll", 1, 300); const sham = spawnUnit(b, "shaman", 1, 260);
    for (const t of b.towers) { t.x = tank.x; t.y = tank.y - 60; t.cd = 5; }
    a.aim = tank; c.aim = tank; a.kind = "archer"; c.kind = "archer";
    update(b, 1 / 30);
    expect(bal.aim).toBe(sham);
  });
  it("a mage obelisk shields a neighbour; the shield absorbs one bomber blast", () => {
    const b = createBattle(lvl(5), squad, "march"); const [m, o] = b.towers as [typeof b.towers[0], typeof b.towers[0]];
    b.towers = [m, o]; m.kind = "mage"; o.kind = "archer"; o.x = m.x + 60; o.y = m.y; o.hp = o.maxHp * 0.5; m.aegisCd = 0;
    update(b, 1 / 30);
    expect(o.aegis).toBe(1);
    const hp = o.hp; const s = spawnUnit(b, "sapper", 3, 100);
    o.x = s.x; o.y = s.y + 30; m.x = 5000; update(b, 1 / 30);
    expect(o.aegis).toBe(0); expect(o.hp).toBeGreaterThanOrEqual(hp - 1);
  });
  it("two heavy guns on one target fire together and switch off lifesteal for 3 s", () => {
    const b = createBattle(lvl(1), squad, "march"); const [c1, c2] = b.towers as [typeof b.towers[0], typeof b.towers[0]];
    b.towers = [c1, c2]; c1.kind = "cannon"; c2.kind = "cannon";
    const v = spawnUnit(b, "vampire", 1, 200); for (const t of b.towers) { t.x = v.x + 40; t.y = v.y; t.charge = 0; }
    c1.cd = 0; c2.cd = 0.3; c2.aim = v;
    update(b, 1 / 30);
    expect(v.nolsT).toBeCloseTo(ADAPT.cross.noLifesteal, 0);
    expect(c2.cd).toBeGreaterThan(0.5);
  });
  it("tar halves walking speed; from region II the garrison pours it every 15 s", () => {
    const b = createBattle(lvl(5), squad, "march"); b.towers = []; b.obstacles = [];
    const u = spawnUnit(b, "skeleton", 1, 100); const [x, y] = b.path.posAt(130);
    b.tars.push({ x, y: y + u.lane, d: 130, t: 9, fire: 0 }); b.tarCd = 99;
    tick(b, 0.4); expect(u.tarT).toBeGreaterThan(0);
    expect(createBattle(lvl(1), squad, "march").level.loc).toBeLessThan(ADAPT.tar.fromLoc);
    expect(ADAPT.tar.every).toBe(15); expect(ADAPT.tar.slow).toBe(0.5);
  });
  it("stones from the gate land 7–9 s apart and hurt units under the gate", () => {
    expect(ADAPT.stones.min).toBe(7); expect(ADAPT.stones.max).toBe(9);
    const b = createBattle(lvl(1), squad, "march"); b.towers = []; b.oilCd = 99;
    const u = spawnUnit(b, "troll", 1, b.path.len); const hp = u.hp; b.stoneCd = 0;
    tick(b, 1.2);
    expect(b.feats.stones).toBeGreaterThan(0); expect(u.hp).toBeLessThan(hp);
    expect(b.stoneCd).toBeGreaterThan(5);
  });
});

describe("breakthrough wave", () => {
  it("support summoned within 1.5 s after a tank gets the speed bonus", () => {
    const b = createBattle(lvl(1), squad, "march"); b.essence = 400;
    summon(b, 0); tick(b, 1); summon(b, 1);
    expect(b.units.find((u) => u.kind === "shaman")!.rushT).toBeGreaterThan(0);
    expect(b.units.find((u) => u.kind === "troll")!.rushT).toBeGreaterThan(0);
  });
  it("no bonus when the support comes later than 1.5 s", () => {
    const b = createBattle(lvl(1), squad, "march"); b.essence = 400;
    summon(b, 0); tick(b, 2); summon(b, 1);
    expect(b.units.find((u) => u.kind === "shaman")!.rushT).toBe(0);
  });
});

describe("defeat breakdown and scouting", () => {
  it("names the tower with the biggest share of damage", () => {
    const r = defeatBreakdown([{ kind: "archer", dealt: 100 }, { kind: "cannon", dealt: 300 }], 140, null);
    expect(r.killer).toEqual({ kind: "cannon", share: 75 }); expect(r.wasted).toBe(140);
  });
  it("units that die before reaching any tower count as wasted essence", () => {
    const b = createBattle(lvl(1), squad, "march"); const u = spawnUnit(b, "troll", 1, 10); u.hp = 0;
    update(b, 1 / 30);
    expect(b.wasted).toBe(105);
  });
  it("scouting warns about a squad without a tank and lists active synergies", () => {
    const lines = garrisonScout(lvl(1), ["goblin", "rat"]).map((l) => l.text).join(" ");
    expect(lines).toContain("нет танка");
    expect(garrisonScout(lvl(1), ["skeleton", "necro"]).some((l) => l.text.startsWith("Синергия"))).toBe(true);
  });
});
