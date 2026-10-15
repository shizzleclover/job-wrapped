import type { Category, ClassifyLabel, ClassifyRequest } from "../shared/schema";
import type { ScanItem } from "../entrypoints/gmail.content/scraper";
import type { ReviewedItem } from "./report";

const MAX_AI = 120;
const PRIORITY: Record<string, number> = { OFFER: 0, INTERVIEW: 1, OTHER: 2 };

/** The rows worth a second opinion: every offer and interview, then anything that mentions a job but didn't match. */
export function aiCandidates(items: ScanItem[]): ClassifyRequest["items"] {
  return items
    .filter((i) => i.verdict.unsure)
    .sort((a, b) => (PRIORITY[a.email.category] ?? 3) - (PRIORITY[b.email.category] ?? 3))
    .slice(0, MAX_AI)
    .map((i) => ({
      id: i.email.key.slice(0, 80),
      from: i.email.senderName.slice(0, 120),
      subject: i.email.subject.slice(0, 200),
      snippet: i.email.snippet.slice(0, 200),
    }));
}

const toCategory = (label: ClassifyLabel): Category => (label === "NOT_JOB" ? "OTHER" : label);

export function applyAi(items: ScanItem[], labels: Record<string, ClassifyLabel>): ReviewedItem[] {
  return items.map((item) => {
    const label = labels[item.email.key.slice(0, 80)];
    if (!label) return { ...item, source: "rules", why: item.verdict.reason };
    const category = toCategory(label);
    const changed = category !== item.email.category;
    return {
      ...item,
      email: { ...item.email, category },
      source: "ai",
      why: changed ? `AI relabelled (rules said: ${item.verdict.reason})` : `AI confirmed: ${item.verdict.reason}`,
    };
  });
}

/** What you can untick before the story plays: the few, high-impact labels. */
export const REVIEW_GROUPS: Array<{ category: Category; title: string }> = [
  { category: "OFFER", title: "Offers" },
  { category: "INTERVIEW", title: "Interviews" },
  { category: "PROGRAM", title: "Side quests" },
];

export function untick(items: ReviewedItem[], keys: Set<string>): ReviewedItem[] {
  return items.map((i) => (keys.has(i.email.key) ? { ...i, email: { ...i.email, category: "OTHER" }, source: "you", why: "You unticked it in review" } : i));
}
