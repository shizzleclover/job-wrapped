// GENERATED from extension/shared/share.ts by `npm run sync-shared`. Edit that file instead.
// Share links carry the card in the URL itself, so the server never stores anything.
import { ShareCardSchema, type ShareCard } from "./schema";

export function encodeShare(card: ShareCard): string {
  const bytes = new TextEncoder().encode(JSON.stringify(card));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(token: string): ShareCard | null {
  try {
    if (token.length > 2000) return null;
    const bin = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const parsed = ShareCardSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.4 ? "#0B0B10" : "#FFFFFF";
}

export interface CardPalette {
  bg: string;
  fg: string;
  /** fg at reduced emphasis, as a hex with alpha */
  muted: string;
  line: string;
  /** The art panel: a mesh of the three aura colors */
  art: string;
  artFg: string;
  pillBg: string;
  pillFg: string;
}

/** One palette for the story card and the link preview, so they always match. */
export function cardPalette(style: ShareCard["st"], colors: string[]): CardPalette {
  const [c1 = "#FF3D7F", c2 = "#7B5CFF", c3 = "#3DD9FF"] = colors;
  const art = `radial-gradient(circle at 18% 22%, ${c1} 0%, transparent 55%), radial-gradient(circle at 85% 30%, ${c2} 0%, transparent 55%), radial-gradient(circle at 50% 95%, ${c3} 0%, transparent 60%), #0B0B10`;
  if (style === "bold") {
    const fg = inkOn(c1);
    return { bg: c1, fg, muted: `${fg}A6`, line: `${fg}33`, art, artFg: "#FFFFFF", pillBg: "#0B0B10", pillFg: "#FFFFFF" };
  }
  if (style === "paper") {
    return { bg: "#F5F0E6", fg: "#0B0B10", muted: "#0B0B10A6", line: "#0B0B1026", art, artFg: "#FFFFFF", pillBg: c1, pillFg: inkOn(c1) };
  }
  return { bg: "#0B0B10", fg: "#F5F5F0", muted: "#F5F5F0A6", line: "#F5F5F026", art, artFg: "#FFFFFF", pillBg: c1, pillFg: inkOn(c1) };
}
