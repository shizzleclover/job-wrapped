import { classify, classifySent, extractCompany, extractRole, platformFor, type Verdict } from "../../lib/classify";
import type { ScannedEmail, SentEmail } from "../../lib/analyze";

export interface ScanProgress {
  label: string;
  pct: number;
  found: Record<"APPLIED" | "REJECTED" | "INTERVIEW" | "OFFER" | "SENT", number>;
}

/** Every received row we looked at, kept or not, with why. Feeds the AI check, the review and the scan report. */
export interface ScanItem {
  email: ScannedEmail;
  verdict: Verdict;
}

export interface ScanResult {
  items: ScanItem[];
  sent: SentEmail[] | null;
  threads: number;
  truncated: boolean;
}

const MAX_PAGES = 5;
// Digests, communities and promos live in these tabs; real company emails land in Primary or Updates.
const WINDOW = "newer_than:1y -from:me -category:promotions -category:social -category:forums";

interface Step {
  label: string;
  q: string;
  pages: number;
}

const RECEIVED: Step[] = [
  {
    label: "Finding every application you sent",
    q: `("thank you for applying" OR "thanks for applying" OR "thank you for your application" OR "thanks for your application" OR "application received" OR "received your application" OR "we got your application" OR "your application to" OR "your application for" OR "your application was sent" OR "application submitted" OR "application confirmation" OR "application is under review" OR "successfully submitted" OR "Indeed Application" OR "you applied" OR "thanks for your interest") ${WINDOW}`,
    pages: MAX_PAGES,
  },
  {
    label: "Counting the 'unfortunately' emails",
    q: `("unfortunately" OR "not moving forward" OR "won't be moving forward" OR "other candidates" OR "not to proceed" OR "we regret" OR "position has been filled" OR "after careful consideration") ("application" OR "role" OR "position" OR "candidacy") ${WINDOW}`,
    pages: MAX_PAGES,
  },
  {
    label: "Looking for interview invites",
    q: `("interview" OR "phone screen" OR "coding challenge" OR "take-home" OR "hackerrank" OR "codesignal") ("schedule" OR "invite" OR "invitation" OR "availability" OR "next round" OR "complete") ${WINDOW}`,
    pages: 3,
  },
  {
    label: "Checking for any offers",
    q: `("offer letter" OR "pleased to offer you" OR "excited to offer you" OR "pleased to extend" OR "offer of employment") ${WINDOW}`,
    pages: 1,
  },
  {
    label: "Spotting your side quests",
    q: `(hackathon OR fellowship OR accelerator OR bootcamp OR cohort OR scholarship) (application OR applying OR applied OR accepted OR registration) ${WINDOW}`,
    pages: 2,
  },
];

const SENT: Step = {
  label: "Reading your outreach and cover letters",
  q: `in:sent newer_than:1y (resume OR CV OR "cover letter" OR portfolio OR role OR position OR opportunity OR internship OR referral OR application OR applying OR interview OR hiring OR job OR recruiter)`,
  pages: MAX_PAGES,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const visible = (el: Element) => (el as HTMLElement).offsetParent !== null;
const NO_REPLY = /no-?reply|do-?not-?reply|notifications?@|mailer-daemon|postmaster/i;

function visibleRows(): HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>('div[role="main"] tr.zA')).filter(visible);
}

function signature(): string {
  const rows = visibleRows();
  return `${rows.length}|${rows
    .slice(0, 3)
    .map((r) => r.innerText.slice(0, 80))
    .join("|")}`;
}

function showsNoResults(): boolean {
  return Array.from(document.querySelectorAll('div[role="main"] td.TC')).some(visible);
}

function isLastPage(): boolean {
  const older = Array.from(document.querySelectorAll('div[role="button"][aria-label="Older"]')).find(visible);
  return !older || older.getAttribute("aria-disabled") === "true";
}

/** Navigate Gmail and wait until the list actually re-renders, instead of sleeping a fixed time. */
async function navigate(hash: string): Promise<void> {
  const before = signature();
  window.location.hash = hash;
  const start = Date.now();
  while (Date.now() - start < 8000) {
    await sleep(150);
    if (showsNoResults()) return;
    if (signature() !== before && visibleRows().length > 0) {
      await sleep(350);
      return;
    }
  }
}

function parseGmailDate(raw: string): number | null {
  if (!raw) return null;
  const attempts = [raw, raw.replace(/^[A-Za-z]{3},\s*/, ""), raw.replace(/^[A-Za-z]{3},\s*/, "").replace(/,(\s*\d{1,2}:\d{2})/, "$1")];
  for (const a of attempts) {
    const t = new Date(a).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function selfEmail(): string | null {
  return document.title.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0]?.toLowerCase() ?? null;
}

interface RowParts {
  key: string;
  /** Everyone in the thread except you, in the order Gmail lists them */
  people: Array<{ name: string; email: string }>;
  /** Gmail lists thread participants in writing order, so "me, Jane" means you wrote first */
  startedByMe: boolean;
  subject: string;
  snippet: string;
  timestamp: number | null;
}

function rowParts(row: HTMLTableRowElement, me: string | null): RowParts | null {
  const everyone = Array.from(row.querySelectorAll<HTMLElement>("span[email]")).map((s) => {
    const email = (s.getAttribute("email") ?? "").toLowerCase();
    return { name: s.getAttribute("name") || s.innerText.trim(), email, isMe: s.innerText.trim().toLowerCase() === "me" || email === me };
  });
  const people = everyone.filter((p) => p.email && !p.isMe).map(({ name, email }) => ({ name, email }));
  const subject = row.querySelector<HTMLElement>(".bog")?.innerText.trim() ?? "";
  const snippet = (row.querySelector<HTMLElement>(".y2")?.innerText ?? "").replace(/^\s*[-–]\s*/, "").trim();
  if (!subject && !snippet) return null;
  const dateEl = row.querySelector<HTMLElement>("td.xW span[title], td.xW span");
  const threadId =
    row.querySelector("[data-thread-id]")?.getAttribute("data-thread-id") ??
    row.querySelector("[data-legacy-thread-id]")?.getAttribute("data-legacy-thread-id");
  const timestamp = parseGmailDate(dateEl?.getAttribute("title") || dateEl?.innerText || "");
  return {
    key: threadId ?? `${people[0]?.email ?? ""}|${subject}|${timestamp ?? ""}`,
    people,
    startedByMe: everyone[0]?.isMe ?? false,
    subject,
    snippet: snippet.slice(0, 200),
    timestamp,
  };
}

function parseReceived(p: RowParts): ScanItem {
  const sender = p.people[0] ?? { name: "", email: "" };
  const verdict = classify(p.subject, p.snippet, sender.name, sender.email);
  const email: ScannedEmail = {
    key: p.key,
    senderName: sender.name,
    senderEmail: sender.email,
    subject: p.subject,
    snippet: p.snippet,
    timestamp: p.timestamp,
    category: verdict.label ?? "OTHER",
    company: extractCompany(sender.name, sender.email, p.subject, p.snippet),
    role: extractRole(p.subject, p.snippet),
    platform: platformFor(sender.email),
  };
  return { email, verdict };
}

function parseSent(p: RowParts): SentEmail | null {
  const signals = classifySent(p.subject, p.snippet);
  // A thread with only you in it is an email nobody has answered yet: still counts.
  const others = p.people.filter((r) => !NO_REPLY.test(r.email));
  const first = others[0];
  return {
    key: p.key,
    recipients: others,
    subject: p.subject,
    snippet: p.snippet,
    timestamp: p.timestamp,
    company: first ? extractCompany(first.name, first.email, p.subject, p.snippet) : extractCompany("", "", p.subject, p.snippet),
    startedByMe: p.startedByMe,
    replied: p.startedByMe && others.length > 0,
    ...signals,
  };
}

export async function scanGmail(onProgress: (p: ScanProgress) => void, opts: { includeSent: boolean }): Promise<ScanResult> {
  const originalHash = window.location.hash || "#inbox";
  const me = selfEmail();
  const received = new Map<string, ScanItem>();
  const sent = new Map<string, SentEmail>();
  const steps = [...RECEIVED, ...(opts.includeSent ? [SENT] : [])];
  const totalSteps = steps.reduce((s, q) => s + q.pages, 0);
  let done = 0;
  let truncated = false;

  const report = (label: string) => {
    const found = { APPLIED: 0, REJECTED: 0, INTERVIEW: 0, OFFER: 0, SENT: sent.size };
    for (const { email: e } of received.values()) {
      if (e.category === "ASSESSMENT") found.INTERVIEW++;
      else if (e.category !== "OTHER" && e.category !== "PROGRAM") found[e.category]++;
    }
    onProgress({ label, pct: Math.round((done / totalSteps) * 100), found });
  };

  /** Runs a search across its pages and hands every visible row to `take`. Returns rows added. */
  const crawl = async (step: Step, take: (p: RowParts) => boolean) => {
    for (let page = 1; page <= step.pages; page++) {
      report(step.label);
      await navigate(`#search/${encodeURIComponent(step.q)}${page > 1 ? `/p${page}` : ""}`);
      let added = 0;
      for (const row of visibleRows()) {
        const parts = rowParts(row, me);
        if (parts && take(parts)) added++;
      }
      done++;
      if (showsNoResults() || isLastPage() || added === 0) {
        done += step.pages - page;
        return;
      }
      if (page === step.pages) truncated = true;
    }
  };

  try {
    for (const step of RECEIVED) {
      await crawl(step, (p) => {
        if (received.has(p.key)) return false;
        received.set(p.key, parseReceived(p));
        return true;
      });
    }

    if (opts.includeSent) {
      await crawl(SENT, (p) => {
        if (sent.has(p.key)) return false;
        const email = parseSent(p);
        if (email) sent.set(email.key, email);
        return true;
      });

    }
  } finally {
    window.location.hash = originalHash;
  }

  done = totalSteps;
  report("Crunching the numbers");
  return {
    items: [...received.values()],
    sent: opts.includeSent ? [...sent.values()] : null,
    threads: received.size + sent.size,
    truncated,
  };
}
