"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { activity, collaborators, db, deals, newId, nowIso, payouts, reminders, workspaces, type Deal, type Workspace } from "@/lib/db";
import { dealInsight, draftReminder, draftRenewal, extractDeal, type DealFacts } from "@/lib/ai";
import { ExtractionSchema } from "@/lib/ai/schema";
import { createAndSendInvoice, getInvoiceStatus, isPaidStatus, PayPalError, sendInvoiceReminder, sendPayouts } from "@/lib/paypal";
import { dealState, rightsDaysLeft, rightsEnd } from "@/lib/deals";
import { daysUntil, isoDay, money } from "@/lib/format";
import { getWorkspace, WS_COOKIE } from "@/lib/workspace";
import { markPaid, proposePayouts } from "@/lib/deal-ops";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function ws() {
  const w = await getWorkspace();
  if (!w) throw new Error("Your session expired. Open the demo again.");
  return w;
}

function ownDeal(w: Workspace, dealId: string) {
  const d = db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.workspaceId, w.id))).get();
  if (!d) throw new Error("That deal no longer exists.");
  return d;
}

const log = (w: Workspace, dealId: string | null, kind: typeof activity.$inferInsert.kind, message: string) =>
  db.insert(activity).values({ id: newId(), workspaceId: w.id, dealId, kind, message, createdAt: nowIso() }).run();

function facts(w: Workspace, d: Deal): DealFacts {
  const sent = db.select().from(reminders).where(and(eq(reminders.dealId, d.id), eq(reminders.status, "sent"))).all().length;
  return {
    creator: w.name, brand: d.brand, contactName: d.contactName, title: d.title, fee: d.fee, currency: d.currency,
    invoiceNumber: d.invoiceNumber, dueDate: d.dueDate, daysLate: Math.max(0, -(daysUntil(d.dueDate) ?? 0)),
    usageDays: d.usageDays, rightsEnd: rightsEnd(d), rightsDaysLeft: rightsDaysLeft(d), status: d.status,
    remindersSent: sent, tonePref: w.reminderTone,
  };
}

const fail = (err: unknown): { ok: false; error: string } => ({
  ok: false,
  error: err instanceof PayPalError || err instanceof Error ? err.message : "Something went wrong. Please try again.",
});

async function refreshInsight(w: Workspace, dealId: string) {
  const fresh = ownDeal(w, dealId);
  const insight = await dealInsight(facts(w, fresh)).catch(() => null);
  if (insight) db.update(deals).set({ insight }).where(eq(deals.id, dealId)).run();
}

// ---------------------------------------------------------------- intake

export async function extractAction(email: string, hint?: { fromName?: string; fromEmail?: string; subject?: string }) {
  try {
    await ws();
    if (email.trim().length < 40) return { ok: false as const, error: "That email looks too short. Paste the whole message." };
    const { data, source } = await extractDeal(email, hint);
    return { ok: true as const, data, source };
  } catch (err) {
    return fail(err);
  }
}

const ApproveSchema = ExtractionSchema.extend({
  brand: z.string().trim().min(1, "Add the brand name"),
  contactEmail: z.string().trim().email("Add a valid contact email"),
  currency: z.string().length(3),
  fee: z.number().positive("Add the fee"),
  deliverables: z.array(z.object({ description: z.string().min(1), platform: z.string().nullable(), amount: z.number().nullable() })).min(1, "Add at least one deliverable"),
});

/** The only path from AI output to a sent invoice: runs after the creator clicks Approve. */
export async function approveAndSendAction(
  input: unknown,
  opts: { draftId?: string; sourceEmail?: string; confidence?: Record<string, number> }
): Promise<Result<{ dealId: string; simulated: boolean; invoiceNumber: string }>> {
  try {
    const w = await ws();
    const parsed = ApproveSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Some fields need a look." };
    const x = parsed.data;

    // Line items must add up to the fee.
    const items = x.deliverables.map((d) => ({ name: d.description, amount: d.amount ?? 0 }));
    const sum = items.reduce((s, i) => s + i.amount, 0);
    if (Math.abs(sum - x.fee) > 0.5) {
      if (sum === 0) items.forEach((i) => (i.amount = x.fee / items.length));
      else return { ok: false, error: `Line items add up to ${money(sum, x.currency)} but the fee is ${money(x.fee, x.currency)}.` };
    }

    const invoice = await createAndSendInvoice({
      creatorName: w.name, invoicerEmail: null, brand: x.brand, contactName: x.contactName, contactEmail: x.contactEmail,
      currency: x.currency, dueDate: x.dueDate, terms: x.paymentTerms, items,
      memo: `${x.title ?? `${x.brand} partnership`}. Thank you for working with ${w.name}!`,
    });

    const values = {
      brand: x.brand, contactName: x.contactName, contactEmail: x.contactEmail, title: x.title ?? `${x.brand} partnership`,
      currency: x.currency, fee: x.fee, deliverables: x.deliverables, dueDate: x.dueDate, paymentTerms: x.paymentTerms,
      usageDays: x.usageDays, usageStart: x.usageDays ? (x.dueDate && x.dueDate > isoDay() ? x.dueDate : isoDay()) : null,
      status: "sent" as const, invoiceId: invoice.id, invoiceNumber: invoice.number, invoiceUrl: invoice.url, sentAt: nowIso(),
    };
    let dealId = opts.draftId;
    if (dealId) {
      ownDeal(w, dealId);
      db.update(deals).set(values).where(eq(deals.id, dealId)).run();
    } else {
      dealId = newId();
      db.insert(deals).values({ id: dealId, workspaceId: w.id, createdAt: nowIso(), sourceEmail: opts.sourceEmail ?? null, confidence: opts.confidence ?? null, ...values }).run();
      log(w, dealId, "extracted", `Pulled a ${x.brand} deal out of an email.`);
    }
    log(w, dealId, "approved", `You approved the ${x.brand} invoice.`);
    log(w, dealId, "invoice_sent", `Invoice ${invoice.number} sent to ${x.brand} via PayPal${invoice.simulated ? " (simulated)" : ""}.`);

    const d = ownDeal(w, dealId);
    const insight = await dealInsight(facts(w, d)).catch(() => null);
    if (insight) db.update(deals).set({ insight }).where(eq(deals.id, dealId)).run();

    revalidatePath("/app", "layout");
    return { ok: true, dealId, simulated: invoice.simulated, invoiceNumber: invoice.number };
  } catch (err) {
    return fail(err);
  }
}

export async function discardDraftAction(dealId: string) {
  const w = await ws();
  const d = ownDeal(w, dealId);
  if (d.status === "draft") db.update(deals).set({ status: "cancelled" }).where(eq(deals.id, dealId)).run();
  revalidatePath("/app", "layout");
  redirect("/app");
}

// ---------------------------------------------------------------- payment tracking

export async function refreshStatusAction(dealId: string): Promise<Result<{ paid: boolean; status: string }>> {
  try {
    const w = await ws();
    const d = ownDeal(w, dealId);
    if (!d.invoiceId) return { ok: false, error: "No invoice has been sent for this deal yet." };
    const { status, url } = await getInvoiceStatus(d.invoiceId);
    if (url && url !== d.invoiceUrl) db.update(deals).set({ invoiceUrl: url }).where(eq(deals.id, d.id)).run();
    if (isPaidStatus(status)) {
      markPaid(d, "via PayPal");
      await refreshInsight(w, d.id);
    }
    revalidatePath("/app", "layout");
    return { ok: true, paid: isPaidStatus(status) || d.status === "paid", status };
  } catch (err) {
    return fail(err);
  }
}

/** Demo only: stands in for the brand paying, when PayPal is simulated. */
export async function simulatePaymentAction(dealId: string): Promise<Result> {
  try {
    const w = await ws();
    const d = ownDeal(w, dealId);
    if (!d.invoiceId?.startsWith("SIM-") && !d.invoiceId?.startsWith("DEMO-")) return { ok: false, error: "This invoice is on real PayPal sandbox. Pay it as the sandbox buyer, then refresh." };
    markPaid(d, "(simulated)");
    await refreshInsight(w, d.id);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------- chase agent

export async function draftReminderAction(dealId: string, tone: "friendly" | "firm" | "final"): Promise<Result<{ id: string; subject: string; body: string }>> {
  try {
    const w = await ws();
    const d = ownDeal(w, dealId);
    const r = await draftReminder(facts(w, d), tone);
    const id = newId();
    db.insert(reminders).values({ id, dealId, tone, subject: r.subject, body: r.body, status: "draft", createdAt: nowIso() }).run();
    revalidatePath(`/app/deals/${dealId}`);
    return { ok: true, id, subject: r.subject, body: r.body };
  } catch (err) {
    return fail(err);
  }
}

export async function sendReminderAction(reminderId: string, subject: string, body: string): Promise<Result<{ simulated: boolean }>> {
  try {
    const w = await ws();
    const r = db.select().from(reminders).where(eq(reminders.id, reminderId)).get();
    if (!r) return { ok: false, error: "That reminder was removed." };
    const d = ownDeal(w, r.dealId);
    if (!d.invoiceId) return { ok: false, error: "Send the invoice first." };
    const res = await sendInvoiceReminder(d.invoiceId, subject, body);
    db.update(reminders).set({ subject, body, status: "sent", sentAt: nowIso() }).where(eq(reminders.id, reminderId)).run();
    log(w, d.id, "reminder", `${r.tone[0].toUpperCase() + r.tone.slice(1)} reminder sent to ${d.brand}${res.simulated ? " (simulated)" : " via PayPal"}.`);
    revalidatePath("/app", "layout");
    return { ok: true, simulated: res.simulated };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteReminderAction(reminderId: string) {
  const w = await ws();
  const r = db.select().from(reminders).where(eq(reminders.id, reminderId)).get();
  if (r && ownDeal(w, r.dealId) && r.status === "draft") db.delete(reminders).where(eq(reminders.id, reminderId)).run();
  revalidatePath("/app", "layout");
}

// ---------------------------------------------------------------- rights guard

export async function renewalPitchAction(dealId: string): Promise<Result<{ subject: string; body: string; source: string }>> {
  try {
    const w = await ws();
    const d = ownDeal(w, dealId);
    const p = await draftRenewal(facts(w, d));
    return { ok: true, subject: p.subject, body: p.body, source: p.source };
  } catch (err) {
    return fail(err);
  }
}

export async function logRenewalSentAction(dealId: string) {
  const w = await ws();
  const d = ownDeal(w, dealId);
  log(w, d.id, "renewal", `Renewal pitch sent to ${d.brand}.`);
  revalidatePath("/app", "layout");
}

export async function refreshInsightAction(dealId: string): Promise<Result<{ insight: string }>> {
  try {
    const w = await ws();
    const d = ownDeal(w, dealId);
    const insight = await dealInsight(facts(w, d));
    db.update(deals).set({ insight }).where(eq(deals.id, d.id)).run();
    revalidatePath(`/app/deals/${dealId}`);
    return { ok: true, insight };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------- collaborators & payouts

const CollabSchema = z.object({
  name: z.string().trim().min(1, "Add a name"),
  email: z.string().trim().email("Add a valid PayPal email"),
  role: z.string().trim().optional(),
  sharePct: z.number().gt(0, "Share must be more than 0%").max(100),
});

export async function addCollaboratorAction(dealId: string, input: unknown): Promise<Result> {
  try {
    const w = await ws();
    const d = ownDeal(w, dealId);
    const parsed = CollabSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const total = db.select().from(collaborators).where(eq(collaborators.dealId, dealId)).all().reduce((s, c) => s + c.sharePct, 0);
    if (total + parsed.data.sharePct > 90) return { ok: false, error: `Splits would reach ${total + parsed.data.sharePct}%. Keep at least 10% for yourself.` };
    db.insert(collaborators).values({ id: newId(), dealId, ...parsed.data, role: parsed.data.role || null }).run();
    if (d.status === "paid") proposePayouts(dealId);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function removeCollaboratorAction(collabId: string) {
  const w = await ws();
  const c = db.select().from(collaborators).where(eq(collaborators.id, collabId)).get();
  if (c) {
    ownDeal(w, c.dealId);
    const sent = db.select().from(payouts).where(and(eq(payouts.collaboratorId, collabId), eq(payouts.status, "sent"))).get();
    if (!sent) db.delete(collaborators).where(eq(collaborators.id, collabId)).run();
  }
  revalidatePath("/app", "layout");
}

export async function sendPayoutsAction(dealId: string): Promise<Result<{ count: number; simulated: boolean }>> {
  try {
    const w = await ws();
    const d = ownDeal(w, dealId);
    if (d.status !== "paid") return { ok: false, error: "Payouts unlock once the brand has paid." };
    const rows = db
      .select({ p: payouts, c: collaborators })
      .from(payouts)
      .innerJoin(collaborators, eq(collaborators.id, payouts.collaboratorId))
      .where(and(eq(payouts.dealId, dealId), eq(payouts.status, "proposed")))
      .all();
    if (!rows.length) return { ok: false, error: "No payouts waiting for approval." };
    const res = await sendPayouts(d.id.slice(0, 8) + Date.now().toString(36), rows.map(({ p, c }) => ({
      email: c.email, amount: p.amount, currency: p.currency, ref: p.id,
      note: `${c.sharePct}% of ${d.brand}: ${d.title}. Thanks for the collab!`,
    })));
    for (const { p, c } of rows) {
      db.update(payouts).set({ status: "sent", batchId: res.batchId, sentAt: nowIso() }).where(eq(payouts.id, p.id)).run();
      log(w, d.id, "payout", `Paid ${c.name} ${money(p.amount, p.currency)} (${c.sharePct}%) via PayPal Payouts${res.simulated ? " (simulated)" : ""}.`);
    }
    revalidatePath("/app", "layout");
    return { ok: true, count: rows.length, simulated: res.simulated };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------- settings & onboarding

const SettingsSchema = z.object({
  name: z.string().trim().min(1, "Add your name").max(60),
  niche: z.string().trim().max(60).optional(),
  payoutEmail: z.union([z.literal(""), z.string().trim().email("That payout email looks invalid")]),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]),
  reminderTone: z.enum(["gentle", "balanced", "direct"]),
});

export async function saveSettingsAction(input: unknown): Promise<Result> {
  try {
    const w = await ws();
    const parsed = SettingsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const s = parsed.data;
    db.update(workspaces).set({ name: s.name, niche: s.niche || null, payoutEmail: s.payoutEmail || null, currency: s.currency, reminderTone: s.reminderTone }).where(eq(workspaces.id, w.id)).run();
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function startWorkspaceAction(input: { name: string; niche: string; payoutEmail: string; currency: string }): Promise<Result> {
  const name = input.name.trim() || "Creator";
  const id = newId();
  db.insert(workspaces).values({
    id, name, niche: input.niche.trim() || null, payoutEmail: input.payoutEmail.trim() || null,
    currency: ["INR", "USD", "EUR", "GBP"].includes(input.currency) ? input.currency : "INR",
    reminderTone: "balanced", isDemo: false, onboarded: true, createdAt: nowIso(),
  }).run();
  (await cookies()).set(WS_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return { ok: true };
}

export async function deleteWorkspaceAction() {
  const w = await getWorkspace();
  if (w) db.delete(workspaces).where(eq(workspaces.id, w.id)).run();
  (await cookies()).delete(WS_COOKIE);
  redirect("/");
}

export async function dealStateFor(dealId: string) {
  const w = await ws();
  return dealState(ownDeal(w, dealId));
}
