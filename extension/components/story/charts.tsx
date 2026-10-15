import { motion } from "framer-motion";
import { hourLabel } from "../../shared/fallback";
import { withAlpha } from "./themes";

const EASE = [0.16, 1, 0.3, 1] as const;

// Single-series charts: marks use fg (recessive) with one highlighted mark; all text stays on fg.

export function MonthBars({
  data,
  fg,
  highlight,
  delay = 0.4,
}: {
  data: Array<{ key: string; label: string; count: number }>;
  fg: string;
  highlight: string | null;
  delay?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-[48cqw] items-end gap-[1.2cqw]" role="img" aria-label={`Applications per month: ${data.map((d) => `${d.label} ${d.count}`).join(", ")}`}>
      {data.map((d, i) => {
        const on = d.key === highlight;
        return (
          <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-[1.5cqw]">
            {on && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.9 }}
                className="font-display text-[4.2cqw] font-extrabold leading-none"
              >
                {d.count}
              </motion.div>
            )}
            <motion.div
              className="w-full origin-bottom rounded-t-[4px]"
              style={{ height: `${Math.max(2, (d.count / max) * 82)}%`, background: on ? fg : withAlpha(fg, 0.32) }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.05 }}
            />
            <div className="font-sans text-[2.6cqw] font-semibold uppercase" style={{ opacity: on ? 1 : 0.6 }}>
              {d.label.charAt(0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HourRing({ counts, peak, fg, delay = 0.3 }: { counts: number[]; peak: number | null; fg: string; delay?: number }) {
  const max = Math.max(1, ...counts);
  const inner = 42;
  const span = 40;
  return (
    <div className="relative aspect-square w-[78cqw]">
      <svg viewBox="-112 -112 224 224" className="h-full w-full overflow-visible" role="img" aria-label={`Applications by hour, peak at ${peak === null ? "unknown" : hourLabel(peak)}`}>
        <circle r={inner - 6} fill="none" stroke={withAlpha(fg, 0.18)} strokeWidth="1" />
        {counts.map((c, h) => {
          const angle = (h / 24) * 360 - 90 + 7.5;
          const len = 3 + (c / max) * span;
          const on = h === peak;
          return (
            <motion.line
              key={h}
              x1={inner}
              x2={inner + len}
              y1={0}
              y2={0}
              stroke={on ? fg : withAlpha(fg, 0.38)}
              strokeWidth={on ? 9 : 7}
              strokeLinecap="round"
              transform={`rotate(${angle})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: EASE, delay: delay + h * 0.03 }}
            />
          );
        })}
        {[0, 6, 12, 18].map((h) => {
          const a = ((h / 24) * 360 - 90) * (Math.PI / 180);
          return (
            <text
              key={h}
              x={Math.cos(a) * 98}
              y={Math.sin(a) * 98 + 2.5}
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill={fg}
              opacity={0.6}
              fontFamily="Inter Variable, system-ui"
            >
              {hourLabel(h)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekdayColumns({ counts, fg, delay = 0.4 }: { counts: number[]; fg: string; delay?: number }) {
  const max = Math.max(1, ...counts);
  const peak = counts.indexOf(max);
  return (
    <div className="flex h-[34cqw] items-end gap-[2.4cqw]">
      {counts.map((c, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-[1.5cqw]">
          <motion.div
            className="w-full origin-bottom rounded-t-[4px]"
            style={{ height: `${Math.max(3, (c / max) * 86)}%`, background: i === peak ? fg : withAlpha(fg, 0.3) }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.06 }}
          />
          <div className="font-sans text-[3cqw] font-bold" style={{ opacity: i === peak ? 1 : 0.55 }}>
            {DAY_LETTERS[i]}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RankBars({ items, fg, delay = 0.4, unit = "" }: { items: Array<{ name: string; count: number }>; fg: string; delay?: number; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ol className="space-y-[3cqw]">
      {items.map((item, i) => (
        <motion.li
          key={item.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: delay + i * 0.12 }}
          className="grid grid-cols-[6cqw_1fr] items-center gap-x-[2cqw]"
        >
          <span className="font-display text-[5cqw] font-extrabold leading-none opacity-60">{i + 1}</span>
          <div>
            <div className="flex items-baseline justify-between gap-[2cqw]">
              <span className="truncate font-display text-[5.6cqw] font-bold leading-tight">{item.name}</span>
              <span className="shrink-0 font-sans text-[3.4cqw] font-semibold tabular-nums opacity-80">
                {item.count}
                {unit}
              </span>
            </div>
            <div className="mt-[1.2cqw] h-[1.6cqw] w-full rounded-full" style={{ background: withAlpha(fg, 0.15) }}>
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ width: `${(item.count / max) * 100}%`, background: i === 0 ? fg : withAlpha(fg, 0.55) }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, ease: EASE, delay: delay + 0.2 + i * 0.12 }}
              />
            </div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

/** 100 cells; the ghosted share fades out to empty outlines, one by one. */
export function GhostWaffle({ pct, fg, delay = 0.6 }: { pct: number; fg: string; delay?: number }) {
  const ghosted = Math.round(pct);
  return (
    <div className="grid grid-cols-10 gap-[1.2cqw]" role="img" aria-label={`${ghosted} out of 100 applications got no reply`}>
      {Array.from({ length: 100 }, (_, i) => {
        const isGhost = i < ghosted;
        return (
          <motion.div
            key={i}
            className="aspect-square rounded-[3px]"
            style={{ border: `1.5px solid ${withAlpha(fg, isGhost ? 0.35 : 0)}` }}
            initial={{ backgroundColor: fg }}
            animate={{ backgroundColor: isGhost ? withAlpha(fg, 0) : fg, scale: isGhost ? 0.82 : 1 }}
            transition={{ duration: 0.4, delay: isGhost ? delay + i * 0.018 : 0 }}
          />
        );
      })}
    </div>
  );
}

export function Funnel({ steps, fg, delay = 0.5 }: { steps: Array<{ label: string; value: number }>; fg: string; delay?: number }) {
  const max = Math.max(1, steps[0]?.value ?? 1);
  return (
    <div className="space-y-[1.8cqw]">
      {steps.map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + i * 0.18 }}>
          <div className="mb-[1.2cqw] flex items-baseline justify-between font-sans text-[3.6cqw] font-semibold">
            <span className="opacity-80">{s.label}</span>
            <span className="font-display text-[5cqw] font-extrabold tabular-nums">{s.value.toLocaleString("en-US")}</span>
          </div>
          <div className="h-[3.5cqw] overflow-hidden rounded-full" style={{ background: withAlpha(fg, 0.14) }}>
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, background: i === steps.length - 1 ? fg : withAlpha(fg, 0.45) }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: delay + 0.1 + i * 0.18 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
