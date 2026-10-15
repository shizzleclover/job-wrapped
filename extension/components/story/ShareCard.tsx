import { forwardRef, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, EyeOff, Link2, Loader2, RotateCcw, Share2, X as Close } from "lucide-react";
import { siFacebook, siInstagram, siSnapchat, siTelegram, siThreads, siWhatsapp, siX } from "simple-icons";
import type { CardStyle, ShareCard, SpiceLevel } from "../../shared/schema";
import { cardPalette } from "../../shared/share";
import { SITE_URL } from "../../lib/api";
import { composerUrl, copyImage, download, renderCard, shareText, shareUrl, toShareCard, type Platform } from "../../lib/share";
import type { SlideContext } from "./slides";

const SPICES: Array<{ id: SpiceLevel; label: string }> = [
  { id: "linkedin_safe", label: "Safe" },
  { id: "crispy", label: "Crispy" },
  { id: "unhinged", label: "Unhinged" },
];

const STYLES: Array<{ id: CardStyle; label: string }> = [
  { id: "aura", label: "Aura" },
  { id: "bold", label: "Bold" },
  { id: "paper", label: "Paper" },
];

const pref = {
  get: (key: string) => {
    try {
      return localStorage.getItem(`jw:${key}`);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(`jw:${key}`, value);
    } catch {
      /* private mode: preference just isn't remembered */
    }
  },
};

export function SummarySlide({ input, copy, offline, spice, regenerating, onReplay, onSpice }: SlideContext) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CardStyle>(() => (STYLES.some((s) => s.id === pref.get("style")) ? (pref.get("style") as CardStyle) : "aura"));
  const [hideCompanies, setHideCompanies] = useState(() => pref.get("hideCompanies") === "1");
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const card = useMemo(() => toShareCard(input, copy, style, hideCompanies), [input, copy, style, hideCompanies]);

  useEffect(() => pref.set("style", style), [style]);
  useEffect(() => pref.set("hideCompanies", hideCompanies ? "1" : "0"), [hideCompanies]);

  const render = () => renderCard(cardRef.current!);
  const save = async () => {
    setSaving(true);
    try {
      download(await render(), `job-hunt-wrapped-${input.meta.year}.png`);
    } catch (err) {
      console.error("Failed to export image:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center gap-[3cqw] px-[6cqw] pb-[7cqw] pt-[16cqw]">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        className="w-[min(64cqw,calc((100cqh-74cqw)*9/16))]"
      >
        <StoryCard ref={cardRef} card={card} />
      </motion.div>

      <div className="flex w-[80cqw] flex-col gap-[2.2cqw]" data-interactive>
        <div className="grid grid-cols-[1fr_auto_auto] gap-[2cqw]">
          <button
            onClick={() => setSheet(true)}
            className="flex items-center justify-center gap-[2cqw] rounded-full bg-[#C6FF3D] px-[4cqw] py-[3.2cqw] font-sans text-[3.8cqw] font-bold text-[#0B0B10] transition hover:brightness-95"
          >
            <Share2 className="h-[4.4cqw] w-[4.4cqw]" /> Share
          </button>
          <IconButton label={saving ? "Saving image" : "Save image"} onClick={save}>
            {saving ? <Loader2 className="h-[4.4cqw] w-[4.4cqw] animate-spin" /> : <Download className="h-[4.4cqw] w-[4.4cqw]" />}
          </IconButton>
          <IconButton label="Replay from the start" onClick={onReplay}>
            <RotateCcw className="h-[4.4cqw] w-[4.4cqw]" />
          </IconButton>
        </div>

        <div className="flex items-center justify-between gap-[2cqw]">
          <div className="flex items-center gap-[1.6cqw]" role="radiogroup" aria-label="Card style">
            {STYLES.map((s) => {
              const p = cardPalette(s.id, card.c);
              return (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={style === s.id}
                  aria-label={`${s.label} style`}
                  title={s.label}
                  onClick={() => setStyle(s.id)}
                  className={`h-[7cqw] w-[7cqw] rounded-full border-2 transition ${style === s.id ? "scale-110 border-[#F5F5F0]" : "border-white/20"}`}
                  style={{ background: s.id === "aura" ? p.art : p.bg }}
                />
              );
            })}
          </div>
          <button
            onClick={() => setHideCompanies((h) => !h)}
            aria-pressed={hideCompanies}
            className={`flex items-center gap-[1.5cqw] rounded-full px-[3cqw] py-[1.8cqw] font-sans text-[3cqw] font-semibold transition ${
              hideCompanies ? "bg-[#F5F5F0] text-[#0B0B10]" : "bg-white/10 text-[#F5F5F0]/80 hover:text-[#F5F5F0]"
            }`}
          >
            <EyeOff className="h-[3.4cqw] w-[3.4cqw]" /> Hide companies
          </button>
        </div>

        <div className="flex items-center justify-between gap-[2cqw] rounded-full bg-white/8 p-[1cqw]">
          {SPICES.map((s) => (
            <button
              key={s.id}
              onClick={() => onSpice(s.id)}
              disabled={regenerating}
              className={`flex-1 rounded-full py-[1.8cqw] font-sans text-[3.2cqw] font-semibold transition ${
                spice === s.id ? "bg-[#F5F5F0] text-[#0B0B10]" : "text-[#F5F5F0]/70 hover:text-[#F5F5F0]"
              }`}
            >
              {regenerating && spice === s.id ? "Writing…" : s.label}
            </button>
          ))}
        </div>
        <p className="text-center font-sans text-[2.8cqw] text-[#F5F5F0]/55">
          {input.meta.isDemo ? "Demo data. Open Gmail to play your own." : offline ? "AI writer offline. Copy written from your stats." : copy.signoff}
        </p>
      </div>

      <AnimatePresence>{sheet && <ShareSheet card={card} render={render} onClose={() => setSheet(false)} />}</AnimatePresence>
    </div>
  );
}

/** The 9:16 card. Sized in its own container units so the exported PNG matches what's on screen. */
export const StoryCard = forwardRef<HTMLDivElement, { card: ShareCard }>(function StoryCard({ card }, ref) {
  const p = cardPalette(card.st, card.c);
  const stats = [
    ["Applications", card.s.apps.toLocaleString("en-US")],
    ["Interviews", card.s.int.toLocaleString("en-US")],
    ["Ghosted", `${card.s.ghost}%`],
    card.s.off > 0 ? ["Offers", card.s.off.toLocaleString("en-US")] : ["Unfortunatelys", card.s.unf.toLocaleString("en-US")],
  ];
  const details = [card.p && ["Top platform", card.p], card.h && ["Peak hour", card.h], ["Anthem", card.m.t]].filter((d): d is string[] => !!d);

  return (
    <div ref={ref} className="relative aspect-[9/16] w-full overflow-hidden rounded-[5cqw] [container-type:inline-size]" style={{ background: p.bg, color: p.fg }}>
      <div className="flex h-full flex-col justify-between gap-[4cqw] p-[6cqw]">
        <div className="flex items-center justify-between font-sans text-[3.3cqw] font-bold uppercase tracking-[0.18em]">
          <span>Job Hunt Wrapped</span>
          <span style={{ color: p.muted }}>{card.y}</span>
        </div>

        <div className="relative flex aspect-[1/0.92] flex-col justify-between overflow-hidden rounded-[4.5cqw] p-[6cqw]" style={{ background: p.art, color: p.artFg }}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
            style={{ backgroundImage: "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 7px)" }}
          />
          <span
            className="relative self-start rounded-full px-[3cqw] py-[1.2cqw] font-sans text-[2.8cqw] font-extrabold uppercase tracking-[0.1em]"
            style={{ background: p.pillBg, color: p.pillFg }}
          >
            {card.r}
          </span>
          <div className="relative">
            <div className="font-display text-[11.5cqw] font-extrabold leading-[0.9] tracking-[-0.035em]">{card.a}</div>
            <div className="mt-[2.5cqw] font-display text-[4.4cqw] font-semibold italic leading-snug opacity-90">“{card.t}”</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-[5cqw] gap-y-[3.5cqw]">
          {stats.map(([label, value]) => (
            <div key={label}>
              <div className="font-sans text-[3cqw] font-semibold uppercase tracking-[0.12em]" style={{ color: p.muted }}>
                {label}
              </div>
              <div className="font-display text-[14cqw] font-extrabold leading-[0.95] tracking-[-0.02em] [font-stretch:75%]">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-[5cqw] border-t pt-[4cqw]" style={{ borderColor: p.line }}>
          {card.co.length > 0 ? (
            <div>
              <div className="font-sans text-[3cqw] font-semibold uppercase tracking-[0.12em]" style={{ color: p.muted }}>
                Top companies
              </div>
              <ol className="mt-[1.5cqw] space-y-[0.4cqw] font-display text-[4.4cqw] font-bold leading-tight">
                {card.co.map((c, i) => (
                  <li key={c} className="truncate">
                    <span className="mr-[1.5cqw]" style={{ color: p.muted }}>
                      {i + 1}
                    </span>
                    {c}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <Mini label="Anthem by" value={card.m.a} muted={p.muted} />
          )}
          <div className="space-y-[2.5cqw]">
            {details.map(([label, value]) => (
              <Mini key={label} label={label!} value={value!} muted={p.muted} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between font-sans text-[2.8cqw] font-semibold" style={{ color: p.muted }}>
          <span>{new URL(SITE_URL).host}</span>
          <span>Get your own Wrapped</span>
        </div>
      </div>
    </div>
  );
});

function Mini({ label, value, muted }: { label: string; value: string; muted: string }) {
  return (
    <div className="min-w-0">
      <div className="font-sans text-[3cqw] font-semibold uppercase tracking-[0.12em]" style={{ color: muted }}>
        {label}
      </div>
      <div className="truncate font-display text-[4.4cqw] font-bold leading-tight">{value}</div>
    </div>
  );
}

const PLATFORMS: Array<{ id: Platform; label: string; bg: string; fg: string; icon: ReactNode }> = [
  { id: "instagram", label: "Instagram", bg: "linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)", fg: "#fff", icon: <Brand path={siInstagram.path} /> },
  { id: "x", label: "X", bg: "#000", fg: "#fff", icon: <Brand path={siX.path} /> },
  { id: "linkedin", label: "LinkedIn", bg: "#0A66C2", fg: "#fff", icon: <span className="font-sans text-[5.4cqw] font-extrabold leading-none tracking-[-0.06em]">in</span> },
  { id: "snapchat", label: "Snapchat", bg: "#FFFC00", fg: "#000", icon: <Brand path={siSnapchat.path} /> },
  { id: "whatsapp", label: "WhatsApp", bg: "#25D366", fg: "#fff", icon: <Brand path={siWhatsapp.path} /> },
  { id: "facebook", label: "Facebook", bg: "#0866FF", fg: "#fff", icon: <Brand path={siFacebook.path} /> },
  { id: "threads", label: "Threads", bg: "#000", fg: "#fff", icon: <Brand path={siThreads.path} /> },
  { id: "telegram", label: "Telegram", bg: "#26A5E4", fg: "#fff", icon: <Brand path={siTelegram.path} /> },
];

const NOTES: Partial<Record<Platform, string>> = {
  x: "Card copied. Paste it into your post with ⌘V.",
  linkedin: "Card copied. Paste it into your post with ⌘V.",
  threads: "Card copied. Paste it into your post with ⌘V.",
  instagram: "Story image saved and caption copied. Add it to your story from Instagram.",
  snapchat: "Story image saved. Snapchat also gets your share link.",
};

function ShareSheet({ card, render, onClose }: { card: ShareCard; render: () => Promise<Blob>; onClose: () => void }) {
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = shareUrl(card);
  const text = shareText(card);
  const canNativeShare = typeof navigator.share === "function";
  const filename = `job-hunt-wrapped-${card.y}.png`;

  const go = (platform: Platform) => {
    // Open first, synchronously, so the popup blocker treats it as a click.
    window.open(composerUrl(platform, url, text), "_blank", "noopener");
    const image = render();
    if (platform === "x" || platform === "linkedin" || platform === "threads") copyImage(image).catch(() => setNote("Couldn't copy the card. Use Save image instead."));
    if (platform === "instagram") {
      navigator.clipboard.writeText(`${text} ${url}`).catch(() => {});
      image.then((b) => download(b, filename));
    }
    if (platform === "snapchat") image.then((b) => download(b, filename));
    setNote(NOTES[platform] ?? "Opened in a new tab.");
  };

  const nativeShare = async () => {
    try {
      const file = new File([await render()], filename, { type: "image/png" });
      const data = navigator.canShare?.({ files: [file] }) ? { files: [file], text, url } : { text, url };
      await navigator.share(data);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setNote("Sharing isn't available here. Try a platform above.");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div className="absolute inset-0 z-30 flex items-end bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} data-interactive>
      <motion.div
        className="w-full rounded-t-[7cqw] bg-[#15151C] px-[6cqw] pb-[8cqw] pt-[5cqw] text-[#F5F5F0]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[6.5cqw] font-extrabold tracking-tight">Share your Wrapped</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-white/10 p-[2cqw] hover:bg-white/20">
            <Close className="h-[4.4cqw] w-[4.4cqw]" />
          </button>
        </div>

        <div className="mt-[5cqw] grid grid-cols-4 gap-y-[5cqw]">
          {PLATFORMS.map((p) => (
            <button key={p.id} onClick={() => go(p.id)} aria-label={`Share to ${p.label}`} className="group flex flex-col items-center gap-[1.8cqw]">
              <span aria-hidden className="flex h-[14cqw] w-[14cqw] items-center justify-center rounded-full transition group-hover:scale-105" style={{ background: p.bg, color: p.fg }}>
                {p.icon}
              </span>
              <span className="font-sans text-[2.9cqw] font-medium text-[#F5F5F0]/80">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-[6cqw] grid grid-cols-2 gap-[2.5cqw]">
          <button onClick={copyLink} className="flex items-center justify-center gap-[2cqw] rounded-full bg-white/10 py-[3cqw] font-sans text-[3.5cqw] font-semibold hover:bg-white/15">
            {copied ? <Check className="h-[4cqw] w-[4cqw]" /> : <Link2 className="h-[4cqw] w-[4cqw]" />}
            {copied ? "Link copied" : "Copy link"}
          </button>
          {canNativeShare && (
            <button onClick={nativeShare} className="flex items-center justify-center gap-[2cqw] rounded-full bg-white/10 py-[3cqw] font-sans text-[3.5cqw] font-semibold hover:bg-white/15">
              <Share2 className="h-[4cqw] w-[4cqw]" /> More apps
            </button>
          )}
        </div>

        <p className="mt-[4cqw] min-h-[4cqw] text-center font-sans text-[3cqw] text-[#F5F5F0]/60" aria-live="polite">
          {note ?? "Links show a preview of your card. Your share link only contains what's on the card."}
        </p>
      </motion.div>
    </motion.div>
  );
}

function Brand({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[6cqw] w-[6cqw]" fill="currentColor" aria-hidden>
      <path d={path} />
    </svg>
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
