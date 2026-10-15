import type { SentEmail } from "./analyze";
import type { ScanItem } from "../entrypoints/gmail.content/scraper";

export type LabelSource = "rules" | "ai" | "you";

export interface ReviewedItem extends ScanItem {
  source: LabelSource;
  /** Final reason, after the AI check and your review */
  why: string;
}

const LABELS: Record<string, string> = {
  APPLIED: "Applied",
  REJECTED: "Rejected",
  INTERVIEW: "Interview",
  ASSESSMENT: "Assessment",
  OFFER: "Offer",
  PROGRAM: "Side quest",
  OTHER: "Ignored",
};

const cell = (v: string) => `"${v.replace(/"/g, '""').replace(/\s+/g, " ").trim()}"`;
const date = (t: number | null) => (t ? new Date(t).toISOString().slice(0, 16).replace("T", " ") : "");

/** A local CSV of everything the scan saw and why it was counted or not. Never leaves the browser. */
export function scanReportCsv(items: ReviewedItem[], sent: SentEmail[] | null): string {
  const rows = [["Folder", "Counted as", "Decided by", "Why", "From", "Sender domain", "Company", "Role", "Subject", "Preview", "Date"]];
  for (const { email: e, source, why } of items) {
    rows.push(["Inbox", LABELS[e.category] ?? e.category, source, why, e.senderName, e.senderEmail.split("@")[1] ?? "", e.company ?? "", e.role ?? "", e.subject, e.snippet, date(e.timestamp)]);
  }
  for (const s of sent ?? []) {
    const tags = [s.coverLetter && "cover letter", s.resume && "resume", s.followUp && "follow-up", s.dearHiringManager && "Dear Hiring Manager"].filter(Boolean).join(", ");
    rows.push(["Sent", "Outreach", "rules", tags || "Job-related email you sent", s.recipients.map((r) => r.name).join("; "), s.recipients[0]?.email.split("@")[1] ?? "", s.company ?? "", "", s.subject, s.snippet, date(s.timestamp)]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}

export function downloadReport(csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `job-wrapped-scan-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
