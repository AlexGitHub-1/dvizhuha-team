import { LEVELS } from "../data/levels";
import type { MonsterId } from "../data/monsters";
import { MONSTERS } from "../data/monsters";
import { canSummon, castSpell, createBattle, outcome, summon, update } from "./battle";

/** Headless bot used for balance checks. */
export function simulate(levelId: number, squad: { kind: MonsterId; lvl: number }[], seed = 1) {
  let s = seed; const orig = Math.random; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  try {
    const b = createBattle(LEVELS[levelId - 1]!, squad, "march");
    const order = squad.map((_, i) => i).sort((a, c) => MONSTERS[squad[c]!.kind].cost - MONSTERS[squad[a]!.kind].cost);
    let t = 0; let wave = false;
    while (!b.result && t < 400) {
      if (b.essence >= 400) wave = true;
      if (wave) { for (const i of order) if (canSummon(b, i)) summon(b, i); if (b.essence < 30) wave = false; }
      if (b.units.length > 4) castSpell(b);
      update(b, 1 / 30); t += 1 / 30;
    }
    return outcome(b);
  } finally { Math.random = orig; }
}
