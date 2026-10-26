import { ACHIEVEMENTS, ACH_BY_ID, type AchDef, type FrameId } from "../data/achievements";
import { CLUES, SCENES, ACCUSE_RIGHT, type SuspectId } from "../data/story";
import type { MonsterId } from "../data/monsters";
import type { Progress } from "./progress";

/** Pure achievement rules. Achievements are cosmetic: they never feed BattleMods or the economy. */
export interface AchState { c: Record<string, number>; got: Record<string, true>; seen: Record<string, true>; title?: string | undefined; frame?: FrameId | undefined }
const EMPTY: AchState = { c: {}, got: {}, seen: {} };
export const achState = (p: Progress): AchState => ({ ...EMPTY, ...p.ach });
const withC = (p: Progress, f: (c: Record<string, number>, a: AchState) => void): Progress => {
  const a = achState(p); const c = { ...a.c }; f(c, a); return { ...p, ach: { ...a, c } };
};
const inc = (c: Record<string, number>, k: string, n = 1) => { c[k] = (c[k] ?? 0) + n; };
const flag = (c: Record<string, number>, k: string, on: boolean) => { if (on) inc(c, k); };
const max = (c: Record<string, number>, k: string, v: number) => { c[k] = Math.max(c[k] ?? 0, v); };

export interface BattleFacts {
  won: boolean; gateLeftFrac: number; summoned: number; timeLeftSec: number; towersDown: number;
  essenceFull: boolean; squadLvls: number[]; goblins: number; silent: boolean; hour: number;
  prevStars: number; stars: number; streakBefore: number; power: number; required: number;
}
export function achBattle(p: Progress, f: BattleFacts): Progress {
  return withC(p, (c) => {
    flag(c, "losses", !f.won);
    flag(c, "stubborn", f.won && f.streakBefore >= 5);
    flag(c, "nearMiss", !f.won && f.gateLeftFrac < 0.01);
    flag(c, "clown", !f.won && f.prevStars === 3);
    flag(c, "pacifist", f.summoned === 0);
    flag(c, "lastSecond", f.won && f.timeLeftSec < 3);
    flag(c, "loneWolf", f.won && f.summoned === 1);
    flag(c, "noTowers", f.won && f.towersDown === 0);
    flag(c, "greedy", f.essenceFull);
    flag(c, "beggar", f.won && f.squadLvls.length > 0 && f.squadLvls.every((l) => l === 1));
    max(c, "goblins", f.goblins);
    flag(c, "silence", f.silent);
    flag(c, "optimist", f.won && f.power < f.required / 2);
    flag(c, "perfect", f.prevStars === 1 && f.stars === 3);
    flag(c, "night", f.hour >= 3 && f.hour < 5);
  });
}
export function achAccuse(p: Progress, s: SuspectId): Progress {
  const all = Object.keys(CLUES).every((k) => p.clues?.[k]);
  return withC(p, (c) => { flag(c, "wrong", s !== ACCUSE_RIGHT); flag(c, "sherlock", s === ACCUSE_RIGHT && all); });
}
export const achSkip = (p: Progress) => withC(p, (c) => inc(c, "skips"));
export const achReset = (p: Progress) => withC(p, (c) => inc(c, "resets"));
/** A story scene replayed from the Chronicle. */
export function achRewatch(p: Progress, sceneId: string): Progress {
  const a = achState(p); const seen = { ...a.seen, [sceneId]: true as const };
  const n = SCENES.filter((s) => seen[s.id]).length;
  return { ...p, ach: { ...a, seen, c: { ...a.c, rewatched: n } } };
}
export function achCase(p: Progress, id: MonsterId, rarity: string, duplicate: boolean): Progress {
  return withC(p, (c) => {
    if (rarity === "common") inc(c, "dryNow"); else c["dryNow"] = 0;
    max(c, "dry", c["dryNow"] ?? 0);
    if (duplicate) { inc(c, "dup_" + id); max(c, "dupMax", c["dup_" + id]!); }
  });
}

export const achProgress = (p: Progress, a: AchDef) => Math.min(a.goal, achState(p).c[a.counter] ?? 0);
/** Marks every achievement whose counter reached its goal (also tracks state-based counters). Returns newly unlocked ones. */
export function unlockAchievements(p: Progress): { p: Progress; fresh: AchDef[] } {
  const a = achState(p);
  let c = a.c;
  if (p.gold > (c["maxGold"] ?? 0)) c = { ...c, maxGold: p.gold };
  const fresh = ACHIEVEMENTS.filter((d) => !a.got[d.id] && (c[d.counter] ?? 0) >= d.goal);
  if (!fresh.length && c === a.c) return { p, fresh };
  const got = { ...a.got }; for (const d of fresh) got[d.id] = true;
  return { p: { ...p, ach: { ...a, c, got } }, fresh };
}
export const hasAch = (p: Progress, id: string) => !!p.ach?.got[id];
export const unlockedTitles = (p: Progress) => ACHIEVEMENTS.filter((d) => hasAch(p, d.id) && d.reward.title).map((d) => d.reward.title!);
export const unlockedFrames = (p: Progress) => [...new Set(ACHIEVEMENTS.filter((d) => hasAch(p, d.id) && d.reward.frame).map((d) => d.reward.frame!))];
export const secretSceneOpen = (p: Progress, sceneId: string) => ACHIEVEMENTS.some((d) => d.reward.scene === sceneId && hasAch(p, d.id));
export const hasJoke = (p: Progress, j: "flag" | "plaster") => ACHIEVEMENTS.some((d) => d.reward.joke === j && hasAch(p, d.id));
export function setTitle(p: Progress, t: string | undefined): Progress { return { ...p, ach: { ...achState(p), title: t } }; }
export function setFrame(p: Progress, f: FrameId | undefined): Progress { return { ...p, ach: { ...achState(p), frame: f } }; }
export { ACH_BY_ID };
