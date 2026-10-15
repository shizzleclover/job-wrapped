import { buildFallbackCopy } from "../shared/fallback";
import { WrappedResponseSchema, type WrappedCopy, type WrappedInput, type WrappedResponse } from "../shared/schema";

const API_URL: string = import.meta.env.WXT_API_URL || "http://localhost:3000/api/wrapped";
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
