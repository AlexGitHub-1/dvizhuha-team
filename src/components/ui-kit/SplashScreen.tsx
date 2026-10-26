import { useEffect, useRef, useState } from "react";
import { LiveBackdrop } from "@/components/ui-kit/LiveBackdrop";
import { GameButton } from "@/components/ui-kit";
import { resumeAmbient, setIntensity, sfx, startScene, stopScene, unlockAudio } from "@/game/audio";

const TIPS = [
  "Точим клыки гоблинам…",
  "Будим Костяного Дракона…",
  "Пересчитываем черепа в казне…",
  "Шаман варит зелье из болотной тины…",
  "Тролль ищет свою дубину…",
  "Гарнизон столицы нервно проверяет ворота…",
];

/** Launch screen: studio credit, then the game logo with a loading bar, epic march underneath. Shown once per launch. */
export function SplashScreen() {
  const [open, setOpen] = useState(true);
  const [phase, setPhase] = useState<"studio" | "logo">("studio");
  const [load, setLoad] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!open) return;
    const h = document.documentElement; const prev = h.style.overflow; h.style.overflow = "hidden";
    setIntensity(0.9); startScene("epic", true); started.current = true;
    const t = setTimeout(() => setPhase("logo"), 3400);
    return () => { clearTimeout(t); h.style.overflow = prev; };
  }, [open]);
  useEffect(() => {
    if (phase !== "logo") return;
    sfx.ram();
    const t = setInterval(() => setLoad((v) => { if (v >= 100) { clearInterval(t); return 100; } return Math.min(100, v + 2 + Math.random() * 4); }), 70);
    return () => clearInterval(t);
  }, [phase]);

  if (!open) return null;
  const ready = load >= 100;
  const finish = () => {
    if (leaving) return; setLeaving(true); unlockAudio(); sfx.click();
    setTimeout(() => { stopScene(); setIntensity(0); resumeAmbient(); setOpen(false); }, 600);
  };
  const onClick = () => { unlockAudio(); if (phase === "studio") setPhase("logo"); };

  return (
    <div className={"fixed inset-0 z-[100] select-none overflow-hidden bg-background transition-opacity duration-500 " + (leaving ? "opacity-0" : "opacity-100")} onClick={onClick}>
      <LiveBackdrop />
      <div className="absolute inset-0 bg-background/40" />
      {phase === "studio" ? (
        <div key="studio" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center animate-screen-in">
          <div className="h-px w-40 bg-gold/60 animate-bar-grow" />
          <div className="font-display text-5xl tracking-wide text-gold drop-shadow-[0_0_24px_var(--gold)] sm:text-7xl">Движуха Team</div>
          <div className="text-sm uppercase tracking-[0.5em] text-muted-foreground">представляет</div>
          <div className="h-px w-40 bg-gold/60 animate-bar-grow" />
        </div>
      ) : (
        <div key="logo" className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="animate-pop-in">
            <div className="font-display text-6xl leading-none text-foreground drop-shadow-[0_0_30px_var(--blood)] sm:text-8xl">SIEGE</div>
            <div className="mt-2 font-display text-xl uppercase tracking-[0.35em] text-blood sm:text-3xl">March of Doom</div>
          </div>
          <div className="w-[min(420px,80vw)]">
            <div className="h-3 overflow-hidden rounded-full border border-gold/50 bg-card/80">
              <div className="h-full bg-gradient-to-r from-blood to-gold transition-[width] duration-100" style={{ width: load + "%" }} />
            </div>
            <div className="mt-2 h-5 text-sm text-muted-foreground">{ready ? "Орда готова к походу" : TIPS[Math.floor(load / 17) % TIPS.length]}</div>
          </div>
          <GameButton className={"min-w-56 transition-opacity " + (ready ? "opacity-100 animate-soft-pulse" : "pointer-events-none opacity-0")} onClick={(e) => { e.stopPropagation(); finish(); }}>
            Начать поход
          </GameButton>
          <div className="absolute bottom-5 text-xs text-muted-foreground/70">© Движуха Team</div>
        </div>
      )}
    </div>
  );
}
