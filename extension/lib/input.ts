import type { SpiceLevel, WrappedInput } from "../shared/schema";
import { analyze, type ScannedEmail, type SentEmail } from "./analyze";
import { demoEmails, demoOutbox } from "./demo";

export function buildInput(
  emails: ScannedEmail[],
  opts: {
    spiceLevel: SpiceLevel;
    shareSnippets: boolean;
    isDemo: boolean;
    threads: number;
    truncated: boolean;
    outbox?: { sent: SentEmail[] } | null;
    now?: number;
  }
): WrappedInput {
  const now = opts.now ?? Date.now();
  // Sent emails only ever contribute counts and company names; their text never leaves the browser.
  const { metrics, samples } = analyze(emails, now, opts.outbox ?? null);
  return {
    spiceLevel: opts.spiceLevel,
    metrics,
    sampleEmails: opts.shareSnippets ? samples : [],
    meta: {
      year: new Date(now).getFullYear(),
      windowLabel: "The last 12 months",
      scannedThreads: opts.threads,
      truncated: opts.truncated,
      isDemo: opts.isDemo,
      generatedAt: new Date(now).toISOString(),
    },
  };
}

export function buildDemoInput(spiceLevel: SpiceLevel, now = Date.now()): WrappedInput {
  const emails = demoEmails(now);
  return buildInput(emails, { spiceLevel, shareSnippets: true, isDemo: true, threads: emails.length, truncated: false, outbox: demoOutbox(now), now });
}
