import { ACHIEVEMENTS } from "@/game/data/achievements";
import { SECRET_SCENES } from "@/game/data/story";
import { hasAch, secretSceneOpen } from "@/game/meta/achievements";
import { achAccuse, achRewatch } from "@/game/meta/achievements";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ScreenShell } from "@/components/ui-kit";
import { Cutscene } from "@/components/ui-kit/Cutscene";
import { CharArt, StoryBackdrop } from "@/components/ui-kit/StoryArt";
import { CHARS, CLUES, RECAP, SCENES, SUSPECTS, type CharId, type ClueId, type SuspectId, type SuspectStatus } from "@/game/data/story";
import { LOCATIONS } from "@/game/data/locations";
import { accusationOpen, accusationScene, accuse, accusedRight, suspectStatus } from "@/game/meta/progress";
import { setProgress } from "@/game/meta/store";
import { ACCUSE_CHOICES } from "@/game/data/story";
import { useProgress } from "@/game/meta/store";
import { sfx } from "@/game/audio";

export const Route = createFileRoute("/chronicle")({
  head: () => ({
    meta: [
      { title: "Летопись — SIEGE: March of Doom" },
      { name: "description", content: "Книга расследования Владыки Мортрекса: главы сюжета, доска улик и подозреваемые." },
      { property: "og:title", content: "Летопись — SIEGE: March of Doom" },
      { property: "og:description", content: "Кто сжёг Вересковую Лощину? Улики, подозреваемые и сцены похода." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chronicle,
});

const KIND = (id: string) => id === "final" ? "Финал" : id.startsWith("p") ? "Пролог" : "Эпилог";
const STATUS: Record<SuspectStatus, { label: string; cls: string }> = {
  unknown: { label: "нет данных", cls: "border-ink/30 text-ink/50" },
  suspect: { label: "подозрение", cls: "border-gold text-gold bg-ink/80" },
  cleared: { label: "невиновен", cls: "border-poison text-poison bg-ink/80" },
  traitor: { label: "предатель", cls: "border-wax text-vellum bg-wax" },
};
/** clue pin positions on the cork board, % of the board */
const CLUE_POS: Record<ClueId, [number, number]> = {
  order: [12, 12], dagger: [37, 8], rag: [63, 12], tag: [88, 9], seal: [20, 36],
  ash: [48, 33], road: [78, 35], arrow: [12, 58], hand: [42, 58], key: [72, 58],
};
const SUS_POS: Record<SuspectId, number> = { crown: 10, eldric: 30, grosh: 50, kaira: 70, vale: 90 };
const SUS_Y = 74;
const BOARD_CHARS: CharId[] = ["lord", "grosh", "kaira", "eldric", "selesta", "scribe", "vale"];


function Chronicle() {
  const p = useProgress();
  const [open, setOpen] = useState<string | null>(null);
  const [flip, setFlip] = useState(false);
  const [loc, setLoc] = useState(0);
  const [char, setChar] = useState<CharId>("lord");
  const [tip, setTip] = useState<{ c: ClueId; x: number; y: number } | null>(null);
  const known = Object.entries(RECAP).filter(([n]) => p.story?.["e" + (Number(n) - 1)]).map(([n, t]) => ({ n: Number(n), t: t.replace(/^Ранее\.\s*/, "") }));
  const seenCount = SCENES.filter((s) => p.story?.[s.id]).length;
  const clueCount = Object.keys(CLUES).filter((c) => p.clues?.[c]).length;

  const play = (id: string) => { setProgress((q) => achRewatch(q, id)); sfx.whoosh(); setFlip(true); setTimeout(() => { setFlip(false); setOpen(id); }, 550); };
  const chapters = SCENES.map((s, k) => ({ s, k })).filter(({ s }) => s.loc === loc);
  const cd = CHARS[char];
  const notes = (cd.notes ?? []).filter((n) => p.story?.[n.after]);
  const charKnown = notes.length > 0;

  return (
    <ScreenShell title="Летопись">
      {open && <Cutscene sceneId={open} onDone={() => setOpen(null)} />}
      <div className="relative overflow-hidden rounded-3xl border-2 border-border bg-gradient-to-br from-card via-background to-card p-6 shadow-[var(--shadow-deep)]">
        {/* wood grain */}
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(92deg,transparent_0_18px,color-mix(in_oklab,var(--cork)_25%,transparent)_18px_20px)]" />
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gold/15 blur-3xl animate-candle" />

        <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Дело о сожжённой деревне</p>
            <h2 className="font-display text-3xl tracking-wider text-gold drop-shadow-[0_2px_14px_var(--blood)]">Кто сжёг Вересковую Лощину?</h2>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="rounded-full border border-gold/50 bg-card/80 px-3 py-1">📖 Сцен: <b className="text-gold">{seenCount}/{SCENES.length}</b></span>
            <span className="rounded-full border border-gold/50 bg-card/80 px-3 py-1">🔎 Улик: <b className="text-gold">{clueCount}/{Object.keys(CLUES).length}</b></span>
          </div>
        </div>

        <div className="relative grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          {/* ---- the book */}
          <div className="relative">
            <div className="flex gap-1 pl-6">
              {LOCATIONS.map((l) => (
                <button key={l.id} onClick={() => { sfx.click(); setLoc(l.id); }}
                  className={cn("rounded-t-md border-2 border-b-0 px-3 pb-1.5 pt-2 font-display text-xs tracking-wide transition",
                    loc === l.id ? "translate-y-0.5 border-gold bg-vellum text-ink" : "border-border bg-card text-muted-foreground hover:text-gold")}>
                  {["I", "II", "III", "IV", "V", "VI"][l.id]} · {l.name}
                </button>
              ))}
            </div>
            <div className="relative grid min-h-[560px] grid-cols-2 rounded-xl border-4 border-wax/70 bg-wax/60 p-2 shadow-[var(--shadow-deep)]">
              {/* left page: chapters */}
              <div className={cn("relative rounded-l-lg bg-vellum p-6 text-ink shadow-[inset_-20px_0_30px_-20px_var(--ink)]", flip && "animate-page-flip")}>
                <p className="text-center font-display text-sm tracking-[0.3em] text-wax">{LOCATIONS[loc]!.name}</p>
                <p className="mb-4 text-center text-xs italic text-ink/60">{LOCATIONS[loc]!.blurb}</p>
                <div className="space-y-4">
                  {chapters.map(({ s, k }) => {
                    const seen = !!p.story?.[s.id];
                    return (
                      <button key={s.id} disabled={!seen} onClick={() => play(s.id)}
                        className={cn("group relative flex w-full gap-3 overflow-hidden rounded-md border-2 p-2 text-left transition",
                          seen ? "border-ink/30 hover:-translate-y-0.5 hover:border-wax hover:shadow-lg" : "border-dashed border-ink/25")}>
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded border border-ink/40 bg-ink">
                          {seen ? <StoryBackdrop bg={s.bg} /> : <div className="grid h-full place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-wax font-display text-gold shadow-inner">✠</span></div>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-wax">Глава {s.loc + 1} · {KIND(s.id)}</p>
                          <p className="break-words font-display text-base leading-tight">{seen ? s.title : "Запечатано"}</p>
                          <p className="mt-1 line-clamp-2 text-xs italic text-ink/70">{seen ? `«${s.epigraph}»` : "Сцена откроется по ходу похода."}</p>
                        </div>
                        {seen && <span className="absolute bottom-2 right-3 text-xs font-bold text-wax opacity-0 transition group-hover:opacity-100">▶ Читать</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* right page: characters */}
              <div className="relative rounded-r-lg bg-vellum p-6 text-ink shadow-[inset_20px_0_30px_-20px_var(--ink)]">
                <p className="mb-3 text-center font-display text-sm tracking-[0.3em] text-wax">Действующие лица</p>
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  {BOARD_CHARS.map((id) => {
                    const known = (CHARS[id].notes ?? []).some((n) => p.story?.[n.after]);
                    return (
                      <button key={id} onClick={() => { sfx.click(); setChar(id); }} title={known ? CHARS[id].name : "???"}
                        className={cn("h-14 w-14 overflow-hidden rounded-full border-2 bg-ink transition", char === id ? "scale-110 border-wax" : "border-ink/30", !known && "opacity-40 grayscale")}>
                        <CharArt id={id} size={52} />
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-ink/20 bg-ink/5 p-4">
                  <div className="mx-auto mb-2 h-40 w-40 overflow-hidden rounded-lg border-2 border-ink/40 bg-ink">{charKnown ? <CharArt id={char} size={156} animate /> : <div className="grid h-full place-items-center font-display text-4xl text-vellum/40">?</div>}</div>
                  <p className="text-center font-display text-xl">{charKnown ? cd.name : "Неизвестный"}</p>
                  <div className="mt-3 space-y-2 text-sm leading-relaxed">
                    {charKnown ? notes.map((n, k) => <p key={k} className="border-l-2 border-wax/60 pl-3 italic">{n.text}</p>) : <p className="text-center italic text-ink/60">Писарь ещё ничего не записал.</p>}
                  </div>
                </div>
                <p className="absolute bottom-3 right-5 text-[10px] italic text-ink/50">записано рукой Писаря</p>
              </div>
              <div className="pointer-events-none absolute inset-y-2 left-1/2 w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-ink/30 to-transparent" />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
          <AccusePanel onPlay={play} />
          {/* ---- cork board */}
          <div className="relative min-h-[640px] rounded-xl border-8 border-wax/50 bg-cork shadow-[var(--shadow-deep)] [background-image:radial-gradient(color-mix(in_oklab,var(--ink)_35%,transparent)_1px,transparent_1.5px)] [background-size:7px_7px]">
            <p className="absolute left-1/2 top-2 z-10 -translate-x-1/2 -rotate-1 rounded bg-vellum px-3 py-0.5 font-display text-sm text-ink shadow">ДОСКА УЛИК</p>
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {(Object.keys(CLUES) as ClueId[]).filter((c) => p.clues?.[c]).map((c) => {
                const [x, y] = CLUE_POS[c]; const sx = SUS_POS[CLUES[c].points];
                return <path key={c} d={`M${x} ${y + 6} Q${(x + sx) / 2} ${(y + SUS_Y) / 2 + 8} ${sx} ${SUS_Y - 4}`} stroke="var(--wax)" strokeWidth="0.45" fill="none" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />;
              })}
            </svg>
            {(Object.keys(CLUES) as ClueId[]).map((c, k) => {
              const [x, y] = CLUE_POS[c]; const got = !!p.clues?.[c]; const d = CLUES[c];
              return (
                <div key={c} className="group absolute w-[21%] -translate-x-1/2 hover:z-20" onMouseEnter={(e) => { if (!got) return; const r = e.currentTarget.getBoundingClientRect(); setTip({ c, x: r.left + r.width / 2, y: r.bottom }); }} onMouseLeave={() => setTip(null)} style={{ left: `${x}%`, top: `${y}%`, rotate: `${((k * 37) % 9) - 4}deg` }}>
                  <span className="absolute -top-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rounded-full bg-wax shadow-[0_2px_3px_var(--ink)]" />
                  <div className={cn("rounded-sm p-2 text-center shadow-[0_6px_12px_-4px_var(--ink)] transition group-hover:scale-110", got ? "bg-vellum text-ink" : "bg-vellum/40 text-ink/50")}>
                    <div className="text-2xl">{got ? d.icon : "?"}</div>
                    <p className="text-[11px] font-bold leading-tight">{got ? d.name : "Не найдено"}</p>
                  </div>
                </div>
              );
            })}
            {(Object.keys(SUSPECTS) as SuspectId[]).map((s) => {
              const st = suspectStatus(p, s); const d = SUSPECTS[s];
              return (
                <div key={s} className="absolute w-[18%] -translate-x-1/2 text-center" style={{ left: `${SUS_POS[s]}%`, top: `${SUS_Y - 4}%` }}>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-ink/50 bg-vellum text-2xl shadow-lg">{st === "unknown" ? "?" : d.icon}</div>
                  <p className="mt-1 truncate text-xs font-bold text-vellum drop-shadow">{st === "unknown" ? "???" : d.name}</p>
                  <span className={cn("mt-1 inline-block max-w-[92%] truncate whitespace-nowrap rounded border px-1 text-[9px] font-bold uppercase leading-4 tracking-normal sm:text-[10px]", STATUS[st].cls)}>{STATUS[st].label}</span>
                </div>
              );
            })}
          </div>
          {/* ---- plain summary of the investigation */}
          <div className="rounded-xl border-2 border-gold/40 bg-card/80 p-4 shadow-[var(--shadow-deep)]">
            <h3 className="mb-2 font-display text-lg tracking-wide text-gold">Что мы знаем</h3>
            <p className="mb-2 text-sm text-muted-foreground">Двенадцать лет назад сожгли деревню Вересковая Лощина. Владыка Мортрекс выжил и ищет, кто отдал приказ.</p>
            {known.length ? <ol className="space-y-2 text-sm leading-relaxed">{known.map((k) => <li key={k.n} className="border-l-2 border-gold/60 pl-3"><b className="text-gold">Глава {k.n}.</b> {k.t}</li>)}</ol>
              : <p className="text-sm italic text-muted-foreground">Пройди первую главу, и здесь появятся первые выводы.</p>}
          </div>
          </div>
        </div>
      </div>
      {tip && typeof document !== "undefined" && createPortal(
        <div className="pointer-events-none fixed z-[200] w-64 -translate-x-1/2 rounded-md border-2 border-wax bg-vellum p-3 text-sm text-ink shadow-[var(--shadow-deep)] animate-stagger-in" style={{ left: Math.min(Math.max(tip.x, 140), window.innerWidth - 140), top: Math.min(tip.y + 10, window.innerHeight - 160) }}>
          <p className="mb-1 font-display text-base">{CLUES[tip.c].icon} {CLUES[tip.c].name}</p>{CLUES[tip.c].text}
        </div>, document.body)}
      <section className="panel-texture mt-4 rounded-2xl border-2 border-primary/40 bg-card/90 p-5">
        <div className="mb-3 flex items-end justify-between"><h3 className="font-display text-xl uppercase tracking-widest text-primary">Тайное</h3><span className="text-xs text-muted-foreground">Страницы открываются за деяния</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECRET_SCENES.map((s) => { const on = secretSceneOpen(p, s.id); const by = ACHIEVEMENTS.find((d) => d.reward.scene === s.id)!;
            return (
              <button key={s.id} disabled={!on} onClick={() => play(s.id)} className={cn("rounded-xl border-2 p-3 text-left transition", on ? "border-gold/60 bg-vellum text-ink hover:-translate-y-0.5" : "border-border bg-muted/50 text-muted-foreground")}>
                <div className="text-[10px] uppercase tracking-[0.25em] text-wax">{on ? "Тайная страница" : "Запечатано воском"}</div>
                <div className="font-display leading-tight">{on ? s.title.replace("Тайное: ", "") : "???"}</div>
                <div className="mt-1 text-xs italic">{on ? `«${s.epigraph}»` : `Деяние: ${by.secret && !hasAch(p, by.id) ? "тайное" : `«${by.name}»`}`}</div>
              </button>
            ); })}
        </div>
      </section>
    </ScreenShell>
  );
}

/** One-time accusation: the player names who burned the Hollow before the forge chapter. */
function AccusePanel({ onPlay }: { onPlay: (id: string) => void }) {
  const p = useProgress();
  const [pick, setPick] = useState<SuspectId | null>(null);
  if (!accusationOpen(p) && !p.accusation) return null;
  if (p.accusation) {
    const right = accusedRight(p);
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-3 self-start rounded-xl border-2 px-4 py-3", right ? "border-poison/60 bg-poison/10" : "border-wax/60 bg-wax/10")}>
        <p className="text-sm"><span className="font-display text-xs uppercase tracking-widest text-gold">Обвинение · </span>{SUSPECTS[p.accusation].icon} {SUSPECTS[p.accusation].name} — {right ? <b className="text-poison">Раскрыто верно</b> : <b className="text-wax">Ошибка Владыки</b>}</p>
        <button onClick={() => onPlay(accusationScene(p.accusation!))} className="rounded-full border border-gold/60 px-3 py-1 text-xs text-gold transition hover:bg-gold/15">▶ Пересмотреть</button>
      </div>
    );
  }
  return (
    <div className="panel-texture relative self-start overflow-hidden rounded-xl border-2 border-gold bg-card p-4 shadow-[var(--shadow-glow)] animate-pop-in">
      <div className="pointer-events-none absolute inset-0 animate-soft-pulse rounded-xl" />
      <p className="font-display text-lg uppercase text-gold">⚖ Предъяви обвинение</p>
      <p className="mt-1 text-sm text-muted-foreground">Сопоставь улики на доске. Кто сжёг Вересковую Лощину? Выбор делается один раз.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACCUSE_CHOICES.map((s) => (
          <button key={s} onClick={() => { sfx.click(); setPick(s); }} className={cn("flex flex-col items-center gap-1 rounded-lg border-2 bg-secondary px-2 py-3 transition hover:-translate-y-0.5", pick === s ? "border-blood shadow-[0_0_18px_color-mix(in_oklab,var(--blood)_55%,transparent)]" : "border-border hover:border-gold/60")}>
            <span className="text-3xl">{SUSPECTS[s].icon}</span><span className="text-xs font-bold">{SUSPECTS[s].name}</span>
          </button>
        ))}
      </div>
      <button disabled={!pick} onClick={() => { if (!pick) return; setProgress((x) => x.accusation ? x : achAccuse(accuse(x, pick), pick)); onPlay(accusationScene(pick)); }}
        className="mt-3 w-full rounded-lg border-2 border-blood bg-blood/80 py-2 font-display uppercase text-foreground transition enabled:hover:bg-blood disabled:opacity-40">
        {pick ? `Обвинить: ${SUSPECTS[pick].name}` : "Выбери подозреваемого"}
      </button>
    </div>
  );
}
