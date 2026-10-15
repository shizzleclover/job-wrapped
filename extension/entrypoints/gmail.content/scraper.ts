import { classify, classifySent, extractCompany, extractRole, platformFor } from "../../lib/classify";
import type { ReplyChecks, ScannedEmail, SentEmail } from "../../lib/analyze";

export interface ScanProgress {
  label: string;
  pct: number;
  found: Record<"APPLIED" | "REJECTED" | "INTERVIEW" | "OFFER" | "SENT", number>;
}

export interface ScanResult {
  emails: ScannedEmail[];
  sent: SentEmail[] | null;
  /** Which cold contacts we checked for a reply, and which of them wrote back */
  replyChecks: ReplyChecks;
  threads: number;
  truncated: boolean;
}

const MAX_PAGES = 5;
const WINDOW = "newer_than:1y -from:me";
const REPLY_BATCH = 15;
const MAX_REPLY_CHECKS = 60;

interface Step {
  label: string;
  q: string;
  pages: number;
}

const RECEIVED: Step[] = [
  {
    label: "Finding every application you sent",
    q: `("thank you for applying" OR "thanks for applying" OR "application received" OR "received your application" OR "your application to" OR "your application was sent" OR "application submitted" OR "application is under review") ${WINDOW}`,
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
];

const SENT: Step = {
  label: "Reading your outreach and cover letters",
  q: `in:sent newer_than:1y (resume OR CV OR "cover letter" OR portfolio OR "the role" OR "the position" OR "job opening" OR internship OR referral OR "applying for" OR "application for")`,
  pages: 3,
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
  people: Array<{ name: string; email: string }>;
  subject: string;
  snippet: string;
  timestamp: number | null;
}

function rowParts(row: HTMLTableRowElement, me: string | null): RowParts | null {
  const people = Array.from(row.querySelectorAll<HTMLElement>("span[email]"))
    .map((s) => ({ name: s.getAttribute("name") || s.innerText.trim(), email: (s.getAttribute("email") ?? "").toLowerCase() }))
    .filter((p) => p.email && p.name !== "me" && p.email !== me);
  const subject = row.querySelector<HTMLElement>(".bog")?.innerText.trim() ?? "";
  const snippet = (row.querySelector<HTMLElement>(".y2")?.innerText ?? "").replace(/^\s*[-–]\s*/, "").trim();
  if (!subject && !snippet) return null;
  const dateEl = row.querySelector<HTMLElement>("td.xW span[title], td.xW span");
  const threadId =
    row.querySelector("[data-thread-id]")?.getAttribute("data-thread-id") ??
    row.querySelector("[data-legacy-thread-id]")?.getAttribute("data-legacy-thread-id");
  const timestamp = parseGmailDate(dateEl?.getAttribute("title") || dateEl?.innerText || "");
  return { key: threadId ?? `${people[0]?.email ?? ""}|${subject}|${timestamp ?? ""}`, people, subject, snippet: snippet.slice(0, 200), timestamp };
}

function parseReceived(p: RowParts): ScannedEmail | null {
  const category = classify(p.subject, p.snippet);
  if (!category) return null;
  const sender = p.people[0] ?? { name: "", email: "" };
  return {
    key: p.key,
    senderName: sender.name,
    senderEmail: sender.email,
    subject: p.subject,
    snippet: p.snippet,
    timestamp: p.timestamp,
    category,
    company: extractCompany(sender.name, sender.email, p.subject, p.snippet),
    role: extractRole(p.subject, p.snippet),
    platform: platformFor(sender.email),
  };
}

function parseSent(p: RowParts): SentEmail | null {
  const signals = classifySent(p.subject, p.snippet);
  const recipients = p.people.filter((r) => !NO_REPLY.test(r.email));
  if (!signals || recipients.length === 0) return null;
  const first = recipients[0]!;
  return {
    key: p.key,
    recipients,
    subject: p.subject,
    snippet: p.snippet,
    timestamp: p.timestamp,
    company: extractCompany(first.name, first.email, p.subject, p.snippet),
    ...signals,
  };
}

export async function scanGmail(onProgress: (p: ScanProgress) => void, opts: { includeSent: boolean }): Promise<ScanResult> {
  const originalHash = window.location.hash || "#inbox";
  const me = selfEmail();
  const received = new Map<string, ScannedEmail>();
  const sent = new Map<string, SentEmail>();
  const replied = new Set<string>();
  let checkedContacts: string[] = [];
  const steps = [...RECEIVED, ...(opts.includeSent ? [SENT] : [])];
  const replyBatches = opts.includeSent ? MAX_REPLY_CHECKS / REPLY_BATCH : 0;
  const totalSteps = steps.reduce((s, q) => s + q.pages, 0) + replyBatches;
  let done = 0;
  let truncated = false;

  const report = (label: string) => {
    const found = { APPLIED: 0, REJECTED: 0, INTERVIEW: 0, OFFER: 0, SENT: sent.size };
    for (const e of received.values()) {
      if (e.category === "ASSESSMENT") found.INTERVIEW++;
      else if (e.category !== "OTHER") found[e.category]++;
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
        const email = parseReceived(p);
        if (!email || received.has(email.key)) return false;
        received.set(email.key, email);
        return true;
      });
    }

    if (opts.includeSent) {
      await crawl(SENT, (p) => {
        const email = parseSent(p);
        if (!email || sent.has(email.key)) return false;
        sent.set(email.key, email);
        return true;
      });

      // Did the people you reached out to ever write back? Ask Gmail directly, in batches.
      const known = new Set([...received.values()].map((e) => e.senderEmail));
      const contacts = [...new Set([...sent.values()].flatMap((s) => s.recipients.map((r) => r.email)))].filter((e) => !known.has(e));
      const checks = contacts.slice(0, MAX_REPLY_CHECKS);
      checkedContacts = checks;
      for (let i = 0; i < checks.length; i += REPLY_BATCH) {
        const batch = checks.slice(i, i + REPLY_BATCH);
        report("Checking who wrote back");
        await navigate(`#search/${encodeURIComponent(`from:(${batch.join(" OR ")}) newer_than:1y`)}`);
        for (const row of visibleRows()) {
          for (const p of rowParts(row, me)?.people ?? []) if (batch.includes(p.email)) replied.add(p.email);
        }
        done++;
      }
    }
  } finally {
    window.location.hash = originalHash;
  }

  done = totalSteps;
  report("Crunching the numbers");
  return {
    emails: [...received.values()],
    sent: opts.includeSent ? [...sent.values()] : null,
    replyChecks: { checked: checkedContacts, replied: [...replied] },
    threads: received.size + sent.size,
    truncated,
  };
}
