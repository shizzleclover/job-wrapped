import { toBlob } from "html-to-image";
import { hourLabel } from "../shared/fallback";
import { encodeShare } from "../shared/share";
import type { CardStyle, ShareCard, WrappedCopy, WrappedInput } from "../shared/schema";
import { SITE_URL } from "./api";

export type Platform = "x" | "linkedin" | "instagram" | "snapchat" | "whatsapp" | "facebook" | "threads" | "telegram";

const HEX = /^#[0-9a-f]{6}$/i;

export function toShareCard(input: WrappedInput, copy: WrappedCopy, style: CardStyle, hideCompanies: boolean): ShareCard {
  const m = input.metrics;
  const colors = copy.personality.auraColors.filter((c) => HEX.test(c));
  return {
    v: 1,
    y: input.meta.year,
    a: copy.personality.archetype.slice(0, 80),
    t: copy.personality.tagline.slice(0, 160),
    r: copy.personality.rarity.slice(0, 60),
    c: colors.length === 3 ? colors : ["#FF3D7F", "#7B5CFF", "#3DD9FF"],
    s: { apps: m.totals.applications, int: m.totals.interviews, ghost: m.rates.ghostRatePct, off: m.totals.offers, unf: m.totals.unfortunately },
    co: hideCompanies ? [] : m.companies.top.slice(0, 5).map((c) => c.name),
    p: m.platforms[0]?.name ?? null,
    h: m.time.peakHour === null ? null : hourLabel(m.time.peakHour),
    m: { t: copy.personality.themeSong.title.slice(0, 120), a: copy.personality.themeSong.artist.slice(0, 120) },
    st: style,
  };
}

export const shareUrl = (card: ShareCard) => `${SITE_URL}/s/${encodeShare(card)}`;

export const shareText = (card: ShareCard) =>
  `My ${card.y} Job Hunt Wrapped: I'm "${card.a}". ${card.s.apps} applications, ${card.s.int} interviews, ${card.s.ghost}% ghosted. What's yours?`;

const enc = encodeURIComponent;

/** Where each platform's composer lives. Instagram has no web composer, so it gets the saved image instead. */
export function composerUrl(platform: Platform, url: string, text: string): string {
  switch (platform) {
    case "x":
      return `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`;
    case "linkedin":
      return `https://www.linkedin.com/feed/?shareActive=true&text=${enc(`${text}\n\n${url}`)}`;
    case "threads":
      return `https://www.threads.net/intent/post?text=${enc(`${text} ${url}`)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
    case "whatsapp":
      return `https://wa.me/?text=${enc(`${text} ${url}`)}`;
    case "telegram":
      return `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`;
    case "snapchat":
      return `https://www.snapchat.com/scan?attachmentUrl=${enc(url)}`;
    case "instagram":
      return "https://www.instagram.com/";
  }
}

export function renderCard(el: HTMLElement): Promise<Blob> {
  return toBlob(el, { pixelRatio: 1080 / el.offsetWidth, cacheBust: true }).then((blob) => {
    if (!blob) throw new Error("Could not render the card");
    return blob;
  });
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Starts the clipboard write inside the click, so it keeps the user gesture while the image renders. */
export function copyImage(blob: Promise<Blob>): Promise<void> {
  return navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
