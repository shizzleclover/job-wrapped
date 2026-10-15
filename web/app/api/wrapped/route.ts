import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { WrappedCopySchema, WrappedInputSchema, type WrappedCopy, type WrappedInput, type WrappedResponse } from "@/lib/wrapped/schema";
import { buildFallbackCopy, hourLabel } from "@/lib/wrapped/fallback";
import { findTrack } from "@/lib/spotify";
import { cors, MODEL, rateLimited, tooLarge } from "@/lib/http";

const TONES: Record<WrappedInput["spiceLevel"], string> = {
  linkedin_safe: "Clever, upbeat and recruiter-friendly. Celebrate their resilience. Gentle humor only, never mean.",
  crispy: "Classic Spotify Wrapped energy mixed with sharp tech-Twitter wit. Playfully roast recruiting culture while hyping the user up.",
  unhinged:
    "Full comedic roast. Brutally funny, dramatic and delightfully unhinged about ATS platforms, ghosting recruiters and 2 AM panic-applying. Roast the system harder than the person; never punch down.",
};

const system = (input: WrappedInput) => `You are the lead writer for "Job Hunt Wrapped", a Spotify Wrapped style story about someone's job hunt, built from their inbox.
Tone: ${TONES[input.spiceLevel]}

Rules:
1. Every number you mention must come from the facts. Never invent numbers, companies or roles. Applications and companies are different counts: never call applications "companies".
2. Mention real company names, roles and hiring platforms from the data. Quote rejection snippets in the translator where you can.
3. Each field is shown on its own story slide in big type. Headlines: 6 words max. Lines: 22 words max, one idea each. Bio: 45 words max. Traits: 4 words max.
   The slide already shows the big number, so a line should add a joke or an angle, not just restate the stat.
4. Never use em dashes. Use commas, colons or periods.
5. If a stat is zero or missing, joke about that instead of pretending.
6. The personality archetype should feel tailor-made and screenshot-worthy. auraColors are 6-digit hex codes that pop on a near-black card.
7. The theme song must be a real, well-known song.
8. Banned words: testament, truly, beacon, journey, proving, undeniable, remarkable, navigate. No exclamation marks.

Style examples (match the energy, never copy them):
- Weak: "You sent 159 applications, averaging 3.3 a week." Strong: "That's not a job search, that's a cardio routine."
- Weak: "112 applications never got a reply." Strong: "Notion opened your application, felt something, and chose silence."
- Weak: "Microsoft rejected you in 3 hours." Strong: "Microsoft rejected you faster than Outlook loads."
- Translator, strong: they said "We've decided to move forward with other candidates", they meant "The hiring manager's college roommate needed a job."`;

function outreachFacts(o: WrappedInput["metrics"]["outreach"]): Array<string | false | null> {
  if (!o) return ["The user chose not to scan their sent emails, so there's no outreach data."];
  if (o.sent === 0) return ["They sent zero job-related emails themselves (no cold outreach, no emailed cover letters)."];
  return [
    `They wrote ${o.sent} job-related emails themselves to ${o.people} people. ${o.cold} were cold emails to people who hadn't contacted them first.`,
    o.checked > 0 && `Of ${o.checked} cold contacts, ${o.replied} ever wrote back (${o.replyRatePct}%).`,
    `${o.coverLetters} mentioned a cover letter, ${o.resumes} a resume or CV, ${o.followUps} were follow-ups. "Dear Hiring Manager" or "To whom it may concern": ${o.dearHiringManager} times.`,
    o.topCompany && `They emailed people at ${o.topCompany.name} the most (${o.topCompany.count} emails).`,
  ];
}

/** Plain-English facts, so the model can't misread what a number means. */
function facts(input: WrappedInput): string {
  const { totals: t, rates: r, time, companies: c, roles, responseTimes: rt, platforms } = input.metrics;
  const lines = [
    `${t.applications} applications sent to ${t.companies} companies, about ${time.perWeek} per week.`,
    `${t.answered} applications got a reply. ${t.ghosted} applications (${r.ghostRatePct}%) never got any reply. ${t.pending} are too recent to call.`,
    `${t.rejections} rejection emails. The word "unfortunately" appeared in ${t.unfortunately} emails.`,
    `${t.interviews} interview invites (${r.interviewRatePct}% of applications), ${t.assessments} assessments, ${t.offers} offers${c.offersFrom.length ? ` (from ${c.offersFrom.join(", ")})` : ""}.`,
    time.peakHour !== null && `Most applications were sent around ${hourLabel(time.peakHour)}. ${time.lateNightPct}% were sent between 10 PM and 4 AM.`,
    time.topWeekday && `Favorite day to apply: ${time.topWeekday}. ${time.weekendPct}% of applications were sent on weekends.`,
    time.busiestMonth && `Busiest month: ${time.busiestMonth.label} (${time.busiestMonth.count} applications).${time.quietestMonth ? ` Quietest: ${time.quietestMonth.label} (${time.quietestMonth.count}).` : ""}`,
    time.busiestDay && `Busiest single day: ${time.busiestDay.label}, ${time.busiestDay.count} applications. Longest streak: ${time.longestStreakDays} days in a row.`,
    platforms.length && `Hiring platforms: ${platforms.map((p) => `${p.name} (${p.count})`).join(", ")}. ${input.metrics.directPct}% went directly to the company.`,
    c.top.length && `Most applied-to companies: ${c.top.map((x) => `${x.name} (${x.count})`).join(", ")}.`,
    c.ghosted.length && `Companies that never replied at all: ${c.ghosted.join(", ")}.`,
    c.rejectedBy.length && `Rejected by: ${c.rejectedBy.join(", ")}.`,
    c.interviewedWith.length && `Interviewed with: ${c.interviewedWith.join(", ")}.`,
    roles.all.length && `Roles applied for: ${roles.all.join("; ")}. Main field: ${roles.dominantFamily}. Senior-sounding titles: ${roles.seniority.senior}, junior titles: ${roles.seniority.junior}.`,
    rt.fastestRejection && `Fastest rejection: ${rt.fastestRejection.company}, ${rt.fastestRejection.hours} hours after applying.`,
    rt.slowestResponse && `Slowest reply: ${rt.slowestResponse.company}, ${rt.slowestResponse.days} days.`,
    rt.avgDaysToRejection !== null && `Average wait for a rejection: ${rt.avgDaysToRejection} days.`,
    ...outreachFacts(input.metrics.outreach),
    input.metrics.programs.count > 0
      ? `Side quests (not jobs): ${input.metrics.programs.count} hackathons, fellowships or programs${input.metrics.programs.names.length ? `, including ${input.metrics.programs.names.join(", ")}` : ""}.`
      : "No hackathons, fellowships or programs.",
  ];
  return lines.filter(Boolean).map((l) => `- ${l}`).join("\n");
}

function prompt(input: WrappedInput): string {
  const { sampleEmails, meta } = input;
  return [
    `Year: ${meta.year} (${meta.windowLabel})${meta.truncated ? ". The inbox was large, so counts are a lower bound" : ""}.`,
    `Facts:\n${facts(input)}`,
    sampleEmails.length
      ? `Sample emails (most relevant first):\n${sampleEmails.map((e) => `- [${e.category}] ${e.company ?? "?"} | ${e.subject} | ${e.snippet}`).join("\n")}`
      : "The user opted out of sharing email text. Work from the stats, company and role names only.",
  ].join("\n\n");
}

const scrub = (copy: WrappedCopy): WrappedCopy => JSON.parse(JSON.stringify(copy).replace(/\s*[—–]\s*/g, ", "));

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function POST(req: NextRequest) {
  const headers = cors(req);
  if (tooLarge(req)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413, headers });
  }
  if (rateLimited(req, "wrapped")) {
    return NextResponse.json({ error: "Too many requests, try again in a few minutes" }, { status: 429, headers });
  }

  const parsed = WrappedInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues.slice(0, 5) }, { status: 400, headers });
  }
  const input = parsed.data;
  const respond = async (copy: WrappedCopy, source: WrappedResponse["source"]) => {
    const body: WrappedResponse = { copy, source, track: await findTrack(copy.personality.themeSong) };
    return NextResponse.json(body, { headers });
  };

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    return respond(buildFallbackCopy(input), "fallback");
  }

  try {
    const { output } = await generateText({
      model: google(MODEL),
      output: Output.object({ schema: WrappedCopySchema }),
      system: system(input),
      prompt: prompt(input),
      maxRetries: 1,
      timeout: 25_000,
      // Thinking adds ~15s for little gain on short creative copy.
      providerOptions: MODEL.includes("2.5") ? { google: { thinkingConfig: { thinkingBudget: 0 } } satisfies GoogleLanguageModelOptions } : undefined,
    });
    return respond(scrub(output), "ai");
  } catch (error) {
    // The story should always play; the extension shows a small note when copy came from the fallback.
    console.error("Wrapped generation failed, using fallback copy:", error);
    return respond(buildFallbackCopy(input), "fallback");
  }
}
