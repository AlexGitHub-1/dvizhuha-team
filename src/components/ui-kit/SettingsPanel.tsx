import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { sfx } from "@/game/audio";
import { setSettings, useSettings, type Settings } from "@/game/meta/settings";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";
import { GameButton, Tabs } from "./index";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2"><h3 className="font-display text-sm uppercase tracking-[0.25em] text-gold">{title}</h3><div className="space-y-2">{children}</div></section>;
}
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="min-w-0"><div className="text-sm font-semibold">{label}</div>{hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
function Slider({ k, min = 0, max = 1, test }: { k: "master" | "music" | "fx" | "voice" | "ui" | "brightness"; min?: number; max?: number; test?: () => void }) {
  const s = useSettings(); const v = s[k];
  return (
    <>
      <input type="range" min={min} max={max} step={0.05} value={v} aria-label={k}
        onChange={(e) => setSettings({ [k]: Number(e.target.value) } as Partial<Settings>)} onPointerUp={test}
        className="h-2 w-40 cursor-pointer accent-[var(--primary)]" />
      <span className="w-10 text-right font-display text-sm tabular-nums">{Math.round(v * 100)}%</span>
    </>
  );
}
function Switch({ k }: { k: "hitStop" | "numbers" | "marks" | "ambient" | "ranges" | "speedFx" }) {
  const s = useSettings(); const on = s[k];
  return (
    <button role="switch" aria-checked={on} onClick={() => { setSettings({ [k]: !on } as Partial<Settings>); sfx.click(); }}
      className={cn("relative h-6 w-11 rounded-full border-2 transition", on ? "border-gold bg-gold/30" : "border-border bg-muted")}>
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full transition-all", on ? "left-5 bg-gold" : "left-0.5 bg-muted-foreground")} />
    </button>
  );
}

/** Full settings form; used by the settings screen and the battle pause menu. */
export function SettingsPanel({ compact = false }: { compact?: boolean }) {
  const s = useSettings(); const p = useProgress();
  return (
    <div className={cn("space-y-5", compact && "max-h-[60vh] overflow-y-auto pr-1 text-left")}>
      <Section title="Звук">
        <Row label="Общая громкость"><Slider k="master" test={() => sfx.coin()} /></Row>
        <Row label="Музыка"><Slider k="music" /><Switch2 on={!p.musicMuted} onToggle={() => setProgress((x) => ({ ...x, musicMuted: !x.musicMuted }))} /></Row>
        <Row label="Эффекты боя" hint="выстрелы, взрывы, заклинания"><Slider k="fx" test={() => sfx.cannon()} /><Switch2 on={!p.muted} onToggle={() => setProgress((x) => ({ ...x, muted: !x.muted }))} /></Row>
        <Row label="Голоса монстров"><Slider k="voice" test={() => sfx.voice("goblin")} /></Row>
        <Row label="Интерфейс" hint="клики и наведение"><Slider k="ui" test={() => sfx.click()} /></Row>
      </Section>
      <Section title="Изображение">
        <Row label="Яркость"><Slider k="brightness" min={0.6} max={1.4} /></Row>
        <Row label="Тряска экрана"><Tabs value={s.shake} onChange={(v) => setSettings({ shake: v })} items={[{ value: "full", label: "Полная" }, { value: "low", label: "Слабая" }, { value: "off", label: "Выкл" }]} /></Row>
        <Row label="Частицы"><Tabs value={s.particles} onChange={(v) => setSettings({ particles: v })} items={[{ value: "high", label: "Много" }, { value: "low", label: "Мало" }]} /></Row>
        <Row label="Стоп-кадр при мощных ударах"><Switch k="hitStop" /></Row>
        <Row label="Числа урона и лечения"><Switch k="numbers" /></Row>
        <Row label="Метки целей башен"><Switch k="marks" /></Row>
        <Row label="Радиусы башен"><Switch k="ranges" /></Row>
        <Row label="Фоновые эффекты региона" hint="искры, туман, снег"><Switch k="ambient" /></Row>
        <Row label="Эффект ускорения ×2"><Switch k="speedFx" /></Row>
      </Section>
      <Section title="Игра">
        <Row label="Скорость боя"><Tabs value={String(p.speed ?? 1)} onChange={(v) => setProgress((x) => ({ ...x, speed: v === "2" ? 2 : 1 }))} items={[{ value: "1", label: "×1" }, { value: "2", label: "×2" }]} /></Row>
        <Row label="Обучающие подсказки" hint="показать все подсказки заново"><GameButton size="sm" onClick={() => { setProgress({ ...getProgress(), tutorials: {} }); sfx.click(); }}>Показать снова</GameButton></Row>
      </Section>
      <GameButton variant="ghost" className="w-full" onClick={() => { setSettings(null); sfx.click(); }}>↺ Сбросить настройки</GameButton>
    </div>
  );
}
function Switch2({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle} className={cn("relative h-6 w-11 rounded-full border-2 transition", on ? "border-gold bg-gold/30" : "border-border bg-muted")}>
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full transition-all", on ? "left-5 bg-gold" : "left-0.5 bg-muted-foreground")} />
    </button>
  );
}
