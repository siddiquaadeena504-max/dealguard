import "server-only";
import { ollamaJson } from "./ollama";
import { money, fmtDate, today } from "./format";

export const CATEGORIES = [
  "new_offer", "negotiation", "agreement", "scope_change", "payment", "deadline_change", "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Deliverable = { description: string; platform: string | null; due_date: string | null };
export type UsageRights = {
  description: string | null;
  platforms: string | null;
  start_date: string | null;
  end_date: string | null;
  exclusivity: string | null;
};
export type Extracted = {
  brand: string | null;
  contact_name: string | null;
  contact_email: string | null;
  fee: number | null;
  currency: string | null;
  payment_terms: string | null;
  payment_due_date: string | null;
  payment_received: boolean | null;
  deliverables: Deliverable[];
  usage_rights: UsageRights | null;
  campaign_summary: string | null;
  confidence: number;
};

const str = { type: ["string", "null"] };
const SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: CATEGORIES },
    brand: str,
    contact_name: str,
    contact_email: str,
    fee: { type: ["number", "null"] },
    currency: str,
    payment_terms: str,
    payment_due_date: str,
    payment_received: { type: ["boolean", "null"] },
    deliverables: {
      type: "array",
      items: {
        type: "object",
        properties: { description: { type: "string" }, platform: str, due_date: str },
        required: ["description", "platform", "due_date"],
      },
    },
    usage_rights: {
      type: ["object", "null"],
      properties: { description: str, platforms: str, start_date: str, end_date: str, exclusivity: str },
      required: ["description", "platforms", "start_date", "end_date", "exclusivity"],
    },
    campaign_summary: str,
    confidence: { type: "number" },
  },
  required: [
    "category", "brand", "contact_name", "contact_email", "fee", "currency", "payment_terms",
    "payment_due_date", "payment_received", "deliverables", "usage_rights", "campaign_summary", "confidence",
  ],
};

const SYSTEM = `You help a content creator track brand sponsorship deals. Read one email and return JSON.

category, pick exactly one:
- new_offer: a brand proposes a new paid collaboration or sponsorship
- negotiation: discussing or countering fee, deliverables or terms
- agreement: terms are confirmed or a contract is agreed
- scope_change: deliverables, fee or usage rights change on an existing deal
- payment: invoice, payment sent, payment late, or payment details
- deadline_change: a due date or posting date moves
- other: anything that is not about a brand deal (newsletters, receipts, personal mail, spam)

Rules:
- Only use facts written in the email. If something is not stated, use null. Never guess or invent values.
- fee is a plain number with no symbols (e.g. 1500). currency is a 3-letter code like USD, EUR, GBP, INR.
- Dates must be YYYY-MM-DD. Today is ${today()}. Only fill a date if the email states it.
- deliverables lists each piece of content (e.g. "1 Instagram Reel"). Empty list if none are mentioned.
- usage_rights is how the brand may reuse the content (paid ads, whitelisting, duration). null if not mentioned.
- campaign_summary is one short sentence, or null.
- confidence is 0 to 1: how sure you are about the category and fields.
- If category is other, set every other field to null and deliverables to [].`;

// Cheap filter so the local model only reads emails that might be about a deal.
const DEAL_WORDS =
  /\b(sponsor|sponsorship|collab|collaboration|partnership|partner|campaign|brand deal|ambassador|ugc|influencer|creator|rate card|rates?|fee|budget|invoice|payment|paid|payout|remittance|deliverables?|usage rights|whitelist|licen[cs]e|exclusivity|contract|agreement|brief|reel|tiktok|youtube|instagram|integration|dedicated video|story|stories|post date|go[- ]live|deadline)\b/i;

export function looksLikeDeal(subject: string, text: string) {
  return DEAL_WORDS.test(subject) || DEAL_WORDS.test(text.slice(0, 4000));
}

const clean = (s: unknown) => (typeof s === "string" && s.trim() && s.trim().toLowerCase() !== "null" ? s.trim() : null);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** True if the date is actually written in the email (ISO, "5 Dec", "Dec 5th", 05/12, 12/5...). */
function dateMentioned(iso: string, text: string) {
  if (text.includes(iso)) return true;
  const [, m, d] = iso.split("-").map(Number);
  const mon = MONTHS[m - 1];
  const day = `0?${d}(?:st|nd|rd|th)?`;
  const patterns = [
    new RegExp(`\\b${day}\\s+(?:of\\s+)?${mon}[a-z]*\\b`),
    new RegExp(`\\b${mon}[a-z]*\\.?\\s+${day}\\b`),
    new RegExp(`\\b0?${d}[/.-]0?${m}\\b`),
    new RegExp(`\\b0?${m}[/.-]0?${d}\\b`),
  ];
  return patterns.some((p) => p.test(text));
}

/** Drop values the email does not support, so the model cannot invent them. */
function guard(raw: Record<string, unknown>, haystack: string): Extracted {
  const text = haystack.toLowerCase();
  const digits = text.replace(/[,\s]/g, "");
  const isDate = (s: unknown): s is string =>
    typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && dateMentioned(s, text);

  let fee = typeof raw.fee === "number" && isFinite(raw.fee) && raw.fee > 0 ? raw.fee : null;
  if (fee != null && !digits.includes(String(fee).replace(/\.0+$/, ""))) fee = null;

  let contactEmail = clean(raw.contact_email);
  if (contactEmail && !text.includes(contactEmail.toLowerCase())) contactEmail = null;

  const currency = clean(raw.currency)?.toUpperCase() ?? null;
  const ur = raw.usage_rights as Record<string, unknown> | null;
  const usage: UsageRights | null =
    ur && (clean(ur.description) || clean(ur.platforms) || isDate(ur.end_date))
      ? {
          description: clean(ur.description),
          platforms: clean(ur.platforms),
          start_date: isDate(ur.start_date) ? ur.start_date : null,
          end_date: isDate(ur.end_date) ? ur.end_date : null,
          exclusivity: clean(ur.exclusivity),
        }
      : null;

  return {
    brand: clean(raw.brand),
    contact_name: clean(raw.contact_name),
    contact_email: contactEmail,
    fee,
    currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : null,
    payment_terms: clean(raw.payment_terms),
    payment_due_date: isDate(raw.payment_due_date) ? raw.payment_due_date : null,
    payment_received: typeof raw.payment_received === "boolean" ? raw.payment_received : null,
    deliverables: Array.isArray(raw.deliverables)
      ? (raw.deliverables as Record<string, unknown>[])
          .filter((d) => clean(d?.description))
          .map((d) => ({
            description: clean(d.description)!,
            platform: clean(d.platform),
            due_date: isDate(d.due_date) ? d.due_date : null,
          }))
      : [],
    usage_rights: usage,
    campaign_summary: clean(raw.campaign_summary),
    confidence:
      typeof raw.confidence === "number"
        ? Math.max(0, Math.min(1, raw.confidence > 1 ? raw.confidence / 100 : raw.confidence))
        : 0.5,
  };
}

export async function analyseEmail(email: {
  from: string;
  subject: string;
  date: string;
  text: string;
}): Promise<{ category: Category; data: Extracted | null }> {
  const body = email.text.slice(0, 6000);
  const prompt = `From: ${email.from}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${body}`;
  const raw = await ollamaJson<Record<string, unknown>>(SYSTEM, prompt, SCHEMA);
  const category = (CATEGORIES as readonly string[]).includes(raw.category as string)
    ? (raw.category as Category)
    : "other";
  if (category === "other") return { category, data: null };
  return { category, data: guard(raw, prompt) };
}

// ---------- Follow-up drafts ----------

export const DRAFT_KINDS = {
  payment_followup: "Payment follow-up",
  extension_offer: "Usage extension offer",
  usage_end_notice: "Usage rights ending notice",
  additional_fee_proposal: "Additional fee proposal",
} as const;
export type DraftKind = keyof typeof DRAFT_KINDS;

export type DraftContext = {
  creatorName: string;
  contactName: string | null;
  brand: string | null;
  title: string;
  fee: number | null;
  currency: string | null;
  paymentDue: string | null;
  paymentStatus: string | null;
  usageEnd: string | null;
  usageDescription: string | null;
  deliverables: string[];
  note?: string;
};

function templateDraft(kind: DraftKind, c: DraftContext) {
  const hi = `Hi ${c.contactName ?? "there"},`;
  const sign = `\n\nBest,\n${c.creatorName}`;
  const amount = money(c.fee, c.currency);
  switch (kind) {
    case "payment_followup":
      return `${hi}\n\nI hope you're well! I'm following up on the payment of ${amount} for ${c.title}, which was due on ${fmtDate(c.paymentDue)}. Could you let me know when I can expect it, or if you need anything else from me to process it?\n\nThank you!${sign}`;
    case "extension_offer":
      return `${hi}\n\nThe usage rights for the content from ${c.title} run until ${fmtDate(c.usageEnd)}. If you'd like to keep using it after that, I'd be happy to offer an extension. Let me know the period you have in mind and I'll send over a quote.${sign}`;
    case "usage_end_notice":
      return `${hi}\n\nA quick note that the usage rights for the content from ${c.title} end on ${fmtDate(c.usageEnd)}. After that date, please remove the content from paid placements unless we agree an extension. Happy to discuss if you'd like to continue.${sign}`;
    case "additional_fee_proposal":
      return `${hi}\n\nThanks for the update on ${c.title}. Since the scope has grown beyond what we originally agreed (${c.deliverables.join(", ") || "the original deliverables"} for ${amount}), I'd like to propose an additional fee to cover the extra work. Let me know if you'd like me to send a breakdown.${sign}`;
  }
}

export async function writeDraft(kind: DraftKind, c: DraftContext): Promise<string> {
  const facts = [
    `Creator name: ${c.creatorName}`,
    `Brand contact name: ${c.contactName ?? "unknown"}`,
    `Brand: ${c.brand ?? "unknown"}`,
    `Deal: ${c.title}`,
    `Fee: ${money(c.fee, c.currency)}`,
    `Payment due: ${fmtDate(c.paymentDue)} (status: ${c.paymentStatus ?? "unknown"})`,
    `Usage rights: ${c.usageDescription ?? "none recorded"}, ending ${fmtDate(c.usageEnd)}`,
    `Deliverables: ${c.deliverables.join("; ") || "none recorded"}`,
    c.note ? `Extra note from creator: ${c.note}` : "",
  ].join("\n");
  try {
    const out = await ollamaJson<{ body: string }>(
      `You write short, friendly, professional emails for a content creator to send to a brand.
Write the email body only (no subject line). Start with "Hi <name>,". End with "Best," and the creator's name.
Use only the facts given. Do not invent numbers, dates or promises. Keep it under 150 words.`,
      `Write a ${DRAFT_KINDS[kind]} email.\n\nFacts:\n${facts}`,
      { type: "object", properties: { body: { type: "string" } }, required: ["body"] },
      120_000
    );
    if (out.body?.trim().length > 40) return out.body.trim();
  } catch {
    // Ollama unavailable or slow: fall back to the built-in template.
  }
  return templateDraft(kind, c);
}
