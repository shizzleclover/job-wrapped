// Canonical copy. web/lib/wrapped/ is synced from this folder by `npm run sync-shared` in web/.
import { z } from "zod";

export const SpiceLevelSchema = z.enum(["linkedin_safe", "crispy", "unhinged"]);
export type SpiceLevel = z.infer<typeof SpiceLevelSchema>;

export const CategorySchema = z.enum(["APPLIED", "REJECTED", "INTERVIEW", "ASSESSMENT", "OFFER", "OTHER"]);
export type Category = z.infer<typeof CategorySchema>;

const Count = z.number().int().min(0).max(1_000_000);
const Pct = z.number().min(0).max(100);
const Name = z.string().max(80);
const Named = z.object({ name: Name, count: Count });

export const SampleEmailSchema = z.object({
  company: Name.nullable(),
  role: Name.nullable(),
  subject: z.string().max(200),
  snippet: z.string().max(200),
  date: z.string().max(40),
  category: CategorySchema,
});
export type SampleEmail = z.infer<typeof SampleEmailSchema>;

export const OutreachSchema = z.object({
  /** Job-related emails the user sent */
  sent: Count,
  /** Sent to people who hadn't emailed them about a job first */
  cold: Count,
  people: Count,
  /** Of the cold contacts we checked, how many ever wrote back */
  checked: Count,
  replied: Count,
  replyRatePct: Pct,
  coverLetters: Count,
  resumes: Count,
  followUps: Count,
  dearHiringManager: Count,
  topCompany: Named.nullable(),
  companies: z.array(Name).max(12),
});
export type Outreach = z.infer<typeof OutreachSchema>;

const Dated = z.object({ company: Name.nullable(), role: Name.nullable(), date: z.string().max(40) });

export const MetricsSchema = z.object({
  totals: z.object({
    applications: Count,
    companies: Count,
    rejections: Count,
    interviews: Count,
    assessments: Count,
    offers: Count,
    ghosted: Count,
    pending: Count,
    responded: Count,
    /** Applications that got any reply */
    answered: Count,
    unfortunately: Count,
  }),
  rates: z.object({
    ghostRatePct: Pct,
    responseRatePct: Pct,
    interviewRatePct: Pct,
    rejectionRatePct: Pct,
  }),
  time: z.object({
    /** 0-23, local time, based on application confirmation emails */
    peakHour: z.number().int().min(0).max(23).nullable(),
    hourCounts: z.array(Count).length(24),
    lateNightPct: Pct,
    /** Sunday-first */
    weekdayCounts: z.array(Count).length(7),
    topWeekday: z.string().max(12).nullable(),
    weekendPct: Pct,
    monthly: z.array(z.object({ key: z.string().max(7), label: z.string().max(4), count: Count })).max(12),
    busiestMonth: z.object({ label: z.string().max(12), count: Count }).nullable(),
    quietestMonth: z.object({ label: z.string().max(12), count: Count }).nullable(),
    busiestDay: z.object({ date: z.string().max(10), label: z.string().max(24), count: Count }).nullable(),
    longestStreakDays: Count,
    activeDays: Count,
    perWeek: z.number().min(0).max(10_000),
    firstApplication: Dated.nullable(),
    lastApplication: Dated.nullable(),
  }),
  platforms: z.array(Named).max(8),
  directPct: Pct,
  companies: z.object({
    top: z.array(Named).max(10),
    repeat: Named.nullable(),
    ghosted: z.array(Name).max(16),
    rejectedBy: z.array(Name).max(16),
    interviewedWith: z.array(Name).max(16),
    offersFrom: z.array(Name).max(8),
  }),
  roles: z.object({
    top: z.array(Named).max(8),
    families: z.array(Named).max(10),
    dominantFamily: Name.nullable(),
    seniority: z.object({ senior: Count, junior: Count }),
    wildcard: Name.nullable(),
    all: z.array(Name).max(40),
  }),
  /** Null when the user chose not to scan sent mail */
  outreach: OutreachSchema.nullable(),
  responseTimes: z.object({
    fastestRejection: z.object({ company: Name, hours: z.number().min(0) }).nullable(),
    slowestResponse: z.object({ company: Name, days: z.number().min(0) }).nullable(),
    avgDaysToRejection: z.number().min(0).nullable(),
    avgDaysToInterview: z.number().min(0).nullable(),
  }),
});
export type Metrics = z.infer<typeof MetricsSchema>;

export const WrappedInputSchema = z.object({
  spiceLevel: SpiceLevelSchema,
  metrics: MetricsSchema,
  /** Empty when the user opts out of sharing email text with the AI writer. */
  sampleEmails: z.array(SampleEmailSchema).max(40),
  meta: z.object({
    year: z.number().int(),
    windowLabel: z.string().max(40),
    scannedThreads: Count,
    truncated: z.boolean(),
    isDemo: z.boolean(),
    generatedAt: z.string().max(40),
  }),
});
export type WrappedInput = z.infer<typeof WrappedInputSchema>;

const line = (d: string) => z.string().describe(d);

export const WrappedCopySchema = z.object({
  intro: z.object({
    headline: line("Punchy 3-7 word opener for their year. No numbers."),
    subtext: line("One witty sentence that sets up the story to come."),
  }),
  volume: z.object({
    headline: line("2-6 word reaction to their total application count"),
    line: line("One sentence putting the count in perspective (per week, per day, etc)"),
  }),
  timeline: z.object({
    headline: line("2-6 words about how their year unfolded month to month"),
    line: line("One sentence about their busiest and quietest months"),
  }),
  streak: z.object({ line: line("One sentence about their longest daily streak and busiest single day") }),
  clock: z.object({
    timeBadge: line("Funny 2-5 word title for when they apply, e.g. '1 AM LinkedIn Goblin'"),
    line: line("One sentence roasting or celebrating their peak hour and late-night share"),
  }),
  weekday: z.object({ line: line("One sentence about their favorite weekday to apply and weekend habits") }),
  platforms: z.object({ line: line("One sentence about the hiring platforms (ATS) they fought most") }),
  companies: z.object({ line: line("One sentence about the companies they chased, mention a real one") }),
  outreach: z.object({
    headline: line("2-6 word reaction to the cold emails and cover letters they sent. If there is no outreach data, joke that they let their inbox do the work."),
    line: line("One sentence about their reply rate, follow-ups or 'Dear Hiring Manager' habit"),
  }),
  roles: z.object({
    wildcardRole: line("The funniest reach or outlier role from their list (use a real one if given)"),
    line: line("One sentence comparing their main role family with the wildcard"),
  }),
  ghost: z.object({
    headline: line("2-6 word reaction to their ghosting rate"),
    line: line("One sentence about the companies that never replied"),
  }),
  rejections: z.object({
    unfortunatelyLine: line("One sentence about how many times they read 'unfortunately'"),
    speedLine: line("One sentence about their fastest rejection or slowest reply. Empty string if no data."),
  }),
  translator: z
    .array(
      z.object({
        company: line("A real company from their rejections"),
        theySaid: line("A short quote (under 15 words) based on the rejection snippet"),
        theyMeant: line("Brutally honest, funny translation, under 18 words"),
      })
    )
    .min(1)
    .max(3),
  interviews: z.object({
    headline: line("2-6 word reaction to their interview count"),
    line: line("One sentence about their interview conversion rate. Hype them up."),
  }),
  offer: z.object({ line: line("One celebratory sentence if they got offers, otherwise an encouraging one") }),
  personality: z.object({
    archetype: line("Creative 2-5 word persona title, e.g. 'The 2AM Greenhouse Alchemist'"),
    rarity: line("Short badge, e.g. 'TOP 0.8% OF LATE-NIGHT GRINDERS'"),
    tagline: line("One-line motto for their job hunt energy"),
    bio: line("2-3 sentence personalized character analysis based on their stats"),
    traits: z.array(z.string()).length(3).describe("3 short traits, 2-4 words each"),
    // An array, not a tuple: Gemini's structured output rejects tuple schemas.
    auraColors: z
      .array(z.string())
      .length(3)
      .describe("Three vibrant 6-digit hex colors, e.g. ['#FF2A85', '#7928CA', '#00F0FF']"),
    themeSong: z.object({
      title: z.string(),
      artist: z.string(),
      reason: line("Short reason why this real song fits their job hunt"),
    }),
  }),
  forecast: z.object({
    headline: line("2-6 word prediction for their next year"),
    line: line("One sentence, specific and funny, about what happens next"),
  }),
  signoff: line("A short closing line, under 12 words"),
});
export type WrappedCopy = z.infer<typeof WrappedCopySchema>;

/** The theme song, resolved on Spotify by the server. */
export const TrackSchema = z.object({
  id: z.string().max(40),
  title: z.string().max(200),
  artist: z.string().max(200),
  albumArt: z.string().url().nullable(),
  url: z.string().url(),
});
export type Track = z.infer<typeof TrackSchema>;

export const WrappedResponseSchema = z.object({
  copy: WrappedCopySchema,
  source: z.enum(["ai", "fallback"]),
  track: TrackSchema.nullable().optional(),
});
export type WrappedResponse = z.infer<typeof WrappedResponseSchema>;

export const CardStyleSchema = z.enum(["aura", "bold", "paper"]);
export type CardStyle = z.infer<typeof CardStyleSchema>;

const Hex = z.string().regex(/^#[0-9a-f]{6}$/i);

/** Everything a share link carries. Short keys keep URLs short; nothing here identifies the user. */
export const ShareCardSchema = z.object({
  v: z.literal(1),
  y: z.number().int().min(2000).max(2100),
  a: z.string().max(80),
  t: z.string().max(160),
  r: z.string().max(60),
  c: z.array(Hex).length(3),
  s: z.object({ apps: Count, int: Count, ghost: Pct, off: Count, unf: Count }),
  co: z.array(Name).max(5),
  p: Name.nullable(),
  h: z.string().max(8).nullable(),
  m: z.object({ t: z.string().max(120), a: z.string().max(120) }),
  st: CardStyleSchema,
});
export type ShareCard = z.infer<typeof ShareCardSchema>;
