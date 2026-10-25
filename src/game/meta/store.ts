import { useSyncExternalStore } from "react";
import { defaultProgress, migrateStarters, type Progress } from "./progress";
import { setMusicMuted, setMuted } from "../audio";

const KEY = "siege-progress-v1";
const SERVER = defaultProgress();
let state: Progress = SERVER;
let loaded = false;
const subs = new Set<() => void>();

/** Called once after hydration (from __root) — never during render. */
export function loadProgress() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (p.v === 1) { const d = defaultProgress(); state = migrateStarters({ ...d, ...p, stats: { ...d.stats, ...p.stats }, questClaims: { ...p.questClaims }, talents: { ...p.talents }, tutorials: { ...p.tutorials }, story: { ...p.story }, clues: { ...p.clues } }); }
    }
  } catch { /* corrupt save -> defaults */ }
  setMuted(state.muted); setMusicMuted(state.musicMuted);
  subs.forEach((f) => f());
}

export function setProgress(next: Progress | ((p: Progress) => Progress)) {
  state = typeof next === "function" ? next(state) : next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  setMuted(state.muted); setMusicMuted(state.musicMuted);
  subs.forEach((f) => f());
}
export function getProgress() { return state; }

export function useProgress() {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => state,
    () => SERVER,
  );
}
