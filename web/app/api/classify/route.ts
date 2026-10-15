import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { ClassifyRequestSchema, ClassifyResponseSchema, type ClassifyResponse } from "@/lib/wrapped/schema";
import { cors, MODEL, rateLimited, tooLarge } from "@/lib/http";

const SYSTEM = `You sort emails from someone's job hunt. For each email, pick one label:
- APPLIED: an employer or hiring platform confirming the person applied to a job
- REJECTED: an employer turning the person down for a job
- INTERVIEW: an employer inviting the person to an interview or call for a job
- ASSESSMENT: an employer sending a coding test, take-home or assessment for a job
- OFFER: an employer offering this person a job. Only when they are personally being offered the job.
- PROGRAM: hackathons, fellowships, accelerators, bootcamps, scholarships, communities, events and conferences
- NOT_JOB: everything else, including newsletters, digests, community posts, forums, job alerts, recruiting marketing,
  and stories about other people's offers or interviews

Be strict. Digests (Quora, Medium, Glassdoor Community, Reddit, Blind) quoting someone else's offer are NOT_JOB.
Return a label for every id you were given.`;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function POST(req: NextRequest) {
  const headers = cors(req);
  if (tooLarge(req)) return NextResponse.json({ error: "Payload too large" }, { status: 413, headers });
  if (rateLimited(req, "classify")) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });

  const parsed = ClassifyRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400, headers });
  const { items } = parsed.data;
  const empty: ClassifyResponse = { labels: [] };
  if (!items.length || !process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) return NextResponse.json(empty, { headers });

  try {
    const { output } = await generateText({
      model: google(MODEL),
      output: Output.object({ schema: ClassifyResponseSchema }),
      system: SYSTEM,
      prompt: items.map((i) => `id=${i.id} | from: ${i.from} | subject: ${i.subject} | preview: ${i.snippet}`).join("\n"),
      maxRetries: 1,
      timeout: 20_000,
      providerOptions: MODEL.includes("2.5") ? { google: { thinkingConfig: { thinkingBudget: 0 } } satisfies GoogleLanguageModelOptions } : undefined,
    });
    const ids = new Set(items.map((i) => i.id));
    return NextResponse.json({ labels: output.labels.filter((l) => ids.has(l.id)) }, { headers });
  } catch (error) {
    // The extension falls back to its own rules, so a failure here is never fatal.
    console.error("Classification failed:", error);
    return NextResponse.json(empty, { headers });
  }
}
