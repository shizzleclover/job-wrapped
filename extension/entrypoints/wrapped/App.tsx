import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play } from "lucide-react";
import { SpiceLevelSchema, type SpiceLevel, type WrappedInput } from "../../shared/schema";
import { generateCopy, type CopyResult } from "../../lib/api";
import { buildDemoInput } from "../../lib/input";
import { hasExtensionStorage, latestWrappedId, loadWrapped, saveWrapped } from "../../lib/storage";
import { Player } from "../../components/story/Player";
import { buildSlides } from "../../components/story/slides";

type State =
  | { phase: "loading" }
  | { phase: "empty" }
  | { phase: "ready"; id: string | null; input: WrappedInput; result: CopyResult };

const params = new URLSearchParams(window.location.search);
const MIN_INTRO_MS = 2600;
// Preview hooks: ?demo=1&spice=unhinged&slide=4&paused=1&autoplay=1
const preview = {
  demo: params.has("demo") || !hasExtensionStorage(),
  spice: SpiceLevelSchema.catch("crispy").parse(params.get("spice")),
  slide: Number(params.get("slide") ?? 0) || 0,
  paused: params.has("paused"),
  autoplay: params.has("autoplay"),
};

async function load(): Promise<State> {
  if (preview.demo) {
    const input = buildDemoInput(preview.spice);
    return { phase: "ready", id: null, input, result: await generateCopy(input) };
  }
  const id = params.get("id") ?? (await latestWrappedId());
  const stored = id ? await loadWrapped(id) : null;
  if (!id || !stored) return { phase: "empty" };
  if (stored.response) return { phase: "ready", id, input: stored.input, result: { ...stored.response, offline: stored.response.source === "fallback" } };
  const result = await generateCopy(stored.input);
  await saveWrapped({ ...stored, response: { copy: result.copy, source: result.source } });
  return { phase: "ready", id, input: stored.input, result };
}

export default function App() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [started, setStarted] = useState(preview.autoplay);
  const [introDone, setIntroDone] = useState(preview.autoplay);
  const [regenerating, setRegenerating] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIntroDone(true), MIN_INTRO_MS);
    load().then(setState);
    return () => clearTimeout(timer);
  }, []);

  const onSpice = useCallback(
    async (spice: SpiceLevel) => {
      if (state.phase !== "ready" || spice === state.input.spiceLevel) return;
      setRegenerating(true);
      const input = { ...state.input, spiceLevel: spice };
      setState({ ...state, input });
      const result = await generateCopy(input);
      if (state.id) await saveWrapped({ id: state.id, input, response: { copy: result.copy, source: result.source } });
      setState({ phase: "ready", id: state.id, input, result });
      setRegenerating(false);
    },
    [state]
  );

  const slides = useMemo(() => {
    if (state.phase !== "ready") return [];
    return buildSlides({
      input: state.input,
      copy: state.result.copy,
      offline: state.result.offline,
      spice: state.input.spiceLevel,
      regenerating,
      onReplay: () => setRestartKey((k) => k + 1),
      onSpice,
    });
  }, [state, regenerating, onSpice]);

  if (state.phase === "empty") return <Empty />;

  const ready = state.phase === "ready" && introDone;
  if (started && ready) {
    return (
      <Player
        slides={slides}
        isDemo={state.input.meta.isDemo}
        restartKey={restartKey}
        initialIndex={Math.min(preview.slide, slides.length - 1)}
        initialPaused={preview.paused}
      />
    );
  }
  return <Intro ready={ready} year={state.phase === "ready" ? state.input.meta.year : new Date().getFullYear()} onStart={() => setStarted(true)} />;
}

const LOADING_LINES = ["Rewinding your year", "Counting the ghosts", "Translating corporate speak", "Picking your anthem", "Writing your story"];

function Intro({ ready, year, onStart }: { ready: boolean; year: number; onStart: () => void }) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-10 overflow-hidden bg-[#050507] px-6 text-[#F5F5F0]">
      <motion.div
        className="pointer-events-none absolute aspect-square w-[min(120vw,900px)] rounded-full opacity-40 blur-3xl"
        style={{ background: "conic-gradient(#C6FF3D, #FF3D7F, #2D3BFF, #3DFFB5, #C6FF3D)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative text-center">
        <div className="font-sans text-sm font-semibold uppercase tracking-[0.3em] opacity-70">Job Hunt Wrapped</div>
        <div
          className="mt-2 font-display text-[clamp(7rem,30vw,16rem)] font-extrabold leading-[0.85] tracking-[-0.05em] [font-stretch:75%]"
          style={{ backgroundImage: "linear-gradient(100deg, #C6FF3D, #3DFFB5 45%, #FF3D7F)", WebkitBackgroundClip: "text", color: "transparent" }}
        >
          {year}
        </div>
      </div>
      <div className="relative h-16">
        <AnimatePresence mode="wait">
          {ready ? (
            <motion.button
              key="play"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              autoFocus
              className="flex items-center gap-3 rounded-full bg-[#C6FF3D] px-8 py-4 font-display text-xl font-extrabold text-[#0B0B10] shadow-[0_0_60px_rgba(198,255,61,0.45)]"
            >
              <Play className="h-5 w-5" fill="currentColor" /> Play your Wrapped
            </motion.button>
          ) : (
            <motion.div
              key={line}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="pt-4 font-sans text-lg font-medium opacity-80"
            >
              {LOADING_LINES[line]}…
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="absolute bottom-6 font-sans text-xs opacity-50">Tap to advance · hold to pause · arrow keys work too</p>
    </div>
  );
}

function Empty() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-[#050507] px-6 text-center text-[#F5F5F0]">
      <h1 className="font-display text-5xl font-extrabold tracking-tight">Nothing to play yet</h1>
      <p className="max-w-md font-sans text-lg opacity-75">Open Gmail and hit the “Play your Job Wrapped” button in the bottom-right corner.</p>
      <div className="flex gap-3">
        <a href="https://mail.google.com" className="rounded-full bg-[#C6FF3D] px-6 py-3 font-bold text-[#0B0B10]">
          Open Gmail
        </a>
        <a href="?demo=1" className="rounded-full bg-white/10 px-6 py-3 font-bold">
          Watch the demo
        </a>
      </div>
    </div>
  );
}
