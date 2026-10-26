import { describe, expect, it } from "vitest";
import { voiceFor } from "@/game/audio";
import { CHARS, type CharId } from "@/game/data/story";

describe("cutscene voices", () => {
  it("every speaking character has a fixed voice", () => {
    for (const id of Object.keys(CHARS) as CharId[]) {
      if (id === "narrator") continue;
      const a = voiceFor(id), b = voiceFor(id);
      expect(a.f).toBeGreaterThan(0);
      expect(a).toEqual(b);
    }
  });
  it("an unknown speaker still gets a stable voice", () => {
    expect(voiceFor("stranger")).toEqual(voiceFor("stranger"));
    expect(voiceFor("stranger").f).toBeGreaterThan(0);
  });
});
