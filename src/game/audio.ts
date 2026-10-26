// Pure Web Audio API synthesized sound. Cartoon "villain march" style:
// effects bus + music bus -> warm saturation -> glue compressor -> soft hall reverb. No audio files.
import type { MonsterId } from "./data/monsters";

type Bus = "fx" | "music";
let ctx: AudioContext | null = null;
let fxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let verbSend: GainNode | null = null;
let musicVerb: GainNode | null = null;
let muted = false;
let musicMuted = false;
const FX_VOL = 0.4, MUSIC_VOL = 0.26;
let masterGain: GainNode | null = null;
/** cutscene speech: own bus so the effects mute toggle and the crowd limiter never drop a syllable */
let talkBus: GainNode | null = null;
const vols = { master: 0.8, music: 0.7, fx: 0.8, voice: 0.8, ui: 0.6 };
const fxTarget = () => (muted ? 0 : FX_VOL * vols.fx * 1.25);
const musicTarget = () => (musicMuted ? 0 : MUSIC_VOL * vols.music * 1.4);
/** category multiplier applied to effect voices while a voice/UI sound is being built */
let volMul = 1;
function withMul<T>(m: number, f: () => T) { const o = volMul; volMul = m; try { return f(); } finally { volMul = o; } }
/** Player volume settings (0..1 each). */
export function setVolumes(v: Partial<typeof vols>) {
  Object.assign(vols, v); if (!ctx) return; const t = ctx.currentTime;
  masterGain?.gain.setTargetAtTime(vols.master * 1.25, t, 0.05); fxBus?.gain.setTargetAtTime(fxTarget(), t, 0.05);
  if (scene) musicBus?.gain.setTargetAtTime(musicTarget(), t, 0.1);
}

function impulse(c: AudioContext, sec: number) {
  const len = Math.floor(c.sampleRate * sec); const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  return buf;
}
function satCurve(k = 2.2) {
  const n = 1024; const cv = new Float32Array(n); const nk = Math.tanh(k);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; cv[i] = Math.tanh(k * x) / nk; }
  return cv;
}

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.22;
    const sat = ctx.createWaveShaper(); sat.curve = satCurve(); sat.oversample = "2x";
    const pre = ctx.createGain(); pre.gain.value = 0.85;
    const warm = ctx.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 8500;
    const body = ctx.createBiquadFilter(); body.type = "peaking"; body.frequency.value = 220; body.gain.value = 2; body.Q.value = 0.8;
    masterGain = ctx.createGain(); masterGain.gain.value = vols.master * 1.25;
    pre.connect(sat).connect(body).connect(warm).connect(comp).connect(masterGain).connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 1.8);
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.3; verb.connect(verbOut).connect(pre);
    verbSend = ctx.createGain(); verbSend.gain.value = 0.9; verbSend.connect(verb);
    musicVerb = ctx.createGain(); musicVerb.gain.value = 0.5; musicVerb.connect(verb);
    fxBus = ctx.createGain(); fxBus.gain.value = fxTarget(); fxBus.connect(pre); fxBus.connect(verbSend);
    talkBus = ctx.createGain(); talkBus.gain.value = FX_VOL * 1.25; talkBus.connect(pre); talkBus.connect(verbSend);
    musicBus = ctx.createGain(); musicBus.gain.value = musicTarget(); musicBus.connect(pre); musicBus.connect(musicVerb);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) { muted = m; if (fxBus && ctx) fxBus.gain.setTargetAtTime(fxTarget(), ctx.currentTime, 0.05); }
export function setMusicMuted(m: boolean) { musicMuted = m; if (musicBus && ctx) musicBus.gain.setTargetAtTime(musicTarget(), ctx.currentTime, 0.2); if (m) stopScene(); else if (!scene) resumeAmbient(); }
export function unlockAudio() { ac(); }

const jit = (f: number, k = 0.04) => f * (1 + (Math.random() - 0.5) * 2 * k);
const outOf = (bus: Bus) => (bus === "fx" ? fxBus : musicBus);
const isMuted = (bus: Bus) => (bus === "fx" ? muted : musicMuted);

// crowd limiter: when many effects ring at once, extra ones are dropped so battles never turn into noise
let live = 0; const MAX_LIVE = 46;
function track(n: AudioScheduledSourceNode, bus: Bus) { if (bus !== "fx") return; live++; n.onended = () => { live--; }; }
const crowded = (bus: Bus) => bus === "fx" && live > MAX_LIVE;

type SynthOpts = { type?: OscillatorType; vol?: number; a?: number; slide?: number | undefined; cut?: number; cutEnd?: number; q?: number; vib?: number; vibRate?: number; detune?: number; bus?: Bus; hold?: number };
/** One oscillator voice at absolute time `t` with optional lowpass sweep and vibrato. */
function synth(c: AudioContext, f: number, t: number, dur: number, o: SynthOpts = {}) {
  const bus = o.bus ?? "fx"; const out = outOf(bus); if (!out || isMuted(bus) || crowded(bus)) return;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = o.type ?? "triangle"; osc.frequency.setValueAtTime(f, t); if (o.detune) osc.detune.value = o.detune;
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
  const vol = Math.max(0.0002, (o.vol ?? 0.2) * (bus === "fx" ? volMul : 1)), a = o.a ?? 0.005, hold = o.hold ?? 0;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a);
  if (hold) g.gain.setValueAtTime(vol, t + a + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc;
  if (o.cut) {
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = o.q ?? 1; lp.frequency.setValueAtTime(o.cut, t);
    if (o.cutEnd) lp.frequency.exponentialRampToValueAtTime(o.cutEnd, t + dur); node.connect(lp); node = lp;
  }
  if (o.vib) { const l = c.createOscillator(); const lg = c.createGain(); l.frequency.value = o.vibRate ?? 5.5; lg.gain.value = f * o.vib; l.connect(lg).connect(osc.frequency); l.start(t + 0.08); l.stop(t + dur + 0.05); }
  node.connect(g).connect(out); osc.start(t); osc.stop(t + dur + 0.05); track(osc, bus);
}
function noiseAt(c: AudioContext, t: number, dur: number, vol: number, freq: number, type: BiquadFilterType = "lowpass", bus: Bus = "fx", a = 0.003, q = 1, freqEnd?: number) {
  const out = outOf(bus); if (!out || isMuted(bus) || crowded(bus)) return;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(); s.buffer = buf; if (bus === "fx") vol = Math.max(0.0002, vol * volMul);
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out); s.start(t); track(s, bus);
}

// relative-time helpers (delay from now) used by effects
function tone(freq: number, dur: number, type: OscillatorType, vol = 0.5, slideTo?: number, delay = 0, bus: Bus = "fx", attack = 0.005) {
  const c = ac(); if (!c) return; synth(c, freq, c.currentTime + delay, dur, { type, vol, slide: slideTo, a: attack, bus });
}
function noise(dur: number, vol: number, filterFreq: number, delay = 0, bus: Bus = "fx", type: BiquadFilterType = "lowpass", attack = 0.003, sweepTo?: number) {
  const c = ac(); if (!c) return; noiseAt(c, c.currentTime + delay, dur, vol, filterFreq, type, bus, attack, 1, sweepTo);
}
function chime(f: number, dur: number, vol: number, delay = 0, bus: Bus = "fx") {
  const c = ac(); if (!c) return; bell(c, f, c.currentTime + delay, dur, vol, bus);
}

// ---------- instruments (absolute time)
function bell(c: AudioContext, f: number, t: number, dur: number, v: number, bus: Bus) {
  synth(c, f, t, dur, { type: "sine", vol: v, a: 0.004, bus }); synth(c, f * 2.76, t, dur * 0.45, { type: "sine", vol: v * 0.3, a: 0.004, bus }); synth(c, f * 5.4, t, dur * 0.2, { type: "sine", vol: v * 0.1, a: 0.004, bus });
}
function xylo(c: AudioContext, f: number, t: number, v: number, bus: Bus = "music") {
  synth(c, f, t, 0.35, { type: "sine", vol: v, a: 0.002, bus }); synth(c, f * 3.93, t, 0.08, { type: "sine", vol: v * 0.35, a: 0.001, bus }); noiseAt(c, t, 0.02, v * 0.25, 4000, "bandpass", bus);
}
function pizz(c: AudioContext, f: number, t: number, v: number, bus: Bus = "music") {
  synth(c, f, t, 0.28, { type: "sawtooth", vol: v, a: 0.003, cut: 2400, cutEnd: 300, bus }); synth(c, f, t, 0.22, { type: "triangle", vol: v * 0.6, a: 0.002, bus });
}
function tuba(c: AudioContext, f: number, t: number, dur: number, v: number, bus: Bus = "music") {
  synth(c, f, t, dur, { type: "sawtooth", vol: v * 0.6, a: 0.025, cut: 900, cutEnd: 260, q: 2, bus }); synth(c, f, t, dur, { type: "sine", vol: v, a: 0.02, bus });
}
function whistle(c: AudioContext, f: number, t: number, dur: number, v: number, bus: Bus = "music") {
  synth(c, f, t, dur, { type: "sine", vol: v, a: 0.03, hold: dur * 0.5, vib: 0.012, vibRate: 6, slide: f * 0.995, bus }); noiseAt(c, t, Math.min(dur, 0.15), v * 0.12, f * 2, "bandpass", bus, 0.02, 4);
}
function trumpet(c: AudioContext, f: number, t: number, dur: number, v: number, bus: Bus = "music") {
  synth(c, f, t, dur, { type: "sawtooth", vol: v, a: 0.03, hold: dur * 0.4, cut: 700, cutEnd: 2600, q: 3, vib: 0.008, vibRate: 5.5, bus });
  synth(c, f * 1.003, t, dur, { type: "square", vol: v * 0.3, a: 0.04, cut: 1500, bus });
}
function kazoo(c: AudioContext, f: number, t: number, dur: number, v: number, bus: Bus = "music") {
  synth(c, f, t, dur, { type: "sawtooth", vol: v, a: 0.02, hold: dur * 0.4, cut: 1300, q: 7, vib: 0.02, vibRate: 7, bus });
}
function musicBox(c: AudioContext, f: number, t: number, v: number, bus: Bus = "music") { bell(c, f, t, 0.9, v, bus); }
function kick(c: AudioContext, t: number, v: number) { synth(c, 120, t, 0.32, { type: "sine", vol: v, a: 0.002, slide: 42, bus: "music" }); noiseAt(c, t, 0.03, v * 0.3, 1800, "lowpass", "music"); }
function snare(c: AudioContext, t: number, v: number) { noiseAt(c, t, 0.16, v, 2200, "bandpass", "music", 0.002, 0.8); synth(c, 210, t, 0.08, { type: "triangle", vol: v * 0.5, slide: 160, bus: "music" }); }
function hat(c: AudioContext, t: number, v: number) { noiseAt(c, t, 0.05, v, 8000, "highpass", "music", 0.001); }
function anvil(c: AudioContext, t: number, v: number) { for (const [k, w] of [[1, 1], [2.41, 0.5], [3.9, 0.3]] as const) synth(c, 820 * k, t, 0.5, { type: "sine", vol: v * w, a: 0.001, bus: "music" }); noiseAt(c, t, 0.03, v * 0.5, 5000, "highpass", "music"); }

// formant "voice": a buzzy source through two vowel filters — cartoon gibberish
const VOW: Record<string, [number, number]> = { a: [800, 1200], o: [500, 880], u: [330, 700], e: [480, 1900], i: [300, 2300] };
function voiceAt(c: AudioContext, f0: number, vowels: string, t: number, dur: number, v: number, glide = 1, type: OscillatorType = "sawtooth", talk = false) {
  const out = talk ? talkBus : fxBus; if (!out || (!talk && (muted || crowded("fx")))) return;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f0 * glide), t + dur);
  const vib = c.createOscillator(); const vg = c.createGain(); vib.frequency.value = 7; vg.gain.value = f0 * 0.03; vib.connect(vg).connect(o.frequency);
  v = Math.max(0.0002, v * volMul); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const seq = vowels.split("").map((k) => VOW[k] ?? VOW["a"]!);
  for (let fi = 0; fi < 2; fi++) {
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 6;
    seq.forEach((vw, i) => bp.frequency.linearRampToValueAtTime(vw[fi]!, t + (dur * i) / Math.max(1, seq.length - 1)));
    bp.frequency.setValueAtTime(seq[0]![fi]!, t);
    const fg = c.createGain(); fg.gain.value = fi === 0 ? 1.6 : 0.9; o.connect(bp).connect(fg).connect(g);
  }
  g.connect(out); o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05); if (!talk) track(o, "fx");
}
function say(f0: number, vowels: string, dur: number, v: number, delay = 0, glide = 1, type: OscillatorType = "sawtooth") {
  const c = ac(); if (!c) return; voiceAt(c, jit(f0, 0.08), vowels, c.currentTime + delay, dur, v, glide, type);
}
/** cartoon pop: quick pitch drop + click */
function pop(f = 600, v = 0.12, delay = 0) { tone(jit(f, 0.08), 0.09, "sine", v, f * 0.4, delay); noise(0.02, v * 0.6, 3000, delay, "fx", "bandpass"); }
/** springy boing */
function boing(f = 180, v = 0.1, delay = 0) { const c = ac(); if (!c) return; synth(c, f, c.currentTime + delay, 0.45, { type: "triangle", vol: v, vib: 0.08, vibRate: 14, slide: f * 1.6 }); }

const last: Record<string, number> = {};
function throttle(k: string, ms: number) { const n = performance.now(); if (n - (last[k] ?? 0) < ms) return true; last[k] = n; return false; }

const VOICE: Partial<Record<MonsterId, () => void>> = {
  goblin: () => { say(420, "eai", 0.12, 0.09); say(470, "ia", 0.1, 0.08, 0.13); say(520, "e", 0.09, 0.07, 0.25, 1.2); },
  sapper: () => { say(400, "ao", 0.14, 0.09, 0, 1.3); say(460, "i", 0.1, 0.07, 0.16); noise(0.4, 0.05, 5000, 0.25, "fx", "highpass"); },
  troll: () => { say(85, "ou", 0.6, 0.16, 0, 0.8); noise(0.3, 0.05, 300, 0.1); },
  shaman: () => { say(190, "oao", 0.7, 0.1, 0, 1.06); chime(784, 0.6, 0.03, 0.3); },
  skeleton: () => { for (let i = 0; i < 5; i++) { const c = ac(); if (c) xylo(c, jit(700 + (i % 2) * 180, 0.03), c.currentTime + i * 0.06, 0.06, "fx"); } },
  rat: () => { tone(jit(2000, 0.1), 0.06, "sine", 0.05, 2800); tone(jit(2300, 0.1), 0.07, "sine", 0.05, 3100, 0.09); },
  ghost: () => { say(380, "uou", 1.0, 0.07, 0, 1.6, "triangle"); },
  golem: () => { say(70, "o", 0.6, 0.12, 0, 0.85); noise(0.4, 0.1, 500, 0, "fx", "lowpass", 0.05); chime(1300, 0.6, 0.03, 0.15); },
  fatty: () => { say(110, "ao", 0.35, 0.12, 0, 0.7); say(90, "u", 0.2, 0.08, 0.38); },
  orc: () => { say(130, "a", 0.22, 0.12, 0, 0.85); say(115, "ao", 0.3, 0.12, 0.24, 0.8); },
  vampire: () => { say(260, "ae", 0.35, 0.08, 0, 1.25, "square"); say(330, "e", 0.15, 0.06, 0.38, 1.2, "square"); },
  phoenix: () => { const c = ac(); if (!c) return; for (let i = 0; i < 3; i++) whistle(c, 1400 + i * 260, c.currentTime + i * 0.09, 0.12, 0.05, "fx"); },
  necro: () => { say(140, "uaa", 0.8, 0.09, 0, 0.9); say(210, "a", 0.5, 0.05, 0.25, 0.9); },
  runebreaker: () => { say(160, "ae", 0.3, 0.1); chime(1760, 0.4, 0.04, 0.2); },
  dragon: () => { say(75, "aou", 1.0, 0.16, 0, 0.7); noise(0.9, 0.12, 900, 0.05, "fx", "bandpass", 0.1, 300); },
  abyss: () => { say(52, "ouu", 1.4, 0.18, 0, 0.75); say(104, "o", 1.2, 0.06, 0.2, 0.7, "square"); noise(1.2, 0.12, 250, 0.1); },
  ram: () => { say(420, "ei", 0.1, 0.07); say(380, "a", 0.12, 0.07, 0.12); noise(0.35, 0.12, 300, 0.1); },
  catapult: () => { for (let i = 0; i < 4; i++) noise(0.04, 0.09, 1400, i * 0.07, "fx", "bandpass"); boing(140, 0.07, 0.3); },
};
const DEATH: Partial<Record<MonsterId, () => void>> = {
  goblin: () => { say(500, "ea", 0.16, 0.07, 0, 0.5); pop(700, 0.08, 0.12); },
  sapper: () => { say(480, "ou", 0.15, 0.07, 0, 0.5); },
  rat: () => tone(jit(2400, 0.1), 0.12, "sine", 0.05, 900),
  troll: () => { say(90, "ou", 0.5, 0.14, 0, 0.6); noise(0.4, 0.2, 260, 0.2); },
  golem: () => { noise(0.4, 0.2, 2600, 0, "fx", "highpass"); for (let i = 0; i < 4; i++) chime(jit(1500 + i * 300), 0.3, 0.04, i * 0.05); },
  skeleton: () => { const c = ac(); if (!c) return; for (let i = 0; i < 6; i++) xylo(c, jit(900 - i * 90, 0.04), c.currentTime + i * 0.045, 0.06, "fx"); },
  ghost: () => say(500, "ou", 0.6, 0.06, 0, 0.35, "triangle"),
  vampire: () => { say(300, "ae", 0.3, 0.07, 0, 1.6, "square"); },
  phoenix: () => { noise(0.5, 0.15, 1500, 0, "fx", "bandpass", 0.01, 400); tone(800, 0.4, "triangle", 0.05, 1600); },
  fatty: () => { say(100, "ou", 0.4, 0.12, 0, 0.6); noise(0.3, 0.15, 500, 0.15); },
  orc: () => say(120, "au", 0.4, 0.12, 0, 0.6),
  necro: () => say(160, "au", 0.6, 0.08, 0, 0.5),
  dragon: () => { say(80, "ao", 1.0, 0.14, 0, 0.5); noise(0.8, 0.25, 500); },
  abyss: () => { say(55, "ou", 1.4, 0.18, 0, 0.5); noise(1.2, 0.3, 300); },
};

// cutscene voices: base pitch, pitch spread, syllable length, glide, waveform
const BABBLE: Record<string, { f: number; var: number; len: number; glide: number; wave: OscillatorType; vol: number }> = {
  lord: { f: 85, var: 0.15, len: 0.11, glide: 0.85, wave: "sawtooth", vol: 1.3 },
  kaira: { f: 280, var: 0.2, len: 0.09, glide: 1.05, wave: "triangle", vol: 0.9 },
  grosh: { f: 105, var: 0.25, len: 0.1, glide: 0.8, wave: "square", vol: 1 },
  eldric: { f: 150, var: 0.12, len: 0.08, glide: 0.95, wave: "sawtooth", vol: 1.1 },
  selesta: { f: 360, var: 0.25, len: 0.07, glide: 1.15, wave: "triangle", vol: 0.9 },
  scribe: { f: 200, var: 0.4, len: 0.06, glide: 1.3, wave: "square", vol: 0.6 },
  vale: { f: 125, var: 0.1, len: 0.1, glide: 0.92, wave: "sawtooth", vol: 1 },
  scout: { f: 210, var: 0.3, len: 0.06, glide: 1.1, wave: "square", vol: 0.8 },
  witch: { f: 300, var: 0.5, len: 0.09, glide: 1.4, wave: "sawtooth", vol: 0.8 },
};
const WAVES: OscillatorType[] = ["sawtooth", "triangle", "square"];
/** Fixed voice for a speaker; unknown speakers get one derived from their id, so nobody is ever silent. */
export function voiceFor(who: string) {
  const known = BABBLE[who]; if (known) return known;
  let h = 7; for (const ch of who) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { f: 110 + (h % 220), var: 0.15 + ((h >> 8) % 20) / 100, len: 0.07 + ((h >> 12) % 4) / 100, glide: 0.85 + ((h >> 16) % 40) / 100, wave: WAVES[h % 3]!, vol: 0.9 };
}
/** a short scale jingle on the fx bus */
function jingle(notes: number[], step: number, inst: "bell" | "trumpet" | "xylo" | "pizz", v: number) {
  const c = ac(); if (!c) return; const t0 = c.currentTime;
  notes.forEach((f, i) => { if (!f) return; const t = t0 + i * step;
    if (inst === "bell") bell(c, f, t, 0.7, v, "fx"); else if (inst === "trumpet") trumpet(c, f, t, step * 1.4, v, "fx"); else if (inst === "xylo") xylo(c, f, t, v, "fx"); else pizz(c, f, t, v, "fx"); });
}
const semi = (base: number, s: number) => base * Math.pow(2, s / 12);

export const sfx = {
  voice(kind: MonsterId) { if (throttle("v" + kind, 400)) return; withMul(vols.voice * 1.25, () => VOICE[kind]?.()); },
  meteor() { noise(0.7, 0.2, 3000, 0, "fx", "bandpass", 0.35, 600); tone(1200, 0.6, "sine", 0.05, 150); noise(1.2, 0.8, 600, 0.6); tone(60, 1, "sine", 0.6, 28, 0.6); boing(90, 0.06, 0.75); },
  smoke() { noise(1.4, 0.25, 900, 0, "fx", "lowpass", 0.3); pop(300, 0.1); pop(380, 0.08, 0.15); pop(260, 0.08, 0.3); },
  berserk() { say(110, "aoa", 0.6, 0.12, 0, 1.2); tone(98, 0.8, "sawtooth", 0.06, 196, 0, "fx", 0.05); },
  catapult() { if (throttle("cp", 200)) return; boing(160, 0.08); noise(0.2, 0.15, 900, 0.02, "fx", "bandpass", 0.01, 2200); },
  ram() { tone(jit(70, 0.05), 0.5, "sine", 0.55, 30); noise(0.35, 0.45, 400); pop(220, 0.08, 0.05); },
  slowMo() { tone(70, 1.1, "sine", 0.5, 30); tone(140, 0.9, "triangle", 0.12, 50, 0.05); noise(1, 0.15, 400, 0, "fx", "lowpass", 0.3, 120); },
  oil() { if (throttle("oil", 1500)) return; for (let i = 0; i < 5; i++) pop(jit(260 + i * 40, 0.2), 0.06, i * 0.09); noise(1, 0.12, 2500, 0, "fx", "highpass", 0.2); },
  champion() { jingle([semi(196, 0), semi(196, 7), semi(196, 12), semi(196, 16), 0, semi(196, 12)], 0.11, "trumpet", 0.09); chime(784, 1.2, 0.05, 0.6); },
  gateFall() { noise(2.2, 0.85, 300); tone(45, 2, "sine", 0.7, 20); for (let i = 0; i < 6; i++) noise(0.12, 0.18, 1500, 0.4 + i * 0.15, "fx", "bandpass"); jingle([0, 0, 0, 0, 0, 0, semi(262, 0), semi(262, 4), semi(262, 7), semi(262, 12)], 0.12, "trumpet", 0.08); },
  tick(n: number) { const c = ac(); if (!c) return; const t = c.currentTime; synth(c, n <= 3 ? 80 : 60, t, 0.4, { type: "sine", vol: n <= 3 ? 0.5 : 0.35, slide: 32 }); xylo(c, n <= 3 ? 1047 : 880, t, n <= 3 ? 0.1 : 0.07, "fx"); },
  click() { const c = ac(); if (!c) return; synth(c, jit(520, 0.03), c.currentTime, 0.07, { type: "sine", vol: 0.1, slide: 340 }); noiseAt(c, c.currentTime, 0.015, 0.06, 2500, "bandpass"); },
  hover() { if (throttle("hv", 60)) return; tone(jit(1100, 0.02), 0.05, "sine", 0.025, 1400); },
  pageTurn() { noise(0.28, 0.1, 1800, 0, "fx", "bandpass", 0.06, 4000); },
  arrow() { if (throttle("a", 70)) return; noise(0.09, 0.07, jit(2600, 0.15), 0, "fx", "bandpass", 0.003, 6000); tone(jit(700, 0.08), 0.05, "sine", 0.04, 1100); },
  cannon() { if (throttle("cn", 60)) return; tone(jit(130, 0.08), 0.35, "sine", 0.45, 40); noise(0.45, 0.35, jit(600, 0.1)); pop(jit(240), 0.06, 0.02); },
  bolt() { if (throttle("b", 80)) return; boing(jit(320), 0.05); noise(0.12, 0.15, 1500); },
  flame() { if (throttle("f", 260)) return; noise(0.35, 0.09, 900, 0, "fx", "lowpass", 0.05, 2400); },
  zap() { if (throttle("z", 70)) return; tone(jit(1400, 0.1), 0.12, "square", 0.025, 300); tone(jit(900, 0.1), 0.08, "sine", 0.04, 2000); },
  frost() { if (throttle("fs", 120)) return; chime(jit(2100, 0.05), 0.35, 0.045); noise(0.12, 0.06, 6000, 0, "fx", "highpass"); },
  censer() { if (throttle("cs", 220)) return; for (let i = 0; i < 3; i++) pop(jit(300 + i * 70, 0.15), 0.04, i * 0.08); },
  bell() { if (throttle("bl", 1500)) return; chime(660, 1.6, 0.09); chime(990, 1.2, 0.04, 0.02); },
  freeze() { if (throttle("fr", 200)) return; const c = ac(); if (!c) return; [2093, 2637, 3136].forEach((f, i) => bell(c, f, c.currentTime + i * 0.04, 0.4, 0.04, "fx")); },
  explosion() { if (throttle("ex", 50)) return; noise(0.9, 0.7, jit(800, 0.15), 0, "fx", "lowpass", 0.003, 200); tone(jit(90), 0.7, "sine", 0.6, 28); pop(200, 0.08, 0.05); },
  summon() { const c = ac(); if (!c) return; const t = c.currentTime; synth(c, jit(260, 0.03), t, 0.2, { type: "sine", vol: 0.14, slide: 620 }); xylo(c, 784, t + 0.08, 0.06, "fx"); noiseAt(c, t, 0.15, 0.05, 1500, "bandpass", "fx", 0.01, 1, 4000); },
  revive() { tone(150, 0.4, "triangle", 0.08, 500); chime(880, 0.4, 0.04, 0.25); },
  death(kind: MonsterId) { if (throttle("d", 70)) return; withMul(vols.voice * 1.25, DEATH[kind] ?? (() => pop(jit(500, 0.15), 0.08))); },
  towerDown() { noise(1.1, 0.55, 450); tone(200, 0.8, "sawtooth", 0.06, 50); for (let i = 0; i < 4; i++) noise(0.08, 0.14, 1800, 0.3 + i * 0.1, "fx", "bandpass"); jingle([0, 0, 0, semi(392, 0), semi(392, 4), semi(392, 7)], 0.1, "xylo", 0.08); },
  upgradeTower() { for (let i = 0; i < 3; i++) noise(0.04, 0.1, 3200, i * 0.1, "fx", "bandpass"); chime(784, 0.5, 0.05, 0.35); },
  gateCrack() { noise(0.9, 0.6, 350); tone(70, 0.8, "sawtooth", 0.1, 35); noise(0.3, 0.2, 2200, 0.1, "fx", "bandpass"); },
  gearUp() { jingle([523, 659, 784, 1047], 0.07, "xylo", 0.09); noise(0.2, 0.08, 4000, 0, "fx", "highpass"); },
  unlock() { noise(1.2, 0.12, 900, 0, "fx", "lowpass", 0.5); jingle([0, 0, 0, 0, 262, 392, 523, 784], 0.13, "bell", 0.07); },
  warcry() { say(160, "aoa", 0.5, 0.12, 0, 1.15); say(200, "a", 0.4, 0.08, 0.05, 1.1); jingle([196, 247, 294, 392], 0.08, "trumpet", 0.08); },
  hit() { if (throttle("h", 45)) return; tone(jit(200, 0.1), 0.05, "sine", 0.05, 90); },
  gateHit() { if (throttle("gh", 350)) return; tone(jit(62, 0.06), 0.45, "sine", 0.4, 34); noise(0.22, 0.25, 380); chime(jit(310, 0.05), 0.5, 0.03); },
  gateStage() { for (let i = 0; i < 6; i++) noise(0.06, 0.24, jit(2600, 0.2), i * 0.05, "fx", "bandpass"); noise(1.4, 0.5, 180, 0.15, "fx", "lowpass", 0.1); tone(40, 1.4, "sine", 0.5, 22, 0.15); },
  stone() { if (throttle("st", 80)) return; noise(0.08, 0.3, 900); tone(jit(150, 0.05), 0.1, "sine", 0.22, 80); },
  chest() { const c = ac(); if (!c) return; synth(c, 180, c.currentTime, 0.5, { type: "sawtooth", vol: 0.03, slide: 120, cut: 800 }); noise(0.4, 0.1, 1200, 0, "fx", "bandpass", 0.2); pop(160, 0.12, 0.48); },
  coins() { for (let i = 0; i < 7; i++) chime(jit(1500 + (i % 3) * 320, 0.06), 0.3, 0.04, i * 0.06 + Math.random() * 0.03); },
  speed() { const c = ac(); if (!c) return; whistle(c, 660, c.currentTime, 0.12, 0.06, "fx"); whistle(c, 990, c.currentTime + 0.08, 0.14, 0.06, "fx"); },
  coin() { chime(988, 0.25, 0.06); chime(1319, 0.35, 0.06, 0.08); },
  levelUp() { jingle([392, 523, 659, 784, 0, 1047], 0.07, "xylo", 0.1); },
  caseShake() { noise(0.1, 0.16, 500); boing(jit(120), 0.05); },
  reveal(tier: number) { jingle([523, 659, 784, 1047, 1319].slice(0, 2 + tier), 0.1, "bell", 0.08); if (tier >= 3) jingle([0, 0, 262, 330, 392, 523], 0.1, "trumpet", 0.06); },
  superCharge() { if (throttle("sc", 400)) return; const c = ac(); if (!c) return; synth(c, 300, c.currentTime, 1.1, { type: "triangle", vol: 0.05, slide: 1300, vib: 0.03, vibRate: 10 }); },
  superFire() { if (throttle("sf", 150)) return; noise(0.45, 0.3, 2500, 0, "fx", "lowpass", 0.003, 400); tone(1200, 0.4, "triangle", 0.08, 200); },
  whoosh() { noise(0.4, 0.2, 800, 0, "fx", "bandpass", 0.1, 3000); },
  lidPop() { pop(260, 0.25); noise(0.25, 0.3, 3000); boing(200, 0.06, 0.05); },
  flip() { tone(700, 0.08, "sine", 0.08, 1200); },
  mythic() { noise(1.2, 0.4, 700); const c = ac(); if (!c) return; const t = c.currentTime; for (const [f, v] of [[262, "a"], [330, "o"], [392, "a"], [523, "o"]] as const) voiceAt(c, f, v + v, t, 1.6, 0.06, 1, "sawtooth"); jingle([0, 0, 0, 523, 659, 784, 1047], 0.1, "bell", 0.07); },
  victory() {
    const c = ac(); if (!c) return; const t = c.currentTime; const r = 262; const s = 0.13;
    [0, 0, 0, 7, 0, 5, 7, 12].forEach((n, i) => trumpet(c, semi(r, n), t + [0, 0.5, 1, 1.5, 3, 3.5, 4, 4.5][i]! * s * 2, s * (i === 7 ? 6 : 1.4), 0.1, "fx"));
    [0, 7, 0, 7, 0].forEach((n, i) => tuba(c, semi(r / 4, n), t + i * s * 2, s * 1.8, 0.2, "fx"));
    bell(c, semi(r * 2, 12), t + 9 * s, 1.4, 0.07, "fx"); noiseAt(c, t + 9 * s, 0.6, 0.15, 6000, "highpass", "fx");
  },
  defeat() {
    const c = ac(); if (!c) return; const t = c.currentTime;
    [[392, 0, 0.35], [370, 0.4, 0.35], [349, 0.8, 0.35], [330, 1.2, 1.4]].forEach(([f, d, l]) =>
      synth(c, f!, t + d!, l!, { type: "sawtooth", vol: 0.08, a: 0.04, cut: 500, cutEnd: 1600, q: 4, vib: l! > 1 ? 0.02 : 0, vibRate: 6, hold: l! * 0.5 }));
  },
  // garrison events
  markTarget() { if (throttle("mk", 800)) return; const c = ac(); if (!c) return; const t = c.currentTime; xylo(c, 1568, t, 0.07, "fx"); xylo(c, 1175, t + 0.09, 0.07, "fx"); },
  chargeBroken() { if (throttle("cb", 200)) return; say(320, "ou", 0.35, 0.06, 0, 0.45, "square"); noise(0.3, 0.12, 3000, 0, "fx", "highpass"); pop(500, 0.08, 0.05); },
  stance(st: string) { if (st === "panic") { chime(880, 0.4, 0.06); chime(880, 0.4, 0.06, 0.18); chime(880, 0.4, 0.06, 0.36); } else if (st === "fury") { jingle([196, 0, 196, 233, 294], 0.1, "trumpet", 0.08); } else chime(523, 0.5, 0.04); },
  wave() { say(180, "ao", 0.25, 0.1, 0, 1.2); jingle([0, 330, 392, 523], 0.08, "pizz", 0.12); },
  /** cutscene "speech": one mumbled syllable in the speaker's voice; vowel picked from the typed letter */
  babble(who: string, ch: string, style?: "thought" | "whisper") {
    const c = ac(); if (!c || !talkBus) return; const v = voiceFor(who);
    const l = ch.toLowerCase(); const vow = "аяa".includes(l) ? "a" : "оёo".includes(l) ? "o" : "уюu".includes(l) ? "u" : "иыi".includes(l) ? "i" : "e";
    // pitch steps come from the letter itself, so the same line always sounds the same
    const step = ((l.charCodeAt(0) % 5) - 2) / 4;
    const soft = style === "whisper" || style === "thought";
    withMul(vols.voice * 1.25 * (soft ? 0.55 : 1), () => {
      voiceAt(c, v.f * (1 + step * v.var), vow + (soft ? vow : "e"), c.currentTime, v.len * (soft ? 1.3 : 1), 0.06 * v.vol * (soft ? 0.6 : 1), v.glide, soft ? "triangle" : v.wave, true);
    });
  },
  achievement() { jingle([784, 988, 1175, 1568], 0.07, "xylo", 0.1); chime(2093, 0.8, 0.04, 0.3); },
};
// interface sounds follow the "interface" volume slider
for (const k of ["click", "hover", "pageTurn", "flip"] as const) { const f = sfx[k]; (sfx as unknown as Record<string, () => void>)[k] = () => withMul(vols.ui * 1.4, f); }

// ---------- music: catchy villain-march tunes as data, layered by battle intensity
type Inst = "xylo" | "whistle" | "musicbox" | "kazoo" | "trumpet" | "tuba" | "pizz";
type Song = { quiet?: number; root: number; bpm: number; meter: 3 | 4; swing?: number; lead: Inst; leadOct: number; chords: [number, "m" | "M"][]; mel: string; anvil?: boolean; box?: boolean };
// melody: one token per eighth note, semitones from the tonic; "." rest, "~" hold previous note, "|" bar line (ignored)
const SONGS: Record<string, Song> = {
  map: { root: 220, bpm: 112, meter: 4, lead: "whistle", leadOct: 2, chords: [[0, "m"], [3, "M"], [0, "m"], [7, "M"], [8, "M"], [5, "m"], [0, "m"], [7, "M"]],
    mel: "0 . 3 . 7 . 6 7 | 10 . 7 . 3 ~ 5 . | 0 . 3 . 7 . 12 10 | 7 ~ ~ . . . 7 8 | 10 . 8 . 7 . 5 3 | 5 . 3 . 2 ~ -2 . | 0 3 7 12 10 7 3 2 | 0 ~ ~ . -5 . 0 ." },
  dead: { root: 164.8, bpm: 150, meter: 3, lead: "xylo", leadOct: 2, chords: [[0, "m"], [0, "m"], [5, "m"], [7, "M"], [8, "M"], [5, "m"], [7, "M"], [0, "m"]],
    mel: "0 . 3 . 7 . | 6 . 7 . . . | 0 . 3 . 8 . | 7 . . . . . | 12 . 11 . 10 . | 9 . 8 . 7 . | 5 . 3 . 2 . | 0 . . . -1 ." },
  ice: { root: 293.7, bpm: 96, meter: 4, lead: "musicbox", leadOct: 1, box: true, chords: [[0, "m"], [8, "M"], [3, "M"], [10, "M"], [5, "m"], [0, "m"], [7, "M"], [0, "m"]],
    mel: "12 . 10 7 . 3 5 7 | 8 ~ ~ . 7 . 5 . | 3 . 5 7 . 10 12 . | 14 ~ ~ ~ . . . . | 15 . 14 12 . 10 8 . | 7 . 8 10 . 7 . . | 5 . 3 2 . 3 5 . | 0 ~ ~ ~ . . . ." },
  swamp: { root: 196, bpm: 98, meter: 4, swing: 0.33, lead: "kazoo", leadOct: 1, chords: [[0, "m"], [0, "m"], [0, "m"], [0, "m"], [5, "m"], [5, "m"], [7, "M"], [0, "m"]],
    mel: "0 . . 3 5 . 3 . | 6 5 3 . 0 . . . | 0 . . 3 5 . 7 . | 10 . 7 . 5 . . . | 5 . . 8 10 . 8 . | 11 10 8 . 5 . . . | 7 . 5 . 3 . 0 . | -2 . 0 . . . . ." },
  forest: { root: 329.6, bpm: 128, meter: 4, lead: "whistle", leadOct: 1, chords: [[0, "m"], [10, "M"], [0, "m"], [3, "M"], [5, "m"], [3, "M"], [10, "M"], [0, "m"]],
    mel: "0 2 3 5 7 . 5 3 | 2 . -2 . 2 . . . | 0 2 3 5 7 . 10 9 | 7 . . . . . . . | 12 10 9 7 9 . 7 5 | 3 . 5 . 7 . . . | 5 3 2 0 2 . -2 . | 0 . . . . . 7 ." },
  forge: { root: 130.8, bpm: 92, meter: 4, lead: "trumpet", leadOct: 1, anvil: true, chords: [[0, "m"], [0, "m"], [0, "m"], [5, "m"], [8, "M"], [7, "M"], [0, "m"], [7, "M"]],
    mel: "0 . 0 . 3 . 0 . | 7 . 6 . 7 . . . | 0 . 0 . 3 . 5 . | 6 ~ 5 ~ 3 . . . | 8 . 8 . 7 . 5 . | 3 . 2 . 3 . . . | 0 . 3 . 7 . 12 . | 11 ~ ~ . 7 . . ." },
  menu: { quiet: 0.55, root: 220, bpm: 84, meter: 3, lead: "musicbox", leadOct: 1, box: true, chords: [[0, "m"], [5, "m"], [3, "M"], [7, "M"], [8, "M"], [5, "m"], [7, "M"], [0, "m"]],
    mel: "0 . 3 . 7 . | 6 ~ 7 . . . | 10 . 7 . 3 . | 2 ~ ~ . . . | 3 . 5 . 7 . | 8 . 7 . 5 . | 3 . 2 . -2 . | 0 ~ ~ . . ." },
  // splash screen: slow war march, horns over drums
  epic: { root: 146.8, bpm: 76, meter: 4, lead: "trumpet", leadOct: 1, anvil: true, chords: [[0, "m"], [8, "M"], [3, "M"], [10, "M"], [0, "m"], [5, "m"], [7, "M"], [7, "M"]],
    mel: "0 ~ ~ . 0 3 7 ~ | 8 ~ ~ ~ 7 . 5 . | 7 ~ ~ . 3 5 7 ~ | 10 ~ ~ ~ . . 12 . | 12 ~ ~ . 10 . 8 . | 7 ~ ~ ~ 5 . 3 . | 2 ~ 3 ~ 5 ~ 7 ~ | 7 ~ ~ ~ . . . ." },
  capital: { root: 196, bpm: 104, meter: 4, lead: "trumpet", leadOct: 1, chords: [[0, "m"], [5, "m"], [0, "m"], [7, "M"], [3, "M"], [8, "M"], [0, "m"], [0, "m"]],
    mel: "0 . 0 0 7 . . . | 5 . 3 2 0 . . . | 0 . 0 0 7 . 10 . | 12 ~ ~ . 11 . 12 . | 15 . 14 12 10 . 7 . | 8 . 7 5 3 . 2 . | 0 . 3 7 12 . 7 . | 0 ~ ~ ~ . . . ." },
};
type Tok = number | "." | "~";
const parseMel = (s: string): Tok[] => s.split(/\s+/).filter((x) => x && x !== "|").map((x) => (x === "." || x === "~" ? x : Number(x)));
const PARSED: Record<string, Tok[]> = Object.fromEntries(Object.entries(SONGS).map(([k, v]) => [k, parseMel(v.mel)]));

type Scene = { timer: number; stop: () => void };
let scene: Scene | null = null;
let intensity = 0;
/** 0..1 — how close the gate is to falling; more music layers and a faster tempo near the end. */
export function setIntensity(v: number) { intensity = Math.max(0, Math.min(1, v)); }

let sceneKey = "";
let ambient = "";
let foreground = false; // a battle or cutscene owns the music
export function stopScene() { if (scene) { clearInterval(scene.timer); scene.stop(); scene = null; } sceneKey = ""; foreground = false; }

/** Start the theme tune for a location (`map` for the world map); `battle` adds drums and intensity layers. Same tune already playing is not restarted. */
export function startScene(theme: string, battle: boolean) { playScene(theme, battle); foreground = true; }
function playScene(theme: string, battle: boolean) {
  const key = (SONGS[theme] ? theme : "dead") + (battle ? ":b" : "");
  if (scene && sceneKey === key) return;
  stopScene(); if (musicMuted) return; const c = ac(); if (!c || !musicBus) return;
  startSong(c, SONGS[theme] ? theme : "dead", battle); sceneKey = key;
}

/** Background tune for the current screen (outside battle/cutscene); persists across screens. */
export function setAmbient(theme: string) { ambient = theme; if (!foreground) playScene(theme, false); }
/** Return to the screen's background tune after a battle or cutscene ends. */
export function resumeAmbient() { if (ambient && !foreground) playScene(ambient, false); }

function lead(c: AudioContext, inst: Inst, f: number, t: number, dur: number, v: number) {
  switch (inst) {
    case "xylo": xylo(c, f, t, v * 1.2); break;
    case "whistle": whistle(c, f, t, dur, v * 0.8); break;
    case "musicbox": musicBox(c, f, t, v); break;
    case "kazoo": kazoo(c, f, t, dur, v * 0.6); break;
    case "trumpet": trumpet(c, f, t, dur, v * 0.55); break;
    case "tuba": tuba(c, f, t, dur, v); break;
    case "pizz": pizz(c, f, t, v); break;
  }
}

function startSong(c: AudioContext, key: string, battle: boolean) {
  const s = SONGS[key]!; const mel = PARSED[key]!; const per = s.meter * 2; const bars = s.chords.length;
  let step = 0; let next = c.currentTime + 0.12;
  const eighth = () => 30 / (s.bpm * (battle && intensity > 0.7 ? 1.12 : 1));
  const chordNotes = (bar: number) => { const [r, q] = s.chords[bar % bars]!; return [r, r + (q === "m" ? 3 : 4), r + 7]; };
  const schedule = (i: number, t0: number) => {
    const e = eighth(); const pos = i % (per * bars); const bar = Math.floor(pos / per); const inBar = pos % per;
    const t = t0 + (s.swing && inBar % 2 === 1 ? e * s.swing : 0);
    const ch = chordNotes(bar); const beat = inBar / 2;
    // melody (from the second pass in battle it repeats too; first bars of battle the lead is softer)
    const tok = mel[pos];
    if (typeof tok === "number") {
      let len = 1; while (mel[(pos + len) % mel.length] === "~") len++;
      lead(c, s.lead, semi(s.root, tok) * s.leadOct, t, e * len * 0.95, 0.11);
    }
    // oom-pah: bass on strong beats, chord stabs on weak beats
    if (inBar % 2 === 0) {
      const strong = s.meter === 3 ? beat === 0 : beat === 0 || beat === 2;
      if (strong) tuba(c, semi(s.root / 2, s.meter === 4 && beat === 2 ? ch[2]! : ch[0]!), t, e * 1.6, 0.16);
      else for (const n of ch) pizz(c, semi(s.root, n), t, 0.035);
    }
    if (s.box && inBar % 2 === 1 && Math.random() < 0.35) musicBox(c, semi(s.root * 4, ch[(inBar >> 1) % 3]!), t, 0.02);
    if (s.anvil && inBar === 0) anvil(c, t, battle ? 0.06 : 0.035);
    // counter-melody: sustained horn chord tones once the fight heats up (or softly on the map)
    if (inBar === 0 && (battle ? intensity > 0.35 : key === "map" && bar % 2 === 1)) trumpet(c, semi(s.root, ch[1]!), t, e * per * 0.9, battle ? 0.045 : 0.025);
    if (battle) {
      const loud = 0.6 + intensity * 0.5;
      if (inBar === 0 || (s.meter === 4 && inBar === 4)) kick(c, t, 0.22 * loud);
      if (inBar % 2 === 0 && !(inBar === 0 || (s.meter === 4 && inBar === 4))) snare(c, t, 0.06 * loud);
      if (intensity > 0.55) hat(c, t, inBar % 2 ? 0.02 : 0.035);
      if (intensity > 0.8 && inBar === per - 1) { snare(c, t, 0.08); snare(c, t + e / 2, 0.1); }
    } else if (inBar % 2 === 0 && inBar !== 0) hat(c, t, 0.012);
  };
  const timer = window.setInterval(() => {
    if (next < c.currentTime - 0.1) next = c.currentTime + 0.05; // tab was asleep: resync instead of bursting
    while (next < c.currentTime + 0.25) { schedule(step, next); next += eighth(); step++; }
  }, 30);
  const t = c.currentTime; musicBus!.gain.cancelScheduledValues(t); musicBus!.gain.setValueAtTime(0.0001, t); musicBus!.gain.linearRampToValueAtTime(musicTarget() * (s.quiet ?? 1), t + 1.5);
  scene = { timer, stop: () => { const n = c.currentTime; musicBus!.gain.cancelScheduledValues(n); musicBus!.gain.setValueAtTime(musicBus!.gain.value, n); musicBus!.gain.linearRampToValueAtTime(0.0001, n + 0.4); musicBus!.gain.linearRampToValueAtTime(musicTarget(), n + 0.9); } };
}
