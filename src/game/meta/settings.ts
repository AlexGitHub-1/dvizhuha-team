// Player settings (volumes, visuals, gameplay comfort). Saved separately from progress in localStorage.
import { useSyncExternalStore } from "react";
import { setVolumes } from "../audio";
import { RENDER } from "../render/battle";

export type Settings = {
  master: number; music: number; fx: number; voice: number; ui: number; // 0..1
  brightness: number; // 0.6..1.4
  shake: "full" | "low" | "off";
  particles: "high" | "low";
  hitStop: boolean; numbers: boolean; marks: boolean; ambient: boolean; ranges: boolean; speedFx: boolean;
};
export const DEFAULT_SETTINGS: Settings = {
  master: 0.8, music: 0.7, fx: 0.8, voice: 0.8, ui: 0.6, brightness: 1,
  shake: "full", particles: "high", hitStop: true, numbers: true, marks: true, ambient: true, ranges: true, speedFx: true,
};

const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
/** Repairs a saved/partial settings object: numbers clamped to range, unknown values fall back to defaults. */
export function cleanSettings(raw: Partial<Record<keyof Settings, unknown>> | null | undefined): Settings {
  const r = raw ?? {}; const d = DEFAULT_SETTINGS;
  return {
    master: clamp(r.master, 0, 1, d.master), music: clamp(r.music, 0, 1, d.music), fx: clamp(r.fx, 0, 1, d.fx), voice: clamp(r.voice, 0, 1, d.voice), ui: clamp(r.ui, 0, 1, d.ui),
    brightness: clamp(r.brightness, 0.6, 1.4, d.brightness),
    shake: r.shake === "low" || r.shake === "off" ? r.shake : "full",
    particles: r.particles === "low" ? "low" : "high",
    hitStop: bool(r.hitStop, d.hitStop), numbers: bool(r.numbers, d.numbers), marks: bool(r.marks, d.marks), ambient: bool(r.ambient, d.ambient), ranges: bool(r.ranges, d.ranges), speedFx: bool(r.speedFx, d.speedFx),
  };
}
/** Screen shake multiplier for a shake setting. */
export const shakeMul = (s: Settings["shake"]) => (s === "full" ? 1 : s === "low" ? 0.35 : 0);

const KEY = "siege-settings-v1";
let state: Settings = DEFAULT_SETTINGS; let loaded = false;
const subs = new Set<() => void>();

function apply() {
  setVolumes({ master: state.master, music: state.music, fx: state.fx, voice: state.voice, ui: state.ui });
  Object.assign(RENDER, { shake: shakeMul(state.shake), particles: state.particles === "high" ? 1 : 0.25, numbers: state.numbers, marks: state.marks, ambient: state.ambient, ranges: state.ranges });
  if (typeof document !== "undefined") document.documentElement.style.filter = state.brightness === 1 ? "" : `brightness(${state.brightness})`;
}
export function loadSettings() {
  if (loaded || typeof window === "undefined") return; loaded = true;
  try { state = cleanSettings(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { state = DEFAULT_SETTINGS; }
  apply(); subs.forEach((f) => f());
}
export function setSettings(patch: Partial<Settings> | null) {
  state = patch === null ? DEFAULT_SETTINGS : cleanSettings({ ...state, ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  apply(); subs.forEach((f) => f());
}
export function getSettings() { return state; }
export function useSettings() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => DEFAULT_SETTINGS);
}
