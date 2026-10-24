import { describe, expect, it } from "vitest";
import { LEVELS } from "@/game/data/levels";
import { LOCATIONS } from "@/game/data/locations";

describe("campaign layout", () => {
  it("has 6 locations with 4 levels each", () => {
    expect(LOCATIONS).toHaveLength(6);
    expect(LEVELS).toHaveLength(24);
    for (const loc of LOCATIONS) expect(LEVELS.filter((l) => l.loc === loc.id)).toHaveLength(4);
  });
  it("every location after the first brings its own new tower kind", () => {
    const kinds = LOCATIONS.slice(1).map((l) => l.newTower);
    expect(new Set(kinds).size).toBe(5);
    for (const loc of LOCATIONS.slice(1)) for (const l of LEVELS.filter((x) => x.loc === loc.id)) expect(l.towers).toContain(loc.newTower);
    for (const l of LEVELS.filter((x) => x.loc < 1)) for (const k of kinds) expect(l.towers).not.toContain(k);
  });
  it("the last level of each location is a boss with elite towers", () => {
    for (const l of LEVELS) expect(l.boss).toBe(l.id % 4 === 0);
    for (const l of LEVELS.filter((x) => x.boss)) expect(l.elite).toBeGreaterThan(0);
  });
});
