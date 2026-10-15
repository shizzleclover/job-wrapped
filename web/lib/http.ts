import type { NextRequest } from "next/server";

export const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const MAX_BODY_BYTES = 100_000;
const RATE_LIMIT = { requests: 20, windowMs: 10 * 60_000 };
const ALLOWED_ORIGIN = /^(chrome-extension|moz-extension):\/\/[\w-]+$|^http:\/\/localhost(:\d+)?$/;

export function cors(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGIN.test(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// In-memory and per-instance: enough to stop a stray script from burning the Gemini key.
const hits = new Map<string, number[]>();
export function rateLimited(req: NextRequest, bucket: string): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT.requests;
}

export const tooLarge = (req: NextRequest) => Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES;
