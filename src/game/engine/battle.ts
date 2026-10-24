import { MAPS, type LevelDef } from "../data/levels";
import { MONSTERS, type MonsterId } from "../data/monsters";
import { SPELLS, type SpellId } from "../data/shop";
import { SUPER, SUPER_NAME, TOWERS, TOWER_MAX_LVL, towerScale, type TowerKind } from "../data/towers";
import { monsterStats } from "../meta/progress";
import { sfx } from "../audio";
import { makePath, type PathGeo } from "./path";

export const W = 1280, H = 720;
export const GATE = { x: 1185, y: 380 };
export const MAX_ESSENCE = 450;
/** all monsters hit the gate harder than towers */
export const GATE_MUL = 2;

export interface Unit {
  id: number; kind: MonsterId; lvl: number; d: number; x: number; y: number; hp: number; maxHp: number; armor: number;
  speed: number; dps: number; reach: number; radius: number; abil: number; slowT: number; stealthT: number; recloakT: number;
  revived: boolean; reborn: boolean; atGate: boolean; bob: number; atkT: number; buffed: boolean; shield: number; hurtT: number;
  burnT: number; burnDps: number; poisonT: number; poisonDps: number; minion: boolean; dead: boolean; lane: number; attacking: boolean; stunT: number; spawnT: number;
}
export interface Tower {
  id: number; kind: TowerKind; slot: number; lvl: number; x: number; y: number; hp: number; maxHp: number; mul: number;
  cd: number; angle: number; alive: boolean; ruinT: number; flash: number; frozenT: number; blindT: number;
  upgradeT: number; building: boolean; disabled: boolean; charge: number; superT: number; growT: number; shots: number; elite: boolean;
}
export interface Proj { kind: "arrow" | "ball" | "mini"; x: number; y: number; sx: number; sy: number; tx: number; ty: number; t: number; dur: number; target: Unit | null; dmg: number; splash: number; lvl: number }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; grav: number }
export interface Beam { x1: number; y1: number; x2: number; y2: number; life: number; color: string; jag: boolean }
export interface FloatText { x: number; y: number; text: string; life: number; color: string }
export interface SquadSlot { kind: MonsterId; lvl: number; cd: number }

export interface Battle {
  level: LevelDef; path: PathGeo; theme: string; flyLen: number;
  time: number; essence: number; gateHp: number; gateMax: number;
  units: Unit[]; towers: Tower[]; slots: { x: number; y: number }[];
  projs: Proj[]; parts: Particle[]; beams: Beam[]; texts: FloatText[];
  squad: SquadSlot[]; spell: SpellId; spellCd: number; marchT: number; darkT: number;
  upgradeTimer: number; buildTimer: number; deathSpots: { d: number; t: number }[];
  shake: number; gateStage: number; gateHitT: number; result: null | "won" | "lost"; stats: { summoned: number; towersDown: number }; nextId: number;
}

export function createBattle(level: LevelDef, squad: { kind: MonsterId; lvl: number }[], spell: SpellId): Battle {
  const map = MAPS[level.map]!;
  const path = makePath(map.path);
  const start = map.path[0]!;
  const total = level.towers.length + level.emptySlots;
  const slots: { x: number; y: number }[] = [];
  for (let i = 0; i < total * 3 && slots.length < total; i++) {
    const frac = 0.06 + ((i * 0.618) % 1) * 0.86;
    const [px, py, ang] = path.posAt(path.len * frac);
    for (const side of [i % 2 ? 1 : -1, i % 2 ? -1 : 1]) {
      const x = px + Math.cos(ang + Math.PI / 2) * 64 * side, y = py + Math.sin(ang + Math.PI / 2) * 64 * side;
      if (path.dist(x, y) > 52 && x > 40 && x < 1110 && y > 60 && y < H - 30 && slots.every((s) => Math.hypot(s.x - x, s.y - y) > 75)) { slots.push({ x, y }); break; }
    }
  }
  const empties = new Set<number>();
  for (let j = 0; j < level.emptySlots; j++) empties.add(Math.floor(((j + 0.5) * slots.length) / Math.max(1, level.emptySlots)));
  const b: Battle = {
    level, path, theme: map.theme, flyLen: Math.hypot(GATE.x - 40 - start[0], GATE.y - start[1]),
    time: 0, essence: 150, gateHp: level.gateHp, gateMax: level.gateHp,
    units: [], towers: [], slots, projs: [], parts: [], beams: [], texts: [],
    squad: squad.map((s) => ({ ...s, cd: 0 })), spell, spellCd: 0, marchT: 0, darkT: 0,
    upgradeTimer: level.upgradeEvery, buildTimer: level.buildEvery, deathSpots: [],
    shake: 0, gateStage: 0, gateHitT: 0, result: null, stats: { summoned: 0, towersDown: 0 }, nextId: 1,
  };
  let k = 0;
  slots.forEach((s, i) => {
    if (empties.has(i) || k >= level.towers.length) return;
    b.towers.push(makeTower(b, level.towers[k++]!, i, 1));
  });
  // boss levels: a few elite towers start at level 3
  for (let e = 0; e < level.elite && b.towers.length; e++) {
    const t = b.towers[Math.floor(((e + 0.5) * b.towers.length) / Math.max(1, level.elite))]!;
    t.lvl = 3; t.elite = true; t.maxHp *= 1.8; t.hp = t.maxHp;
  }
  return b;
}

function makeTower(b: Battle, kind: TowerKind, slot: number, lvl: number): Tower {
  const s = b.slots[slot]!; const hp = TOWERS[kind].hp * b.level.towerMul;
  return { id: b.nextId++, kind, slot, lvl, x: s.x, y: s.y, hp, maxHp: hp, mul: b.level.towerMul, cd: Math.random() * TOWERS[kind].rate, angle: 0, alive: true, ruinT: 0, flash: 0, frozenT: 0, blindT: 0, upgradeT: 0, building: false, disabled: false, charge: Math.random() * 0.3, superT: 0, growT: 0, shots: 0, elite: false };
}

// ---------- helpers
function burst(b: Battle, x: number, y: number, n: number, color: string, life: number, speed = 120, size = 3, grav = 0) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = Math.random() * speed;
    b.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.5 + Math.random() * 0.5), max: life, size: size * (0.5 + Math.random()), color, grav });
  }
}
function explosion(b: Battle, x: number, y: number, big: number, color = "#ff8a2a") {
  burst(b, x, y, 26 * big, "#ffd27a", 0.6, 220 * big, 4);
  burst(b, x, y, 18 * big, color, 0.5, 160 * big, 5);
  burst(b, x, y, 12 * big, "#555", 1.2, 80 * big, 7, -30);
  b.shake = Math.max(b.shake, 5 * big);
}
const ring = (b: Battle, x: number, y: number, color: string, life = 0.6) => b.beams.push({ x1: x, y1: y, x2: x, y2: y, life, color, jag: false });
const text = (b: Battle, x: number, y: number, t: string, color: string) => b.texts.push({ x, y, text: t, life: 1.2, color });

export function unitProgress(b: Battle, u: Unit) { return MONSTERS[u.kind].flying ? u.d / b.flyLen : u.d / b.path.len; }

function placeUnit(b: Battle, u: Unit) {
  if (MONSTERS[u.kind].flying) {
    const s = b.path.pts[0]!; const k = Math.min(1, u.d / b.flyLen);
    u.x = s[0] + (GATE.x - 40 - s[0]) * k; u.y = s[1] + (GATE.y - s[1]) * k - 30;
  } else { const [x, y] = b.path.posAt(u.d); u.x = x; u.y = y + u.lane; }
}

export function spawnUnit(b: Battle, kind: MonsterId, lvl: number, d: number, minion = false) {
  const st = monsterStats(kind, lvl); const def = MONSTERS[kind];
  const u: Unit = {
    id: b.nextId++, kind, lvl, d, x: 0, y: 0, hp: st.hp, maxHp: st.hp, armor: st.armor, speed: st.speed, dps: st.dps, reach: def.reach,
    radius: def.radius, abil: st.ability, slowT: 0, stealthT: def.stealth ? def.stealth.dur * st.ability : 0, recloakT: 0, revived: false, reborn: false,
    atGate: false, bob: Math.random() * 6, atkT: 0, buffed: false, shield: 0, hurtT: 0, burnT: 0, burnDps: 0, poisonT: 0, poisonDps: 0, minion, dead: false,
    lane: (((b.nextId * 37) % 21) - 10) * 0.8, attacking: false, stunT: 0, spawnT: 0.35,
  };
  placeUnit(b, u); b.units.push(u);
  if (def.blindOnSpawn) {
    for (const t of b.towers) if (t.alive) t.blindT = Math.max(t.blindT, def.blindOnSpawn * st.ability);
    b.shake = 10; burst(b, u.x, u.y, 60, "#a020c0", 1.2, 300, 5); text(b, u.x, u.y - 40, "БАШНИ ОСЛЕПЛЕНЫ", "#d070ff");
  }
  return u;
}

export function canSummon(b: Battle, i: number) { const s = b.squad[i]; return !!s && !b.result && s.cd <= 0 && b.essence >= MONSTERS[s.kind].cost; }
export function summon(b: Battle, i: number) {
  if (!canSummon(b, i)) return false;
  const s = b.squad[i]!; const def = MONSTERS[s.kind];
  b.essence -= def.cost; s.cd = def.cooldown; b.stats.summoned++;
  const n = def.swarm ?? 1;
  for (let k = 0; k < n; k++) spawnUnit(b, s.kind, s.lvl, -k * 14);
  const p = b.path.pts[0]!; burst(b, p[0] + 40, p[1], 30, "#9b5cff", 0.6); ring(b, p[0] + 30, p[1], "#b07cff", 0.5); sfx.summon();
  return true;
}

function frontUnit(b: Battle) { let f: Unit | null = null; for (const u of b.units) if (!u.dead && (!f || unitProgress(b, u) > unitProgress(b, f))) f = u; return f; }

export function castSpell(b: Battle) {
  if (b.result || b.spellCd > 0) return false;
  const front = frontUnit(b);
  if (b.spell !== "march" && b.spell !== "darkness" && !front) return false;
  b.spellCd = SPELLS[b.spell].cooldown;
  if (b.spell === "march") { b.marchT = 3; for (const u of b.units) burst(b, u.x, u.y, 6, "#ff4d2e", 0.5); sfx.warcry(); }
  if (b.spell === "darkness") { b.darkT = 4; sfx.warcry(); }
  if (b.spell === "bloodrain" && front) {
    const ts = b.towers.filter((t) => t.alive).sort((a, c) => Math.hypot(a.x - front.x, a.y - front.y) - Math.hypot(c.x - front.x, c.y - front.y)).slice(0, 3);
    for (const t of ts) { for (let i = 0; i < 25; i++) b.parts.push({ x: t.x + (Math.random() - 0.5) * 60, y: t.y - 200 - Math.random() * 100, vx: 0, vy: 500, life: 0.5, max: 0.5, size: 3, color: "#c01020", grav: 0 }); hurtTower(b, t, 180); }
    sfx.explosion();
  }
  if (b.spell === "raise" && front) {
    for (let i = 0; i < 4; i++) spawnUnit(b, "minion", 3, Math.max(0, front.d - i * 12), true);
    burst(b, front.x, front.y, 30, "#7dff9a", 0.8, 150); sfx.revive();
  }
  b.shake = Math.max(b.shake, 4);
  return true;
}

function hurtUnit(b: Battle, u: Unit, dmg: number) {
  if (u.dead || u.hp <= 0) return;
  u.hp -= dmg * (1 - u.armor) * (1 - u.shield); u.hurtT = 0.12;
  burst(b, u.x, u.y, 3, "#a3141c", 0.4, 60, 2, 200);
  const st = MONSTERS[u.kind].stealth;
  if (st && u.recloakT <= 0 && u.hp > 0) { u.stealthT = 1.5 * u.abil; u.recloakT = st.recloak; }
}
function hurtTower(b: Battle, t: Tower, dmg: number) {
  if (!t.alive) return;
  t.hp -= dmg; t.flash = 0.08; t.charge = Math.min(1, t.charge + (dmg / t.maxHp) * SUPER.hurtFill);
  if (t.hp <= 0) {
    t.alive = false; t.hp = 0; t.upgradeT = 0; t.ruinT = 0; b.stats.towersDown++;
    t.charge = 0; t.superT = 0; explosion(b, t.x, t.y, 1.4); burst(b, t.x, t.y, 25, "#8a7f70", 1.4, 150, 5, 250); burst(b, t.x, t.y - 30, 18, "#6b5a44", 1.6, 260, 6, 420); ring(b, t.x, t.y, "#ffcf5a", 0.5);
    text(b, t.x, t.y - 30, "Разрушено!", "#ffcf5a"); sfx.towerDown();
  }
}
function canSee(b: Battle, u: Unit) {
  if (u.stealthT <= 0) return true;
  return b.towers.some((t) => t.alive && t.kind === "bell" && !t.disabled && Math.hypot(t.x - u.x, t.y - u.y) < TOWERS.bell.range);
}
const miss = (b: Battle) => b.darkT > 0 && Math.random() < 0.7;

// ---------- main update
export function update(b: Battle, dt: number) {
  if (b.result) { fx(b, dt); return; }
  b.time += dt;
  b.essence = Math.min(MAX_ESSENCE, b.essence + b.level.essenceRate * dt);
  for (const s of b.squad) s.cd = Math.max(0, s.cd - dt);
  b.spellCd = Math.max(0, b.spellCd - dt); b.marchT = Math.max(0, b.marchT - dt); b.darkT = Math.max(0, b.darkT - dt);

  const alive = b.units.filter((u) => !u.dead);
  // aura pass
  for (const u of alive) { u.buffed = false; u.shield = 0; }
  for (const src of alive) {
    const d = MONSTERS[src.kind];
    if (d.aura) for (const u of alive) if (Math.hypot(src.x - u.x, src.y - u.y) < d.aura.radius) u.buffed = true;
    if (d.shieldAura) for (const u of alive) if (Math.hypot(src.x - u.x, src.y - u.y) < d.shieldAura.radius) u.shield = Math.max(u.shield, Math.min(0.6, d.shieldAura.reduce * src.abil));
  }
  for (const t of b.towers) {
    t.disabled = false;
    if (t.alive && TOWERS[t.kind].magic) for (const u of alive) { const r = MONSTERS[u.kind].runeAura; if (r && Math.hypot(u.x - t.x, u.y - t.y) < r * u.abil) { t.disabled = true; break; } }
  }

  // units
  for (const u of alive) {
    const def = MONSTERS[u.kind];
    if (u.buffed) u.hp = Math.min(u.maxHp, u.hp + 7 * dt);
    if (u.poisonT > 0) { u.poisonT -= dt; u.hp -= u.poisonDps * dt; if (Math.random() < dt * 8) burst(b, u.x, u.y - 10, 1, "#8fe04a", 0.6, 15, 3, -40); }
    if (u.burnT > 0) { u.burnT -= dt; u.hp -= u.burnDps * dt; if (Math.random() < dt * 10) burst(b, u.x, u.y - 8, 1, "#ff8a2a", 0.4, 20, 3, -60); }
    u.spawnT = Math.max(0, u.spawnT - dt); u.stunT = Math.max(0, u.stunT - dt); u.slowT = Math.max(0, u.slowT - dt); u.stealthT = Math.max(0, u.stealthT - dt); u.recloakT = Math.max(0, u.recloakT - dt); u.hurtT = Math.max(0, u.hurtT - dt);
    const sp = u.speed * (u.buffed ? 1.3 : 1) * (b.marchT > 0 ? 1.8 : 1) * (u.slowT > 0 ? 0.5 : 1) * (u.stunT > 0 ? 0 : 1);
    u.bob += dt * sp * 0.15;
    const end = def.flying ? b.flyLen : b.path.len;
    if (!u.atGate) { u.d += sp * dt; if (u.d >= end) { u.d = end; u.atGate = true; } placeUnit(b, u); }

    if (def.explode) {
      const near = b.towers.find((t) => t.alive && Math.hypot(t.x - u.x, t.y - u.y) < u.reach);
      if (near || u.atGate || Math.hypot(GATE.x - u.x, GATE.y - u.y) < 70) {
        const dmg = def.explode.dmg * u.abil * (1 + 0.12 * (u.lvl - 1));
        u.hp = 0; u.dead = true; explosion(b, u.x, u.y, 1.6); sfx.explosion();
        for (const t of b.towers) if (t.alive && Math.hypot(t.x - u.x, t.y - u.y) < def.explode.radius + 20) hurtTower(b, t, dmg);
        if (Math.hypot(GATE.x - u.x, GATE.y - u.y) < def.explode.radius + 50) { b.gateHp -= dmg * 2.2; b.gateHitT = 0.3; text(b, GATE.x - 30, GATE.y - 80, `-${Math.round(dmg * 2.2)}`, "#ff7a3d"); }
      }
      continue;
    }
    if (def.raise) {
      u.atkT -= dt;
      if (u.atkT <= 0) {
        const spot = b.deathSpots.find((s) => Math.abs(s.d - u.d) < def.raise!.radius);
        if (spot) { b.deathSpots.splice(b.deathSpots.indexOf(spot), 1); const m = spawnUnit(b, "minion", u.lvl, spot.d, true); burst(b, m.x, m.y, 16, "#7dff9a", 0.7, 80); sfx.revive(); }
        u.atkT = def.raise.every / u.abil;
      }
    }
    u.attacking = false;
    const mult = u.buffed ? 1.25 : 1;
    if (u.atGate) { b.gateHp -= u.dps * mult * GATE_MUL * (def.siege ?? 1) * dt; if (Math.random() < dt * 1.5) b.gateHitT = 0.15; u.attacking = true; if (Math.random() < dt * 3) burst(b, GATE.x - 30, u.y, 2, "#c8a070", 0.4, 60, 2, 150); continue; }
    if (u.dps <= 0) continue;
    if (def.fireBreath) {
      const targets = b.towers.filter((t) => t.alive && Math.hypot(t.x - u.x, t.y - u.y) < u.reach);
      for (const t of targets) { hurtTower(b, t, u.dps * mult * dt); if (Math.random() < dt * 20) b.parts.push({ x: u.x + 10, y: u.y, vx: (t.x - u.x) * 2, vy: (t.y - u.y) * 2, life: 0.4, max: 0.4, size: 6, color: Math.random() < 0.5 ? "#ff6a1a" : "#ffd040", grav: 0 }); }
      if (targets.length) { u.attacking = true; sfx.flame(); }
      continue;
    }
    const t = b.towers.find((t) => t.alive && Math.hypot(t.x - u.x, t.y - u.y) < u.reach);
    if (t) {
      u.attacking = true;
      const dmg = u.dps * mult * dt; hurtTower(b, t, dmg);
      if (def.lifesteal) u.hp = Math.min(u.maxHp, u.hp + dmg * def.lifesteal * u.abil);
      if (Math.random() < dt * 4) burst(b, t.x, t.y, 2, "#c8b89a", 0.4, 60, 2, 150);
      if (def.freeze) { u.atkT -= dt; if (u.atkT <= 0) { u.atkT = def.freeze.every; t.frozenT = def.freeze.dur * u.abil; burst(b, t.x, t.y - 20, 18, "#bff3ff", 0.6, 90); sfx.freeze(); } }
    }
  }

  // towers
  for (const t of b.towers) towerTick(b, t, dt);
  defender(b, dt);

  // projectiles
  b.projs = b.projs.filter((p) => {
    p.t += dt;
    if (p.target && !p.target.dead && p.target.hp > 0) { p.tx = p.target.x; p.ty = p.target.y; }
    const k = Math.max(0, Math.min(1, p.t / p.dur));
    const arc = p.kind === "arrow" ? 25 : p.kind === "mini" ? 40 : 90;
    p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * arc;
    if (p.kind !== "arrow" && Math.random() < 0.6) b.parts.push({ x: p.x, y: p.y, vx: 0, vy: -10, life: 0.4, max: 0.4, size: 3, color: "#777", grav: 0 });
    if (k < 1) return true;
    if (p.kind === "arrow") {
      if (p.target && !p.target.dead && p.target.hp > 0) { hurtUnit(b, p.target, p.dmg); if (p.lvl >= 3) { p.target.burnT = 2; p.target.burnDps = p.dmg * 0.5; } sfx.hit(); }
      else if (p.splash > 0) { burst(b, p.tx, p.ty, 4, "#e8d8b0", 0.3, 50, 2); for (const u of b.units) if (Math.hypot(u.x - p.tx, u.y - p.ty) < p.splash) hurtUnit(b, u, p.dmg * 0.5); }
    } else {
      explosion(b, p.tx, p.ty, p.kind === "mini" ? 0.35 : 0.6);
      for (const u of b.units) if (Math.hypot(u.x - p.tx, u.y - p.ty) < p.splash) hurtUnit(b, u, p.dmg);
      if (p.kind === "ball" && p.lvl >= 3) for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; b.projs.push({ kind: "mini", x: p.tx, y: p.ty, sx: p.tx, sy: p.ty, tx: p.tx + Math.cos(a) * 55, ty: p.ty + Math.sin(a) * 55, t: 0, dur: 0.35, target: null, dmg: p.dmg * 0.4, splash: 35, lvl: 1 }); }
    }
    return false;
  });

  // deaths
  for (const u of b.units) {
    if (u.dead || u.hp > 0) continue;
    const def = MONSTERS[u.kind];
    if (def.revive && !u.revived) { u.revived = true; u.hp = u.maxHp * def.revive * u.abil; burst(b, u.x, u.y, 20, "#e8e0c8", 0.7, 90); text(b, u.x, u.y - 20, "Восстал!", "#e8e0c8"); sfx.revive(); continue; }
    if (def.rebirth && !u.reborn) { u.reborn = true; u.hp = u.maxHp; u.stealthT = def.rebirth.stealth * u.abil; burst(b, u.x, u.y, 40, "#ff8a2a", 0.9, 160, 4, -100); text(b, u.x, u.y - 20, "Пепел!", "#ffb050"); sfx.revive(); continue; }
    u.dead = true;
    burst(b, u.x, u.y, 14, "#5c0a10", 0.8, 100, 3, 200); if (!u.minion) sfx.death(u.kind);
    if (def.deathBurst) {
      const db = def.deathBurst; explosion(b, u.x, u.y, 1, "#7fd040"); sfx.explosion();
      for (const t of b.towers) if (t.alive && Math.hypot(t.x - u.x, t.y - u.y) < db.radius) hurtTower(b, t, db.dmg * u.abil);
      for (let i = 0; i < db.count; i++) spawnUnit(b, db.spawn, u.lvl, u.d - i * 8, true);
    }
    if (def.deathSpawn) { const m = spawnUnit(b, def.deathSpawn, u.lvl, u.d, true); burst(b, m.x, m.y, 12, "#5a2050", 0.6); }
    if (!u.minion) b.deathSpots.push({ d: u.d, t: b.time });
  }
  b.units = b.units.filter((u) => !u.dead);
  b.deathSpots = b.deathSpots.filter((s) => b.time - s.t < 20);
  fx(b, dt);

  b.gateHitT = Math.max(0, b.gateHitT - dt);
  if (b.gateHitT > 0.2) b.shake = Math.max(b.shake, 1.5);
  const stage = b.gateHp / b.gateMax < 0.33 ? 2 : b.gateHp / b.gateMax < 0.66 ? 1 : 0;
  if (stage > b.gateStage && b.gateHp > 0) {
    b.gateStage = stage; b.shake = Math.max(b.shake, 9); sfx.gateCrack();
    burst(b, GATE.x - 10, GATE.y - 20, 40, "#c8a070", 1, 200, 5, 300); burst(b, GATE.x - 10, GATE.y - 40, 20, "#ffcf5a", 0.6, 160, 3);
    text(b, GATE.x - 40, GATE.y - 130, stage === 1 ? "Ворота трещат!" : "Ворота рушатся!", "#ffcf5a");
  }
  if (b.gateHp <= 0) {
    b.gateHp = 0; b.result = "won"; b.shake = 20;
    for (let i = 0; i < 6; i++) explosion(b, GATE.x + (Math.random() - 0.5) * 60, GATE.y + (Math.random() - 0.5) * 100, 2);
    sfx.explosion(); setTimeout(() => sfx.victory(), 600);
  } else if (b.time >= b.level.timeLimit) { b.result = "lost"; sfx.defeat(); }
}

function towerTick(b: Battle, t: Tower, dt: number) {
  if (!t.alive) {
    if (b.level.repair) {
      const near = b.units.some((u) => Math.hypot(u.x - t.x, u.y - t.y) < 130);
      t.ruinT = near ? 0 : t.ruinT + dt;
      if (t.ruinT > 12) { t.alive = true; t.lvl = 1; t.maxHp = TOWERS[t.kind].hp * t.mul; t.hp = t.maxHp * 0.5; t.ruinT = 0; text(b, t.x, t.y - 40, "Отстроено", "#9fc8ff"); burst(b, t.x, t.y, 20, "#c8b89a", 0.6, 80); }
    }
    return;
  }
  t.growT = Math.max(0, t.growT - dt); t.flash = Math.max(0, t.flash - dt); t.frozenT = Math.max(0, t.frozenT - dt); t.blindT = Math.max(0, t.blindT - dt);
  if (t.upgradeT > 0) {
    t.upgradeT -= dt;
    if (t.upgradeT <= 0) {
      t.upgradeT = 0;
      if (t.building) { t.building = false; t.hp = t.maxHp; text(b, t.x, t.y - 50, "Построено!", "#9fc8ff"); }
      else { t.lvl++; t.growT = 0.6; t.maxHp *= 1.25; t.hp = Math.min(t.maxHp, t.hp * 1.25 + t.maxHp * 0.2); text(b, t.x, t.y - 50, `Ур. ${t.lvl}!`, "#ffd060"); ring(b, t.x, t.y - 20, "#ffe08a", 0.5); }
      burst(b, t.x, t.y - 30, 30, "#ffe08a", 0.8, 120); sfx.upgradeTower();
    }
    if (t.building) return;
    if (Math.random() < dt * 6) burst(b, t.x + (Math.random() - 0.5) * 40, t.y, 1, "#a89878", 0.8, 30, 4, -20);
  }
  const def = TOWERS[t.kind]; const sc = towerScale(t.lvl);
  const range = def.range * sc.range, dmg = def.dmg * sc.dmg * t.mul;
  t.cd -= dt;
  if (t.frozenT > 0 || t.blindT > 0 || t.disabled) return;
  if (t.superT > 0) {
    t.superT -= dt;
    if (Math.random() < dt * 30) burst(b, t.x, t.y - 40, 1, "#ffe9a0", 0.5, 60, 3, -80);
    if (t.superT <= 0) { t.superT = 0; t.charge = 0; fireSuper(b, t, range, dmg); }
    return;
  }
  if (t.charge >= 1) { t.superT = SUPER.windup; text(b, t.x, t.y - 70, "Суперзаряд!", "#ffe9a0"); sfx.superCharge(); return; }
  const engaged = t.kind === "bell" ? b.units.length > 0 : b.units.some((u) => Math.hypot(u.x - t.x, u.y - t.y) < range * 1.15);
  if (engaged) t.charge = Math.min(1, t.charge + dt / SUPER.fill);
  if (t.kind === "bell") {
    for (const o of b.towers) if (o.alive && !o.building && Math.hypot(o.x - t.x, o.y - t.y) < range) o.hp = Math.min(o.maxHp, o.hp + 18 * sc.dmg * dt);
    if (t.cd <= 0) { t.cd = 2; b.beams.push({ x1: t.x, y1: t.y - 40, x2: t.x, y2: t.y - 40, life: 0.6, color: "#ffe9a0", jag: false }); if (b.units.some((u) => u.stealthT > 0 && Math.hypot(u.x - t.x, u.y - t.y) < range)) sfx.bell(); }
    return;
  }
  let target: Unit | null = null; let decoy: Unit | null = null;
  for (const u of b.units) {
    if (u.dead || !canSee(b, u) || Math.hypot(u.x - t.x, u.y - t.y) > range) continue;
    if (t.kind === "flame" && MONSTERS[u.kind].flying) continue;
    if (MONSTERS[u.kind].decoy && (!decoy || unitProgress(b, u) > unitProgress(b, decoy))) decoy = u;
    if (!target || unitProgress(b, u) > unitProgress(b, target)) target = u;
  }
  if (decoy) target = decoy;
  if (!target) return;
  t.angle = Math.atan2(target.y - t.y, target.x - t.x);
  if (t.cd > 0) return;
  t.cd = def.rate * sc.rate;
  const sy = t.y - 34;
  if (miss(b)) { if (Math.random() < 0.3) text(b, target.x, target.y - 20, "мимо", "#888"); return; }
  if (t.kind === "archer") { b.projs.push({ kind: "arrow", x: t.x, y: sy, sx: t.x, sy, tx: target.x, ty: target.y, t: 0, dur: 0.3, target, dmg, splash: 0, lvl: t.lvl }); sfx.arrow(); }
  else if (t.kind === "cannon") {
    const lead = MONSTERS[target.kind].flying ? [target.x, target.y] : b.path.posAt(target.d + target.speed * 0.7);
    const tx = target.atGate ? target.x : lead[0]!, ty = target.atGate ? target.y : lead[1]! + target.lane;
    b.projs.push({ kind: "ball", x: t.x, y: sy, sx: t.x, sy, tx, ty, t: 0, dur: 0.8, target: null, dmg, splash: (def.splash ?? 50) * sc.range, lvl: t.lvl });
    burst(b, t.x + Math.cos(t.angle) * 20, sy, 10, "#ccc", 0.6, 50, 5, -20); sfx.cannon(); b.shake = Math.max(b.shake, 1.5);
  } else if (t.kind === "mage") {
    let cur: Unit | null = target; let x1 = t.x, y1 = t.y - 48; const hit = new Set<Unit>(); const chain = t.lvl >= 3 ? 3 : 2;
    for (let i = 0; i < chain && cur; i++) {
      b.beams.push({ x1, y1, x2: cur.x, y2: cur.y, life: 0.25, color: "#9fe6ff", jag: true });
      hurtUnit(b, cur, dmg * (i ? 0.6 : 1)); cur.slowT = 1.6; hit.add(cur); burst(b, cur.x, cur.y, 6, "#7fe0ff", 0.4, 90, 2);
      x1 = cur.x; y1 = cur.y; const from: Unit = cur;
      cur = b.units.find((u) => !hit.has(u) && !u.dead && canSee(b, u) && Math.hypot(u.x - from.x, u.y - from.y) < 75) ?? null;
    }
    sfx.zap();
  } else if (t.kind === "frost") {
    t.shots++;
    b.beams.push({ x1: t.x, y1: t.y - 50, x2: target.x, y2: target.y, life: 0.2, color: "#d8f6ff", jag: false });
    hurtUnit(b, target, dmg); target.slowT = 2.2; burst(b, target.x, target.y, 8, "#d8f6ff", 0.5, 70, 2);
    if (t.shots % 3 === 0 && !MONSTERS[target.kind].flying) { target.stunT = Math.max(target.stunT, 0.8 + 0.1 * t.lvl); burst(b, target.x, target.y - 8, 16, "#bff3ff", 0.7, 60, 3); }
    sfx.frost();
  } else if (t.kind === "censer") {
    const tx = target.x, ty = target.y, rad = (def.splash ?? 70) * sc.range;
    burst(b, tx, ty, 26, "#7fd040", 1.2, rad, 6, -15); ring(b, tx, ty, "#8fe04a", 0.4);
    for (const u of b.units) if (!u.dead && Math.hypot(u.x - tx, u.y - ty) < rad) { u.poisonT = 3.5; u.poisonDps = Math.max(u.poisonDps, dmg); }
    sfx.censer();
  } else if (t.kind === "ballista") {
    const ex = t.x + Math.cos(t.angle) * range * 1.2, ey = t.y + Math.sin(t.angle) * range * 1.2;
    b.beams.push({ x1: t.x, y1: sy, x2: ex, y2: ey, life: 0.15, color: "#e8d8b0", jag: false });
    for (const u of b.units) {
      const dx = ex - t.x, dy = ey - t.y, L2 = dx * dx + dy * dy; const k = Math.max(0, Math.min(1, ((u.x - t.x) * dx + (u.y - t.y) * dy) / L2));
      if (Math.hypot(u.x - t.x - dx * k, u.y - t.y - dy * k) < 16 && canSee(b, u)) hurtUnit(b, u, dmg);
    }
    sfx.bolt();
  } else if (t.kind === "flame") {
    for (const u of b.units) if (!u.dead && canSee(b, u) && Math.hypot(u.x - t.x, u.y - t.y) < range && !MONSTERS[u.kind].flying) { hurtUnit(b, u, dmg); if (t.lvl >= 2) { u.burnT = 1; u.burnDps = dmg; } }
    for (let i = 0; i < 4; i++) { const a = t.angle + (Math.random() - 0.5) * 0.6, v = 200 + Math.random() * 100; b.parts.push({ x: t.x, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: range / v, max: range / v, size: 7, color: Math.random() < 0.5 ? "#ff6a1a" : "#ffc040", grav: -40 }); }
    sfx.flame();
  }
}

function fireSuper(b: Battle, t: Tower, range: number, dmg: number) {
  const inRange = b.units.filter((u) => !u.dead && Math.hypot(u.x - t.x, u.y - t.y) < range * 1.2);
  const front = inRange.sort((a, c) => unitProgress(b, c) - unitProgress(b, a))[0];
  text(b, t.x, t.y - 80, SUPER_NAME[t.kind], "#ffe9a0"); ring(b, t.x, t.y - 30, "#ffe9a0", 0.6); b.shake = Math.max(b.shake, 6);
  burst(b, t.x, t.y - 40, 40, "#ffe9a0", 0.7, 220, 4); sfx.superFire();
  const sy = t.y - 40;
  if (t.kind === "archer" && front) {
    for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * 70; b.projs.push({ kind: "arrow", x: t.x, y: sy, sx: t.x, sy, tx: front.x + Math.cos(a) * r, ty: front.y + Math.sin(a) * r * 0.6, t: -i * 0.04, dur: 0.45, target: i < 6 ? front : null, dmg: dmg * 1.2, splash: 26, lvl: t.lvl }); }
  } else if (t.kind === "cannon" && front) {
    for (let i = 0; i < 3; i++) b.projs.push({ kind: "ball", x: t.x, y: sy, sx: t.x, sy, tx: front.x + (i - 1) * 40, ty: front.y, t: -i * 0.18, dur: 0.8, target: null, dmg: dmg * 1.3, splash: 70, lvl: 2 });
    for (const u of inRange) u.stunT = 1.5;
  } else if (t.kind === "mage") {
    let x1 = t.x, y1 = sy - 8;
    for (const u of inRange.slice(0, 7)) { b.beams.push({ x1, y1, x2: u.x, y2: u.y, life: 0.4, color: "#bff3ff", jag: true }); hurtUnit(b, u, dmg * 1.6); u.slowT = 3; x1 = u.x; y1 = u.y; }
  } else if (t.kind === "bell") {
    for (const o of b.towers) if (o.alive && Math.hypot(o.x - t.x, o.y - t.y) < range * 1.3) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.3); burst(b, o.x, o.y - 20, 12, "#fff3b0", 0.6, 80); }
    for (const u of b.units) if (Math.hypot(u.x - t.x, u.y - t.y) < range * 1.5) { u.stealthT = 0; u.recloakT = 4; }
  } else if (t.kind === "ballista") {
    for (const off of [-0.25, 0, 0.25]) {
      const a = t.angle + off, ex = t.x + Math.cos(a) * range * 1.3, ey = t.y + Math.sin(a) * range * 1.3;
      b.beams.push({ x1: t.x, y1: sy, x2: ex, y2: ey, life: 0.25, color: "#ffe9a0", jag: false });
      for (const u of b.units) { const dx = ex - t.x, dy = ey - t.y, L2 = dx * dx + dy * dy; const k = Math.max(0, Math.min(1, ((u.x - t.x) * dx + (u.y - t.y) * dy) / L2)); if (Math.hypot(u.x - t.x - dx * k, u.y - t.y - dy * k) < 18) hurtUnit(b, u, dmg * 1.4); }
    }
  } else if (t.kind === "frost") {
    for (const u of inRange) { if (!MONSTERS[u.kind].flying) u.stunT = 2.5; u.slowT = 5; hurtUnit(b, u, dmg * 2); burst(b, u.x, u.y - 8, 14, "#e0faff", 0.8, 80, 3); }
    for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * range; b.parts.push({ x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r * 0.7 - 120, vx: 30, vy: 160, life: 0.8, max: 0.8, size: 4, color: "#f0fbff", grav: 0 }); }
  } else if (t.kind === "censer") {
    const cx = front ? front.x : t.x, cy = front ? front.y : t.y;
    burst(b, cx, cy, 70, "#7fd040", 1.8, 180, 8, -10);
    for (const u of b.units) if (Math.hypot(u.x - cx, u.y - cy) < 170) { u.poisonT = 6; u.poisonDps = dmg * 2.5; }
  } else if (t.kind === "flame") {
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; b.parts.push({ x: t.x, y: t.y - 10, vx: Math.cos(a) * 260, vy: Math.sin(a) * 160, life: 0.55, max: 0.55, size: 9, color: i % 2 ? "#ff6a1a" : "#ffc040", grav: -30 }); }
    for (const u of b.units) if (!MONSTERS[u.kind].flying && Math.hypot(u.x - t.x, u.y - t.y) < range * 1.4) { hurtUnit(b, u, dmg * 20); u.burnT = 3; u.burnDps = dmg * 2; }
  }
}

function defender(b: Battle, dt: number) {
  const L = b.level;
  if (L.upgradeEvery > 0) {
    b.upgradeTimer -= dt;
    if (b.upgradeTimer <= 0) {
      b.upgradeTimer = L.upgradeEvery;
      const c = b.towers.filter((t) => t.alive && t.lvl < TOWER_MAX_LVL && t.upgradeT <= 0);
      const t = c[Math.floor(Math.random() * c.length)];
      if (t) { t.upgradeT = 6; text(b, t.x, t.y - 60, "Улучшается…", "#ffd060"); }
    }
  }
  if (L.buildEvery > 0) {
    b.buildTimer -= dt;
    if (b.buildTimer <= 0) {
      b.buildTimer = L.buildEvery;
      const used = new Set(b.towers.map((t) => t.slot));
      const free = b.slots.map((_, i) => i).filter((i) => !used.has(i));
      const slot = free[Math.floor(Math.random() * free.length)];
      if (slot !== undefined && L.buildKinds.length) {
        const t = makeTower(b, L.buildKinds[Math.floor(Math.random() * L.buildKinds.length)]!, slot, 1);
        t.building = true; t.upgradeT = 6; t.hp = t.maxHp * 0.3; b.towers.push(t); text(b, t.x, t.y - 60, "Стройка!", "#9fc8ff");
      }
    }
  }
}

function fx(b: Battle, dt: number) {
  b.shake = Math.max(0, b.shake - dt * 25);
  b.parts = b.parts.filter((p) => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; p.vx *= 0.96; p.vy *= 0.96; return p.life > 0; });
  b.beams = b.beams.filter((x) => (x.life -= dt) > 0);
  b.texts = b.texts.filter((t) => { t.y -= 25 * dt; return (t.life -= dt) > 0; });
}

export function outcome(b: Battle) {
  return { won: b.result === "won", gateFrac: 1 - Math.max(0, b.gateHp) / b.gateMax, towersDown: b.stats.towersDown, summoned: b.stats.summoned, timeLeftFrac: Math.max(0, 1 - b.time / b.level.timeLimit) };
}
