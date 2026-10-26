import { describe, expect, it } from "vitest";
import { NODES, NODE_MIN_GAP } from "@/game/render/worldmap";

describe("world map nodes", () => {
  it("no two level circles overlap", () => {
    for (let i = 0; i < NODES.length; i++) for (let k = i + 1; k < NODES.length; k++) {
      const d = Math.hypot(NODES[i]!.x - NODES[k]!.x, NODES[i]!.y - NODES[k]!.y);
      expect(d, `levels ${i + 1} and ${k + 1}`).toBeGreaterThanOrEqual(NODE_MIN_GAP);
    }
  });
});
