export interface Theme {
  bg: string;
  fg: string;
  /** Decorative shape colors. Text never uses these; it stays on fg. */
  a: string;
  b: string;
}

export const THEMES = {
  ink: { bg: "#0B0B10", fg: "#F5F5F0", a: "#C6FF3D", b: "#FF3D7F" },
  lime: { bg: "#C6FF3D", fg: "#0B0B10", a: "#2D3BFF", b: "#FF3D7F" },
  cobalt: { bg: "#2D3BFF", fg: "#FFFFFF", a: "#C6FF3D", b: "#FF9ECF" },
  tangerine: { bg: "#FF6B1A", fg: "#1A0700", a: "#FFF1E0", b: "#2D3BFF" },
  midnight: { bg: "#14093A", fg: "#F5F0FF", a: "#FF3D7F", b: "#3DD9FF" },
  butter: { bg: "#FFE14D", fg: "#1A1400", a: "#FF3D7F", b: "#2D3BFF" },
  hotpink: { bg: "#FF3D7F", fg: "#1A0010", a: "#FFE14D", b: "#14093A" },
  mint: { bg: "#3DFFB5", fg: "#00261A", a: "#2D3BFF", b: "#FF3D7F" },
  ghost: { bg: "#0E1B2B", fg: "#EAF6FF", a: "#3DD9FF", b: "#B79CFF" },
  crimson: { bg: "#E0002E", fg: "#FFF5F5", a: "#FFE14D", b: "#0B0B10" },
  paper: { bg: "#F5F0E6", fg: "#0B0B10", a: "#FF3D7F", b: "#2D3BFF" },
  violet: { bg: "#7B5CFF", fg: "#FFFFFF", a: "#C6FF3D", b: "#FFE14D" },
  black: { bg: "#000000", fg: "#FFFFFF", a: "#FFFFFF", b: "#FFFFFF" },
  plum: { bg: "#1A0B2E", fg: "#FFFFFF", a: "#FF3D7F", b: "#7B5CFF" },
  sky: { bg: "#3DD9FF", fg: "#001A26", a: "#FF3D7F", b: "#2D3BFF" },
  bubblegum: { bg: "#FF9ECF", fg: "#1A0010", a: "#2D3BFF", b: "#FFE14D" },
} satisfies Record<string, Theme>;

export const withAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0")}`;

/** Always three colors, whatever the AI returned. */
export const auraOf = (colors: string[]): [string, string, string] => [colors[0] ?? "#FF3D7F", colors[1] ?? "#7B5CFF", colors[2] ?? "#3DD9FF"];

/** Black or white, whichever reads better on the given background. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return lum > 0.4 ? "#0B0B10" : "#FFFFFF";
}
