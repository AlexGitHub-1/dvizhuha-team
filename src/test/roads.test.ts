import { describe, expect, it } from "vitest";
import { LEVELS, MAPS, roadLength, roadProblems } from "@/game/data/levels";
import { createBattle } from "@/game/engine/battle";

describe("campaign roads", () => {
  MAPS.forEach((m, i) => {
    it(`level ${i + 1}: road sections never cross or overlap`, () => {
      expect(roadProblems(m.path)).toEqual([]);
    });
  });
  it("every road ends at the gate entrance", () => {
    for (const m of MAPS) expect(m.path.slice(-2)).toEqual([[1075, 380], [1150, 380]]);
  });
  it("road lengths stay in a fair range", () => {
    for (const m of MAPS) { const l = roadLength(m.path); expect(l).toBeGreaterThan(1400); expect(l).toBeLessThan(3000); }
  });
  it("every level fits all its tower slots off the road", () => {
    for (const l of LEVELS) {
      const b = createBattle(l, [{ kind: "goblin", lvl: 1 }], "march");
      expect(b.slots.length).toBe(l.towers.length + l.emptySlots);
      for (const s of b.slots) expect(b.path.dist(s.x, s.y)).toBeGreaterThan(50);
    }
  });
});
