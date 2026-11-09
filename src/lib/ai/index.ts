import "server-only";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ExtractionSchema, type Extraction } from "./schema";
import { rulesExtract } from "./rules";
import { money, fmtDate } from "../format";

/*
  AI layer.
  Order: Groq (OpenAI-compatible) → Gemini → built-in rules/templates.
  Every call has a timeout. Only 429 / 5xx / network errors are retried, with exponential
  backoff + jitter. JSON is validated with Zod; invalid JSON gets one repair attempt.
  Logs say which model answered, never keys or prompts.
*/

export type AiSource = "groq" | "gemini" | "built-in";

const TIMEOUT_MS = 20_000;
const RETRIES = 2;

const env = (k: string) => process.env[k]?.trim() || "";

let groq: OpenAI | null = null;
function groqClient() {
  if (!env("AI_API_KEY") || !env("AI_BASE_URL") || !env("AI_MODEL")) return null;
  return (groq ??= new OpenAI({ apiKey: env("AI_API_KEY"), baseURL: env("AI_BASE_URL"), timeout: TIMEOUT_MS, maxRetries: 0 }));
}
let gemini: GoogleGenAI | null = null;
function geminiClient() {
  if (!env("GEMINI_API_KEY") || !env("GEMINI_MODEL")) return null;
  return (gemini ??= new GoogleGenAI({ apiKey: env("GEMINI_API_KEY") }));
}

export const aiConfigured = () => !!(groqClient() || geminiClient());

function retryable(err: unknown) {
  const status = (err as { status?: number })?.status;
  if (typeof status === "number") return status === 429 || status >= 500;
  return true; // network errors, timeouts
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(Object.assign(new Error("AI request timed out"), { status: undefined })), ms)),
  ]);
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      return await withTimeout(fn(), TIMEOUT_MS);
    } catch (err) {
      last = err;
      if (!retryable(err) || attempt === RETRIES) break;
      const backoff = 400 * 2 ** attempt + Math.random() * 300;
      await sleep(backoff);
    }
  }
  throw last;
}

type Provider = { name: Exclude<AiSource, "built-in">; complete: (system: string, user: string) => Promise<string> };

function providers(): Provider[] {
  const list: Provider[] = [];
  const g = groqClient();
  if (g)
    list.push({
      name: "groq",
      complete: async (system, user) => {
        const res = await g.chat.completions.create({
          model: env("AI_MODEL"),
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        });
        return res.choices[0]?.message?.content ?? "";
      },
    });
  const gm = geminiClient();
  if (gm)
    list.push({
      name: "gemini",
      complete: async (system, user) => {
        const res = await gm.models.generateContent({
          model: env("GEMINI_MODEL"),
          contents: user,
          config: { systemInstruction: system, responseMimeType: "application/json", temperature: 0.2 },
        });
        return res.text ?? "";
      },
    });
  return list;
}

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

/** Runs a JSON task across providers. Returns null when nothing configured or all failed. */
async function jsonTask<T>(system: string, user: string, schema: z.ZodType<T>): Promise<{ data: T; source: AiSource } | null> {
  for (const p of providers()) {
    try {
      const text = await withRetry(() => p.complete(system, user));
      let parsed = schema.safeParse(safeJson(text));
      if (!parsed.success) {
        // One repair attempt: show the model its own output and the validation errors.
        const repaired = await withRetry(() =>
          p.complete(
            system,
            `${user}\n\nYour previous reply was not valid. Errors: ${parsed.error!.issues
              .slice(0, 5)
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")}\nPrevious reply:\n${text.slice(0, 2000)}\n\nReply again with ONLY corrected JSON.`
          )
        );
        parsed = schema.safeParse(safeJson(repaired));
      }
      if (parsed.success) {
        console.info(`[ai] answered by ${p.name}`);
        return { data: parsed.data, source: p.name };
      }
      console.warn(`[ai] ${p.name} returned invalid JSON twice, trying next provider`);
    } catch (err) {
      console.warn(`[ai] ${p.name} failed (${(err as { status?: number }).status ?? "network"}), trying next provider`);
    }
  }
  return null;
}

function safeJson(text: string) {
  try {
    return parseJson(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- (a) extraction

const EXTRACT_SYSTEM = `You extract brand-deal terms from an email sent to a content creator.
Reply with ONLY a JSON object with these keys:
brand (string|null), contactName (string|null), contactEmail (string|null), currency (ISO 4217 code like INR, USD, EUR, or null),
fee (number|null: total fee, plain number), deliverables (array of {description, platform|null, amount|null}),
dueDate (YYYY-MM-DD|null: when content goes live or is due), paymentTerms (string|null, e.g. "Net 30"),
usageDays (integer|null: usage-rights duration in days; months = 30 days), title (short campaign name|null),
confidence (object with numbers 0..1 for brand, contactEmail, fee, deliverables, dueDate, paymentTerms, usageDays).
Rules: only use facts written in the email. Use null when something is not stated. Never invent values.
If per-deliverable prices are not stated, split the total fee across deliverables.`;

export async function extractDeal(email: string, hint?: { fromName?: string; fromEmail?: string; subject?: string }) {
  const user = `${hint?.fromName ? `From: ${hint.fromName} <${hint.fromEmail ?? ""}>\n` : ""}${hint?.subject ? `Subject: ${hint.subject}\n` : ""}Today is ${new Date().toISOString().slice(0, 10)}.\n\nEMAIL:\n${email.slice(0, 8000)}`;
  const ai = await jsonTask(EXTRACT_SYSTEM, user, ExtractionSchema);
  if (ai) return { data: ai.data, source: ai.source };
  return { data: rulesExtract(email, hint), source: "built-in" as AiSource };
}

// ---------------------------------------------------------------- (b) chase reminders, (c) renewal pitches, (d) insight

export type DealFacts = {
  creator: string; brand: string; contactName: string | null; title: string; fee: number | null; currency: string;
  invoiceNumber: string | null; dueDate: string | null; daysLate: number; usageDays: number | null; rightsEnd: string | null;
  rightsDaysLeft: number | null; status: string; remindersSent: number; tonePref: string;
};

const EmailSchema = z.object({ subject: z.string().min(3), body: z.string().min(20) });
const first = (name: string | null) => name?.split(" ")[0] ?? "there";

const TONE_GUIDE = {
  friendly: "warm and light, assumes it slipped through the cracks",
  firm: "polite but clear, states the amount and days overdue, asks for a payment date",
  final: "calm and professional, final notice before escalating, mentions pausing future collaboration",
};

export async function draftReminder(f: DealFacts, tone: keyof typeof TONE_GUIDE) {
  const ai = await jsonTask(
    `You write short payment reminder emails for a content creator to send to a brand. Tone: ${TONE_GUIDE[tone]}. The creator prefers a ${f.tonePref} style.
Under 110 words. Use only the facts given. Reply with JSON {"subject": string, "body": string}. Sign off with the creator's name.`,
    JSON.stringify(f),
    EmailSchema
  );
  if (ai) return { ...ai.data, source: ai.source };
  const amount = money(f.fee, f.currency);
  const late = f.daysLate > 0 ? `${f.daysLate} day${f.daysLate === 1 ? "" : "s"} overdue` : `due ${fmtDate(f.dueDate, "long")}`;
  const t = {
    friendly: {
      subject: `Quick nudge on ${f.invoiceNumber}`,
      body: `Hi ${first(f.contactName)},\n\nHope the ${f.title} campaign is going well! Just a gentle nudge that invoice ${f.invoiceNumber} for ${amount} is ${late}. The PayPal link in the invoice email works for a one-click payment.\n\nThanks so much,\n${f.creator}`,
    },
    firm: {
      subject: `Payment overdue: ${f.invoiceNumber} (${amount})`,
      body: `Hi ${first(f.contactName)},\n\nI'm following up on invoice ${f.invoiceNumber} for ${amount}, which is now ${late}. Could you confirm the date payment will be made? If anything is blocking it on your side, let me know and I'll help sort it out.\n\nBest,\n${f.creator}`,
    },
    final: {
      subject: `Final notice: ${f.invoiceNumber}`,
      body: `Hi ${first(f.contactName)},\n\nThis is a final reminder that invoice ${f.invoiceNumber} for ${amount} is ${late}. Please arrange payment within 5 business days. I value working with ${f.brand}, but I'll need to pause future collaborations until this is settled.\n\nRegards,\n${f.creator}`,
    },
  }[tone];
  return { ...t, source: "built-in" as AiSource };
}

export async function draftRenewal(f: DealFacts) {
  const ai = await jsonTask(
    `You write a short, confident usage-rights renewal pitch from a content creator to a brand whose usage rights are about to end.
Offer a 30-day or 90-day extension and suggest a fair fee (about 25% of the original fee per 30 days unless the facts suggest otherwise).
Under 120 words. Reply with JSON {"subject": string, "body": string}. Use only the facts given.`,
    JSON.stringify(f),
    EmailSchema
  );
  if (ai) return { ...ai.data, source: ai.source };
  const monthly = f.fee ? Math.round((f.fee * 0.25) / 100) * 100 : null;
  return {
    subject: `Keep ${f.title} running? Usage extension`,
    body: `Hi ${first(f.contactName)},\n\nThe usage rights for ${f.title} end on ${fmtDate(f.rightsEnd, "long")}. It's been great to see it perform, so if you'd like to keep it running I'm happy to extend:\n\n• 30 more days: ${money(monthly, f.currency)}\n• 90 more days: ${money(monthly ? monthly * 2.5 : null, f.currency)}\n\nAfter ${fmtDate(f.rightsEnd)}, please pause paid placements unless we've agreed an extension. Just reply with the option that works and I'll send the invoice.\n\nBest,\n${f.creator}`,
    source: "built-in" as AiSource,
  };
}

const InsightSchema = z.object({ insight: z.string().min(10).max(220) });

export async function dealInsight(f: DealFacts) {
  const ai = await jsonTask(
    `You are DealGuard, a calm agent that protects a creator's brand deals. Write ONE short, specific, actionable sentence (max 25 words) about what the creator should do next for this deal. Reply with JSON {"insight": string}.`,
    JSON.stringify(f),
    InsightSchema
  );
  if (ai) return ai.data.insight;
  if (f.status === "paid" && f.rightsDaysLeft != null && f.rightsDaysLeft <= 7 && f.rightsDaysLeft >= 0)
    return `Rights end in ${f.rightsDaysLeft} days. Send the renewal pitch now while the content is still live.`;
  if (f.status === "paid") return `${f.brand} paid. Split earnings with collaborators and pitch them your next idea.`;
  if (f.daysLate > 7) return `${f.daysLate} days late. Send a firm reminder today and ask for a payment date.`;
  if (f.daysLate > 0) return `Just went overdue. A friendly nudge usually gets this paid within a couple of days.`;
  if (f.status === "draft") return `Check the extracted terms, then approve. Ask for 50% upfront on first deals with a new brand.`;
  return `Invoice is out. We'll send a friendly nudge 2 days before ${fmtDate(f.dueDate)} if it's still unpaid.`;
}

export type { Extraction };
