import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Ghost, Mail, MailCheck, Sparkles, Swords, Timer, Zap } from "lucide-react";
import { siSpotify } from "simple-icons";
import type { SpiceLevel, Track, WrappedCopy, WrappedInput } from "../../shared/schema";
import { hourLabel, plural } from "../../shared/fallback";
import { CountUp, Fade, Kicker, Marquee, Pop, Words, type ShapeVariant } from "./primitives";
import { Funnel, GhostWaffle, HourRing, MonthBars, RankBars, WeekdayColumns } from "./charts";
import { THEMES, auraOf, inkOn, withAlpha, type Theme } from "./themes";
import { SummarySlide } from "./ShareCard";
import type { Section } from "../../lib/soundtrack";

export interface SlideContext {
  input: WrappedInput;
  copy: WrappedCopy;
  /** The anthem on Spotify, when the server could find it */
  track: Track | null;
  offline: boolean;
  spice: SpiceLevel;
  regenerating: boolean;
  onReplay: () => void;
  onSpice: (spice: SpiceLevel) => void;
}

export interface SlideDef {
  id: string;
  theme: Theme;
  shapes: ShapeVariant;
  /** ms; null means the slide waits for the viewer */
  duration: number | null;
  confetti?: string[];
  /** Soundtrack section; defaults by slide id */
  music?: Section;
  render: () => ReactNode;
}

const BIG = "font-display font-extrabold leading-[0.82] tracking-[-0.02em] [font-stretch:75%]";
const bigSize = (n: number) => {
  const digits = Math.round(n).toLocaleString("en-US").length;
  return digits <= 2 ? "text-[52cqw]" : digits === 3 ? "text-[42cqw]" : digits <= 5 ? "text-[30cqw]" : "text-[24cqw]";
};
const Headline = ({ text, delay = 0, size = "text-[9.5cqw]" }: { text: string; delay?: number; size?: string }) => (
  <h2 className={`font-display font-extrabold leading-[0.95] tracking-[-0.03em] ${size}`}>
    <Words text={text} delay={delay} />
  </h2>
);
const Body = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <Fade delay={delay}>
    <p className="max-w-[86cqw] font-sans text-[4.4cqw] font-medium leading-[1.35] opacity-90">{children}</p>
  </Fade>
);
/** Slide body. AI copy varies in length, so if the content would overflow it scales down to fit. */
function Frame({ children, align = "center" }: { children: ReactNode; align?: "center" | "start" | "end" }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const style = getComputedStyle(outer.current);
      const room = outer.current.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const need = inner.current.offsetHeight;
      setScale(need > room ? Math.max(0.6, room / need) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer.current!);
    ro.observe(inner.current!);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);
  const justify = { center: "justify-center", start: "justify-start", end: "justify-end" }[align];
  const origin = { center: "center", start: "top", end: "bottom" }[align];
  return (
    <div ref={outer} className={`relative z-10 flex h-full flex-col px-[7cqw] pb-[12cqw] pt-[17cqw] ${justify}`}>
      <div ref={inner} className="flex flex-col gap-[4cqw]" style={{ transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: `${origin} left` }}>
        {children}
      </div>
    </div>
  );
}
const Chip = ({ children, theme }: { children: ReactNode; theme: Theme }) => (
  <span
    className="inline-flex items-center gap-[1.5cqw] rounded-full px-[3.2cqw] py-[1.4cqw] font-sans text-[3.3cqw] font-semibold"
    style={{ background: withAlpha(theme.fg, 0.12), border: `1px solid ${withAlpha(theme.fg, 0.25)}` }}
  >
    {children}
  </span>
);

export function buildSlides(ctx: SlideContext): SlideDef[] {
  const { input, copy } = ctx;
  const m = input.metrics;
  const t = m.totals;
  const year = input.meta.year;
  const aura = auraOf(copy.personality.auraColors);
  const slides: Array<SlideDef | false | null | ""> = [
    {
      id: "intro",
      theme: THEMES.ink,
      shapes: "stars",
      duration: 6500,
      render: () => (
        <Frame>
          <Kicker>{input.meta.isDemo ? "A demo inbox, reviewed" : "Your year, reviewed"}</Kicker>
          <motion.div
            className={`${BIG} text-[44cqw]`}
            initial={{ opacity: 0, scale: 1.25, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ backgroundImage: "linear-gradient(100deg, #C6FF3D, #3DFFB5 45%, #FF3D7F)", WebkitBackgroundClip: "text", color: "transparent" }}
          >
            {year}
          </motion.div>
          <Headline text={copy.intro.headline} delay={0.7} size="text-[11cqw]" />
          <Body delay={1.4}>{copy.intro.subtext}</Body>
        </Frame>
      ),
    },
    {
      id: "volume",
      theme: THEMES.lime,
      shapes: "orbit",
      duration: 7500,
      render: () => (
        <Frame align="end">
          <Kicker>This year you sent</Kicker>
          <div className={`${BIG} ${bigSize(t.applications)}`}>
            <CountUp value={t.applications} duration={2} delay={0.3} />
          </div>
          <div className="font-display text-[10cqw] font-bold leading-none tracking-tight">
            <Words text={t.applications === 1 ? "application" : "applications"} delay={0.6} />
          </div>
          <Fade delay={1.6} className="flex flex-wrap gap-[2cqw]">
            <Chip theme={THEMES.lime}>{plural(t.companies, "company", "companies")}</Chip>
            <Chip theme={THEMES.lime}>{plural(m.time.activeDays, "active day")}</Chip>
          </Fade>
          <Headline text={copy.volume.headline} delay={2} size="text-[7.5cqw]" />
          <Body delay={2.5}>{copy.volume.line}</Body>
        </Frame>
      ),
    },
    m.time.monthly.some((x) => x.count > 0) && {
      id: "timeline",
      theme: THEMES.cobalt,
      shapes: "grid",
      duration: 8500,
      render: () => {
        const peak = m.time.monthly.reduce((a, b) => (b.count > a.count ? b : a), m.time.monthly[0]!);
        return (
          <Frame>
            <Kicker>Your year, month by month</Kicker>
            <Headline text={copy.timeline.headline} delay={0.2} />
            <div className="mt-[4cqw]">
              <MonthBars data={m.time.monthly} fg={THEMES.cobalt.fg} highlight={peak.key} delay={0.6} />
            </div>
            {m.time.busiestMonth && (
              <Fade delay={1.6}>
                <div className="font-display text-[7cqw] font-bold leading-tight">
                  Peak: {m.time.busiestMonth.label} · {m.time.busiestMonth.count}
                </div>
              </Fade>
            )}
            <Body delay={2.1}>{copy.timeline.line}</Body>
          </Frame>
        );
      },
    },
    m.time.busiestDay && {
      id: "streak",
      theme: THEMES.tangerine,
      shapes: "burst",
      duration: 7500,
      render: () => (
        <Frame>
          <Kicker>Locked in</Kicker>
          <div className="grid grid-cols-1 gap-[5cqw]">
            <Pop delay={0.2}>
              <div className={`${BIG} text-[40cqw]`}>
                <CountUp value={m.time.longestStreakDays} duration={1.2} delay={0.3} />
              </div>
              <div className="font-display text-[8cqw] font-bold leading-none">day streak</div>
              <div className="mt-[1.5cqw] font-sans text-[3.6cqw] font-medium opacity-75">Your longest run of applying every single day</div>
            </Pop>
            <Pop delay={1.1}>
              <div className="flex items-end gap-[3cqw]">
                <div className={`${BIG} text-[26cqw]`}>
                  <CountUp value={m.time.busiestDay!.count} duration={1} delay={1.2} />
                </div>
                <div className="pb-[2cqw] font-display text-[6cqw] font-bold leading-[1.05]">
                  in one day
                  <br />
                  <span className="opacity-70">{m.time.busiestDay!.label}</span>
                </div>
              </div>
            </Pop>
          </div>
          <Body delay={2}>{copy.streak.line}</Body>
        </Frame>
      ),
    },
    m.time.peakHour !== null && {
      id: "clock",
      theme: THEMES.midnight,
      shapes: "stars",
      duration: 8500,
      render: () => (
        <Frame>
          <Pop delay={0.1}>
            <span
              className="inline-block rounded-full px-[4cqw] py-[1.8cqw] font-sans text-[3.6cqw] font-bold uppercase tracking-wider"
              style={{ background: THEMES.midnight.a, color: inkOn(THEMES.midnight.a) }}
            >
              {copy.clock.timeBadge}
            </span>
          </Pop>
          <div className="relative mx-auto">
            <HourRing counts={m.time.hourCounts} peak={m.time.peakHour} fg={THEMES.midnight.fg} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="font-sans text-[3cqw] font-semibold uppercase tracking-[0.18em] opacity-70">Peak hour</div>
              <Fade delay={1.2} y={6}>
                <div className="font-display text-[12cqw] font-extrabold leading-none [font-stretch:75%]">{hourLabel(m.time.peakHour!)}</div>
              </Fade>
            </div>
          </div>
          <Fade delay={1.6}>
            <div className="font-display text-[7cqw] font-bold leading-tight">{m.time.lateNightPct}% after 10 PM</div>
          </Fade>
          <Body delay={2}>{copy.clock.line}</Body>
        </Frame>
      ),
    },
    m.time.topWeekday && {
      id: "weekday",
      theme: THEMES.butter,
      shapes: "waves",
      duration: 7000,
      render: () => (
        <Frame align="start">
          <Kicker>Your favorite day to apply</Kicker>
          <div className={`${BIG} text-[22cqw]`}>
            <Words text={m.time.topWeekday!} delay={0.2} />
          </div>
          <div className="mt-[2cqw]">
            <WeekdayColumns counts={m.time.weekdayCounts} fg={THEMES.butter.fg} delay={0.8} />
          </div>
          {m.time.weekendPct > 0 && (
            <Fade delay={1.5}>
              <Chip theme={THEMES.butter}>{m.time.weekendPct}% on weekends</Chip>
            </Fade>
          )}
          <Body delay={1.9}>{copy.weekday.line}</Body>
        </Frame>
      ),
    },
    m.platforms.length > 0 && {
      id: "platforms",
      theme: THEMES.hotpink,
      shapes: "stripes",
      duration: 8000,
      render: () => (
        <Frame>
          <Kicker>Your hiring platform nemeses</Kicker>
          <Headline text={`${m.platforms[0]!.name} saw you the most`} delay={0.2} />
          <div className="rounded-[5cqw] p-[5cqw]" style={{ background: withAlpha(THEMES.hotpink.fg, 0.08) }}>
            <RankBars items={m.platforms.slice(0, 5)} fg={THEMES.hotpink.fg} delay={0.7} />
          </div>
          {m.directPct > 0 && (
            <Fade delay={1.8}>
              <Chip theme={THEMES.hotpink}>{m.directPct}% went straight to the company</Chip>
            </Fade>
          )}
          <Body delay={2.1}>{copy.platforms.line}</Body>
        </Frame>
      ),
    },
    t.companies > 0 && {
      id: "companies",
      theme: THEMES.ink,
      shapes: "none",
      duration: 8000,
      render: () => {
        const names = m.companies.top.map((c) => c.name);
        return (
          <div className="relative z-10 flex h-full flex-col justify-center gap-[10cqw] pb-[14cqw] pt-[20cqw]">
            <div className="-rotate-[4deg] space-y-[1.5cqw] font-display text-[14cqw] font-extrabold uppercase leading-[0.95] [font-stretch:75%]">
              <Marquee items={names.slice(0, 5)} seconds={18} />
              <Marquee items={names.slice(5).concat(names.slice(0, 2))} reverse seconds={22} className="text-[#F5F5F0]/25" />
              <Marquee items={names.slice(2, 7)} seconds={26} className="text-[#C6FF3D]" />
              <Marquee items={names.slice(4).concat(names.slice(0, 3))} reverse seconds={30} className="text-[#F5F5F0]/25" />
            </div>
            <div className="space-y-[4cqw] px-[7cqw]">
              <Kicker delay={0.3}>You shot your shot with</Kicker>
              <div className="flex items-end gap-[3cqw]">
                <div className={`${BIG} text-[30cqw]`}>
                  <CountUp value={t.companies} delay={0.4} />
                </div>
                <div className="pb-[3cqw] font-display text-[8cqw] font-bold leading-none">companies</div>
              </div>
              {m.companies.repeat && (
                <Fade delay={1.4}>
                  <Chip theme={THEMES.ink}>
                    Most applied: {m.companies.repeat.name} × {m.companies.repeat.count}
                  </Chip>
                </Fade>
              )}
              <Body delay={1.8}>{copy.companies.line}</Body>
            </div>
          </div>
        );
      },
    },
    !!m.outreach && m.outreach.sent > 0 && {
      id: "outreach",
      theme: THEMES.sky,
      shapes: "waves",
      duration: 9000,
      render: () => {
        const o = m.outreach!;
        const shown = 20;
        const lit = o.checked ? Math.round((o.replied / o.checked) * shown) : 0;
        return (
          <Frame>
            <Kicker>And you didn't just wait around</Kicker>
            <div className="flex items-end gap-[3cqw]">
              <div className={`${BIG} ${bigSize(o.sent)}`}>
                <CountUp value={o.sent} delay={0.3} />
              </div>
              <div className="pb-[3cqw] font-display text-[6.5cqw] font-bold leading-[1.02]">
                job emails
                <br />
                you wrote
              </div>
            </div>
            <Fade delay={1} className="flex flex-wrap gap-[2cqw]">
              <Chip theme={THEMES.sky}>{plural(o.people, "person", "people")} reached</Chip>
              {o.coverLetters > 0 && <Chip theme={THEMES.sky}>{plural(o.coverLetters, "cover letter")}</Chip>}
              {o.followUps > 0 && <Chip theme={THEMES.sky}>{plural(o.followUps, "follow-up")}</Chip>}
              {o.dearHiringManager > 0 && <Chip theme={THEMES.sky}>“Dear Hiring Manager” × {o.dearHiringManager}</Chip>}
            </Fade>
            {o.checked > 0 && (
              <Fade delay={1.5}>
                <div className="rounded-[5cqw] p-[5cqw]" style={{ background: withAlpha(THEMES.sky.fg, 0.08) }}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-sans text-[3.4cqw] font-semibold uppercase tracking-[0.14em] opacity-75">Wrote back</span>
                    <span className="font-display text-[9cqw] font-extrabold leading-none">{o.replyRatePct}%</span>
                  </div>
                  <div className="mt-[3cqw] grid grid-cols-10 gap-[2cqw]" role="img" aria-label={`${o.replied} of ${o.checked} people wrote back`}>
                    {Array.from({ length: shown }, (_, i) => {
                      const Icon = i < lit ? MailCheck : Mail;
                      return (
                        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: i < lit ? 1 : 0.3, y: 0 }} transition={{ delay: 1.8 + i * 0.05 }}>
                          <Icon className="h-auto w-full" strokeWidth={2.2} />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </Fade>
            )}
            <Headline text={copy.outreach.headline} delay={2.3} size="text-[8cqw]" />
            <Body delay={2.8}>{copy.outreach.line}</Body>
          </Frame>
        );
      },
    },
    m.programs.count > 0 && {
      id: "side-quests",
      theme: THEMES.tangerine,
      shapes: "stars",
      duration: 7500,
      render: () => (
        <Frame>
          <Kicker>
            <span className="inline-flex items-center gap-[1.5cqw]">
              <Swords className="h-[4cqw] w-[4cqw]" /> Side quests unlocked
            </span>
          </Kicker>
          <div className="flex items-end gap-[3cqw]">
            <div className={`${BIG} ${bigSize(m.programs.count)}`}>
              <CountUp value={m.programs.count} delay={0.3} />
            </div>
            <div className="pb-[3cqw] font-display text-[6.5cqw] font-bold leading-[1.02]">
              hackathons, fellowships
              <br />& programs
            </div>
          </div>
          <div className="flex flex-wrap gap-[2cqw]">
            {m.programs.names.slice(0, 6).map((name, i) => (
              <Pop key={name} delay={0.9 + i * 0.15}>
                <span
                  className="inline-block rounded-[2.5cqw] px-[3.4cqw] py-[1.8cqw] font-display text-[4.4cqw] font-bold"
                  style={{ background: THEMES.tangerine.fg, color: THEMES.tangerine.bg, rotate: `${i % 2 ? 2 : -2}deg` }}
                >
                  {name}
                </span>
              </Pop>
            ))}
          </div>
          <Body delay={2}>{copy.sideQuests.line}</Body>
        </Frame>
      ),
    },
    (m.roles.all.length > 0 || !!m.roles.dominantFamily) && {
      id: "roles",
      theme: THEMES.mint,
      shapes: "orbit",
      duration: 9000,
      render: () => (
        <Frame>
          <Kicker>Your comfort zone</Kicker>
          <div className={`${BIG} text-[19cqw]`}>
            <Words text={m.roles.dominantFamily ?? "Everything"} delay={0.2} />
          </div>
          <Fade delay={0.8} className="flex flex-wrap gap-[2cqw]">
            {m.roles.top.slice(0, 3).map((r) => (
              <Chip key={r.name} theme={THEMES.mint}>
                {r.name}
              </Chip>
            ))}
          </Fade>
          <Fade delay={1.6}>
            <div className="mt-[4cqw] font-sans text-[3.4cqw] font-semibold uppercase tracking-[0.18em] opacity-75">And then, your wildest reach</div>
          </Fade>
          <Pop delay={2.1}>
            <div
              className="rotate-[-2deg] rounded-[4cqw] px-[5cqw] py-[4.5cqw] font-display text-[8cqw] font-extrabold leading-[1]"
              style={{ background: THEMES.mint.fg, color: THEMES.mint.bg }}
            >
              {copy.roles.wildcardRole}
            </div>
          </Pop>
          <Body delay={2.8}>{copy.roles.line}</Body>
        </Frame>
      ),
    },
    {
      id: "ghost",
      theme: THEMES.ghost,
      shapes: "blobs",
      duration: 9000,
      render: () => (
        <Frame>
          <Kicker>
            <span className="inline-flex items-center gap-[1.5cqw]">
              <Ghost className="h-[4cqw] w-[4cqw]" /> The ghost report
            </span>
          </Kicker>
          <div className="flex items-end gap-[3cqw]">
            <div className={`${BIG} text-[28cqw]`}>
              <CountUp value={m.rates.ghostRatePct} delay={0.3} format={(n) => `${Math.round(n)}%`} />
            </div>
            <div className="pb-[3cqw] font-display text-[5.6cqw] font-bold leading-[1.05]">
              never
              <br />
              replied
            </div>
          </div>
          <div className="w-[72cqw]">
            <GhostWaffle pct={m.rates.ghostRatePct} fg={THEMES.ghost.fg} delay={0.8} />
          </div>
          <Headline text={copy.ghost.headline} delay={2.2} size="text-[8cqw]" />
          <Body delay={2.6}>{copy.ghost.line}</Body>
          {m.companies.ghosted.length > 0 && (
            <Fade delay={3}>
              <div className="font-sans text-[3.3cqw] font-medium opacity-60">{m.companies.ghosted.slice(0, 6).join(" · ")}</div>
            </Fade>
          )}
        </Frame>
      ),
    },
    {
      id: "rejections",
      theme: THEMES.crimson,
      shapes: "none",
      duration: 8500,
      render: () => (
        <Frame>
          <Kicker>You read the word</Kicker>
          <div className="font-display text-[13cqw] font-extrabold italic leading-[0.92] tracking-[-0.03em]">
            {[1, 0.55, 0.3, 0.14].map((opacity, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -30 }} animate={{ opacity, x: 0 }} transition={{ delay: 0.2 + i * 0.25, duration: 0.6 }}>
                unfortunately
              </motion.div>
            ))}
          </div>
          <div className="flex items-end gap-[3cqw]">
            <div className={`${BIG} text-[28cqw]`}>
              <CountUp value={t.unfortunately} delay={1.2} />
            </div>
            <div className="pb-[2.5cqw] font-display text-[8cqw] font-bold leading-none">times</div>
          </div>
          <Body delay={1.8}>{copy.rejections.unfortunatelyLine}</Body>
          {copy.rejections.speedLine && (
            <Fade delay={2.6}>
              <div className="flex gap-[3cqw] rounded-[4cqw] p-[4cqw]" style={{ background: withAlpha(THEMES.crimson.fg, 0.12) }}>
                <Timer className="mt-[0.5cqw] h-[6cqw] w-[6cqw] shrink-0" />
                <p className="font-sans text-[3.8cqw] font-semibold leading-snug">{copy.rejections.speedLine}</p>
              </div>
            </Fade>
          )}
        </Frame>
      ),
    },
    {
      id: "translator",
      theme: THEMES.paper,
      shapes: "grid",
      duration: 6000 + copy.translator.length * 2600,
      render: () => (
        <Frame>
          <Kicker>Corporate translator</Kicker>
          <Headline text="What they said vs. what they meant" delay={0.1} size="text-[7.5cqw]" />
          <div className="space-y-[3cqw]">
            {copy.translator.map((item, i) => {
              const base = 0.9 + i * 2.4;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24, rotate: i % 2 ? 1.5 : -1.5 }}
                  animate={{ opacity: 1, y: 0, rotate: i % 2 ? 1 : -1 }}
                  transition={{ delay: base, type: "spring", stiffness: 200, damping: 20 }}
                  className="rounded-[4cqw] bg-white px-[4cqw] py-[3.2cqw] shadow-[0_1.5cqw_0_#0B0B10]"
                  style={{ border: "2px solid #0B0B10" }}
                >
                  <div className="font-sans text-[3cqw] font-bold uppercase tracking-[0.14em] opacity-60">{item.company}</div>
                  <motion.div
                    className="mt-[1cqw] font-sans text-[3.4cqw] italic leading-snug line-through decoration-[0.5cqw]"
                    initial={{ textDecorationColor: "rgba(255,61,127,0)", opacity: 0.85 }}
                    animate={{ textDecorationColor: "rgba(255,61,127,1)", opacity: 0.6 }}
                    transition={{ delay: base + 1, duration: 0.4 }}
                  >
                    “{item.theySaid}”
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: base + 1.3 }}
                    className="mt-[1.5cqw] font-display text-[4.6cqw] font-extrabold leading-[1.1]"
                  >
                    {item.theyMeant}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </Frame>
      ),
    },
    {
      id: "interviews",
      theme: THEMES.violet,
      shapes: "burst",
      duration: 8500,
      render: () => (
        <Frame>
          <Kicker>Interview invites</Kicker>
          <div className={`${BIG} text-[30cqw]`}>
            <CountUp value={t.interviews} delay={0.3} duration={1.4} />
          </div>
          <Headline text={copy.interviews.headline} delay={0.8} size="text-[8.5cqw]" />
          <div className="rounded-[5cqw] p-[5cqw]" style={{ background: withAlpha(THEMES.violet.fg, 0.1) }}>
            <Funnel
              fg={THEMES.violet.fg}
              delay={1.2}
              steps={[
                { label: "Applied", value: t.applications },
                { label: "Heard back", value: t.answered },
                { label: "Interviews", value: t.interviews },
                ...(t.offers > 0 ? [{ label: "Offers", value: t.offers }] : []),
              ]}
            />
          </div>
          <Body delay={2.2}>{copy.interviews.line}</Body>
        </Frame>
      ),
    },
    t.offers > 0 && {
      id: "offer",
      theme: THEMES.lime,
      shapes: "stars",
      duration: 7500,
      confetti: ["#2D3BFF", "#FF3D7F", "#0B0B10", "#FFFFFF"],
      render: () => (
        <Frame>
          <Kicker>And then, plot twist</Kicker>
          <Pop delay={0.3}>
            <div className={`${BIG} text-[40cqw]`}>{t.offers === 1 ? "OFFER" : `${t.offers} OFFERS`}</div>
          </Pop>
          {m.companies.offersFrom.length > 0 && (
            <Fade delay={1}>
              <div className="font-display text-[9cqw] font-bold leading-none">from {m.companies.offersFrom.slice(0, 3).join(", ")}</div>
            </Fade>
          )}
          <Body delay={1.5}>{copy.offer.line}</Body>
        </Frame>
      ),
    },
    {
      id: "persona-intro",
      theme: THEMES.black,
      shapes: "none",
      duration: 4200,
      render: () => (
        <Frame>
          <motion.div
            className="mx-auto aspect-square w-[46cqw] rounded-full blur-[4cqw]"
            style={{ background: `conic-gradient(${aura.join(", ")}, ${aura[0]})` }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1, 0.85, 1], opacity: 1, rotate: 180 }}
            transition={{ duration: 3.6, ease: "easeInOut" }}
          />
          <Headline text="Now for the main event." size="text-[11cqw]" />
          <Fade delay={1.2}>
            <div className="font-display text-[7cqw] font-bold leading-tight opacity-80">
              Your job seeker personality is
              {[0, 1, 2].map((i) => (
                <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: 1.4 + i * 0.2 }}>
                  .
                </motion.span>
              ))}
            </div>
          </Fade>
        </Frame>
      ),
    },
    {
      id: "persona",
      theme: { ...THEMES.ink, a: aura[0], b: aura[1] },
      shapes: "blobs",
      duration: 12000,
      confetti: aura,
      render: () => <PersonaCard copy={copy} year={year} />,
    },
    {
      id: "anthem",
      theme: { ...THEMES.plum, a: aura[0], b: aura[2] },
      shapes: "waves",
      duration: ctx.track ? 14000 : 8000,
      // The Spotify player brings its own audio, so the soundtrack steps aside.
      music: ctx.track ? "hush" : "duck",
      render: () => (ctx.track ? <SpotifyAnthem copy={copy} track={ctx.track} /> : <Anthem copy={copy} />),
    },
    {
      id: "forecast",
      theme: THEMES.bubblegum,
      shapes: "stars",
      duration: 7000,
      render: () => (
        <Frame>
          <Kicker>
            <span className="inline-flex items-center gap-[1.5cqw]">
              <Sparkles className="h-[4cqw] w-[4cqw]" /> {year + 1} forecast
            </span>
          </Kicker>
          <CrystalBall />
          <Headline text={copy.forecast.headline} delay={0.4} size="text-[12cqw]" />
          <Body delay={1.1}>{copy.forecast.line}</Body>
        </Frame>
      ),
    },
    {
      id: "summary",
      theme: THEMES.ink,
      shapes: "grid",
      duration: null,
      render: () => <SummarySlide {...ctx} />,
    },
  ];
  return slides.filter((s): s is SlideDef => !!s);
}

function PersonaCard({ copy, year }: { copy: WrappedCopy; year: number }) {
  const [a1, a2, a3] = auraOf(copy.personality.auraColors);
  return (
    <Frame>
      <Kicker>Your {year} job seeker personality</Kicker>
      <motion.div
        initial={{ opacity: 0, rotateY: 70, scale: 0.85 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 14, delay: 0.2 }}
        className="relative overflow-hidden rounded-[6cqw] p-[0.9cqw] [perspective:800px]"
      >
        <motion.div
          className="absolute -inset-[50%]"
          style={{ background: `conic-gradient(${a1}, ${a2}, ${a3}, ${a1})` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative space-y-[3cqw] rounded-[5.2cqw] bg-[#0B0B10] p-[5.5cqw]" style={{ backgroundImage: `linear-gradient(160deg, ${a1}26, transparent 45%, ${a2}26)` }}>
          <span className="inline-block rounded-full px-[3cqw] py-[1.2cqw] font-sans text-[2.8cqw] font-extrabold uppercase tracking-[0.14em]" style={{ background: a1, color: inkOn(a1) }}>
            {copy.personality.rarity}
          </span>
          <div className="font-display text-[9.5cqw] font-extrabold leading-[0.92] tracking-[-0.03em]">
            <Words text={copy.personality.archetype} delay={0.9} stagger={0.1} />
          </div>
          <Fade delay={1.7}>
            <p className="font-display text-[4.6cqw] font-semibold italic leading-snug" style={{ color: a3 }}>
              “{copy.personality.tagline}”
            </p>
          </Fade>
          <Fade delay={2.3}>
            <p className="font-sans text-[3.5cqw] leading-[1.42] opacity-85">{copy.personality.bio}</p>
          </Fade>
          <div className="flex flex-wrap gap-[1.8cqw]">
            {copy.personality.traits.map((trait, i) => (
              <Pop key={trait} delay={3 + i * 0.2}>
                <span className="inline-block rounded-[2cqw] border border-white/20 bg-white/5 px-[2.6cqw] py-[1.3cqw] font-sans text-[3.1cqw] font-semibold">✦ {trait}</span>
              </Pop>
            ))}
          </div>
        </div>
      </motion.div>
    </Frame>
  );
}

function CrystalBall() {
  return (
    <motion.div
      className="relative mx-auto my-[2cqw] aspect-square w-[58cqw]"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, y: [0, -8, 0] }}
      transition={{ scale: { type: "spring", stiffness: 120, damping: 12 }, opacity: { duration: 0.4 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 32% 28%, #ffffff 0 6%, #C9B8FF 18%, #7B5CFF 48%, #2D3BFF 78%, #14093A 100%)",
          boxShadow: "0 3cqw 10cqw rgba(45,59,255,0.45), inset 0 -3cqw 6cqw rgba(0,0,0,0.25)",
        }}
      />
      <motion.div
        className="absolute inset-[18%] rounded-full opacity-70 blur-[2cqw]"
        style={{ background: "conic-gradient(#FF3D7F, #FFE14D, #3DFFB5, #FF3D7F)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute -bottom-[6%] left-1/2 h-[16%] w-[60%] -translate-x-1/2 rounded-[50%] bg-[#1A0010]" />
    </motion.div>
  );
}

function SpotifyAnthem({ copy, track }: { copy: WrappedCopy; track: Track }) {
  const [a1] = auraOf(copy.personality.auraColors);
  return (
    <Frame>
      <Kicker>Your official job hunt anthem</Kicker>
      <div className="relative my-[1cqw] h-[56cqw] w-[86cqw]">
        <motion.div
          className="absolute left-[24cqw] top-[3cqw] aspect-square w-[50cqw] rounded-full"
          style={{ background: "repeating-radial-gradient(circle, #111 0 1cqw, #1d1d1d 1cqw 1.4cqw)", boxShadow: `0 3cqw 12cqw ${a1}55` }}
          initial={{ x: "-40%", opacity: 0 }}
          animate={{ x: 0, opacity: 1, rotate: 360 }}
          transition={{ x: { delay: 0.6, type: "spring", stiffness: 70, damping: 14 }, opacity: { delay: 0.6 }, rotate: { duration: 3.5, repeat: Infinity, ease: "linear" } }}
        >
          {track.albumArt && (
            <img src={track.albumArt} alt="" className="absolute left-1/2 top-1/2 aspect-square w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover" />
          )}
        </motion.div>
        <motion.div
          className="absolute left-0 top-0 aspect-square w-[56cqw] overflow-hidden rounded-[2cqw] bg-[#111] shadow-[0_3cqw_10cqw_rgba(0,0,0,0.55)]"
          initial={{ scale: 0.7, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 15 }}
        >
          {track.albumArt && <img src={track.albumArt} alt={`${track.title} cover art`} className="h-full w-full object-cover" />}
        </motion.div>
      </div>
      <div className="font-display text-[9.5cqw] font-extrabold leading-[0.95] tracking-[-0.03em]">
        <Words text={track.title} delay={0.8} />
      </div>
      <Fade delay={1.2}>
        <div className="font-display text-[5.6cqw] font-semibold opacity-80">{track.artist}</div>
      </Fade>
      <Body delay={1.6}>{copy.personality.themeSong.reason}</Body>
      <Fade delay={2}>
        <div data-interactive className="space-y-[2.5cqw]">
          <iframe
            title={`${track.title} on Spotify`}
            src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
            className="h-[80px] w-full rounded-[12px] border-0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
          <a
            href={track.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[2cqw] rounded-full bg-[#1ED760] px-[4cqw] py-[2.2cqw] font-sans text-[3.4cqw] font-bold text-black transition hover:brightness-95"
          >
            <svg viewBox="0 0 24 24" className="h-[4.4cqw] w-[4.4cqw]" fill="currentColor" aria-hidden>
              <path d={siSpotify.path} />
            </svg>
            Play on Spotify
          </a>
        </div>
      </Fade>
    </Frame>
  );
}

function Anthem({ copy }: { copy: WrappedCopy }) {
  const [a1, a2, a3] = auraOf(copy.personality.auraColors);
  const song = copy.personality.themeSong;
  return (
    <Frame>
      <Kicker>Your official job hunt anthem</Kicker>
      <div className="relative mx-auto my-[2cqw] aspect-square w-[70cqw]">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `repeating-radial-gradient(circle, #111 0 1.2cqw, #1d1d1d 1.2cqw 1.6cqw)`,
            boxShadow: `0 0 0 1cqw #000, 0 4cqw 16cqw ${a1}55`,
          }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 360 }}
          transition={{ scale: { type: "spring", stiffness: 120, damping: 14 }, opacity: { duration: 0.4 }, rotate: { duration: 4, repeat: Infinity, ease: "linear" } }}
        >
          <div
            className="absolute left-1/2 top-1/2 flex aspect-square w-[38%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${a1}, ${a2}, ${a3}, ${a1})` }}
          >
            <div className="aspect-square w-[14%] rounded-full bg-[#1A0B2E]" />
          </div>
        </motion.div>
      </div>
      <div className="flex items-end gap-[1cqw]" aria-hidden>
        {Array.from({ length: 18 }, (_, i) => (
          <motion.div
            key={i}
            className="w-[1.6cqw] rounded-full"
            style={{ background: i % 3 === 0 ? a1 : withAlpha("#FFFFFF", 0.7) }}
            animate={{ height: ["1.5cqw", `${3 + ((i * 7) % 9)}cqw`, "1.5cqw"] }}
            transition={{ duration: 0.6 + (i % 5) * 0.12, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      <div className="font-display text-[10cqw] font-extrabold leading-[0.95] tracking-[-0.03em]">
        <Words text={song.title} delay={0.6} />
      </div>
      <Fade delay={1.1}>
        <div className="font-display text-[6cqw] font-semibold opacity-80">{song.artist}</div>
      </Fade>
      <Body delay={1.6}>
        <Zap className="mr-[1cqw] inline h-[4cqw] w-[4cqw] align-[-0.5cqw]" />
        {song.reason}
      </Body>
    </Frame>
  );
}
