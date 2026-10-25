import { describe, expect, it, vi } from "vitest";
vi.mock("@/game/audio", () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));
import { castSpell, createBattle, requestSummon, update, GATE, type Battle } from "@/game/engine/battle";
import { LEVELS } from "@/game/data/levels";
import { TOWER_ESSENCE } from "@/game/data/towers";
import { SYN } from "@/game/data/synergies";
import { BATTLE_SHOUTS } from "@/game/data/story";

const lvl = (id: number) => LEVELS.find((l) => l.id === id)!;
const kill = (b: Battle) => { for (const t of b.towers) { t.alive = false; t.hp = 0; } };

describe("battle mechanics", () => {
  it("a destroyed tower gives back essence", () => {
    const b = createBattle(lvl(1), [{ kind: "troll", lvl: 1 }], "meteor");
    const t = b.towers[0]!; t.hp = 1; b.essence = 0;
    expect(castSpell(b, t.x, t.y)).toBe(true);
    expect(t.alive).toBe(false);
    expect(b.essence).toBe(TOWER_ESSENCE);
    expect(b.orbs).toHaveLength(1);
  });

  it("a click short of essence queues the summon and fires it once affordable", () => {
    const b = createBattle(lvl(1), [{ kind: "goblin", lvl: 1 }], "march");
    b.essence = 5;
    expect(requestSummon(b, 0)).toBe("queued");
    b.essence = 30; update(b, 0.01);
    expect(b.queue).toBeNull();
    expect(b.stats.summoned).toBe(1);
  });

  it("a click far from affordable is not queued", () => {
    const b = createBattle(lvl(1), [{ kind: "troll", lvl: 1 }], "march");
    b.essence = 0;
    expect(requestSummon(b, 0)).toBe("no");
  });

  it("Legion leaves exactly one minion per battle", () => {
    const b = createBattle(lvl(1), [{ kind: "skeleton", lvl: 1 }, { kind: "ghost", lvl: 1 }], "march");
    kill(b); b.essence = 999;
    const minions = () => b.units.filter((u) => u.minion).length;
    let spawned = 0;
    for (let k = 0; k < 3; k++) {
      b.squad[0]!.cd = 0; requestSummon(b, 0);
      const u = b.units.find((x) => !x.minion && !x.dead)!; u.revived = true; u.legion = true; u.hp = 0;
      const m0 = minions(); update(b, 0.01); spawned += minions() - m0;
    }
    expect(spawned).toBe(1);
  });

  it("Siege Fist stuns wall towers every third gate impact", () => {
    const b = createBattle(lvl(1), [{ kind: "troll", lvl: 1 }, { kind: "golem", lvl: 1 }], "march");
    const t = b.towers[0]!; t.x = GATE.x - 100; t.y = GATE.y;
    b.essence = 999; requestSummon(b, 0);
    const u = b.units[0]!; u.atGate = true; u.d = b.path.len; u.hp = 1e9;
    const hits = (n: number) => { while (b.fistHits < n) update(b, 0.05); };
    hits(2); t.blindT = 0; expect(b.fistHits).toBe(2);
    hits(3); expect(t.blindT).toBeGreaterThan(SYN.fistStun - 0.2);
  });

  it("boss levels shout at start, and normal levels stay silent", () => {
    const boss = createBattle(lvl(4), [{ kind: "goblin", lvl: 1 }], "march"); update(boss, 0.05);
    expect(boss.shouts[0]?.text).toBe(BATTLE_SHOUTS[4]!.start!.text);
    const plain = createBattle(lvl(1), [{ kind: "goblin", lvl: 1 }], "march"); update(plain, 0.05);
    expect(plain.shouts).toHaveLength(0);
  });
});

import { REGION_GUARD, TOWERS as TW } from "@/game/data/towers";
describe("harder towers", () => {
  it("archers and frost spires snipe the most fragile monster", () => {
    expect(TW.archer.focus).toBe("weak"); expect(TW.frost.focus).toBe("weak");
  });
  it("some regions shrug off blasts and others melee", () => {
    expect(REGION_GUARD[1]!.blast).toBeGreaterThan(0); expect(REGION_GUARD[2]!.melee).toBeGreaterThan(0); expect(REGION_GUARD[0]).toEqual({ blast: 0, melee: 0 });
  });
});
