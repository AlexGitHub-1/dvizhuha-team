import { describe, expect, it } from "vitest";
import { defaultProgress, foundClues, markClue, suspectStatus, markScene, pendingEpilogue, prologueFor } from "@/game/meta/progress";
import { CLUES, SCENES } from "@/game/data/story";

describe("story scenes", () => {
  it("prologue only on the first level of a region, once", () => {
    const p = defaultProgress();
    expect(prologueFor(p, 1)).toBe("p0");
    expect(prologueFor(p, 2)).toBeNull();
    expect(prologueFor(p, 5)).toBe("p1");
    expect(prologueFor(markScene(p, "p0"), 1)).toBeNull();
  });
  it("epilogue after the region's last level, final after the last epilogue", () => {
    const p = { ...defaultProgress(), stars: { 1: 3, 2: 1, 3: 1 } };
    expect(pendingEpilogue(p)).toBeNull();
    const q = { ...p, stars: { ...p.stars, 4: 1 } };
    expect(pendingEpilogue(q)).toBe("e0");
    expect(pendingEpilogue(markScene(q, "e0"))).toBeNull();
    expect(pendingEpilogue(markScene(markScene(q, "e0"), "e5"))).toBe("final");
  });
  it("13 scenes, each with lines", () => {
    expect(SCENES).toHaveLength(13);
    for (const s of SCENES) expect(s.lines.length).toBeGreaterThanOrEqual(6);
  });
  it("each clue is found in exactly one line", () => {
    for (const c of Object.keys(CLUES)) expect(SCENES.flatMap((s) => s.lines).filter((l) => l.clue === c)).toHaveLength(1);
  });
  it("clues are saved once", () => {
    const p = markClue(markClue(defaultProgress(), "order"), "order");
    expect(foundClues(p)).toEqual(["order"]);
  });
  it("suspects change status as scenes are watched", () => {
    let p = defaultProgress();
    expect(suspectStatus(p, "kaira")).toBe("unknown");
    p = markScene(p, "e2"); expect(suspectStatus(p, "kaira")).toBe("suspect");
    p = markScene(p, "p4"); expect(suspectStatus(p, "kaira")).toBe("traitor");
    expect(suspectStatus(markScene(markScene(defaultProgress(), "p0"), "p2"), "crown")).toBe("cleared");
  });
});

import { accuse, accusationOpen, accusationScene, accusedRight } from "@/game/meta/progress";
import { defaultProgress as dp2 } from "@/game/meta/progress";
describe("accusation", () => {
  it("opens only after the forest epilogue and is chosen once", () => {
    const p = dp2();
    expect(accusationOpen(p)).toBe(false);
    const q = { ...p, story: { e3: true as const } };
    expect(accusationOpen(q)).toBe(true);
    const a = accuse(q, "grosh");
    expect(a.accusation).toBe("grosh");
    expect(accusationOpen(a)).toBe(false);
    expect(accuse(a, "kaira").accusation).toBe("grosh");
    expect(accusedRight(a)).toBe(false);
  });
  it("Kaira is the right answer; wrong picks get their own scene", () => {
    expect(accusationScene("kaira")).toBe("acc_right");
    expect(accusationScene("eldric")).toBe("acc_eldric");
  });
});

import { RECAP as RC, SCENE_BY_ID as SB } from "@/game/data/story";
describe("clear storytelling", () => {
  it("chapters 2–6 open with a plain recap of what is known", () => {
    for (let n = 1; n <= 5; n++) expect(SB["p" + n]!.lines[0]!.text).toBe(RC[n]);
  });
  it("the first prologue explains who the hero is before anything else", () => {
    expect(SB["p0"]!.lines[0]!.text).toContain("Мортрекс");
  });
});
