import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { GameButton } from "./index";
import { TUTORIALS, type TutorialId } from "@/game/data/tutorials";
import { markTutorial, tutorialDone } from "@/game/meta/progress";
import { getProgress, setProgress, useProgress } from "@/game/meta/store";
import { sfx } from "@/game/audio";

/** Shows a set of first-time hints once (spotlight + bubble). Calls onActive(true/false) while visible. */
export function Tutorial({ id, onActive, delay = 500 }: { id: TutorialId; onActive?: (on: boolean) => void; delay?: number }) {
  const p = useProgress();
  const done = tutorialDone(p, id);
  const [step, setStep] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const steps = TUTORIALS[id];

  useEffect(() => { if (done) return; const t = setTimeout(() => setStep(0), delay); return () => clearTimeout(t); }, [done, delay]);
  const on = step >= 0 && !done;
  useEffect(() => { onActive?.(on); }, [on, onActive]);

  useLayoutEffect(() => {
    if (!on) return;
    const measure = () => { const el = document.querySelector(`[data-tut="${steps[step]!.target}"]`); setRect(el ? el.getBoundingClientRect() : null); };
    const el = document.querySelector(`[data-tut="${steps[step]!.target}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    measure(); const t = setInterval(measure, 250);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { clearInterval(t); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [on, step, steps]);

  if (!on || typeof document === "undefined") return null;
  const finish = () => { setProgress(markTutorial(getProgress(), id)); setStep(-1); };
  const next = () => { sfx.click(); if (step + 1 >= steps.length) finish(); else setStep(step + 1); };
  const s = steps[step]!;
  const pad = 8;
  const r = rect ? { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 } : null;
  // bubble goes below the target if there is room, otherwise above; centred when there is no target
  const vw = window.innerWidth, vh = window.innerHeight; const BW = 340;
  const BH = 190;
  // big targets (the whole battlefield): put the bubble inside, near the bottom edge
  const inside = !!r && r.h > vh * 0.5;
  const below = r ? r.y + r.h + BH + 14 < vh : true;
  const bx = r ? Math.max(12, Math.min(vw - BW - 12, r.x + r.w / 2 - BW / 2)) : vw / 2 - BW / 2;
  const raw = !r ? vh / 2 - BH / 2 : inside ? Math.min(r.y + r.h, vh) - BH - 24 : below ? r.y + r.h + 14 : r.y - 14 - BH;
  const by = Math.max(12, Math.min(vh - BH - 12, raw));
  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label={s.title}>
      {r ? (
        <div className="pointer-events-none absolute rounded-xl border-2 border-gold transition-all duration-300"
          style={{ left: r.x, top: r.y, width: r.w, height: r.h, boxShadow: "0 0 0 9999px color-mix(in oklab, var(--background) 72%, transparent), 0 0 24px var(--gold)" }} />
      ) : <div className="absolute inset-0 bg-background/70" />}
      <div key={step} className={cn("panel-texture absolute w-[340px] rounded-xl border border-gold/70 bg-card p-4 shadow-2xl animate-pop-in")} style={{ left: bx, top: by }}>
        <div className="text-[10px] uppercase tracking-[0.3em] text-gold">Совет {step + 1}/{steps.length}</div>
        <h3 className="mt-1 font-display text-lg uppercase text-primary">{s.title}</h3>
        <p className="mt-1 text-sm">{s.text}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1">{steps.map((_, i) => <span key={i} className={cn("h-1.5 w-4 rounded-full", i <= step ? "bg-gold" : "bg-border")} />)}</div>
          <div className="flex gap-2">
            <GameButton size="sm" variant="ghost" onClick={finish}>Пропустить</GameButton>
            <GameButton size="sm" variant="gold" onClick={next}>{step + 1 >= steps.length ? "Понятно!" : "Далее"}</GameButton>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
