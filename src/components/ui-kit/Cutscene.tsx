import { achSkip } from "@/game/meta/achievements";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CHARS, CLUES, SCENES, SCENE_BY_ID, type CharId, type ClueId } from "@/game/data/story";
import { LOCATIONS } from "@/game/data/locations";
import { markClue } from "@/game/meta/progress";
import { setProgress } from "@/game/meta/store";
import { resumeAmbient, sfx, startScene, stopScene, unlockAudio } from "@/game/audio";
import { CharArt, StoryBackdrop, TONE_BG, TONE_BORDER, TONE_TEXT } from "./StoryArt";

type Phase = "intro" | "play" | "outro";

function Portrait({ id, active, side }: { id: CharId; active: boolean; side: "left" | "right" }) {
  const c = CHARS[id];
  const size = typeof window === "undefined" ? 360 : Math.min(460, Math.max(240, window.innerHeight * 0.46));
  return (
    <div key={id} className={cn("relative animate-stagger-in transition-all duration-500 ease-out",
      active ? "z-10 scale-100 opacity-100" : "scale-[0.86] opacity-45 brightness-50 saturate-50",
      active && (side === "left" ? "translate-x-6" : "-translate-x-6"))}>
      {/* floor glow */}
      <div className={cn("absolute -bottom-4 left-1/2 h-10 w-[80%] -translate-x-1/2 rounded-[50%] blur-xl transition-opacity duration-500", TONE_BG[c.tone], active ? "opacity-60" : "opacity-0")} />
      <div className={cn(active && "animate-idle-bob")}>
        <div className={cn("relative", side === "right" && !c.monster && "-scale-x-100")} style={{ width: size, height: size }}>
          <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_55%,black_55%,transparent_75%)]"><CharArt id={id} size={size} animate={active} /></div>
        </div>
      </div>
    </div>
  );
}

function Typed({ text, n, whisper }: { text: string; n: number; whisper: boolean }) {
  const shown = text.slice(0, n);
  if (!whisper) return <>{shown}</>;
  return <>{shown.split(" ").map((w, k) => <span key={k} className="animate-tremble" style={{ animationDelay: `${k * 0.05}s` }}>{w}&nbsp;</span>)}</>;
}

/** Visual-novel cutscene overlay. Rendered through a portal (screens animate with transforms). */
export function Cutscene({ sceneId, onDone }: { sceneId: string; onDone: () => void }) {
  const scene = SCENE_BY_ID[sceneId]!;
  /** chapters are regions: a prologue opens one, an epilogue closes it */
  const chapter = scene.loc + 1;
  const opens = /^p\d/.test(scene.id) || scene.id === "intro", closes = /^e\d/.test(scene.id) || scene.id === "final";
  const [phase, setPhase] = useState<Phase>("intro");
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(0);
  const [log, setLog] = useState(false);
  const [clue, setClue] = useState<{ id: ClueId; k: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const line = scene.lines[i]!;
  const full = typed >= line.text.length;
  const doneRef = useRef(onDone); doneRef.current = onDone;

  const sides = useMemo(() => {
    let left: CharId | null = null, right: CharId | null = null;
    for (let k = 0; k <= i; k++) { const w = scene.lines[k]!.who; if (w === "narrator") continue; if (CHARS[w].side === "left") left = w; else right = w; }
    return { left, right };
  }, [i, scene]);

  useEffect(() => { setMounted(true); unlockAudio(); startScene(LOCATIONS[scene.loc]!.theme, false); return () => { stopScene(); resumeAmbient(); }; }, [scene.loc]);
  // the page underneath must not scroll while the cutscene covers it
  useEffect(() => {
    const h = document.documentElement, b = document.body; const ph = h.style.overflow, pb = b.style.overflow;
    h.style.overflow = "hidden"; b.style.overflow = "hidden";
    return () => { h.style.overflow = ph; b.style.overflow = pb; };
  }, []);
  useEffect(() => { if (phase !== "intro") return; const t = setTimeout(() => setPhase("play"), 3200); return () => clearTimeout(t); }, [phase]);
  useEffect(() => { if (phase !== "outro") return; sfx.chest(); const t = setTimeout(() => doneRef.current(), 2200); return () => clearTimeout(t); }, [phase]);
  useEffect(() => {
    if (phase !== "play") return;
    setTyped(0);
    if (line.fx === "shake") sfx.ram(); else if (line.fx === "flash") sfx.whoosh();
    if (line.clue) { const c = line.clue; setProgress((q) => markClue(q, c)); setClue({ id: c, k: i }); sfx.coins(); }
    let k = 0;
    const t = setInterval(() => {
      // every few letters the speaker mumbles a syllable in their own voice
      if (k % 3 === 0 && line.who !== "narrator" && /[A-Za-zА-Яа-яЁё]/.test(line.text[k] ?? "")) sfx.babble(line.who, line.text[k]!, line.style);
      k++;
      setTyped((n) => { if (n >= line.text.length) { clearInterval(t); return n; } return n + 1; });
    }, line.style === "whisper" ? 34 : 22);
    return () => clearInterval(t);
  }, [i, line, phase]);

  const next = () => {
    if (phase === "intro") { setPhase("play"); return; }
    if (phase === "outro") { doneRef.current(); return; }
    if (!full) { setTyped(line.text.length); return; }
    if (i + 1 >= scene.lines.length) { if (closes) setPhase("outro"); else doneRef.current(); return; }
    sfx.click(); setI(i + 1);
  };
  const nextRef = useRef(next); nextRef.current = next;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); nextRef.current(); } if (e.key === "Escape") doneRef.current(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  if (!mounted) return null;
  const speaker = line.who === "narrator" ? null : CHARS[line.who];
  const loc = LOCATIONS[scene.loc]!;
  return createPortal(
    <div className="fixed inset-0 z-[80] select-none overflow-hidden bg-background" onClick={next}>
      <StoryBackdrop bg={scene.bg} />
      {phase === "play" && line.fx === "flash" && <div key={"f" + i} className="pointer-events-none absolute inset-0 bg-blood/40 animate-screen-flash" />}
      {phase === "play" && line.fx === "fade" && <div key={"d" + i} className="pointer-events-none absolute inset-0 bg-background animate-screen-flash" />}

      <div key={"s" + i} className={cn("relative flex h-full flex-col", phase === "play" && line.fx === "shake" && "animate-big-shake")}>
        <div className="flex flex-1 items-end justify-between px-[4vw] pb-2 pt-24">
          <div>{phase === "play" && sides.left && <Portrait id={sides.left} side="left" active={line.who === sides.left} />}</div>
          <div>{phase === "play" && sides.right && <Portrait id={sides.right} side="right" active={line.who === sides.right} />}</div>
        </div>

        {phase === "play" && (
          <div className="relative z-20 mx-auto mb-[9vh] w-[min(1100px,94vw)] animate-stagger-in">
            {speaker && (
              <div className={cn("absolute -top-6 z-10 flex items-center gap-2 rounded-lg border-2 bg-card px-4 py-1.5 shadow-[var(--shadow-deep)]", TONE_BORDER[speaker.tone], speaker.side === "right" ? "right-10" : "left-10")}>
                <span className={cn("h-3 w-3 rotate-45", TONE_BG[speaker.tone])} />
                <span className={cn("font-display tracking-wider", TONE_TEXT[speaker.tone])}>{speaker.name}</span>
              </div>
            )}
            <div className="panel-texture relative min-h-[150px] rounded-xl border-2 border-gold/60 bg-card/95 px-10 pb-6 pt-9 shadow-[var(--shadow-deep)]">
              {/* gold corners */}
              {["left-1 top-1 border-l-2 border-t-2", "right-1 top-1 border-r-2 border-t-2", "bottom-1 left-1 border-b-2 border-l-2", "bottom-1 right-1 border-b-2 border-r-2"].map((c) => <span key={c} className={cn("pointer-events-none absolute h-5 w-5 border-gold", c)} />)}
              <p className={cn("text-lg leading-relaxed sm:text-xl",
                line.who === "narrator" && "text-center font-display tracking-wide text-gold/90",
                line.style === "thought" && "italic text-ice",
                line.style === "whisper" && "italic text-primary")}>
                {line.style === "thought" && "« "}
                <Typed text={line.text} n={typed} whisper={line.style === "whisper"} />
                {line.style === "thought" && full && " »"}
                {!full && <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-gold align-middle" />}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-1">{scene.lines.map((_, k) => <span key={k} className={cn("h-1 w-3 rounded-full", k <= i ? "bg-gold" : "bg-border")} />)}</div>
                <span className={cn("text-gold transition-opacity", full ? "animate-soft-pulse opacity-100" : "opacity-0")}>{i + 1 >= scene.lines.length ? "Завершить главу ▸" : "Далее ▸"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* letterbox */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[7vh] bg-background animate-bar-top" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[6vh] bg-background animate-bar-bottom" />

      <header className="absolute inset-x-0 top-0 flex h-[7vh] items-center justify-between px-6">
        <p className="font-display text-sm tracking-[0.3em] text-gold/80">ГЛАВА {chapter}: {loc.name.toUpperCase()} · {scene.title.toUpperCase()}</p>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button className="rounded-md border border-gold/40 bg-card/80 px-3 py-1 text-sm hover:border-gold" onClick={() => setLog((v) => !v)}>📜 История</button>
          <button className="rounded-md border border-gold/40 bg-card/80 px-3 py-1 text-sm hover:border-gold" onClick={() => { setProgress(achSkip); doneRef.current(); }}>Пропустить ⏭</button>
        </div>
      </header>

      {clue && <div key={clue.k} className="pointer-events-none absolute left-1/2 top-[9vh] z-30 animate-clue-drop">
        <div className="flex items-center gap-4 rounded-lg border-2 border-gold bg-vellum px-5 py-3 text-ink shadow-[var(--shadow-deep)]">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-wax text-2xl shadow-inner">{CLUES[clue.id].icon}</span>
          <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-wax">Улика найдена</p><p className="font-display text-lg">{CLUES[clue.id].name}</p></div>
        </div>
      </div>}

      {phase === "intro" && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-background/85">
          <div className="text-center">
            {opens ? <>
              <p className="font-display text-2xl tracking-[0.3em] text-gold/80 animate-chapter-in">ГЛАВА {chapter}</p>
              <h1 className="mt-2 font-display text-5xl text-gold drop-shadow-[0_4px_24px_var(--blood)] animate-chapter-in sm:text-7xl" style={{ animationDelay: "0.3s" }}>{loc.name}</h1>
              <p className="mt-3 text-lg uppercase tracking-[0.3em] text-muted-foreground animate-stagger-in" style={{ animationDelay: "0.6s" }}>{scene.title}</p>
            </> : <>
              <p className="mb-3 text-sm uppercase tracking-[0.5em] text-muted-foreground animate-stagger-in">Глава {chapter} · {loc.name}</p>
              <h1 className="mt-2 font-display text-5xl text-gold drop-shadow-[0_4px_24px_var(--blood)] animate-chapter-in sm:text-7xl" style={{ animationDelay: "0.3s" }}>{scene.title}</h1>
            </>}
            <div className="mx-auto my-6 h-px w-64 bg-gradient-to-r from-transparent via-gold to-transparent" />
            <p className="mx-auto max-w-xl text-lg italic text-muted-foreground animate-stagger-in" style={{ animationDelay: "1s" }}>«{scene.epigraph}»</p>
          </div>
        </div>
      )}
      {phase === "outro" && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-background/85 animate-stagger-in">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-wax font-display text-3xl text-gold shadow-[var(--shadow-deep)] animate-pop-in">✠</div>
            <p className="font-display text-4xl tracking-[0.2em] text-gold animate-chapter-in">{scene.id === "final" ? "Конец истории" : `Глава ${chapter} завершена`}</p>
            {scene.id !== "final" && <p className="mt-3 text-muted-foreground">{loc.name}</p>}
          </div>
        </div>
      )}

      {log && (
        <div className="absolute inset-y-0 right-0 z-50 w-[min(460px,90vw)] overflow-y-auto border-l-2 border-gold/40 bg-card/95 p-5 shadow-[var(--shadow-deep)]" onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-gold">История</h3><button onClick={() => setLog(false)}>✕</button></div>
          {scene.lines.slice(0, i + 1).map((l, k) => (
            <p key={k} className="mb-3 text-sm leading-relaxed">
              {l.who !== "narrator" && <b className={cn("mr-1", TONE_TEXT[CHARS[l.who].tone])}>{CHARS[l.who].name}:</b>}
              <span className={cn(l.who === "narrator" && "italic text-muted-foreground")}>{l.text}</span>
            </p>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
