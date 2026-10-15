import type { Category } from "../shared/schema";
import type { ScannedEmail, SentEmail } from "./analyze";

// Deterministic fake inbox so demo mode and screenshots look the same every time.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const COMPANIES: Array<[string, string]> = [
  ["Stripe", "no-reply@greenhouse.io"],
  ["Linear", "jobs@ashbyhq.com"],
  ["Vercel", "jobs@ashbyhq.com"],
  ["Paystack", "talent@paystack.com"],
  ["Moniepoint", "no-reply@greenhouse.io"],
  ["Notion", "no-reply@greenhouse.io"],
  ["Figma", "no-reply@greenhouse.io"],
  ["Shopify", "noreply@myworkday.com"],
  ["Microsoft", "noreply@myworkday.com"],
  ["Flutterwave", "hire@lever.co"],
  ["Andela", "hire@lever.co"],
  ["Spotify", "no-reply@smartrecruiters.com"],
  ["Canva", "no-reply@smartrecruiters.com"],
  ["Datadog", "no-reply@greenhouse.io"],
  ["Ramp", "jobs@ashbyhq.com"],
  ["Plaid", "hire@lever.co"],
  ["Airbnb", "no-reply@greenhouse.io"],
  ["Deel", "jobs@ashbyhq.com"],
  ["Kuda", "careers@kuda.com"],
  ["Chipper Cash", "hire@lever.co"],
  ["Netflix", "noreply@myworkday.com"],
  ["Discord", "no-reply@greenhouse.io"],
  ["Supabase", "jobs@ashbyhq.com"],
  ["Cloudflare", "no-reply@greenhouse.io"],
  ["SpaceX", "careers@spacex.com"],
];

const ROLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Full-Stack Engineer",
  "Frontend Engineer",
  "Product Engineer",
  "Software Engineer, Payments",
  "Design Engineer",
  "Senior Frontend Engineer",
];
const WILDCARDS = ["Senior Starship Avionics Lead", "Head of Brand Marketing", "Product Designer"];

// Weighted toward a spring push and a late-summer panic.
const MONTH_WEIGHTS = [4, 6, 14, 18, 9, 5, 7, 16, 12, 6, 3, 2];
const HOUR_WEIGHTS = [6, 5, 3, 1, 0, 0, 0, 1, 2, 3, 4, 3, 3, 2, 2, 3, 3, 2, 3, 4, 5, 7, 9, 8];

function weighted(r: () => number, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i]!;
    if (x < 0) return i;
  }
  return weights.length - 1;
}

function email(r: () => number, i: number, company: string, sender: string, category: Category, ts: number, role: string): ScannedEmail {
  const copy: Record<Category, [string, string]> = {
    APPLIED: [`Thank you for applying to ${company}`, `We've received your application for the ${role} role and our team will review it.`],
    REJECTED: [
      `Update on your application to ${company}`,
      r() > 0.5
        ? `Thank you for your interest in the ${role} role. Unfortunately, we have decided not to move forward with your candidacy at this time.`
        : `We were impressed by your background, however we've decided to move forward with other candidates whose experience more closely aligns.`,
    ],
    INTERVIEW: [`Invitation to interview: ${role}`, `We loved your application and would like to schedule an interview with our team this week.`],
    ASSESSMENT: [`Next step: coding challenge`, `Please complete the take-home assessment within 5 days.`],
    OFFER: [`Your offer from ${company}`, `We're thrilled to extend an offer for the ${role} position. Your offer letter is attached.`],
    PROGRAM: [`Thanks for applying to ${company}`, "We've received your hackathon application. Teams will be announced soon."],
    OTHER: ["Following up", "Just checking in on your application."],
  };
  const [subject, snippet] = copy[category];
  return {
    key: `demo-${i}`,
    senderName: `${company} Recruiting`,
    senderEmail: sender,
    subject,
    snippet,
    timestamp: ts,
    category,
    company,
    role,
    platform: null,
  };
}

export function demoEmails(now = Date.now()): ScannedEmail[] {
  const r = rng(2026);
  const out: ScannedEmail[] = [];
  const nowDate = new Date(now);
  const DAY = 86_400_000;

  for (let i = 0; i < 158; i++) {
    const [company, sender] = COMPANIES[Math.floor((r() < 0.35 ? r() * 0.3 : r()) * COMPANIES.length)]!;
    const monthsAgo = 11 - weighted(r, MONTH_WEIGHTS);
    const day = new Date(nowDate.getFullYear(), nowDate.getMonth() - monthsAgo, 1 + Math.floor(r() * 27), weighted(r, HOUR_WEIGHTS), Math.floor(r() * 60));
    const ts = Math.min(day.getTime(), now - DAY);
    const role = company === "SpaceX" ? WILDCARDS[0]! : r() > 0.94 ? WILDCARDS[1 + Math.floor(r() * 2)]! : ROLES[Math.floor(r() * ROLES.length)]!;
    out.push(email(r, out.length, company, sender, "APPLIED", ts, role));

    const roll = r();
    const later = (days: number) => Math.min(ts + days * DAY, now - 3_600_000);
    if (roll < 0.26) out.push(email(r, out.length, company, sender, "REJECTED", later(2 + r() * 40), role));
    else if (roll < 0.31) out.push(email(r, out.length, company, sender, "INTERVIEW", later(4 + r() * 14), role));
    else if (roll < 0.325) out.push(email(r, out.length, company, sender, "ASSESSMENT", later(3 + r() * 6), role));
  }
  // The one that rejected in a few hours, and the one that came through.
  const t0 = now - 120 * DAY;
  out.push(email(r, out.length, "Microsoft", "noreply@myworkday.com", "APPLIED", t0, "Senior Software Engineer"));
  out.push(email(r, out.length, "Microsoft", "noreply@myworkday.com", "REJECTED", t0 + 3.2 * 3_600_000, "Senior Software Engineer"));
  out.push(email(r, out.length, "Paystack", "talent@paystack.com", "OFFER", now - 9 * DAY, "Product Engineer"));
  for (const [i, program] of ["HackLagos", "Google Developer Groups DevFest", "Ventures Platform Fellowship", "ETHGlobal Online", "Kaggle Days"].entries()) {
    out.push({ ...email(r, out.length, program, "team@hackathon.dev", "PROGRAM", now - (30 + i * 40) * DAY, ""), role: null, company: program });
  }

  return out.map((e) => ({ ...e, platform: platformOf(e.senderEmail) }));
}

function platformOf(sender: string): string | null {
  if (sender.includes("greenhouse")) return "Greenhouse";
  if (sender.includes("ashby")) return "Ashby";
  if (sender.includes("workday")) return "Workday";
  if (sender.includes("lever")) return "Lever";
  if (sender.includes("smartrecruiters")) return "SmartRecruiters";
  return null;
}

export function demoOutbox(now = Date.now()): { sent: SentEmail[] } {
  const r = rng(7);
  const targets = ["Stripe", "Linear", "Vercel", "Paystack", "Flutterwave", "Supabase", "Ramp", "Deel", "Figma", "Cloudflare"];
  const sent: SentEmail[] = Array.from({ length: 41 }, (_, i) => {
    const company = targets[Math.floor(r() * r() * targets.length)]!;
    const email = `person${i % 29}@${company.toLowerCase()}.com`;
    return {
      key: `demo-sent-${i}`,
      recipients: [{ name: `Person ${i}`, email }],
      subject: i % 3 === 0 ? `Following up: Software Engineer role` : `Software Engineer application`,
      snippet: "",
      timestamp: now - Math.floor(r() * 300) * 86_400_000,
      company,
      startedByMe: i % 6 !== 5,
      replied: i % 4 === 0,
      coverLetter: r() < 0.45,
      resume: r() < 0.8,
      followUp: i % 3 === 0,
      dearHiringManager: r() < 0.3,
    };
  });
  return { sent };
}
