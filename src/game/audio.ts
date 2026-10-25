// Pure Web Audio API synthesized sound: effects bus (with soft reverb) + music/ambient bus, both through a compressor.
import type { MonsterId } from "./data/monsters";

let ctx: AudioContext | null = null;
let fxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let verbSend: GainNode | null = null;
let muted = false;
let musicMuted = false;
const FX_VOL = 0.42, MUSIC_VOL = 0.22;

function impulse(c: AudioContext, sec: number) {
  const len = Math.floor(c.sampleRate * sec); const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  return buf;
}

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 9000; // tame harsh highs
    comp.connect(tone).connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 1.6);
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.35; verb.connect(verbOut).connect(comp);
    verbSend = ctx.createGain(); verbSend.gain.value = 1; verbSend.connect(verb);
    fxBus = ctx.createGain(); fxBus.gain.value = muted ? 0 : FX_VOL; fxBus.connect(comp); fxBus.connect(verbSend);
    musicBus = ctx.createGain(); musicBus.gain.value = musicMuted ? 0 : MUSIC_VOL; musicBus.connect(comp);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) { muted = m; if (fxBus && ctx) fxBus.gain.setTargetAtTime(m ? 0 : FX_VOL, ctx.currentTime, 0.05); }
export function setMusicMuted(m: boolean) { musicMuted = m; if (musicBus && ctx) musicBus.gain.setTargetAtTime(m ? 0 : MUSIC_VOL, ctx.currentTime, 0.2); if (m) stopScene(); }
export function unlockAudio() { ac(); }

const jit = (f: number, k = 0.04) => f * (1 + (Math.random() - 0.5) * 2 * k);

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.5, slideTo?: number, delay = 0, bus: "fx" | "music" = "fx", attack = 0.005) {
  if (bus === "fx" ? muted : musicMuted) return; const c = ac(); const out = bus === "fx" ? fxBus : musicBus; if (!c || !out) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur: number, vol: number, filterFreq: number, delay = 0, bus: "fx" | "music" = "fx", type: BiquadFilterType = "lowpass", attack = 0.003) {
  if (bus === "fx" ? muted : musicMuted) return; const c = ac(); const out = bus === "fx" ? fxBus : musicBus; if (!c || !out) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out); s.start(t);
}
/** soft bell / chime with partials */
function chime(f: number, dur: number, vol: number, delay = 0, bus: "fx" | "music" = "fx") {
  tone(f, dur, "sine", vol, undefined, delay, bus, 0.01); tone(f * 2.76, dur * 0.5, "sine", vol * 0.3, undefined, delay, bus, 0.01); tone(f * 5.4, dur * 0.25, "sine", vol * 0.12, undefined, delay, bus, 0.01);
}

const last: Record<string, number> = {};
function throttle(k: string, ms: number) { const n = performance.now(); if (n - (last[k] ?? 0) < ms) return true; last[k] = n; return false; }

const DEATH: Partial<Record<MonsterId, () => void>> = {
  goblin: () => tone(jit(700, 0.1), 0.15, "square", 0.05, 300),
  rat: () => tone(jit(1400, 0.1), 0.08, "square", 0.04, 900),
  troll: () => { tone(110, 0.5, "sawtooth", 0.1, 50); noise(0.4, 0.2, 300); },
  golem: () => { noise(0.5, 0.25, 2500, 0, "fx", "highpass"); chime(1600, 0.4, 0.05); },
  skeleton: () => { for (let i = 0; i < 4; i++) noise(0.04, 0.12, 3000, i * 0.04, "fx", "bandpass"); },
  ghost: () => tone(900, 0.6, "sine", 0.06, 200),
  vampire: () => tone(500, 0.4, "triangle", 0.06, 1200),
  phoenix: () => { noise(0.5, 0.2, 1500); tone(600, 0.4, "triangle", 0.05, 1500); },
  dragon: () => { tone(90, 1, "sawtooth", 0.14, 40); noise(0.8, 0.3, 500); },
  abyss: () => { tone(60, 1.4, "sawtooth", 0.16, 30); noise(1.2, 0.3, 300); },
};

const VOICE: Partial<Record<MonsterId, () => void>> = {
  goblin: () => { for (let i = 0; i < 3; i++) tone(jit(900, 0.08), 0.06, "square", 0.03, 1200, i * 0.07); },
  sapper: () => { for (let i = 0; i < 2; i++) tone(jit(800, 0.08), 0.07, "square", 0.03, 1300, i * 0.08); noise(0.15, 0.06, 3000, 0.15, "fx", "highpass"); },
  troll: () => { tone(85, 0.6, "sawtooth", 0.08, 65, 0, "fx", 0.08); noise(0.5, 0.1, 260, 0, "fx", "lowpass", 0.1); },
  shaman: () => { tone(196, 0.9, "sine", 0.06, 207, 0, "fx", 0.2); tone(294, 0.9, "sine", 0.04, 311, 0, "fx", 0.2); },
  skeleton: () => { for (let i = 0; i < 5; i++) noise(0.03, 0.08, 3500, i * 0.05, "fx", "bandpass"); },
  rat: () => { tone(jit(2200, 0.1), 0.05, "square", 0.025, 2600); tone(jit(2400, 0.1), 0.05, "square", 0.025, 2800, 0.08); },
  ghost: () => tone(600, 1, "sine", 0.05, 900, 0, "fx", 0.3),
  golem: () => { noise(0.5, 0.14, 400, 0, "fx", "lowpass", 0.05); chime(1200, 0.6, 0.04, 0.1); },
  fatty: () => { tone(120, 0.4, "triangle", 0.07, 70); noise(0.3, 0.08, 500, 0.1); },
  orc: () => { tone(140, 0.4, "sawtooth", 0.07, 110); tone(110, 0.35, "sawtooth", 0.06, 90, 0.18); },
  vampire: () => tone(1200, 0.5, "triangle", 0.04, 700),
  phoenix: () => { chime(1568, 0.4, 0.05); chime(2093, 0.5, 0.04, 0.1); noise(0.4, 0.08, 1800); },
  necro: () => { tone(110, 1, "sawtooth", 0.05, 98, 0, "fx", 0.3); chime(440, 0.8, 0.03, 0.2); },
  runebreaker: () => { tone(300, 0.4, "square", 0.04, 150); chime(1760, 0.3, 0.04, 0.1); },
  dragon: () => { tone(70, 1.2, "sawtooth", 0.12, 50, 0, "fx", 0.1); noise(1, 0.2, 700, 0.1); },
  abyss: () => { tone(45, 1.6, "sawtooth", 0.14, 35, 0, "fx", 0.2); tone(90, 1.4, "square", 0.04, 70, 0.2); noise(1.4, 0.2, 250); },
  ram: () => { tone(jit(900, 0.08), 0.06, "square", 0.03, 1200); noise(0.4, 0.15, 300, 0.05); },
  catapult: () => { for (let i = 0; i < 4; i++) noise(0.05, 0.1, 1200, i * 0.08, "fx", "bandpass"); tone(160, 0.3, "triangle", 0.05, 120, 0.3); },
};

export const sfx = {
  voice(kind: MonsterId) { if (throttle("v" + kind, 400)) return; VOICE[kind]?.(); },
  meteor() { noise(0.6, 0.25, 2500, 0, "fx", "bandpass", 0.3); tone(900, 0.5, "sawtooth", 0.06, 120); noise(1.3, 0.9, 600, 0.35); tone(55, 1, "sine", 0.6, 25, 0.35); },
  smoke() { noise(1.6, 0.3, 700, 0, "fx", "lowpass", 0.4); },
  berserk() { tone(98, 0.8, "sawtooth", 0.1, 196, 0, "fx", 0.05); },
  catapult() { if (throttle("cp", 200)) return; noise(0.15, 0.2, 900); tone(220, 0.25, "triangle", 0.06, 90); },
  ram() { tone(jit(70, 0.05), 0.5, "sine", 0.55, 30); noise(0.4, 0.5, 400); noise(0.2, 0.15, 2000, 0.05, "fx", "bandpass"); },
  oil() { if (throttle("oil", 1500)) return; noise(1.2, 0.2, 3000, 0, "fx", "highpass", 0.2); noise(0.6, 0.12, 600, 0.1); },
  champion() { [196, 262, 330, 392].forEach((f, i) => tone(f, 0.5, "sawtooth", 0.07, undefined, i * 0.12, "fx", 0.04)); chime(784, 1.2, 0.06, 0.5); },
  gateFall() { noise(2.2, 0.9, 300); tone(45, 2, "sine", 0.7, 20); for (let i = 0; i < 8; i++) noise(0.15, 0.2, 1500, 0.4 + i * 0.15, "fx", "bandpass"); },
  tick(n: number) { tone(n <= 3 ? 70 : 55, 0.45, "sine", n <= 3 ? 0.55 : 0.4, 30); noise(0.18, n <= 3 ? 0.35 : 0.22, 300); if (n <= 3) tone(55, 0.3, "sine", 0.4, 28, 0.22); },
  click() { tone(jit(620), 0.06, "triangle", 0.08, 380); },
  hover() { if (throttle("hv", 60)) return; tone(jit(1200, 0.02), 0.04, "sine", 0.025); },
  pageTurn() { noise(0.3, 0.12, 2400, 0, "fx", "bandpass", 0.08); },
  arrow() { if (throttle("a", 60)) return; noise(0.07, 0.1, jit(3400, 0.15), 0, "fx", "bandpass"); tone(jit(900, 0.08), 0.05, "triangle", 0.05, 500); },
  cannon() { noise(0.6, 0.5, jit(500, 0.1)); tone(jit(110, 0.08), 0.35, "sine", 0.45, 38); },
  bolt() { if (throttle("b", 80)) return; noise(0.15, 0.25, 1500); tone(jit(300), 0.15, "sawtooth", 0.07, 80); },
  flame() { if (throttle("f", 250)) return; noise(0.35, 0.1, 900, 0, "fx", "lowpass", 0.05); },
  zap() { if (throttle("z", 60)) return; tone(jit(1400, 0.1), 0.15, "sawtooth", 0.05, 300); },
  frost() { if (throttle("fs", 120)) return; chime(jit(2100, 0.05), 0.35, 0.05); noise(0.15, 0.08, 6000, 0, "fx", "highpass"); },
  censer() { if (throttle("cs", 200)) return; noise(0.6, 0.12, 700, 0, "fx", "bandpass", 0.15); tone(jit(180), 0.3, "sine", 0.06, 120); },
  bell() { if (throttle("bl", 1500)) return; chime(660, 1.6, 0.1); },
  freeze() { if (throttle("fr", 200)) return; tone(2000, 0.3, "triangle", 0.06, 800); },
  explosion() { noise(1.0, 0.8, jit(800, 0.15)); tone(jit(80), 0.7, "sine", 0.6, 25); },
  summon() { tone(jit(220, 0.03), 0.14, "triangle", 0.12, 440); tone(jit(330, 0.03), 0.18, "triangle", 0.09, 660, 0.06); noise(0.2, 0.05, 1200, 0, "fx", "bandpass"); },
  revive() { tone(150, 0.4, "sawtooth", 0.08, 400); },
  death(kind: MonsterId) { if (throttle("d", 70)) return; (DEATH[kind] ?? (() => tone(jit(300, 0.15), 0.16, "triangle", 0.05, 120)))(); },
  towerDown() { noise(1.2, 0.6, 450); tone(200, 0.8, "sawtooth", 0.12, 50); for (let i = 0; i < 4; i++) noise(0.1, 0.15, 1800, 0.3 + i * 0.12, "fx", "bandpass"); },
  upgradeTower() { for (let i = 0; i < 3; i++) noise(0.05, 0.12, 3200, i * 0.12, "fx", "bandpass"); chime(784, 0.5, 0.06, 0.4); },
  gateCrack() { noise(0.9, 0.7, 350); tone(70, 0.8, "sawtooth", 0.15, 35); noise(0.3, 0.2, 2200, 0.1, "fx", "bandpass"); },
  gearUp() { [523, 659, 784, 1047].forEach((f, i) => chime(f, 0.6, 0.06, i * 0.07)); noise(0.2, 0.1, 4000, 0, "fx", "highpass"); },
  unlock() { noise(1.4, 0.15, 900, 0, "fx", "lowpass", 0.6); [262, 392, 523, 784].forEach((f, i) => chime(f, 1.2, 0.07, 0.4 + i * 0.15)); },
  warcry() { [196, 247, 294, 392].forEach((f, i) => tone(f, 0.35, "sawtooth", 0.1, undefined, i * 0.08)); noise(0.3, 0.2, 200); },
  hit() { if (throttle("h", 40)) return; tone(jit(180, 0.1), 0.05, "triangle", 0.05, 90); },
  gateHit() { if (throttle("gh", 350)) return; tone(jit(62, 0.06), 0.45, "sine", 0.4, 34); noise(0.25, 0.3, 380); chime(jit(310, 0.05), 0.5, 0.035); },
  gateStage() { for (let i = 0; i < 6; i++) noise(0.06, 0.28, jit(2600, 0.2), i * 0.05, "fx", "bandpass"); noise(1.6, 0.6, 180, 0.15, "fx", "lowpass", 0.1); tone(40, 1.4, "sine", 0.5, 22, 0.15); },
  stone() { if (throttle("st", 80)) return; noise(0.09, 0.35, 900); tone(jit(140, 0.05), 0.12, "sine", 0.25, 80); },
  chest() { tone(jit(180, 0.05), 0.5, "sawtooth", 0.035, 120, 0, "fx", 0.15); noise(0.45, 0.12, 1200, 0, "fx", "bandpass", 0.2); noise(0.08, 0.3, 500, 0.5); },
  coins() { for (let i = 0; i < 7; i++) chime(jit(1500 + (i % 3) * 320, 0.06), 0.3, 0.045, i * 0.065 + Math.random() * 0.03); },
  speed() { tone(330, 0.12, "triangle", 0.08, 660); tone(495, 0.12, "triangle", 0.06, 990, 0.07); },
  coin() { chime(988, 0.25, 0.06); chime(1319, 0.35, 0.06, 0.08); },
  levelUp() { [392, 523, 659, 784].forEach((f, i) => chime(f, 0.5, 0.08, i * 0.07)); },
  caseShake() { noise(0.12, 0.18, 500); tone(jit(90), 0.1, "triangle", 0.08); },
  reveal(tier: number) { [523, 659, 784, 1047, 1319].slice(0, 2 + tier).forEach((f, i) => chime(f, 0.8, 0.09, i * 0.1)); },
  superCharge() { if (throttle("sc", 400)) return; tone(300, 1.1, "sawtooth", 0.04, 1200, 0, "fx", 0.3); },
  superFire() { if (throttle("sf", 150)) return; noise(0.5, 0.35, 2500); tone(1200, 0.4, "triangle", 0.1, 200); },
  whoosh() { noise(0.4, 0.22, 1800, 0, "fx", "bandpass", 0.1); },
  lidPop() { noise(0.25, 0.4, 3000); tone(160, 0.3, "sine", 0.3, 60); },
  flip() { tone(700, 0.08, "triangle", 0.08, 1100); },
  mythic() { noise(1.2, 0.5, 700); [130, 196, 262, 392].forEach((f, i) => tone(f, 0.9, "sawtooth", 0.08, undefined, i * 0.05)); },
  victory() { [262, 330, 392, 523, 659, 784].forEach((f, i) => chime(f, 1, 0.12, i * 0.13)); [131, 196].forEach((f) => tone(f, 1.6, "sawtooth", 0.06, undefined, 0.6, "fx", 0.2)); },
  defeat() { [392, 349, 311, 262, 196].forEach((f, i) => tone(f, 0.7, "triangle", 0.12, undefined, i * 0.22)); },
};

// ---------- ambient + procedural war music
type Scene = { timer: number; stop: () => void };
let scene: Scene | null = null;
let intensity = 0;
/** 0..1 — how close the gate is to falling; louder drums near the end. */
export function setIntensity(v: number) { intensity = Math.max(0, Math.min(1, v)); }

export function stopScene() { if (scene) { clearInterval(scene.timer); scene.stop(); scene = null; } }

/** Start calm background music (+ soft drums when `battle`) for a location theme. No wind/rain noise. */
export function startScene(theme: string, battle: boolean) {
  stopScene(); if (musicMuted) return; const c = ac(); if (!c || !musicBus) return;
  startCalmMusic(c, theme, battle);
}

/** Soft pad chord on the music bus with slow swell. */
function pad(c: AudioContext, freqs: number[], dur: number, vol: number, type: OscillatorType = "triangle", cutoff = 1200) {
  const t = c.currentTime; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cutoff; const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  lp.connect(g).connect(musicBus!);
  for (const f of freqs) for (const d of [-4, 4]) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); }
}

// chord progressions (Hz) per theme
const Am = [220, 261.6, 329.6], F = [174.6, 220, 261.6], C = [130.8, 196, 261.6], G_ = [196, 246.9, 293.7], Dm = [146.8, 174.6, 220], Em = [164.8, 196, 246.9];
const Bm = [246.9, 293.7, 370], Gm = [196, 233.1, 293.7], Eb = [155.6, 196, 233.1], Bb = [116.5, 174.6, 233.1], Cm = [130.8, 155.6, 196];
const MUSIC: Record<string, { prog: number[][]; bpm: number; pad: OscillatorType; cutoff: number; bell: number; bass: number }> = {
  map: { prog: [Am, F, C, G_, Am, F, Dm, Em], bpm: 70, pad: "triangle", cutoff: 1200, bell: 1, bass: 1 },
  dead: { prog: [Am, Dm, Am, Em], bpm: 62, pad: "triangle", cutoff: 900, bell: 0.8, bass: 1 },
  ice: { prog: [Bm, G_, Em, Bm], bpm: 64, pad: "sine", cutoff: 2200, bell: 1.5, bass: 0.6 },
  swamp: { prog: [Dm, Bb, Gm, Am], bpm: 58, pad: "sine", cutoff: 600, bell: 0.5, bass: 1.4 },
  forest: { prog: [Em, C, G_, Dm], bpm: 66, pad: "triangle", cutoff: 1400, bell: 1.1, bass: 0.9 },
  forge: { prog: [Cm, Gm, Eb, Gm], bpm: 60, pad: "sawtooth", cutoff: 500, bell: 0.6, bass: 1.6 },
  capital: { prog: [Gm, Eb, Bb, F], bpm: 56, pad: "triangle", cutoff: 1000, bell: 0.9, bass: 1.2 },
};

/** Calm theme music: warm chords + sparse music-box melody; soft low drum in battle. */
function startCalmMusic(c: AudioContext, theme: string, battle: boolean) {
  const m = MUSIC[theme] ?? MUSIC["dead"]!;
  const beat = 60 / m.bpm; let step = 0;
  const play = () => {
    const bar = Math.floor(step / 4) % m.prog.length; const ch = m.prog[bar]!; const b = step % 4;
    if (b === 0) { pad(c, ch.map((f) => f / 2), beat * 4.2, 0.05, m.pad, m.cutoff); tone(ch[0]! / 4, beat * 4, "sine", 0.06 * m.bass, undefined, 0, "music", 0.4); }
    const notes = [ch[0]! * 2, ch[1]! * 2, ch[2]! * 2, ch[1]! * 4, ch[2]! * 4];
    if (Math.random() < 0.7) chime(notes[(b * 2 + Math.floor(Math.random() * 2) + bar) % notes.length]!, beat * 2.2, 0.03 * m.bell, 0, "music");
    if (Math.random() < 0.2) chime(notes[Math.floor(Math.random() * notes.length)]!, beat * 1.5, 0.018 * m.bell, beat / 2, "music");
    if (battle) {
      const loud = 0.5 + intensity * 0.5;
      if (b === 0 || b === 2) tone(58, 0.5, "sine", 0.16 * loud, 40, 0, "music", 0.01);
      if (intensity > 0.5 && b === 3) tone(58, 0.4, "sine", 0.1 * loud, 40, beat / 2, "music", 0.01);
      // crescendo once the gate is below 30%: low horns + quicker drums
      if (intensity > 0.7) {
        if (b === 0) for (const f of [ch[0]! / 2, ch[2]! / 2]) tone(f, beat * 3.6, "sawtooth", 0.035, undefined, 0, "music", beat * 0.8);
        for (const k of [0.25, 0.5, 0.75]) tone(62, 0.25, "sine", 0.07 * loud, 42, beat * k, "music", 0.005);
      }
    }
    step++;
  };
  play();
  const timer = window.setInterval(play, beat * 1000);
  const t = c.currentTime; musicBus!.gain.cancelScheduledValues(t); musicBus!.gain.setValueAtTime(0.0001, t); musicBus!.gain.linearRampToValueAtTime(MUSIC_VOL, t + 2.5);
  scene = { timer, stop: () => { const n = c.currentTime; musicBus!.gain.cancelScheduledValues(n); musicBus!.gain.setValueAtTime(musicBus!.gain.value, n); musicBus!.gain.linearRampToValueAtTime(0.0001, n + 0.6); musicBus!.gain.linearRampToValueAtTime(musicMuted ? 0 : MUSIC_VOL, n + 1.2); } };
}
