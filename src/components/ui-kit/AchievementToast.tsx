import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { onAchievements } from "@/game/meta/store";
import type { AchDef } from "@/game/data/achievements";
import { sfx } from "@/game/audio";

/** Slides newly unlocked achievements in from the top, one at a time. Mounted once in __root; never pauses the battle. */
export function AchievementToast() {
  const [queue, setQueue] = useState<AchDef[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return onAchievements((a) => setQueue((q) => [...q, ...a])); }, []);
  const cur = queue[0];
  useEffect(() => {
    if (!cur) return;
    try { sfx.achievement(); } catch { /* audio not ready */ }
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 3600);
    return () => clearTimeout(t);
  }, [cur]);
  if (!mounted || !cur) return null;
  return createPortal(
    <div key={cur.id} className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4">
      <div className="panel-texture flex max-w-md animate-pop-in items-center gap-3 rounded-2xl border-2 border-gold bg-card/95 px-4 py-3 shadow-[0_0_40px_color-mix(in_oklab,var(--gold)_45%,transparent)]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gold/70 bg-gold/15 text-2xl">{cur.icon}</div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold">Деяние открыто{queue.length > 1 ? ` · ещё ${queue.length - 1}` : ""}</div>
          <div className="font-display text-lg leading-tight text-foreground">{cur.name}</div>
          <div className="text-xs text-muted-foreground">{cur.desc}</div>
          {(cur.reward.title || cur.reward.scene) && <div className="mt-0.5 text-[11px] text-gold">{cur.reward.title && `Титул «${cur.reward.title}»`}{cur.reward.title && cur.reward.scene && " · "}{cur.reward.scene && "тайная страница Летописи"}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
