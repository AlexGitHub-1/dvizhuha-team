import { describe, expect, it } from "vitest";
import { defaultProgress, talentBonuses, type Progress } from "@/game/meta/progress";
import { achAccuse, achBattle, achCase, achSkip, hasAch, unlockAchievements, type BattleFacts } from "@/game/meta/achievements";
import { CLUES } from "@/game/data/story";

const F: BattleFacts = { won: false, gateLeftFrac: 0.5, summoned: 5, timeLeftSec: 60, towersDown: 2, essenceFull: false, squadLvls: [2, 2], goblins: 0, silent: false, hour: 12, prevStars: 0, stars: 0, streakBefore: 0, power: 500, required: 500 };
const run = (p: Progress, f: Partial<BattleFacts>, n = 1) => { for (let i = 0; i < n; i++) p = unlockAchievements(achBattle(p, { ...F, ...f })).p; return p; };

describe("achievements", () => {
  it("10 losses unlock «Ученик боли», 50 unlock «Мазохист»", () => {
    const p9 = run(defaultProgress(), {}, 9); expect(hasAch(p9, "pain")).toBe(false);
    const p10 = run(p9, {}); expect(hasAch(p10, "pain")).toBe(true); expect(hasAch(p10, "masochist")).toBe(false);
    expect(hasAch(run(p10, {}, 40), "masochist")).toBe(true);
  });
  it("winning after 5 losses in a row unlocks «Упрямый осёл», after 4 it does not", () => {
    expect(hasAch(run(defaultProgress(), { won: true, streakBefore: 4 }), "stubborn")).toBe(false);
    expect(hasAch(run(defaultProgress(), { won: true, streakBefore: 5 }), "stubborn")).toBe(true);
  });
  it("losing with less than 1% gate left unlocks «На волоске»", () => {
    expect(hasAch(run(defaultProgress(), { gateLeftFrac: 0.011 }), "nearmiss")).toBe(false);
    expect(hasAch(run(defaultProgress(), { gateLeftFrac: 0.009 }), "nearmiss")).toBe(true);
  });
  it("a battle with 0 summons unlocks «Пацифист»", () => {
    expect(hasAch(run(defaultProgress(), { summoned: 0 }), "pacifist")).toBe(true);
  });
  it("winning with less than 3 seconds left unlocks «Последняя секунда»", () => {
    expect(hasAch(run(defaultProgress(), { won: true, timeLeftSec: 3 }), "lastsec")).toBe(false);
    expect(hasAch(run(defaultProgress(), { won: true, timeLeftSec: 2.9 }), "lastsec")).toBe(true);
  });
  it("15 chests in a row with only commons unlock «Невезучий»; a rare resets the run", () => {
    let p = defaultProgress();
    for (let i = 0; i < 14; i++) p = achCase(p, "goblin", "common", true);
    p = achCase(p, "rat", "rare", false);
    expect(hasAch(unlockAchievements(p).p, "unlucky")).toBe(false);
    for (let i = 0; i < 15; i++) p = achCase(p, "goblin", "common", true);
    expect(hasAch(unlockAchievements(p).p, "unlucky")).toBe(true);
  });
  it("accusing the wrong suspect unlocks «Не тот», the right one with all clues «Шерлок»", () => {
    expect(hasAch(unlockAchievements(achAccuse(defaultProgress(), "grosh")).p, "wrong")).toBe(true);
    const all = { ...defaultProgress(), clues: Object.fromEntries(Object.keys(CLUES).map((c) => [c, true as const])) };
    const r = unlockAchievements(achAccuse(all, "kaira")).p;
    expect(hasAch(r, "sherlock")).toBe(true); expect(hasAch(r, "wrong")).toBe(false);
  });
  it("10 skipped cutscenes unlock «Нетерпеливый»", () => {
    let p = defaultProgress(); for (let i = 0; i < 10; i++) p = achSkip(p);
    expect(hasAch(unlockAchievements(p).p, "skipper")).toBe(true);
  });
  it("achievements never change battle bonuses", () => {
    const p = run(defaultProgress(), { summoned: 0, won: true, timeLeftSec: 1 }, 50);
    expect(talentBonuses(p)).toEqual(talentBonuses(defaultProgress()));
  });
});
