import { buildFallbackCopy } from "../shared/fallback";
import {
  ClassifyResponseSchema,
  WrappedResponseSchema,
  type ClassifyLabel,
  type ClassifyRequest,
  type WrappedCopy,
  type WrappedInput,
  type WrappedResponse,
} from "../shared/schema";

const API_URL: string = import.meta.env.WXT_API_URL || "http://localhost:3000/api/wrapped";
/** The deployed site: hosts the API and the public share pages. */
export const SITE_URL = new URL(API_URL).origin;
const TIMEOUT_MS = 30_000;
const HEX = /^#[0-9a-f]{6}$/i;

export type CopyResult = WrappedResponse & { offline: boolean };

function sanitize(copy: WrappedCopy, input: WrappedInput): WrappedCopy {
  const fallback = buildFallbackCopy(input);
  const valid = copy.personality.auraColors.length === 3 && copy.personality.auraColors.every((c) => HEX.test(c));
  const aura = valid ? copy.personality.auraColors : fallback.personality.auraColors;
  return {
    ...copy,
    translator: copy.translator.length ? copy.translator : fallback.translator,
    personality: { ...copy.personality, auraColors: aura },
  };
}

/** Never throws: if the server is down or returns junk, the story still plays with data-driven copy. */
export async function generateCopy(input: WrappedInput): Promise<CopyResult> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    const parsed = WrappedResponseSchema.parse(await res.json());
    return { ...parsed, copy: sanitize(parsed.copy, input), offline: false };
  } catch (err) {
    console.warn("[job-wrapped] Using offline copy:", err);
    return { copy: buildFallbackCopy(input), source: "fallback", offline: true };
  }
}

const CLASSIFY_URL = API_URL.replace(/\/wrapped$/, "/classify");

/** Asks the AI to label emails the rules weren't sure about. Returns {} if the server is down or says nothing. */
export async function classifyEmails(items: ClassifyRequest["items"]): Promise<Record<string, ClassifyLabel>> {
  if (!items.length) return {};
  try {
    const res = await fetch(CLASSIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`Classify responded ${res.status}`);
    const { labels } = ClassifyResponseSchema.parse(await res.json());
    return Object.fromEntries(labels.map((l) => [l.id, l.label]));
  } catch (err) {
    console.warn("[job-wrapped] AI check unavailable, using rules only:", err);
    return {};
  }
}
