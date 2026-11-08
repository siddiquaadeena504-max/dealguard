import "server-only";
import { lt, and, eq } from "drizzle-orm";
import { activity, collaborators, db, deals, newId, payouts, reminders, workspaces, type Deliverable } from "../db";
import { isoDay } from "../format";
import { DEMO_EMAILS } from "./emails";

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

type SeedDeal = {
  brand: string; contactName: string; contactEmail: string; title: string; currency: string; fee: number;
  deliverables: Deliverable[]; dueIn: number; terms: string; usageDays: number | null; usageStartAgo: number | null;
  status: "draft" | "sent" | "paid"; sentAgoDays?: number; paidAgoDays?: number; insight: string; emailId?: string;
};

const DEALS: SeedDeal[] = [
  {
    brand: "GlowSkin", contactName: "Priya Menon", contactEmail: "priya@glowskin.in", title: "Winter launch: Reel + Stories",
    currency: "INR", fee: 150000, dueIn: 42, terms: "Net 30 from posting", usageDays: 90, usageStartAgo: null, status: "draft",
    deliverables: [
      { description: "Instagram Reel (45–60s)", platform: "Instagram", amount: 100000 },
      { description: "3 Instagram Stories with link", platform: "Instagram", amount: 50000 },
    ],
    insight: "New brand for you. Ask for 50% upfront on first deals over ₹1L.", emailId: "glowskin",
  },
  {
    brand: "boAt", contactName: "Rahul Verma", contactEmail: "rahul.verma@boat-lifestyle.com", title: "Airdopes Pro launch video",
    currency: "INR", fee: 85000, dueIn: 3, terms: "15 days after publish", usageDays: null, usageStartAgo: null, status: "sent", sentAgoDays: 12,
    deliverables: [
      { description: "YouTube integration (60–90s)", platform: "YouTube", amount: 70000 },
      { description: "YouTube Short", platform: "YouTube", amount: 15000 },
    ],
    insight: "boAt paid on time twice before. A friendly nudge on the due date is enough.",
  },
  {
    brand: "Mamaearth", contactName: "Sneha Iyer", contactEmail: "sneha@mamaearth.in", title: "Monsoon haircare Reel",
    currency: "INR", fee: 72000, dueIn: -9, terms: "Net 30", usageDays: 30, usageStartAgo: 20, status: "sent", sentAgoDays: 39,
    deliverables: [{ description: "Instagram Reel", platform: "Instagram", amount: 72000 }],
    insight: "Usually pays 10–14 days late. Send a firm reminder now and loop in finance.",
  },
  {
    brand: "Nykaa", contactName: "Ishita Rao", contactEmail: "ishita.rao@nykaa.com", title: "Festive glam tutorial",
    currency: "INR", fee: 120000, dueIn: -20, terms: "Net 30", usageDays: 60, usageStartAgo: 55, status: "paid", sentAgoDays: 50, paidAgoDays: 21,
    deliverables: [
      { description: "YouTube tutorial (8–10 min)", platform: "YouTube", amount: 90000 },
      { description: "Instagram Reel cut-down", platform: "Instagram", amount: 30000 },
    ],
    insight: "Rights end in 5 days and the Reel is still running as an ad. Pitch a 30-day extension.",
  },
  {
    brand: "Notion", contactName: "Maya Chen", contactEmail: "maya.chen@makenotion.com", title: "Study-with-me sponsorship",
    currency: "USD", fee: 1800, dueIn: -6, terms: "Net 45", usageDays: 180, usageStartAgo: 126, status: "paid", sentAgoDays: 51, paidAgoDays: 8,
    deliverables: [
      { description: "YouTube integration · video 1", platform: "YouTube", amount: 900 },
      { description: "YouTube integration · video 2", platform: "YouTube", amount: 900 },
    ],
    insight: "Paid 2 days early. A great brand to pitch a quarterly retainer to.",
  },
  {
    brand: "Decathlon", contactName: "Lena Fischer", contactEmail: "lena.fischer@decathlon.eu", title: "Trail running Reel",
    currency: "EUR", fee: 950, dueIn: 14, terms: "Net 30", usageDays: 60, usageStartAgo: 16, status: "sent", sentAgoDays: 16,
    deliverables: [{ description: "Instagram Reel on a trail run", platform: "Instagram", amount: 950 }],
    insight: "EU brands often pay on the last day of terms. No action needed yet.",
  },
  {
    brand: "Zomato", contactName: "Arjun Kapoor", contactEmail: "arjun.k@zomato.com", title: "Weekend food crawl vlog",
    currency: "INR", fee: 60000, dueIn: -2, terms: "Net 15", usageDays: null, usageStartAgo: null, status: "sent", sentAgoDays: 17,
    deliverables: [{ description: "YouTube vlog integration", platform: "YouTube", amount: 60000 }],
    insight: "Just went overdue. A friendly reminder usually works within 2 days for Zomato.",
  },
];

/** Creates a fresh demo workspace with deals in every state. */
export function createDemoWorkspace() {
  // Housekeeping: drop demo workspaces older than a day.
  db.delete(workspaces).where(and(eq(workspaces.isDemo, true), lt(workspaces.createdAt, ago(24 * 60)))).run();

  const wsId = newId();
  db.insert(workspaces).values({
    id: wsId, name: "Aanya", niche: "Beauty & lifestyle", payoutEmail: "aanya.creates@example.com",
    currency: "INR", reminderTone: "balanced", isDemo: true, onboarded: true, createdAt: new Date().toISOString(),
  }).run();

  const log = (dealId: string | null, kind: typeof activity.$inferInsert.kind, message: string, minutesAgo: number) =>
    db.insert(activity).values({ id: newId(), workspaceId: wsId, dealId, kind, message, createdAt: ago(minutesAgo) }).run();

  let invoiceSeq = 38;
  for (const s of DEALS) {
    const id = newId();
    const sent = s.status !== "draft";
    const number = sent ? `INV-2026-${String(invoiceSeq++).padStart(4, "0")}` : null;
    const usageStart = s.usageStartAgo != null ? isoDay(-s.usageStartAgo) : null;
    db.insert(deals).values({
      id, workspaceId: wsId, brand: s.brand, contactName: s.contactName, contactEmail: s.contactEmail, title: s.title,
      currency: s.currency, fee: s.fee, deliverables: s.deliverables, dueDate: isoDay(s.dueIn), paymentTerms: s.terms,
      usageDays: s.usageDays, usageStart, status: s.status,
      invoiceId: sent ? `DEMO-${number}` : null, invoiceNumber: number,
      sourceEmail: s.emailId ? DEMO_EMAILS.find((e) => e.id === s.emailId)!.body() : null,
      confidence: s.status === "draft" ? { brand: 0.97, fee: 0.92, deliverables: 0.88, dueDate: 0.71, usageDays: 0.84, contactEmail: 0.99 } : null,
      insight: s.insight,
      sentAt: s.sentAgoDays != null ? ago(s.sentAgoDays * 1440) : null,
      paidAt: s.paidAgoDays != null ? ago(s.paidAgoDays * 1440) : null,
      createdAt: ago((s.sentAgoDays ?? 0) * 1440 + 30),
    }).run();

    if (s.status === "draft") log(id, "extracted", `Pulled a ${s.brand} offer out of Priya's email. Waiting for your approval.`, 11);
    if (sent) log(id, "invoice_sent", `Invoice ${number} sent to ${s.brand} via PayPal.`, s.sentAgoDays! * 1440);
    if (s.status === "paid") log(id, "paid", `${s.brand} paid ${number}. Shield up. 💚`, s.paidAgoDays! * 1440);

    if (s.brand === "Mamaearth") {
      db.insert(reminders).values({
        id: newId(), dealId: id, tone: "friendly", status: "sent", sentAt: ago(4 * 1440), createdAt: ago(4 * 1440),
        subject: `Quick nudge on ${number}`,
        body: `Hi Sneha, hope the campaign is doing well! Just a gentle reminder that invoice ${number} for ₹72,000 is now due. Here's the PayPal link again. Thank you!`,
      }).run();
      log(id, "reminder", "Friendly reminder sent to Mamaearth. No reply yet.", 4 * 1440);
    }
    if (s.brand === "Nykaa") {
      const c = newId();
      db.insert(collaborators).values({ id: c, dealId: id, name: "Dev Patel", email: "dev.edits@example.com", role: "Video editor", sharePct: 15 }).run();
      db.insert(payouts).values({
        id: newId(), dealId: id, collaboratorId: c, amount: 18000, currency: "INR", status: "proposed", createdAt: ago(21 * 1440),
      }).run();
      log(id, "rights", "Nykaa usage rights end in 5 days. Renewal pitch is ready.", 60);
    }
    if (s.brand === "Notion") {
      const c = newId();
      db.insert(collaborators).values({ id: c, dealId: id, name: "Riya Sen", email: "riya.thumbs@example.com", role: "Thumbnail designer", sharePct: 10 }).run();
      db.insert(payouts).values({
        id: newId(), dealId: id, collaboratorId: c, amount: 180, currency: "USD", status: "sent", batchId: "DEMO-BATCH-7Q2",
        sentAt: ago(7 * 1440), createdAt: ago(8 * 1440),
      }).run();
      log(id, "payout", "Paid Riya Sen $180 (10%) via PayPal Payouts.", 7 * 1440);
    }
    if (s.brand === "Zomato") log(id, "rights", "Zomato invoice went overdue 2 days ago. Friendly reminder drafted.", 180);
  }
  log(null, "email", "New email from GlowSkin looks like a brand deal.", 12);
  return wsId;
}
