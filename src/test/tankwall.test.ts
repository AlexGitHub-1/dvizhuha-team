import { describe, expect, it } from "vitest";
import { simulate } from "@/game/engine/sim";

const wins = (kinds: string[], level: number) => {
  let w = 0;
  for (let s = 1; s <= 8; s++) if (simulate(level, kinds.map((k) => ({ kind: k as never, lvl: 6 })), s).won) w++;
  return w;
};

describe("tank wall", () => {
  it("a mixed squad beats five trolls more often on level 4", () => {
    expect(wins(["troll", "shaman", "goblin", "skeleton", "sapper"], 4)).toBeGreaterThan(wins(["troll", "troll", "troll", "troll", "troll"], 4));
  });
});
