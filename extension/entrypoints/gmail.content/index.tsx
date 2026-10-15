import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { ArrowRight, Check, Loader2, Lock, Sparkles, X } from "lucide-react";
import type { SpiceLevel } from "../../shared/schema";
import { buildDemoInput, buildInput } from "../../lib/input";
import { saveWrapped } from "../../lib/storage";
import { scanGmail, type ScanProgress } from "./scraper";
import "./style.css";

const MIN_EMAILS = 5;

const SPICES: Array<{ id: SpiceLevel; title: string; desc: string; heat: number }> = [
  { id: "linkedin_safe", title: "LinkedIn Safe", desc: "Wholesome and recruiter-approved", heat: 1 },
  { id: "crispy", title: "Crispy", desc: "Classic Wrapped energy, light roast", heat: 2 },
  { id: "unhinged", title: "Unhinged", desc: "No mercy. Built for the group chat", heat: 3 },
];

type Status =
  | { step: "idle" }
  | { step: "setup" }
  | { step: "scanning"; progress: ScanProgress }
  | { step: "few"; found: number }
  | { step: "done" };

async function openStory(id: string) {
  await browser.runtime.sendMessage({ type: "open-wrapped", id });
}

function GmailOverlayApp() {
  const [status, setStatus] = useState<Status>({ step: "idle" });
  const [spice, setSpice] = useState<SpiceLevel>("crispy");
  const [shareSnippets, setShareSnippets] = useState(true);
  const [includeSent, setIncludeSent] = useState(true);
  const [lastId, setLastId] = useState<string | null>(null);

  const play = async (input: ReturnType<typeof buildInput>) => {
    const id = crypto.randomUUID();
    await saveWrapped({ id, input });
    setLastId(id);
    await openStory(id);
    setStatus({ step: "done" });
  };

  const start = async () => {
    setStatus({ step: "scanning", progress: { label: "Warming up", pct: 0, found: { APPLIED: 0, REJECTED: 0, INTERVIEW: 0, OFFER: 0, SENT: 0 } } });
    try {
      const scan = await scanGmail((progress) => setStatus({ step: "scanning", progress }), { includeSent });
      if (scan.emails.length < MIN_EMAILS) return setStatus({ step: "few", found: scan.emails.length });
      await play(
        buildInput(scan.emails, {
          spiceLevel: spice,
          shareSnippets,
          isDemo: false,
          threads: scan.threads,
          truncated: scan.truncated,
          outbox: scan.sent ? { sent: scan.sent, checks: scan.replyChecks } : null,
        })
      );
    } catch (err) {
      console.error("[job-wrapped]", err);
      setStatus({ step: "setup" });
    }
  };

  return (
    <div className="jw fixed bottom-6 right-6 z-[2147483000] text-[#F5F5F0]">
      {status.step === "idle" && (
        <button
          onClick={() => setStatus({ step: "setup" })}
          className="flex cursor-pointer items-center gap-2.5 rounded-full border-2 border-[#C6FF3D] bg-[#0B0B10] py-3 pl-4 pr-5 text-sm font-bold transition hover:bg-[#16161d]"
          style={{ boxShadow: "0 0 32px rgba(198,255,61,0.35)" }}
        >
          <Sparkles className="h-5 w-5 text-[#C6FF3D]" />
          Play your Job Wrapped
        </button>
      )}

      {status.step !== "idle" && (
        <div className="w-[340px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0B10]" style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center justify-between px-5 pt-5">
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C6FF3D]">
              <Sparkles className="h-4 w-4" /> Job Hunt Wrapped
            </span>
            {status.step !== "scanning" && (
              <button onClick={() => setStatus({ step: "idle" })} aria-label="Close" className="cursor-pointer rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {status.step === "setup" && (
            <div className="space-y-4 p-5">
              <div>
                <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">How spicy should it be?</h2>
                <p className="mt-1 text-[13px] text-white/60">You can switch tones at the end, too.</p>
              </div>
              <div className="space-y-2">
                {SPICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSpice(s.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      spice === s.id ? "border-[#C6FF3D] bg-[#C6FF3D]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="w-11 shrink-0 text-center text-[15px] tracking-[-0.2em]">{"🌶️".repeat(s.heat)}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold">{s.title}</span>
                      <span className="block text-xs text-white/55">{s.desc}</span>
                    </span>
                    {spice === s.id && <Check className="h-4 w-4 text-[#C6FF3D]" />}
                  </button>
                ))}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/[0.04] p-3">
                <input type="checkbox" checked={includeSent} onChange={(e) => setIncludeSent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#C6FF3D]" />
                <span className="text-xs leading-relaxed text-white/70">
                  <span className="block font-semibold text-white">Include emails I sent</span>
                  Cold outreach, cover letters and follow-ups, plus who wrote back. Only counts and company names are used, never what you wrote.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/[0.04] p-3">
                <input type="checkbox" checked={shareSnippets} onChange={(e) => setShareSnippets(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#C6FF3D]" />
                <span className="text-xs leading-relaxed text-white/70">
                  <span className="block font-semibold text-white">Let the AI read a few email previews</span>
                  Sharper jokes. Up to 36 subject lines and previews from emails companies sent you go to the AI writer. Off: only your stats, company and role names.
                </span>
              </label>

              <button
                onClick={start}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#C6FF3D] py-3.5 text-sm font-extrabold text-[#0B0B10] transition hover:brightness-95"
              >
                Scan my inbox <ArrowRight className="h-4 w-4" />
              </button>
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                We run a few Gmail searches in this tab and do all the counting in your browser. Only the results above go to the AI writer, and nothing is saved on a server.
              </p>
            </div>
          )}

          {status.step === "scanning" && <Scanning progress={status.progress} />}

          {status.step === "few" && (
            <div className="space-y-4 p-5">
              <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">
                We only found {status.found} job {status.found === 1 ? "email" : "emails"}
              </h2>
              <p className="text-[13px] text-white/60">That's not enough for a proper story. Want to see what it looks like with a demo inbox?</p>
              <button
                onClick={() => play(buildDemoInput(spice))}
                className="w-full cursor-pointer rounded-full bg-[#C6FF3D] py-3.5 text-sm font-extrabold text-[#0B0B10]"
              >
                Watch the demo
              </button>
              <button onClick={() => setStatus({ step: "setup" })} className="w-full cursor-pointer rounded-full bg-white/10 py-3 text-sm font-bold">
                Back
              </button>
            </div>
          )}

          {status.step === "done" && (
            <div className="space-y-4 p-5">
              <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">Your Wrapped is ready</h2>
              <p className="text-[13px] text-white/60">It opened in a new tab. Turn your sound off and your confidence up.</p>
              {lastId && (
                <button onClick={() => openStory(lastId)} className="w-full cursor-pointer rounded-full bg-[#C6FF3D] py-3.5 text-sm font-extrabold text-[#0B0B10]">
                  Open it again
                </button>
              )}
              <button onClick={() => setStatus({ step: "setup" })} className="w-full cursor-pointer rounded-full bg-white/10 py-3 text-sm font-bold">
                Scan again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Scanning({ progress }: { progress: ScanProgress }) {
  const stats: Array<[string, number]> = [
    ["Applied", progress.found.APPLIED],
    ["Rejected", progress.found.REJECTED],
    ["Interviews", progress.found.INTERVIEW],
    ["You sent", progress.found.SENT],
  ];
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#C6FF3D]" />
        <span className="text-[15px] font-bold">{progress.label}…</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#C6FF3D] transition-all duration-500" style={{ width: `${Math.max(4, progress.pct)}%` }} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl bg-white/[0.05] px-2 py-3 text-center">
            <Ticker value={n} />
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-white/45">Gmail will flick through a few searches. Hang tight, this takes about 30 to 60 seconds.</p>
    </div>
  );
}

function Ticker({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (shown === value) return;
    const t = setTimeout(() => setShown((s) => s + Math.max(1, Math.ceil((value - s) / 6))), 40);
    return () => clearTimeout(t);
  }, [shown, value]);
  return <div className="text-2xl font-extrabold tabular-nums leading-none">{Math.min(shown, value)}</div>;
}

/**
 * Tailwind v4 registers its CSS variables with @property, which is ignored inside shadow roots.
 * Re-declare those rules on the page so utilities like rings and transforms keep working.
 */
function hoistPropertyRules(shadow: ShadowRoot) {
  const css = Array.from(shadow.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n");
  const rules = css.match(/@property\s+--tw-[\w-]+\s*\{[^}]*\}/g);
  if (!rules?.length || document.getElementById("job-wrapped-properties")) return;
  const style = document.createElement("style");
  style.id = "job-wrapped-properties";
  style.textContent = rules.join("\n");
  document.head.append(style);
}

export default defineContentScript({
  matches: ["*://mail.google.com/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "job-wrapped-overlay",
      position: "inline",
      anchor: "body",
      onMount: (container, shadow) => {
        hoistPropertyRules(shadow);
        const root = ReactDOM.createRoot(container);
        root.render(<GmailOverlayApp />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount();
  },
});
