import type { Category, Metrics, Outreach, SampleEmail } from "../shared/schema";
import { rankRole, roleFamily, seniority } from "./classify";

export interface ScannedEmail {
  key: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  /** ms since epoch, null when Gmail's date couldn't be parsed */
  timestamp: number | null;
  category: Category;
  company: string | null;
  role: string | null;
  platform: string | null;
}

export interface SentEmail {
  key: string;
  recipients: Array<{ name: string; email: string }>;
  subject: string;
  snippet: string;
  timestamp: number | null;
  company: string | null;
  /** You wrote the first message in the thread (outreach), rather than replying to someone */
  startedByMe: boolean;
  /** Someone else wrote in a thread you started */
  replied: boolean;
  coverLetter: boolean;
  resume: boolean;
  followUp: boolean;
  dearHiringManager: boolean;
}

const DAY = 86_400_000;
const GHOST_AFTER_DAYS = 21;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface Journey {
  name: string;
  applied: Ev[];
  appliedCount: number;
  rejected: Ev[];
  interview: Ev[];
  assessment: Ev[];
  offer: Ev[];
}

interface Ev {
  t: number;
  role: string | null;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ts = (e: ScannedEmail) => e.timestamp;
const isNum = (n: number | null): n is number => n !== null;
const top = <T,>(items: T[], score: (t: T) => number) => items.reduce<T | null>((best, t) => (best === null || score(t) > score(best) ? t : best), null);

function countBy<T>(items: T[], key: (t: T) => string | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k) map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

const ranked = (map: Map<string, number>, limit: number) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

function journeys(emails: ScannedEmail[]): Map<string, Journey> {
  const map = new Map<string, Journey>();
  for (const e of emails) {
    if (!e.company) continue;
    const id = e.company.toLowerCase();
    let j = map.get(id);
    if (!j) {
      j = { name: e.company, applied: [], appliedCount: 0, rejected: [], interview: [], assessment: [], offer: [] };
      map.set(id, j);
    }
    if (e.category === "APPLIED") j.appliedCount++;
    if (e.timestamp === null) continue;
    const ev = { t: e.timestamp, role: e.role?.toLowerCase() ?? null };
    if (e.category === "APPLIED") j.applied.push(ev);
    if (e.category === "REJECTED") j.rejected.push(ev);
    if (e.category === "INTERVIEW") j.interview.push(ev);
    if (e.category === "ASSESSMENT") j.assessment.push(ev);
    if (e.category === "OFFER") j.offer.push(ev);
  }
  return map;
}

interface Pair {
  company: string;
  kind: Category;
  days: number;
}

const MATCH_WINDOW_DAYS = 120;

/**
 * Pair each reply with the application it most likely answers: same role if we know it,
 * otherwise the most recent unanswered one within the window. Leftovers were never answered.
 */
function matchReplies(j: Journey): { pairs: Pair[]; unanswered: number[] } {
  const open = [...j.applied].sort((a, b) => a.t - b.t);
  const replies = [
    ...j.rejected.map((e) => ({ ...e, kind: "REJECTED" as const })),
    ...j.interview.map((e) => ({ ...e, kind: "INTERVIEW" as const })),
    ...j.offer.map((e) => ({ ...e, kind: "OFFER" as const })),
    ...j.assessment.map((e) => ({ ...e, kind: "ASSESSMENT" as const })),
  ].sort((a, b) => a.t - b.t);
  const pairs: Pair[] = [];
  for (const r of replies) {
    const candidates = open.filter((a) => a.t <= r.t && r.t - a.t <= MATCH_WINDOW_DAYS * DAY);
    const sameRole = r.role ? candidates.filter((a) => a.role === r.role) : [];
    const pick = (sameRole.length ? sameRole : candidates).at(-1);
    if (!pick) continue;
    open.splice(open.indexOf(pick), 1);
    pairs.push({ company: j.name, kind: r.kind, days: (r.t - pick.t) / DAY });
  }
  return { pairs, unanswered: open.map((a) => a.t) };
}

function streak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const t = new Date(`${d}T12:00:00`).getTime();
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export function analyzeOutreach(sent: SentEmail[]): Outreach {
  // Reply rate only counts threads you started: replying to a recruiter isn't outreach.
  const started = sent.filter((s) => s.startedByMe);
  const replied = started.filter((s) => s.replied).length;
  const people = new Set(sent.flatMap((s) => s.recipients.map((r) => r.email)));
  const byCompany = countBy(sent, (s) => s.company);
  const topCompany = ranked(byCompany, 1)[0];
  return {
    sent: sent.length,
    cold: started.length,
    people: people.size,
    checked: started.length,
    replied,
    replyRatePct: pct(replied, started.length),
    coverLetters: sent.filter((s) => s.coverLetter).length,
    resumes: sent.filter((s) => s.resume).length,
    followUps: sent.filter((s) => s.followUp).length,
    dearHiringManager: sent.filter((s) => s.dearHiringManager).length,
    topCompany: topCompany && topCompany.count >= 2 ? topCompany : null,
    companies: ranked(byCompany, 12).map((c) => c.name),
  };
}

export function analyze(
  all: ScannedEmail[],
  now = Date.now(),
  outbox: { sent: SentEmail[] } | null = null
): { metrics: Metrics; samples: SampleEmail[] } {
  // Programs (hackathons, fellowships…) and anything unlabelled stay out of the job numbers.
  const emails = all.filter((e) => e.category !== "PROGRAM" && e.category !== "OTHER");
  const programs = all.filter((e) => e.category === "PROGRAM");
  const programNames = ranked(countBy(programs, (e) => e.company), 8).map((p) => p.name);
  const byCat = (c: Category) => emails.filter((e) => e.category === c);
  const applied = byCat("APPLIED");
  const outcomeOnly = (c: Category) => byCat(c).filter((e) => !e.company).length;

  const companies = [...journeys(emails).values()];
  const hasResponse = (j: Journey) => j.rejected.length + j.interview.length + j.assessment.length + j.offer.length > 0;
  const appliedCompanies = companies.filter((j) => j.appliedCount > 0 || hasResponse(j));
  const matches = companies.map(matchReplies);
  const ghostedApps = matches.flatMap((m) => m.unanswered.filter((t) => t < now - GHOST_AFTER_DAYS * DAY));
  const pendingApps = matches.reduce((n, m) => n + m.unanswered.length, 0) - ghostedApps.length;
  const answered = matches.reduce((n, m) => n + m.pairs.length, 0);
  const silentCompanies = appliedCompanies.filter((j) => !hasResponse(j) && j.applied.some((a) => a.t < now - GHOST_AFTER_DAYS * DAY));
  const responded = appliedCompanies.filter(hasResponse);
  const rejectedCos = companies.filter((j) => j.rejected.length > 0);
  const interviewCos = companies.filter((j) => j.interview.length > 0);
  const offerCos = companies.filter((j) => j.offer.length > 0);

  // Applications we have evidence for: every confirmation, plus companies that replied without one.
  const applications = applied.length + companies.filter((j) => j.appliedCount === 0 && hasResponse(j)).length;
  const interviews = interviewCos.length + outcomeOnly("INTERVIEW");
  const offers = offerCos.length + outcomeOnly("OFFER");
  const assessments = companies.filter((j) => j.assessment.length > 0).length + outcomeOnly("ASSESSMENT");

  // Confirmation emails land within minutes of hitting Apply, so they approximate when you applied.
  const timeSource = (applied.some((e) => e.timestamp !== null) ? applied : emails).map(ts).filter(isNum);
  const hourCounts = Array.from({ length: 24 }, () => 0);
  const weekdayCounts = Array.from({ length: 7 }, () => 0);
  for (const t of timeSource) {
    const d = new Date(t);
    hourCounts[d.getHours()]!++;
    weekdayCounts[d.getDay()]!++;
  }
  const peakHour = timeSource.length ? hourCounts.indexOf(Math.max(...hourCounts)) : null;
  const lateNight = hourCounts.reduce((sum, n, h) => (h >= 22 || h < 4 ? sum + n : sum), 0);
  const topWeekdayIdx = timeSource.length ? weekdayCounts.indexOf(Math.max(...weekdayCounts)) : -1;

  const nowDate = new Date(now);
  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, month: d.getMonth() };
  });
  const monthCounts = countBy(timeSource, (t) => dayKey(t).slice(0, 7));
  const monthly = monthKeys.map(({ key, month }) => ({ key, label: MONTHS[month]!.slice(0, 3), count: monthCounts.get(key) ?? 0 }));
  const firstActive = monthly.findIndex((m) => m.count > 0);
  const activeMonths = firstActive === -1 ? [] : monthly.slice(firstActive);
  const busiest = top(activeMonths, (m) => m.count);
  const quietest = top(activeMonths, (m) => -m.count);
  const fullMonth = (m: { key: string } | null) => (m ? MONTHS[Number(m.key.slice(5)) - 1]! : "");

  const days = timeSource.map(dayKey);
  const dayCounts = countBy(days, (d) => d);
  const busiestDay = ranked(dayCounts, 1)[0];
  const span = timeSource.length ? Math.max(...timeSource) - Math.min(...timeSource) : 0;
  const weeks = Math.max(1, span / (7 * DAY));

  const datedApplied = applied.filter((e) => e.timestamp !== null).sort((a, b) => a.timestamp! - b.timestamp!);
  const asDated = (e: ScannedEmail | undefined) =>
    e ? { company: e.company, role: e.role, date: new Date(e.timestamp!).toISOString() } : null;

  const platformSource = applied.length ? applied : emails;
  const platformCounts = countBy(platformSource, (e) => e.platform);
  const viaPlatform = [...platformCounts.values()].reduce((a, b) => a + b, 0);

  const companyApps = appliedCompanies
    .map((j) => ({ name: j.name, count: Math.max(1, j.appliedCount) }))
    .sort((a, b) => b.count - a.count);
  const repeat = companyApps[0] && companyApps[0].count >= 2 ? companyApps[0] : null;

  const roleSource = emails.filter((e) => e.role);
  const roleCounts = new Map<string, { title: string; count: number }>();
  for (const e of roleSource) {
    const id = e.role!.toLowerCase();
    const entry = roleCounts.get(id) ?? { title: e.role!, count: 0 };
    entry.count++;
    roleCounts.set(id, entry);
  }
  const uniqueRoles = [...roleCounts.values()].sort((a, b) => b.count - a.count);
  const familyCounts = countBy(roleSource, (e) => roleFamily(e.role!));
  const families = ranked(familyCounts, 10);
  const dominantFamily = families.find((f) => f.name !== "Other")?.name ?? families[0]?.name ?? null;
  const offFamily = uniqueRoles.filter((r) => roleFamily(r.title) !== dominantFamily && roleFamily(r.title) !== "Other");
  const wildcard =
    top(offFamily, (r) => -(familyCounts.get(roleFamily(r.title)) ?? 0))?.title ??
    top(uniqueRoles.filter((r) => rankRole(r.title) > 0), (r) => rankRole(r.title))?.title ??
    null;

  const pairs = matches.flatMap((m) => m.pairs);
  const rejectionGaps = pairs.filter((p) => p.kind === "REJECTED");
  const interviewGaps = pairs.filter((p) => p.kind === "INTERVIEW");
  const fastest = top(rejectionGaps, (g) => -g.days);
  const slowest = top([...rejectionGaps, ...interviewGaps], (g) => g.days);
  const avg = (xs: { days: number }[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x.days, 0) / xs.length) * 10) / 10 : null);

  const metrics: Metrics = {
    totals: {
      applications,
      companies: appliedCompanies.length,
      rejections: byCat("REJECTED").length,
      interviews,
      assessments,
      offers,
      ghosted: ghostedApps.length,
      pending: pendingApps,
      responded: responded.length,
      answered,
      unfortunately: emails.filter((e) => /unfortunately/i.test(`${e.subject} ${e.snippet}`)).length,
    },
    rates: {
      ghostRatePct: pct(ghostedApps.length, ghostedApps.length + answered),
      responseRatePct: pct(answered, ghostedApps.length + answered),
      interviewRatePct: pct(interviews, applications),
      rejectionRatePct: pct(rejectedCos.length, appliedCompanies.length),
    },
    time: {
      peakHour,
      hourCounts,
      lateNightPct: pct(lateNight, timeSource.length),
      weekdayCounts,
      topWeekday: topWeekdayIdx >= 0 ? WEEKDAYS[topWeekdayIdx]! : null,
      weekendPct: pct(weekdayCounts[0]! + weekdayCounts[6]!, timeSource.length),
      monthly,
      busiestMonth: busiest && busiest.count > 0 ? { label: fullMonth(busiest), count: busiest.count } : null,
      quietestMonth: quietest && busiest && quietest.key !== busiest.key ? { label: fullMonth(quietest), count: quietest.count } : null,
      busiestDay: busiestDay
        ? {
            date: busiestDay.name,
            label: new Date(`${busiestDay.name}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
            count: busiestDay.count,
          }
        : null,
      longestStreakDays: streak(days),
      activeDays: dayCounts.size,
      perWeek: Math.round((timeSource.length / weeks) * 10) / 10,
      firstApplication: asDated(datedApplied[0]),
      lastApplication: asDated(datedApplied[datedApplied.length - 1]),
    },
    platforms: ranked(platformCounts, 6),
    directPct: pct(platformSource.length - viaPlatform, platformSource.length),
    companies: {
      top: companyApps.slice(0, 10),
      repeat,
      ghosted: silentCompanies.map((j) => j.name).slice(0, 16),
      rejectedBy: rejectedCos.map((j) => j.name).slice(0, 16),
      interviewedWith: interviewCos.map((j) => j.name).slice(0, 16),
      offersFrom: offerCos.map((j) => j.name).slice(0, 8),
    },
    roles: {
      top: uniqueRoles.slice(0, 8).map((r) => ({ name: r.title, count: r.count })),
      families,
      dominantFamily,
      seniority: {
        senior: uniqueRoles.filter((r) => seniority(r.title) === "senior").length,
        junior: uniqueRoles.filter((r) => seniority(r.title) === "junior").length,
      },
      wildcard,
      all: uniqueRoles.slice(0, 40).map((r) => r.title),
    },
    outreach: outbox ? analyzeOutreach(outbox.sent) : null,
    programs: { count: programs.length, names: programNames },
    responseTimes: {
      fastestRejection: fastest ? { company: fastest.company, hours: Math.round(fastest.days * 24 * 10) / 10 } : null,
      slowestResponse: slowest && slowest.days >= 7 ? { company: slowest.company, days: Math.round(slowest.days) } : null,
      avgDaysToRejection: avg(rejectionGaps),
      avgDaysToInterview: avg(interviewGaps),
    },
  };

  return { metrics, samples: pickSamples(emails) };
}

const SAMPLE_QUOTA: Array<[Category, number]> = [
  ["REJECTED", 12],
  ["INTERVIEW", 6],
  ["OFFER", 3],
  ["ASSESSMENT", 3],
  ["APPLIED", 12],
];

function pickSamples(emails: ScannedEmail[]): SampleEmail[] {
  const out: SampleEmail[] = [];
  for (const [category, quota] of SAMPLE_QUOTA) {
    for (const e of emails.filter((x) => x.category === category).slice(0, quota)) {
      out.push({
        company: e.company,
        role: e.role,
        subject: e.subject.slice(0, 140),
        snippet: e.snippet.slice(0, 160),
        date: e.timestamp ? new Date(e.timestamp).toISOString() : "",
        category: e.category,
      });
    }
  }
  return out.slice(0, 36);
}
