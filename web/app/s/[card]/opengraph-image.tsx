import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cardPalette, decodeShare } from "@/lib/wrapped/share";

export const alt = "A Job Hunt Wrapped card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

export default async function Image({ params }: { params: Promise<{ card: string }> }) {
  const { card: token } = await params;
  const card = decodeShare(token);
  const [display, displayBold, body, bodyBold] = await Promise.all([
    font("bricolage-grotesque-latin-800-normal.woff"),
    font("bricolage-grotesque-latin-700-normal.woff"),
    font("inter-latin-500-normal.woff"),
    font("inter-latin-700-normal.woff"),
  ]);
  const fonts = [
    { name: "Bricolage", data: display, weight: 800 as const },
    { name: "Bricolage", data: displayBold, weight: 700 as const },
    { name: "Inter", data: body, weight: 500 as const },
    { name: "Inter", data: bodyBold, weight: 700 as const },
  ];

  if (!card) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#0B0B10", color: "#F5F5F0", fontFamily: "Bricolage", fontSize: 88, fontWeight: 800 }}>
          Job Hunt Wrapped
        </div>
      ),
      { ...size, fonts }
    );
  }

  const p = cardPalette(card.st, card.c);
  const stats = [
    ["Applications", card.s.apps.toLocaleString("en-US")],
    ["Interviews", card.s.int.toLocaleString("en-US")],
    ["Ghosted", `${card.s.ghost}%`],
    card.s.off > 0 ? ["Offers", card.s.off.toLocaleString("en-US")] : ["“Unfortunately”s", card.s.unf.toLocaleString("en-US")],
  ] as const;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: p.bg, color: p.fg, padding: 40, gap: 44, fontFamily: "Inter" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 520,
            borderRadius: 36,
            padding: 40,
            backgroundImage: p.art,
            color: p.artFg,
          }}
        >
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", background: p.pillBg, color: p.pillFg, borderRadius: 999, padding: "8px 16px", fontSize: 15, fontWeight: 700, letterSpacing: 1.2 }}>
              {card.r.toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontFamily: "Bricolage", fontWeight: 800, fontSize: card.a.length > 26 ? 56 : 66, lineHeight: 0.95, letterSpacing: -1.5 }}>{card.a}</div>
            <div style={{ display: "flex", fontFamily: "Bricolage", fontWeight: 700, fontSize: 26, lineHeight: 1.25, opacity: 0.92 }}>“{card.t}”</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingTop: 8, paddingBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 700, letterSpacing: 4 }}>
            <span>JOB HUNT WRAPPED</span>
            <span style={{ color: p.muted }}>{card.y}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", rowGap: 22 }}>
            {stats.map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", width: "50%" }}>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: 2.5, color: p.muted }}>{label.toUpperCase()}</span>
                <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 92, lineHeight: 1, letterSpacing: -3 }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 21, borderTop: `2px solid ${p.line}`, paddingTop: 20 }}>
            {card.co.length > 0 && (
              <div style={{ display: "flex" }}>
                <span style={{ color: p.muted, marginRight: 10 }}>Top companies</span>
                <span style={{ fontWeight: 700 }}>{card.co.slice(0, 4).join(" · ")}</span>
              </div>
            )}
            <div style={{ display: "flex" }}>
              <span style={{ color: p.muted, marginRight: 10 }}>Anthem</span>
              <span style={{ fontWeight: 700 }}>
                {card.m.t} · {card.m.a}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
