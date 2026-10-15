import type { Category } from "../shared/schema";

// Every category must match on its own. A row is never labelled just because a search returned it:
// searches are broad, and that's how newsletters and welcome emails used to become "offers".
const JOB = /\b(applica(tion|nt)s?|applied|applying|candidacy|candidates?|positions?|roles?|openings?|vacanc(y|ies)|interview(s|ing)?|recruit(er|ers|ing|ment)|hiring|resume|résumé|cv|job)\b/i;
const NOISE =
  /job alert|jobs? (you may|for you|matching|that might)|recommended (jobs|roles)|new (jobs|roles)|is hiring|jobs? digest|weekly digest|newsletter|webinar|unsubscribe from (this|these) alerts?|people are viewing|complete your profile|\btips\b|how to|negotiat|% off|discount|promo code|sale ends|course|masterclass|badge|top (stories|answers|posts)|trending|in your network|people you may know/i;

// Senders that talk about jobs without being employers: digests, communities, event and newsletter platforms.
const NOT_EMPLOYER_DOMAIN =
  /(^|\.)(quora|medium|substack|beehiiv|mailchimp(app)?|mcsv|convertkit|kit|ghost|reddit|redditmail|teamblind|fishbowlapp|glassdoor|lu\.ma|luma(-mail)?|eventbrite|meetup|devpost|mlh|devfolio|dorahacks|taikai|hackerearth-mail|discord|slack|circle|skool|mightynetworks|producthunt|facebookmail|instagram|youtube)\.[a-z.]+$/i;
const NOT_EMPLOYER_NAME = /digest|newsletter|community|weekly|daily|insider|news\b|events?\b|meetup|webinar|podcast|jobs? alerts?|job board|careers? (tips|advice)|blog/i;
// LinkedIn and Indeed send real confirmations from these, and everything else (alerts, news) from other addresses.
const JOB_BOARD_CONFIRMATIONS = /^(jobs-noreply@linkedin\.com|.*@indeed\.com|.*@indeedemail\.com)$/i;

const PROGRAM =
  /hackathon|hack ?week|fellowship|accelerator|incubator|bootcamp|cohort|scholarship|\bgrant\b|ambassador|community (application|membership)|mentorship (program|programme)|(startup|founder|builder|developer|leadership|training|residency) (program|programme)|demo day|summit|conference|meetup|devfest|\bevent\b/i;
// Real jobs that use "program" words
const JOB_PROGRAM = /(internship|graduate|early careers?|apprenticeship|new grad|rotational|trainee) (program|programme)/i;

const REJECTED =
  /unfortunately|we regret|regret to inform|after careful consideration|(won[’']?t|will not|not) be (moving|proceeding|progressing|advancing)|not (be )?(moving|move|proceed(ing)?) forward|decided (not to|to (move forward|proceed|pursue|go) with (other|another))|other candidates|not to proceed|position has been filled|no longer (being )?consider|not (been )?selected|unable to (offer you|move forward|proceed)|not a (fit|match) (at this time|for)/i;
const OFFER =
  /(pleased|excited|delighted|happy|thrilled) to (extend|offer) (you )?(an? |the |this )?(formal |verbal |written )?(offer|position|role|job)|(your|attached|find|enclosed)[^.]{0,25}offer letter|offer letter (is )?(attached|enclosed|for you)|formal offer|verbal offer|offer of employment|extend(ing)? (you )?an offer|your (job )?offer (from|letter|details|package)/i;
const INTERVIEW =
  /(invite|invitation|schedule|scheduling|book|set up|availability|arrange).{0,50}(interview|phone screen|screening call|recruiter (call|chat|screen)|hiring manager|technical (call|round))|interview (invitation|request|confirmation|scheduled|invite|slot)|phone screen|screening call|onsite interview|final[- ]round|next round of (interviews|the process)|move(d)? (you )?forward to the next (stage|round)/i;
const ASSESSMENT = /coding challenge|take[- ]home (assessment|assignment|challenge|test|exercise)|hackerrank|codesignal|codility|testgorilla|technical (test|exercise|assessment)/i;
const GENERIC_ASSESSMENT = /(online|skills?) assessment/i;
const APPLIED =
  /thank(s| you) for (applying|your (job )?application|your interest in (the|our|joining|working))|application (has been |was )?(received|submitted|sent|confirmation|complete)|received your (job )?application|your application (to|for|was sent|is under review|has been|is in)|we('ve| have)? (got|received) your (application|resume|cv)|successfully (applied|submitted)|you('ve| have)? applied (to|for)|indeed application:|application for .{2,60} (received|submitted)|thanks for submitting|submission (received|confirmed)/i;

export interface Verdict {
  label: Category | null;
  /** Human-readable reason, shown in the scan report */
  reason: string;
  /** True when the rules are unsure and a second opinion would help */
  unsure: boolean;
}

export function isNotEmployer(senderName: string, senderEmail: string): boolean {
  const email = senderEmail.toLowerCase();
  if (JOB_BOARD_CONFIRMATIONS.test(email)) return false;
  const domain = email.split("@")[1] ?? "";
  return NOT_EMPLOYER_DOMAIN.test(domain) || /linkedin\.com$/.test(domain) || NOT_EMPLOYER_NAME.test(senderName);
}

export function classify(subject: string, snippet: string, senderName = "", senderEmail = ""): Verdict {
  const text = `${subject} ${snippet}`;
  if (isNotEmployer(senderName, senderEmail)) return { label: null, reason: "Sender is a digest, community or platform", unsure: false };
  if (NOISE.test(text)) return { label: null, reason: "Looks like a newsletter, alert or promotion", unsure: false };
  if (PROGRAM.test(text) && !JOB_PROGRAM.test(text) && !/\b(engineer|developer|designer|manager|analyst|intern)\b/i.test(text))
    return { label: "PROGRAM", reason: "Hackathon, fellowship or program", unsure: false };
  const job = JOB.test(text);
  if (REJECTED.test(text) && job) return { label: "REJECTED", reason: "Rejection wording", unsure: false };
  if (OFFER.test(text) && (job || /offer letter|offer of employment/i.test(text))) return { label: "OFFER", reason: "Offer wording", unsure: true };
  if (INTERVIEW.test(text)) return { label: "INTERVIEW", reason: "Interview invite wording", unsure: true };
  if (ASSESSMENT.test(text) || (GENERIC_ASSESSMENT.test(text) && job)) return { label: "ASSESSMENT", reason: "Assessment wording", unsure: false };
  if (APPLIED.test(text)) return { label: "APPLIED", reason: "Application confirmation wording", unsure: false };
  return { label: null, reason: job ? "Mentions a job but no clear outcome" : "No job signal", unsure: job };
}

/**
 * Signals for emails the user sent. Gmail's search already matched job words anywhere in the email,
 * so we trust it and only look at subject and preview for the extra details.
 */
export function classifySent(subject: string, snippet: string) {
  const text = `${subject} ${snippet}`;
  return {
    coverLetter: /cover letter/i.test(text),
    resume: /résumé|resume|\bcv\b/i.test(text),
    followUp: /follow(ing)?[- ]?up|checking in|circling back|just wanted to (check|follow)|any update/i.test(text),
    dearHiringManager: /dear (hiring manager|hiring team|recruiter|sir or madam|sir\/madam)|to whom it may concern/i.test(text),
  };
}

const PLATFORMS: Array<[RegExp, string]> = [
  [/greenhouse/, "Greenhouse"],
  [/lever\.co/, "Lever"],
  [/workday|myworkday/, "Workday"],
  [/ashbyhq/, "Ashby"],
  [/workable/, "Workable"],
  [/bamboohr/, "BambooHR"],
  [/smartrecruiters/, "SmartRecruiters"],
  [/icims/, "iCIMS"],
  [/jobvite/, "Jobvite"],
  [/taleo|oracle/, "Taleo"],
  [/successfactors|sap\.com/, "SuccessFactors"],
  [/breezy/, "Breezy"],
  [/recruitee/, "Recruitee"],
  [/teamtailor/, "Teamtailor"],
  [/personio/, "Personio"],
  [/applytojob|jazzhr/, "JazzHR"],
  [/rippling/, "Rippling"],
  [/linkedin/, "LinkedIn"],
  [/indeed/, "Indeed"],
  [/wellfound|angel\.co/, "Wellfound"],
  [/otta|welcometothejungle/, "Welcome to the Jungle"],
  [/gem\.com/, "Gem"],
];

export function platformFor(email: string): string | null {
  const domain = email.toLowerCase().split("@")[1] ?? "";
  for (const [re, name] of PLATFORMS) if (re.test(domain)) return name;
  return null;
}

const FREE_MAIL = /^(gmail|googlemail|outlook|hotmail|yahoo|icloud|me|proton|protonmail|aol|live|mail)\./;
const GENERIC_NAME =
  /^(no[- ]?reply|do[- ]?not[- ]?reply|notifications?|careers?|jobs?|recruit(ing|ment|er)?|talent( acquisition)?|hiring|hr|people|team|the team|candidate experience|applications?|me|support|info|admin|unknown)$/i;
const NOT_A_COMPANY =
  /\b(application|applying|applied|received|update|thank|thanks|interview|invitation|confirmation|your|offer|congratulations|next steps?|engineer|developer|designer|manager|analyst|intern|position|role)\b/i;
const PLATFORM_NAMES = new RegExp(`^(${PLATFORMS.map(([, n]) => n).join("|")}|workday|greenhouse|lever|ashby)$`, "i");
const NAME_SUFFIX =
  /\s*(\(.*\)|[-|@,].*|\bvia\b.*|\b(careers?|recruiting|recruitment|talent( acquisition)?|hiring( team)?|jobs|people( team)?|hr|team|notifications?|no-?reply|inc\.?|llc|ltd\.?|corp\.?|gmbh)\b.*)$/i;

function cleanName(raw: string): string | null {
  const name = raw.replace(/["']/g, "").replace(NAME_SUFFIX, "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 40) return null;
  if (GENERIC_NAME.test(name) || PLATFORM_NAMES.test(name) || NOT_A_COMPANY.test(name)) return null;
  if (/^[a-z0-9._-]+$/.test(name) && name.includes(".")) return null;
  return name;
}

const COMPANY_PATTERNS = [
  /application (?:was )?sent to ([^|,.!:\n]+?)(?:\s*$|\s*[|,.!:-]|\s+for\s)/i,
  /\bat\s+([A-Z][\w&'.]*(?:\s+[A-Z][\w&'.]*){0,3})(?:\s*$|\s*[|,.!:(-]|\s+for\s)/,
  /(?:applying|applied|application|interest|interviewing|interview)\s+(?:to|at|with)\s+(?:the\s+)?([A-Z][\w&'. -]{1,40}?)(?:\s*$|\s*[|,.!:(-]|\s+for\s|\s+as\s|\s+at\s|\s+team\b)/,
  /interest in ([A-Z][\w&'.]*(?:\s+[A-Z][\w&'.]*){0,2})(?:\s*$|\s*[|,.!:(-]|\s+for\s)/,
  /^([A-Z][\w&'.]*(?:\s+[A-Z][\w&'.]*){0,2})\s*[|:-]\s/,
];

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function extractCompany(senderName: string, senderEmail: string, subject: string, snippet: string): string | null {
  const fromName = cleanName(senderName);
  if (fromName) return fromName;

  for (const re of COMPANY_PATTERNS) {
    const hit = subject.match(re)?.[1] ?? snippet.match(re)?.[1];
    const name = hit ? cleanName(hit) : null;
    if (name && !/^(the|our|your|this|a|an)\b/i.test(name)) return name;
  }

  const domain = senderEmail.toLowerCase().split("@")[1] ?? "";
  if (domain && !platformFor(senderEmail) && !FREE_MAIL.test(domain)) {
    const parts = domain.split(".");
    const base = parts.length >= 2 ? parts[parts.length - 2]! : parts[0]!;
    if (base && base.length > 1 && !/^(mail|email|hire|jobs|careers|notifications?)$/.test(base)) return titleCase(base);
  }
  return null;
}

const ROLE_KEYWORD =
  /\b(engineer|developer|designer|manager|analyst|scientist|intern(ship)?|lead|architect|specialist|associate|consultant|director|officer|coordinator|researcher|writer|marketer|marketing|sales|product|data|operations|ops|support|recruiter|accountant|administrator|technician|head|vp|founding|staff|principal|strategist|editor|programmer|sre|devops|qa|tester|advocate|representative|executive|counsel|partner|fellow|graduate|trainee)\b/i;

const ROLE_PATTERNS = [
  /\b(?:the|our)\s+(.+?)\s+(?:role|position|opening|vacancy)\b/i,
  /(?:for|to)\s+(?:the|our|a|an)?\s*(.+?)\s+(?:role|position|opening|job|vacancy)\b/i,
  /(?:application|applying|applied)\s+(?:for|to)\s+(?:the\s+)?(.+?)(?:\s+at\s|\s+with\s|\s+[-|–]\s|\s*[(,!.]|$)/i,
  /(?:received|submitted|confirmation|update|interview)\s*[:\-–|]\s*(.+?)(?:\s+at\s|\s+[-|–]\s|\s*[(,!]|$)/i,
  /\bas\s+(?:a|an|the)?\s*(.+?)(?:\s+at\s|\s*[(,!.]|$)/i,
];

export function extractRole(subject: string, snippet: string): string | null {
  for (const source of [subject, snippet]) {
    for (const re of ROLE_PATTERNS) {
      const hit = source.match(re)?.[1]?.replace(/["“”]/g, "").replace(/\s+/g, " ").trim();
      if (hit && hit.length >= 3 && hit.length <= 60 && ROLE_KEYWORD.test(hit) && !/\b(your|our|we|you)\b/i.test(hit)) {
        return hit.replace(/\s*[-–|:]+\s*$/, "");
      }
    }
  }
  return null;
}

const FAMILIES: Array<[RegExp, string]> = [
  [/design|ux|ui\b|creative|illustrat/i, "Design"],
  [/data|analyst|analytics|machine learning|\bml\b|\bai\b|scientist|bi\b/i, "Data"],
  [/product manager|product owner|\bpm\b|product lead|head of product/i, "Product"],
  [/engineer|developer|programmer|sre|devops|software|frontend|backend|full[- ]?stack|mobile|ios|android|qa|architect/i, "Engineering"],
  [/market|growth|seo|content|brand|social media|communications|pr\b/i, "Marketing"],
  [/sales|account (executive|manager)|business development|\bsdr\b|\bbdr\b|partnerships/i, "Sales"],
  [/research/i, "Research"],
  [/operations|ops\b|program manager|project manager|coordinator|chief of staff/i, "Operations"],
  [/support|success|customer/i, "Customer"],
  [/finance|accountant|accounting|legal|counsel|people|recruit|hr\b/i, "Business"],
];

export function roleFamily(role: string): string {
  for (const [re, name] of FAMILIES) if (re.test(role)) return name;
  return "Other";
}

export function seniority(role: string): "senior" | "junior" | null {
  if (/\b(senior|sr\.?|staff|principal|lead|head|director|vp|vice president|chief|founding)\b/i.test(role)) return "senior";
  if (/\b(intern(ship)?|junior|jr\.?|graduate|entry|trainee|apprentice|new grad)\b/i.test(role)) return "junior";
  return null;
}

const SENIORITY_RANK = /\b(chief|vp|vice president|head|director|founding|principal|staff|lead|senior)\b/i;
const RANK_ORDER = ["chief", "vp", "vice president", "head", "director", "founding", "principal", "staff", "lead", "senior"];

/** Highest-sounding title, used as the "wildcard" reach when the AI isn't available. */
export function rankRole(role: string): number {
  const hit = role.match(SENIORITY_RANK)?.[1]?.toLowerCase();
  return hit ? RANK_ORDER.length - RANK_ORDER.indexOf(hit) : 0;
}
