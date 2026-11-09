import type { Extraction } from "./schema";

/*
  Built-in extractor used when no AI keys are configured (and as the last fallback).
  It only reports what it can find written in the email, so it never invents values.
*/

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const CURRENCY: [RegExp, string][] = [
  [/₹|\brs\.?\s|\binr\b/i, "INR"],
  [/€|\beur\b/i, "EUR"],
  [/£|\bgbp\b/i, "GBP"],
  [/\$|\busd\b/i, "USD"],
];

const toNumber = (s: string) => Number(s.replace(/[,\s]/g, ""));
const MONEY = /(₹|rs\.?\s?|inr\s?|\$|usd\s?|€|eur\s?|£|gbp\s?)\s?(\d[\d,]*(?:\.\d+)?)(\s?(?:k|lakh|lakhs|l)\b)?/gi;

function parseMoney(m: RegExpExecArray) {
  let n = toNumber(m[2]);
  const suffix = (m[3] ?? "").trim().toLowerCase();
  if (suffix === "k") n *= 1_000;
  if (suffix.startsWith("l")) n *= 100_000;
  const cur = CURRENCY.find(([re]) => re.test(m[1] + " "))?.[1] ?? null;
  return { n, cur, index: m.index, text: m[0] };
}

function parseDate(text: string): string | null {
  const re = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join("|")})[a-z]*,?\\s+(\\d{4})\\b`, "i");
  const m = text.match(re) ?? null;
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase().slice(0, 3)) + 1;
    return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  return iso ? iso[0] : null;
}

const PLATFORMS: [RegExp, string][] = [
  [/\b(reel|stories|story|instagram|ig)\b/i, "Instagram"],
  [/\b(youtube|short|integration|video)\b/i, "YouTube"],
  [/\btiktok\b/i, "TikTok"],
  [/\b(linkedin)\b/i, "LinkedIn"],
  [/\b(x|twitter|tweet)\b/i, "X"],
];
const DELIVERABLE_WORDS = /\b(reel|reels|story|stories|video|videos|short|shorts|integration|post|posts|tiktok|carousel|vlog|tutorial|live)\b/i;

export function rulesExtract(email: string, hint?: { fromName?: string; fromEmail?: string; subject?: string }): Extraction {
  const text = email.replace(/\r/g, "");
  const lower = text.toLowerCase();
  const confidence: Extraction["confidence"] = {};

  // Contact email: the hint (sender) or the first address in the text.
  const contactEmail = hint?.fromEmail ?? text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
  if (contactEmail) confidence.contactEmail = hint?.fromEmail ? 0.99 : 0.9;

  // Brand: signature line like "Partnerships, GlowSkin" or the sender label "Name · Brand".
  // Only short signature lines count, e.g. "Influencer Partnerships, GlowSkin".
  const signature = text
    .split("\n")
    .map((l) => l.trim())
    .reverse()
    .find((l) => l.length < 70 && /^[\w &'-]*(partnerships|marketing|team|manager|lead|influencer|social)[^,]*,\s*[^,]{2,40}$/i.test(l));
  let brand =
    hint?.fromName?.split("·")[1]?.trim() ??
    signature?.split(",").slice(-1)[0]?.trim() ??
    null;
  if (brand) brand = brand.replace(/\s+(india|europe|eu|global)$/i, "").trim();
  if (!brand && contactEmail) {
    const domain = contactEmail.split("@")[1]?.split(".")[0];
    if (domain && !/gmail|yahoo|outlook|hotmail/.test(domain)) brand = domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  if (brand) confidence.brand = 0.9;

  const contactName =
    hint?.fromName?.split("·")[0]?.trim() ??
    text.match(/\b(?:i'm|i am|this is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/)?.[1] ??
    null;

  // Money: prefer an amount next to budget/fee/total wording, else the largest.
  const monies: ReturnType<typeof parseMoney>[] = [];
  for (const m of text.matchAll(MONEY)) monies.push(parseMoney(m as RegExpExecArray));
  const near = monies.find((m) =>
    /(budget|fee|offer|total|package|for both|for the set|for one|we can offer)/i.test(text.slice(Math.max(0, m.index - 60), m.index + m.text.length + 40))
  );
  const best = near ?? [...monies].sort((a, b) => b.n - a.n)[0];
  const fee = best?.n ?? null;
  const currency = best?.cur ?? null;
  if (fee) confidence.fee = near ? 0.92 : 0.65;

  // Deliverables: bullet/numbered lines or "1 Reel + 3 Stories" phrases.
  const lines = text.split("\n").map((l) => l.trim());
  let deliverables = lines
    .filter((l) => /^([•\-*]|\d+[.)])\s*/.test(l) && DELIVERABLE_WORDS.test(l))
    .map((l) => l.replace(/^([•\-*]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim());
  if (!deliverables.length) {
    const phrase = text.match(/(\b(?:one|two|three|four|five|\d+)\s+[\w\s-]{0,30}?(?:reel|stories|story|video|short|post|integration)s?\b)/gi);
    // Ignore money ("950 for one Reel") and keep one phrase per kind of content.
    const seen = new Set<string>();
    deliverables = (phrase ?? [])
      .map((p) => p.trim())
      .filter((p) => {
        const lead = Number(p.match(/^\d+/)?.[0] ?? 0);
        const kind = p.match(DELIVERABLE_WORDS)?.[0]?.toLowerCase().replace(/s$/, "") ?? p;
        if (lead > 20 || seen.has(kind)) return false;
        seen.add(kind);
        return true;
      });
  }
  // Per-item amounts written like "₹1,00,000 for the Reel".
  const itemAmounts = monies.filter((m) => /for the|for each|per/i.test(text.slice(m.index + m.text.length, m.index + m.text.length + 12)));
  const items = deliverables.map((description) => {
    const platform = PLATFORMS.find(([re]) => re.test(description))?.[1] ?? null;
    const word = description.match(DELIVERABLE_WORDS)?.[0]?.toLowerCase().replace(/s$/, "");
    const priced = itemAmounts.find((m) => word && text.slice(m.index, m.index + m.text.length + 30).toLowerCase().includes(word));
    return { description: description.charAt(0).toUpperCase() + description.slice(1), platform, amount: priced?.n ?? null };
  });
  // Spread the remaining fee across items without a stated price.
  if (fee && items.length) {
    const known = items.reduce((s, i) => s + (i.amount ?? 0), 0);
    const unpriced = items.filter((i) => i.amount == null);
    if (unpriced.length) unpriced.forEach((i) => (i.amount = Math.max(0, Math.round((fee - known) / unpriced.length))));
  }
  if (items.length) confidence.deliverables = itemAmounts.length ? 0.9 : 0.75;

  // Due date: the posting/live date.
  const dueSentence = text.split(/(?<=[.!?\n])/).find((s) => /(by|live|post|publish|on)\b/i.test(s) && parseDate(s));
  const dueDate = dueSentence ? parseDate(dueSentence) : parseDate(text);
  if (dueDate) confidence.dueDate = dueSentence ? 0.8 : 0.55;

  const terms =
    text.match(/\bnet\s?\d+(?:\s+(?:from|after)\s+[a-z ]{3,20})?/i)?.[0] ??
    text.match(/within\s+\d+\s+days?(?:\s+of\s+[a-z ]{3,30})?/i)?.[0] ??
    text.match(/\d+\s+days\s+(?:after|of|from)\s+[a-z ]{3,30}/i)?.[0] ??
    null;
  const paymentTerms = terms ? terms.charAt(0).toUpperCase() + terms.slice(1).replace(/[.,]$/, "") : null;
  if (paymentTerms) confidence.paymentTerms = 0.85;

  let usageDays: number | null = null;
  const usage = lower.match(/(\d+)\s*(day|month)s?(?:\s+of)?\s+(?:paid\s+)?usage|usage(?:\s+rights)?[^.\n]{0,20}?(\d+)\s*(day|month)s?|(\d+)\s*(day|month)s?\s+(?:on|for)\s+(?:our|paid)/);
  if (usage) {
    const n = Number(usage[1] ?? usage[3] ?? usage[5]);
    const unit = usage[2] ?? usage[4] ?? usage[6];
    usageDays = unit === "month" ? n * 30 : n;
    confidence.usageDays = 0.82;
  }

  const subjectish = text.match(/(?:launch|campaign|series|push)[^.\n]{0,40}/i)?.[0];
  return {
    brand, contactName, contactEmail, currency, fee, deliverables: items, dueDate, paymentTerms, usageDays,
    title: hint?.subject
      ? hint.subject.replace(/^(re|fwd?):s*/i, "").replace(/[^p{L}p{N}s:&+-x]/gu, "").trim()
      : subjectish ? subjectish.charAt(0).toUpperCase() + subjectish.slice(1).trim() : brand ? `${brand} partnership` : null,
    confidence,
  };
}
