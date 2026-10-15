import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export function CountUp({
  value,
  duration = 1.6,
  delay = 0,
  format = (n: number) => Math.round(n).toLocaleString("en-US"),
}: {
  value: number;
  duration?: number;
  delay?: number;
  format?: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) return setShown(value);
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / (duration * 1000)));
      setShown(value * (1 - Math.pow(2, -10 * p)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setShown(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay, reduce]);

  return <span className="tabular-nums">{format(shown)}</span>;
}

/** Headline that rises in word by word from behind a mask. */
export function Words({ text, className = "", delay = 0, stagger = 0.06 }: { text: string; className?: string; delay?: number; stagger?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(/\s+/).map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: delay + i * stagger }}
          >
            {word}
            {" "}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function Fade({
  children,
  delay = 0,
  y = 18,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

export function Pop({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Kicker({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <Fade delay={delay} y={8}>
      <div className="font-sans text-[3.4cqw] font-semibold uppercase tracking-[0.18em] opacity-75">{children}</div>
    </Fade>
  );
}

export function Marquee({ items, reverse = false, seconds = 22, className = "" }: { items: string[]; reverse?: boolean; seconds?: number; className?: string }) {
  const row = items.length ? items : ["—"];
  return (
    <div className={`flex overflow-hidden whitespace-nowrap ${className}`} aria-hidden>
      <div
        className="flex shrink-0 gap-[4cqw] pr-[4cqw]"
        style={{ animation: `marquee ${seconds}s linear infinite`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {[...row, ...row].map((item, i) => (
          <span key={i} className="shrink-0">
            {item}
            <span className="mx-[3cqw] opacity-40">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

type ShapeVariant = "orbit" | "blobs" | "stripes" | "stars" | "burst" | "waves" | "grid" | "none";

/** Big graphic shapes behind each slide. Purely decorative. */
export function Shapes({ variant, a, b }: { variant: ShapeVariant; a: string; b: string }) {
  const reduce = useReducedMotion();
  const spin = (seconds: number, dir = 1) =>
    reduce ? {} : { animate: { rotate: 360 * dir }, transition: { duration: seconds, repeat: Infinity, ease: "linear" as const } };

  switch (variant) {
    case "orbit":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <motion.svg className="absolute -right-[35%] -top-[20%] w-[120%]" viewBox="0 0 200 200" {...spin(60)}>
            <circle cx="100" cy="100" r="90" fill="none" stroke={a} strokeWidth="10" strokeDasharray="2 14" strokeLinecap="round" />
            <circle cx="100" cy="100" r="62" fill="none" stroke={b} strokeWidth="2" />
            <circle cx="100" cy="10" r="7" fill={a} />
          </motion.svg>
        </div>
      );
    case "blobs":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <motion.div
            className="absolute -left-[25%] -top-[10%] aspect-square w-[85%] rounded-full blur-[10cqw]"
            style={{ background: a, opacity: 0.55 }}
            animate={reduce ? undefined : { x: ["0%", "18%", "0%"], y: ["0%", "10%", "0%"] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-[15%] -right-[25%] aspect-square w-[90%] rounded-full blur-[12cqw]"
            style={{ background: b, opacity: 0.5 }}
            animate={reduce ? undefined : { x: ["0%", "-15%", "0%"], y: ["0%", "-12%", "0%"] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      );
    case "stripes":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <motion.div
            className="absolute -inset-[50%] rotate-[-24deg]"
            style={{ backgroundImage: `repeating-linear-gradient(90deg, ${a} 0 6%, transparent 6% 14%, ${b} 14% 16%, transparent 16% 24%)`, opacity: 0.35 }}
            animate={reduce ? undefined : { x: ["0%", "-12%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        </div>
      );
    case "stars":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {STAR_SPOTS.map(([x, y, s, d], i) => (
            <motion.svg
              key={i}
              viewBox="0 0 24 24"
              className="absolute"
              style={{ left: `${x}%`, top: `${y}%`, width: `${s}cqw` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={reduce ? { scale: 1, opacity: 1 } : { scale: [0, 1, 0.7, 1], opacity: 1, rotate: [0, 90] }}
              transition={{ duration: 2.4, delay: d, repeat: reduce ? 0 : Infinity, repeatType: "mirror" }}
            >
              <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={i % 2 ? a : b} />
            </motion.svg>
          ))}
        </div>
      );
    case "burst":
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <motion.svg className="absolute left-1/2 top-1/2 w-[190%] -translate-x-1/2 -translate-y-1/2" viewBox="-100 -100 200 200" {...spin(90)}>
            {Array.from({ length: 24 }, (_, i) => (
              <path key={i} d="M0 0 L100 -6 L100 6 Z" fill={i % 2 ? a : b} opacity={0.22} transform={`rotate(${i * 15})`} />
            ))}
          </motion.svg>
        </div>
      );
    case "waves":
      return (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] overflow-hidden" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.svg
              key={i}
              className="absolute bottom-0 left-0 w-[200%]"
              style={{ bottom: `${i * 9}%` }}
              viewBox="0 0 400 40"
              preserveAspectRatio="none"
              animate={reduce ? undefined : { x: ["0%", "-50%"] }}
              transition={{ duration: 7 + i * 3, repeat: Infinity, ease: "linear" }}
            >
              <path
                d="M0 20 Q25 0 50 20 T100 20 T150 20 T200 20 T250 20 T300 20 T350 20 T400 20"
                fill="none"
                stroke={i === 1 ? b : a}
                strokeWidth="5"
                strokeLinecap="round"
                opacity={0.55}
              />
            </motion.svg>
          ))}
        </div>
      );
    case "grid":
      return (
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ backgroundImage: `radial-gradient(${a} 1.2px, transparent 1.2px)`, backgroundSize: "6cqw 6cqw", opacity: 0.35 }}
        />
      );
    default:
      return null;
  }
}

const STAR_SPOTS: Array<[number, number, number, number]> = [
  [8, 9, 9, 0],
  [78, 6, 6, 0.4],
  [86, 38, 11, 0.8],
  [4, 62, 7, 1.2],
  [70, 82, 8, 0.2],
  [40, 90, 5, 1],
];

export type { ShapeVariant };
