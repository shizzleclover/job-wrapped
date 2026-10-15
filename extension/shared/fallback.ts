// Canonical copy. web/lib/wrapped/ is synced from this folder by `npm run sync-shared` in web/.
// Builds the story copy from the real metrics when the AI writer is unavailable.
import type { Metrics, SpiceLevel, WrappedCopy, WrappedInput } from "./schema";

export function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

type Tone<T> = Record<SpiceLevel, T>;
const by = <T,>(spice: SpiceLevel, options: Tone<T>): T => options[spice];

interface Archetype {
  match: (m: Metrics) => boolean;
  name: Tone<string>;
  rarity: string;
  tagline: Tone<string>;
  traits: [string, string, string];
  aura: [string, string, string];
  song: { title: string; artist: string; reason: string };
}

const ARCHETYPES: Archetype[] = [
  {
    match: (m) => m.totals.offers > 0,
    name: { linkedin_safe: "The Strategic Closer", crispy: "The Plot-Twist Closer", unhinged: "The Final Boss of Hiring" },
    rarity: "OFFER UNLOCKED",
    tagline: {
      linkedin_safe: "Persistence compounds.",
      crispy: "They said unfortunately. You said watch me.",
      unhinged: "Survived the ATS hunger games and took the crown.",
    },
    traits: ["Closes Final Rounds", "Rejection-Proof", "Main Character Energy"],
    aura: ["#3DFFB5", "#FFE14D", "#FF3D7F"],
    song: { title: "Celebration", artist: "Kool & The Gang", reason: "You earned the confetti." },
  },
  {
    match: (m) => m.time.lateNightPct >= 35,
    name: { linkedin_safe: "The After-Hours Builder", crispy: "The Midnight Apply Goblin", unhinged: "The 2AM Workday Cryptid" },
    rarity: "NOCTURNAL TOP 3%",
    tagline: {
      linkedin_safe: "Great work happens when it's quiet.",
      crispy: "Sleep is temporary. Confirmation emails are forever.",
      unhinged: "Recruiters sleep. You upload PDFs into the void.",
    },
    traits: ["Moonlight Autofiller", "Caffeine-Powered", "Allergic to Bedtime"],
    aura: ["#7B5CFF", "#FF3D7F", "#3DD9FF"],
    song: { title: "Midnight City", artist: "M83", reason: "Your best work happens after the city sleeps." },
  },
  {
    match: (m) => m.totals.applications >= 120,
    name: { linkedin_safe: "The High-Velocity Applicant", crispy: "The Easy-Apply Sniper", unhinged: "The One-Click Menace" },
    rarity: "VOLUME TOP 1%",
    tagline: {
      linkedin_safe: "Every application is a rep.",
      crispy: "Volume is a strategy if you believe hard enough.",
      unhinged: "If the button says Apply, it is already too late for it.",
    },
    traits: ["Autofill Grandmaster", "Unbothered by Odds", "Cover Letter Speedrunner"],
    aura: ["#C6FF3D", "#FF6B1A", "#2D3BFF"],
    song: { title: "Harder, Better, Faster, Stronger", artist: "Daft Punk", reason: "Your apply speed breaks the sound barrier." },
  },
  {
    match: (m) => m.rates.interviewRatePct >= 12 && m.totals.interviews >= 2,
    name: { linkedin_safe: "The Interview Magnet", crispy: "The Callback Collector", unhinged: "The Recruiter Whisperer" },
    rarity: "CONVERSION TOP 5%",
    tagline: {
      linkedin_safe: "Quality gets the call back.",
      crispy: "Your resume does numbers.",
      unhinged: "Hiring managers see your PDF and simply obey.",
    },
    traits: ["Resume That Converts", "Calendar Always Full", "Small Talk Specialist"],
    aura: ["#FFE14D", "#FF3D7F", "#7B5CFF"],
    song: { title: "Confident", artist: "Demi Lovato", reason: "The interview invites prove it." },
  },
  {
    match: (m) => m.rates.ghostRatePct >= 55,
    name: { linkedin_safe: "The Resilient Optimist", crispy: "The Ghost Whisperer", unhinged: "The Patron Saint of Left-On-Read" },
    rarity: "HAUNTED TOP 4%",
    tagline: {
      linkedin_safe: "Silence is not a no.",
      crispy: "Ghosted, but make it fashion.",
      unhinged: "Half your applications are in a haunted S3 bucket.",
    },
    traits: ["Immune to Silence", "Follow-Up Specialist", "Unshakeable Faith"],
    aura: ["#3DD9FF", "#B79CFF", "#F5F5F0"],
    song: { title: "Somebody That I Used to Know", artist: "Gotye", reason: "For every recruiter who vanished after the first call." },
  },
  {
    match: (m) => m.totals.applications > 0 && m.totals.applications < 30,
    name: { linkedin_safe: "The Selective Strategist", crispy: "The Precision Sniper", unhinged: "The Picky Little Menace" },
    rarity: "QUALITY OVER QUANTITY",
    tagline: {
      linkedin_safe: "Fewer, better applications.",
      crispy: "You don't apply. You choose.",
      unhinged: "Applied to so few jobs that each one is a love letter.",
    },
    traits: ["Reads Every Job Post", "Tailors Every Resume", "Zero Spray-and-Pray"],
    aura: ["#FF6B1A", "#FFE14D", "#3DFFB5"],
    song: { title: "Lose Yourself", artist: "Eminem", reason: "One shot, one opportunity." },
  },
];

const DEFAULT_ARCHETYPE: Archetype = {
  match: () => true,
  name: { linkedin_safe: "The Relentless Optimist", crispy: "The Unbothered Grinder", unhinged: "The Rejection Speedrunner" },
  rarity: "RESILIENCE TOP 2%",
  tagline: {
    linkedin_safe: "Every no gets you closer to yes.",
    crispy: "Too stubborn to quit, too good to stay ghosted.",
    unhinged: "Rejection is just a loading screen.",
  },
  traits: ["Bounces Back Fast", "Pipeline Builder", "Plot-Armor Resilience"],
  aura: ["#FF3D7F", "#7B5CFF", "#3DD9FF"],
  song: { title: "Don't Stop Me Now", artist: "Queen", reason: "Nothing slowed you down this year." },
};

const TRANSLATIONS: Tone<string[]> = {
  linkedin_safe: [
    "The role was competitive, and timing mattered as much as talent.",
    "Strong profile, just not the exact match for this headcount.",
    "We'd genuinely like to see you apply again.",
  ],
  crispy: [
    "We closed this role internally two weeks ago and forgot the job post.",
    "Someone else had a referral from the VP.",
    "See you in six months when we repost the exact same role.",
  ],
  unhinged: [
    "An AI filter rejected you in 0.4 seconds because you wrote ReactJS.",
    "We wanted 12 years of experience in a framework that's 3 years old.",
    "Your resume now lives in a haunted S3 bucket forever.",
  ],
};

const CANNED_QUOTES = [
  "We have decided not to move forward with your application.",
  "We were impressed by your background, however...",
  "We will keep your resume on file for future opportunities.",
];

function rejectionQuote(snippet: string): string | null {
  const sentences = snippet.split(/(?<=[.!?])\s+/);
  const hit = sentences.find((s) => /unfortunately|not (be )?mov|other candidates|regret|not to proceed/i.test(s));
  if (!hit) return null;
  const words = hit.trim().split(/\s+/);
  return words.length > 14 ? `${words.slice(0, 14).join(" ")}...` : hit.trim();
}

function translator(input: WrappedInput): WrappedCopy["translator"] {
  const { spiceLevel, metrics, sampleEmails } = input;
  const meant = TRANSLATIONS[spiceLevel];
  const fromSamples = sampleEmails
    .filter((e) => e.category === "REJECTED" && e.company)
    .map((e) => ({ company: e.company!, quote: rejectionQuote(e.snippet) }))
    .filter((e): e is { company: string; quote: string } => !!e.quote);

  const seen = new Set<string>();
  const quotes = new Set<string>();
  const items: WrappedCopy["translator"] = [];
  for (const s of fromSamples) {
    if (seen.has(s.company) || quotes.has(s.quote) || items.length === 3) continue;
    seen.add(s.company);
    quotes.add(s.quote);
    items.push({ company: s.company, theySaid: s.quote, theyMeant: meant[items.length]! });
  }
  const extra = [...metrics.companies.rejectedBy, ...metrics.companies.top.map((c) => c.name), "A Stealth Startup"];
  for (const company of extra) {
    if (items.length === 3) break;
    if (seen.has(company)) continue;
    seen.add(company);
    const quote = CANNED_QUOTES.find((q) => !quotes.has(q)) ?? CANNED_QUOTES[0]!;
    quotes.add(quote);
    items.push({ company, theySaid: quote, theyMeant: meant[items.length]! });
  }
  return items;
}

export function buildFallbackCopy(input: WrappedInput): WrappedCopy {
  const { spiceLevel: s, metrics: m, meta } = input;
  const t = m.totals;
  const arch = ARCHETYPES.find((a) => a.match(m)) ?? DEFAULT_ARCHETYPE;
  const peak = m.time.peakHour === null ? null : hourLabel(m.time.peakHour);
  const topCompany = m.companies.top[0]?.name;
  const topPlatform = m.platforms[0];
  const family = m.roles.dominantFamily ?? "your field";
  const wildcard = m.roles.wildcard ?? "Chief Vibes Officer";
  const perWeek = Math.round(m.time.perWeek * 10) / 10;
  const fast = m.responseTimes.fastestRejection;
  const out = m.outreach;
  const slow = m.responseTimes.slowestResponse;

  return {
    intro: {
      headline: by(s, {
        linkedin_safe: "Your career story, wrapped",
        crispy: "Welcome to your job hunt era",
        unhinged: "This year was a lot, huh",
      }),
      subtext: by(s, {
        linkedin_safe: "A year of applications, conversations, and growth. Let's look back.",
        crispy: "We read the room (your inbox). Here's what we found.",
        unhinged: "We went through your inbox. We need to talk.",
      }),
    },
    volume: {
      headline: by(s, {
        linkedin_safe: "That's real momentum",
        crispy: t.applications >= 100 ? "Okay, overachiever" : "Every one counted",
        unhinged: t.applications >= 100 ? "Touch grass? Never heard of it" : "Quality? Or fear?",
      }),
      line: `That's about ${perWeek} a week, every week, for ${meta.windowLabel.toLowerCase()}.`,
    },
    timeline: {
      headline: by(s, { linkedin_safe: "Your year, month by month", crispy: "The rise and grind", unhinged: "Peaks, valleys, panic" }),
      line: m.time.busiestMonth
        ? `${m.time.busiestMonth.label} was your peak with ${plural(m.time.busiestMonth.count, "application")}${
            m.time.quietestMonth && m.time.quietestMonth.label !== m.time.busiestMonth.label
              ? `. ${m.time.quietestMonth.label}? ${by(s, { linkedin_safe: "A well-earned breather.", crispy: "We don't talk about it.", unhinged: "You were in hiding." })}`
              : "."
          }`
        : "Some months you sprinted, some months you rested.",
    },
    streak: {
      line: m.time.busiestDay
        ? `On ${m.time.busiestDay.label} you sent ${plural(m.time.busiestDay.count, "application")} in one day. ${by(s, {
            linkedin_safe: "That's focus.",
            crispy: "Locked in.",
            unhinged: "Were you okay?",
          })}`
        : "Consistency was your secret weapon.",
    },
    clock: {
      timeBadge: peak
        ? by(s, {
            linkedin_safe: `${peak} Power Hour`,
            crispy: `The ${peak} Career Architect`,
            unhinged: `Certified ${peak} Goblin`,
          })
        : "Anytime Applier",
      line:
        m.time.lateNightPct >= 20
          ? `${m.time.lateNightPct}% of your applications went out between 10 PM and 4 AM. ${by(s, {
              linkedin_safe: "Dedication doesn't keep office hours.",
              crispy: "Recruiters were asleep. You were not.",
              unhinged: "Nothing good happens after midnight, except apparently your cover letters.",
            })}`
          : by(s, {
              linkedin_safe: "You kept a healthy, professional rhythm.",
              crispy: "Suspiciously well-adjusted hours. Respect.",
              unhinged: "You apply during business hours like a well-rested psychopath.",
            }),
    },
    weekday: {
      line: m.time.topWeekday
        ? `${m.time.topWeekday}s were your day${m.time.weekendPct >= 20 ? `, and ${m.time.weekendPct}% of your applications went out on weekends` : ""}.`
        : "Every day was application day.",
    },
    platforms: {
      line: topPlatform
        ? `You and ${topPlatform.name} spent a lot of time together: ${plural(topPlatform.count, "application")}. ${by(s, {
            linkedin_safe: "You know the system inside out.",
            crispy: "It knows your work history by heart. You still had to retype it.",
            unhinged: "You've retyped your work history into it more times than you've said I love you.",
          })}`
        : "Most of your applications went straight to the company.",
    },
    companies: {
      line: m.companies.repeat
        ? `You applied to ${m.companies.repeat.name} ${m.companies.repeat.count} times. ${by(s, {
            linkedin_safe: "That's commitment.",
            crispy: "They know your name now.",
            unhinged: "This is a restraining-order situation.",
          })}`
        : topCompany
        ? `${topCompany} topped your list across ${plural(t.companies, "company", "companies")}.`
        : `${plural(t.companies, "company", "companies")} got to know your name.`,
    },
    outreach: !out || out.sent === 0
      ? {
          headline: by(s, { linkedin_safe: "You let your work speak", crispy: "Zero cold emails", unhinged: "Not one cold email" }),
          line: "You let the Apply button do all the talking this year.",
        }
      : {
          headline: by(s, {
            linkedin_safe: "You built real connections",
            crispy: out.replyRatePct >= 30 ? "People actually wrote back" : "Shooting your shot, manually",
            unhinged: out.replyRatePct >= 30 ? "The cold emails worked?!" : "Cold emails, colder replies",
          }),
          line: out.checked
            ? `${out.replyRatePct}% of the people you cold-emailed wrote back.${
                out.dearHiringManager
                  ? ` You opened with "Dear Hiring Manager" ${plural(out.dearHiringManager, "time")}.`
                  : out.topCompany
                  ? ` ${out.topCompany.name} got ${plural(out.topCompany.count, "email")} from you.`
                  : ""
              }`
            : `You sent ${plural(out.sent, "job email")} yourself, including ${plural(out.coverLetters, "cover letter")}.`,
        },
    roles: {
      wildcardRole: wildcard,
      line: by(s, {
        linkedin_safe: `You focused on ${family} roles, with a few bold stretch moves.`,
        crispy: `Mostly ${family}. And then, at some point, "${wildcard}".`,
        unhinged: `${family}, ${family}, ${family}... and then you woke up and chose "${wildcard}".`,
      }),
    },
    ghost: {
      headline: by(s, {
        linkedin_safe: "Navigating the silence",
        crispy: m.rates.ghostRatePct >= 50 ? "Spooky season, all year" : "Not too haunted",
        unhinged: m.rates.ghostRatePct >= 50 ? "Left on read, professionally" : "The ghosts were merciful",
      }),
      line:
        t.ghosted > 0
          ? `${plural(t.ghosted, "application")} never got a reply${m.companies.ghosted[0] ? `, including ${m.companies.ghosted[0]}` : ""}. ${by(s, {
              linkedin_safe: "Their loss.",
              crispy: "\"We review every application\" is fiction.",
              unhinged: "Your resume is haunting their database as we speak.",
            })}`
          : "Everyone got back to you. That almost never happens.",
    },
    rejections: {
      unfortunatelyLine:
        t.unfortunately > 0
          ? `You read the word "unfortunately" ${plural(t.unfortunately, "time")} and still applied the next day.`
          : `Not a single "unfortunately". Who are you?`,
      speedLine: fast
        ? `${fast.company} rejected you in ${fast.hours < 48 ? plural(Math.max(1, Math.round(fast.hours)), "hour") : plural(Math.round(fast.hours / 24), "day")}. ${by(s, {
            linkedin_safe: "Efficient hiring!",
            crispy: "Did anyone read it?",
            unhinged: "A robot read your resume and laughed.",
          })}`
        : slow
        ? `${slow.company} took ${plural(Math.round(slow.days), "day")} to get back to you.`
        : "",
    },
    translator: translator(input),
    interviews: {
      headline:
        t.interviews === 0
          ? by(s, { linkedin_safe: "The pipeline is loading", crispy: "Zero. For now.", unhinged: "The silence is deafening" })
          : by(s, { linkedin_safe: "Your work got noticed", crispy: "They wanted to talk", unhinged: "Someone finally blinked" }),
      line:
        t.interviews === 0
          ? "Interviews are a numbers game, and you've been stacking numbers."
          : `${plural(t.interviews, "company", "companies")} wanted to talk. That's 1 in ${Math.max(1, Math.round(t.applications / t.interviews))} applications turning into a real conversation.`,
    },
    offer: {
      line:
        t.offers > 0
          ? `${m.companies.offersFrom[0] ?? "Someone"} said yes. Every rejection was worth it.`
          : "No offer email yet. The best plot twists come late.",
    },
    personality: {
      archetype: arch.name[s],
      rarity: arch.rarity,
      tagline: arch.tagline[s],
      bio: `You sent ${plural(t.applications, "application")}${peak ? `, mostly around ${peak}` : ""}, and turned them into ${plural(
        t.interviews,
        "interview"
      )}. ${by(s, {
        linkedin_safe: "That's discipline most people never build.",
        crispy: "The market was rough. You were rougher.",
        unhinged: "Scientists are studying your stubbornness.",
      })}`,
      traits: arch.traits,
      auraColors: arch.aura,
      themeSong: arch.song,
    },
    forecast: {
      headline: by(s, { linkedin_safe: "Next year: your year", crispy: "Next year's forecast", unhinged: "A prophecy" }),
      line:
        t.offers > 0
          ? by(s, {
              linkedin_safe: "You'll grow fast in the new role.",
              crispy: "You'll unsubscribe from every job alert with deep satisfaction.",
              unhinged: "You will mute LinkedIn and become insufferable about it.",
            })
          : by(s, {
              linkedin_safe: `The right team${topCompany ? `, maybe even ${topCompany},` : ""} is about to find you.`,
              crispy: `${topCompany ?? "Your dream company"} reposts the role. This time, you get the call.`,
              unhinged: `You'll apply to ${topCompany ?? "the same company"} again. And honestly? Valid.`,
            }),
    },
    signoff: by(s, {
      linkedin_safe: "Proud of you. Keep going.",
      crispy: "Same time next year? Hopefully not.",
      unhinged: "Now close the laptop and drink some water.",
    }),
  };
}
