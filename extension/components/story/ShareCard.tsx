import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { Check, Copy, Download, Loader2, RotateCcw } from "lucide-react";
import type { SpiceLevel } from "../../shared/schema";
import { hourLabel } from "../../shared/fallback";
import type { SlideContext } from "./slides";
import { auraOf, inkOn } from "./themes";

const SPICES: Array<{ id: SpiceLevel; label: string }> = [
  { id: "linkedin_safe", label: "Safe" },
  { id: "crispy", label: "Crispy" },
  { id: "unhinged", label: "Unhinged" },
];

export function SummarySlide({ input, copy, offline, spice, regenerating, onReplay, onSpice }: SlideContext) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const m = input.metrics;
  const [a1, a2, a3] = auraOf(copy.personality.auraColors);

  const download = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 1080 / cardRef.current.offsetWidth, cacheBust: true });
      const link = document.createElement("a");
      link.download = `job-hunt-wrapped-${input.meta.year}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error("Failed to export image:", err);
    } finally {
      setSaving(false);
    }
  };

  const copyText = async () => {
    const lines = [
      `My ${input.meta.year} Job Hunt Wrapped`,
      `${copy.personality.archetype}: "${copy.personality.tagline}"`,
      `${m.totals.applications} applications · ${m.totals.interviews} interviews${m.totals.offers ? ` · ${m.totals.offers} offer${m.totals.offers > 1 ? "s" : ""}` : ""}`,
      `${m.rates.ghostRatePct}% ghosted · ${m.totals.unfortunately}× "unfortunately"`,
      `Anthem: ${copy.personality.themeSong.title} by ${copy.personality.themeSong.artist}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const stats = [
    { label: "Applications", value: m.totals.applications.toLocaleString("en-US") },
    { label: "Interviews", value: m.totals.interviews.toLocaleString("en-US") },
    { label: "Ghosted", value: `${m.rates.ghostRatePct}%` },
    { label: m.totals.offers ? "Offers" : "Unfortunatelys", value: (m.totals.offers || m.totals.unfortunately).toLocaleString("en-US") },
  ];

  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center gap-[3.5cqw] px-[6cqw] pb-[8cqw] pt-[17cqw]">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        className="w-[min(70cqw,calc((100cqh-58cqw)*9/16))]"
      >
        <div
          ref={cardRef}
          className="relative aspect-[9/16] w-full overflow-hidden rounded-[5cqw] bg-[#0B0B10] text-[#F5F5F0] [container-type:inline-size]"
          style={{ backgroundImage: `radial-gradient(circle at 100% 0%, ${a1}66, transparent 55%), radial-gradient(circle at 0% 100%, ${a2}55, transparent 55%)` }}
        >
          <div className="flex h-full flex-col justify-between p-[7cqw]">
            <div className="flex items-center justify-between font-sans text-[3.6cqw] font-bold uppercase tracking-[0.16em]">
              <span>Job Hunt Wrapped</span>
              <span className="opacity-60">{input.meta.year}</span>
            </div>

            <div>
              <span className="inline-block rounded-full px-[3cqw] py-[1cqw] font-sans text-[3.2cqw] font-extrabold uppercase tracking-[0.12em]" style={{ background: a1, color: inkOn(a1) }}>
                {copy.personality.rarity}
              </span>
              <div className="mt-[3cqw] font-display text-[11cqw] font-extrabold leading-[0.92] tracking-[-0.03em]">{copy.personality.archetype}</div>
              <div className="mt-[2.5cqw] font-display text-[4.6cqw] font-semibold italic leading-snug" style={{ color: a3 }}>
                “{copy.personality.tagline}”
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-[5cqw] gap-y-[5cqw]">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-sans text-[3.2cqw] font-semibold uppercase tracking-[0.12em] opacity-60">{s.label}</div>
                  <div className="font-display text-[13cqw] font-extrabold leading-none tracking-[-0.04em] [font-stretch:75%]">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-x-[5cqw]">
              <div>
                <div className="font-sans text-[3.2cqw] font-semibold uppercase tracking-[0.12em] opacity-60">Top companies</div>
                <ol className="mt-[1.5cqw] space-y-[0.6cqw] font-display text-[4.6cqw] font-bold leading-tight">
                  {m.companies.top.slice(0, 5).map((c, i) => (
                    <li key={c.name} className="truncate">
                      <span className="mr-[1.5cqw] opacity-50">{i + 1}</span>
                      {c.name}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="space-y-[3cqw]">
                {m.platforms[0] && <Mini label="Top platform" value={m.platforms[0].name} />}
                {m.time.peakHour !== null && <Mini label="Peak hour" value={hourLabel(m.time.peakHour)} />}
                <Mini label="Anthem" value={copy.personality.themeSong.title} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex w-[74cqw] flex-col gap-[2.2cqw]" data-interactive>
        <div className="grid grid-cols-[1fr_auto_auto] gap-[2cqw]">
          <button
            onClick={download}
            disabled={saving}
            className="flex items-center justify-center gap-[2cqw] rounded-full bg-[#C6FF3D] px-[4cqw] py-[3.2cqw] font-sans text-[3.8cqw] font-bold text-[#0B0B10] transition hover:brightness-95 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-[4.4cqw] w-[4.4cqw] animate-spin" /> : <Download className="h-[4.4cqw] w-[4.4cqw]" />}
            {saving ? "Saving…" : "Save image"}
          </button>
          <IconButton label={copied ? "Copied" : "Copy summary text"} onClick={copyText}>
            {copied ? <Check className="h-[4.4cqw] w-[4.4cqw]" /> : <Copy className="h-[4.4cqw] w-[4.4cqw]" />}
          </IconButton>
          <IconButton label="Replay from the start" onClick={onReplay}>
            <RotateCcw className="h-[4.4cqw] w-[4.4cqw]" />
          </IconButton>
        </div>
        <div className="flex items-center justify-between gap-[2cqw] rounded-full bg-white/8 p-[1cqw]">
          {SPICES.map((s) => (
            <button
              key={s.id}
              onClick={() => onSpice(s.id)}
              disabled={regenerating}
              className={`flex-1 rounded-full py-[2cqw] font-sans text-[3.3cqw] font-semibold transition ${
                spice === s.id ? "bg-[#F5F5F0] text-[#0B0B10]" : "text-[#F5F5F0]/70 hover:text-[#F5F5F0]"
              }`}
            >
              {regenerating && spice === s.id ? "Writing…" : s.label}
            </button>
          ))}
        </div>
        <p className="text-center font-sans text-[2.9cqw] text-[#F5F5F0]/55">
          {input.meta.isDemo
            ? "Demo data. Open Gmail to play your own."
            : offline
            ? "AI writer offline. Copy written from your stats."
            : copy.signoff}
        </p>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-sans text-[3.2cqw] font-semibold uppercase tracking-[0.12em] opacity-60">{label}</div>
      <div className="truncate font-display text-[4.6cqw] font-bold leading-tight">{value}</div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex aspect-square items-center justify-center rounded-full bg-white/10 p-[3.2cqw] text-[#F5F5F0] transition hover:bg-white/20"
    >
      {children}
    </button>
  );
}
