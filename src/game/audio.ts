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

export const sfx = {
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

function loopNoise(c: AudioContext, filter: BiquadFilterType, freq: number, vol: number, lfo = 0.1) {
  const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate); const d = buf.getChannelData(0);
  let lastV = 0; for (let i = 0; i < d.length; i++) { lastV = lastV * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = lastV * 6; }
  const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain(); g.gain.value = vol;
  const l = c.createOscillator(); l.frequency.value = lfo; const lg = c.createGain(); lg.gain.value = freq * 0.4; l.connect(lg).connect(f.frequency);
  s.connect(f).connect(g).connect(musicBus!); s.start(); l.start();
  return () => { try { s.stop(); l.stop(); } catch { /* already stopped */ } };
}

const AMBIENT: Record<string, { wind: [BiquadFilterType, number, number]; extra: () => void; root: number }> = {
  dead: { wind: ["bandpass", 500, 0.5], extra: () => { if (Math.random() < 0.15) tone(jit(900, 0.2), 0.25, "triangle", 0.03, 600, 0, "music"); }, root: 110 },
  ice: { wind: ["bandpass", 1100, 0.7], extra: () => { if (Math.random() < 0.2) chime(jit(2600, 0.2), 1.2, 0.02, 0, "music"); }, root: 123.5 },
  swamp: { wind: ["lowpass", 300, 0.6], extra: () => { if (Math.random() < 0.4) tone(jit(240, 0.3), 0.12, "sine", 0.05, 420, 0, "music"); }, root: 98 },
  forest: { wind: ["bandpass", 700, 0.45], extra: () => { if (Math.random() < 0.25) tone(jit(2400, 0.15), 0.12, "sine", 0.025, 3000, 0, "music"); }, root: 116.5 },
  forge: { wind: ["lowpass", 180, 0.9], extra: () => { if (Math.random() < 0.2) chime(jit(1400, 0.1), 0.6, 0.03, 0, "music"); }, root: 87.3 },
  capital: { wind: ["bandpass", 600, 0.4], extra: () => { if (Math.random() < 0.08) chime(330, 3, 0.05, 0, "music"); }, root: 103.8 },
  map: { wind: ["bandpass", 450, 0.35], extra: () => { if (Math.random() < 0.12) chime(jit(523, 0.01), 2, 0.025, 0, "music"); }, root: 110 },
};

export function stopScene() { if (scene) { clearInterval(scene.timer); scene.stop(); scene = null; } }

/** Start ambient bed (+ war drums when `battle`) for a location theme. */
export function startScene(theme: string, battle: boolean) {
  stopScene(); if (musicMuted) return; const c = ac(); if (!c || !musicBus) return;
  if (!battle && theme === "map") { startMapMusic(c); return; }
  const a = AMBIENT[theme] ?? AMBIENT["dead"]!;
  const stops = [loopNoise(c, a.wind[0], a.wind[1], a.wind[2])];
  // low drone: root + fifth
  const drone = [a.root / 2, (a.root * 3) / 4].map((f) => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260; const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(battle ? 0.05 : 0.035, c.currentTime, 2); o.connect(lp).connect(g).connect(musicBus!); o.start(); return o; });
  stops.push(() => drone.forEach((o) => { try { o.stop(); } catch { /* ignore */ } }));
  let step = 0;
  const scale = [1, 1.189, 1.335, 1.498, 1.782]; // minor pentatonic
  const timer = window.setInterval(() => {
    step++;
    a.extra();
    if (!battle) { if (step % 8 === 0) chime(a.root * 4 * scale[Math.floor(Math.random() * 5)]!, 2.5, 0.03, 0, "music"); return; }
    const beat = step % 8; const loud = 0.5 + intensity * 0.7;
    if (beat === 0 || beat === 3 || beat === 4) { tone(62, 0.35, "sine", 0.32 * loud, 38, 0, "music"); noise(0.12, 0.12 * loud, 180, 0, "music"); }
    if (beat === 6 || (intensity > 0.5 && beat === 7)) noise(0.08, 0.1 * loud, 2400, 0, "music", "bandpass");
    if (beat === 0 && step % 32 === 0) [0, 2, 3].forEach((n, i) => tone(a.root * 2 * scale[n]!, 0.9, "triangle", 0.05, undefined, i * 0.3, "music", 0.05));
  }, 250);
  scene = { timer, stop: () => stops.forEach((s) => s()) };
}

/** Soft pad chord on the music bus with slow swell. */
function pad(c: AudioContext, freqs: number[], dur: number, vol: number) {
  const t = c.currentTime; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200; const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  lp.connect(g).connect(musicBus!);
  for (const f of freqs) for (const d of [-4, 4]) { const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); }
}

/** Calm map theme: warm minor chords + sparse music-box melody (~70 bpm). */
function startMapMusic(c: AudioContext) {
  // Am - F - C - G (and a variant ending on Em) in Hz roots
  const prog = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 196, 261.6], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6], [146.8, 174.6, 220], [164.8, 196, 246.9]];
  const beat = 60 / 70; let step = 0;
  const play = () => {
    const bar = Math.floor(step / 4) % prog.length; const ch = prog[bar]!; const b = step % 4;
    if (b === 0) { pad(c, ch.map((f) => f / 2), beat * 4.2, 0.05); tone(ch[0]! / 4, beat * 4, "sine", 0.06, undefined, 0, "music", 0.4); }
    // music box: chord tones an octave or two up, sometimes rest
    const notes = [ch[0]! * 2, ch[1]! * 2, ch[2]! * 2, ch[1]! * 4, ch[2]! * 4];
    if (Math.random() < 0.75) chime(notes[(b * 2 + Math.floor(Math.random() * 2) + bar) % notes.length]!, beat * 2.2, 0.035, 0, "music");
    if (Math.random() < 0.25) chime(notes[Math.floor(Math.random() * notes.length)]!, beat * 1.5, 0.02, beat / 2, "music");
    step++;
  };
  play();
  const timer = window.setInterval(play, beat * 1000);
  const t = c.currentTime; musicBus!.gain.cancelScheduledValues(t); musicBus!.gain.setValueAtTime(0.0001, t); musicBus!.gain.linearRampToValueAtTime(MUSIC_VOL, t + 2.5);
  scene = { timer, stop: () => { const n = c.currentTime; musicBus!.gain.cancelScheduledValues(n); musicBus!.gain.setValueAtTime(musicBus!.gain.value, n); musicBus!.gain.linearRampToValueAtTime(0.0001, n + 0.6); musicBus!.gain.linearRampToValueAtTime(musicMuted ? 0 : MUSIC_VOL, n + 1.2); } };
}
