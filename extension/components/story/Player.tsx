import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { SECTION_FOR_SLIDE, type Soundtrack } from "../../lib/soundtrack";
import { Shapes } from "./primitives";
import type { SlideDef } from "./slides";
import { withAlpha } from "./themes";

const HOLD_MS = 220;

export function Player({
  slides,
  isDemo,
  restartKey,
  initialIndex = 0,
  initialPaused = false,
  soundtrack = null,
}: {
  slides: SlideDef[];
  isDemo: boolean;
  restartKey: number;
  initialIndex?: number;
  initialPaused?: boolean;
  soundtrack?: Soundtrack | null;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [paused, setPaused] = useState(initialPaused);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem("jw:muted") === "1";
    } catch {
      return false;
    }
  });
  const hold = useRef<{ timer: number; x: number } | null>(null);
  const slide = slides[Math.min(index, slides.length - 1)]!;
  const last = index >= slides.length - 1;

  const firstRestart = useRef(restartKey);
  useEffect(() => {
    if (restartKey !== firstRestart.current) setIndex(0);
  }, [restartKey]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") setMuted((v) => !v);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " " && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    const onVisibility = () => setHidden(document.hidden);
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [next, prev]);

  useEffect(() => {
    soundtrack?.setMuted(muted);
    try {
      localStorage.setItem("jw:muted", muted ? "1" : "0");
    } catch {
      /* not remembered in private mode */
    }
  }, [muted, soundtrack]);

  useEffect(() => {
    soundtrack?.setSection(slide.music ?? SECTION_FOR_SLIDE[slide.id] ?? "groove");
  }, [slide.id, slide.music, soundtrack]);

  useEffect(() => soundtrack?.setHidden(hidden), [hidden, soundtrack]);

  useEffect(() => {
    // Clicks inside an iframe (the Spotify player) never reach us; the window blurring is the tell.
    const onBlur = () => setTimeout(() => document.activeElement?.tagName === "IFRAME" && setPaused(true), 0);
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  useEffect(() => {
    if (!slide.confetti || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => confetti({ particleCount: 140, spread: 90, startVelocity: 45, origin: { y: 0.55 }, colors: slide.confetti }), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per slide visit
  }, [slide.id, index]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, [data-interactive]")) return;
    const timer = window.setTimeout(() => setHeld(true), HOLD_MS);
    hold.current = { timer, x: e.clientX };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const h = hold.current;
    hold.current = null;
    if (!h) return;
    clearTimeout(h.timer);
    if (held) return setHeld(false);
    const rect = e.currentTarget.getBoundingClientRect();
    if (h.x - rect.left < rect.width * 0.3) prev();
    else if (!last) next();
  };
  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current.timer);
    hold.current = null;
    setHeld(false);
  };

  const running = !paused && !held && !hidden && slide.duration !== null;
  const { bg, fg } = slide.theme;

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#050507]">
        <div
          className="pointer-events-none absolute inset-0 transition-[background] duration-700"
          style={{ background: `radial-gradient(60% 70% at 50% 50%, ${withAlpha(bg, 0.45)}, transparent 70%)` }}
        />

        <NavButton side="left" onClick={prev} disabled={index === 0} />
        <NavButton side="right" onClick={next} disabled={last} />

        <div
          className="relative h-dvh w-full touch-manipulation overflow-hidden select-none [container-type:size] md:h-[min(94dvh,920px)] md:w-[calc(min(94dvh,920px)*9/16)] md:rounded-[28px] md:shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
          style={{ background: bg, color: fg, transition: "background-color 600ms ease, color 600ms ease" }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={slide.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <Shapes variant={slide.shapes} a={slide.theme.a} b={slide.theme.b} />
              {slide.render()}
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-x-0 top-0 z-20 px-[4cqw] pt-[4cqw]">
            <Progress count={slides.length} index={index} duration={slide.duration} running={running} fg={fg} onDone={next} />
            <div className="mt-[3cqw] flex items-center justify-between">
              <div className="flex items-center gap-[2cqw] font-sans text-[3cqw] font-bold uppercase tracking-[0.16em]">
                <span>Job Hunt Wrapped</span>
                {isDemo && (
                  <span className="rounded-full px-[2cqw] py-[0.6cqw] text-[2.4cqw]" style={{ background: withAlpha(fg, 0.15) }}>
                    Demo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-[2cqw]">
              {soundtrack && (
                <button
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Unmute music" : "Mute music"}
                  aria-pressed={muted}
                  className="flex h-[8cqw] w-[8cqw] items-center justify-center rounded-full transition"
                  style={{ background: withAlpha(fg, 0.12) }}
                >
                  {muted ? <VolumeX className="h-[4cqw] w-[4cqw]" /> : <Volume2 className="h-[4cqw] w-[4cqw]" />}
                </button>
              )}
              {slide.duration !== null && (
                <button
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? "Play" : "Pause"}
                  className="flex h-[8cqw] w-[8cqw] items-center justify-center rounded-full transition"
                  style={{ background: withAlpha(fg, 0.12) }}
                >
                  {paused ? <Play className="h-[3.6cqw] w-[3.6cqw]" fill="currentColor" /> : <Pause className="h-[3.6cqw] w-[3.6cqw]" fill="currentColor" />}
                </button>
              )}
              </div>
            </div>
          </div>

          {held && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[5cqw] z-20 text-center font-sans text-[3cqw] font-semibold uppercase tracking-[0.16em] opacity-70">
              Paused
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

/** Owns its own animation frame loop so slide content doesn't re-render 60 times a second. */
function Progress({
  count,
  index,
  duration,
  running,
  fg,
  onDone,
}: {
  count: number;
  index: number;
  duration: number | null;
  running: boolean;
  fg: string;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const elapsed = useRef(0);

  useEffect(() => {
    elapsed.current = 0;
    setProgress(duration === null ? 1 : 0);
  }, [index, duration]);

  useEffect(() => {
    if (!running || duration === null) return;
    let raf = 0;
    let lastTick = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - lastTick;
      lastTick = now;
      const p = Math.min(1, elapsed.current / duration);
      setProgress(p);
      if (p >= 1) return onDone();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, duration, index, onDone]);

  return (
    <div className="flex gap-[1cqw]">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-[0.9cqw] flex-1 overflow-hidden rounded-full" style={{ background: withAlpha(fg, 0.25) }}>
          <div className="h-full rounded-full" style={{ background: fg, width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} />
        </div>
      ))}
    </div>
  );
}

function NavButton({ side, onClick, disabled }: { side: "left" | "right"; onClick: () => void; disabled: boolean }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous slide" : "Next slide"}
      className={`absolute top-1/2 z-30 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-20 md:flex ${
        side === "left" ? "left-[max(2rem,calc(50%-min(94dvh,920px)*9/32-6rem))]" : "right-[max(2rem,calc(50%-min(94dvh,920px)*9/32-6rem))]"
      }`}
    >
      <Icon className="h-7 w-7" />
    </button>
  );
}
