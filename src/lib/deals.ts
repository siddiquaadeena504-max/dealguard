import "server-only";
import { all, get, run, tx, newId } from "./db";
import { money, fmtDate, today } from "./format";
import type { Extracted } from "./ai";

export type Deal = {
  id: string;
  user_id: string;
  brand_id: string | null;
  contact_id: string | null;
  title: string;
  status: "negotiating" | "active" | "completed" | "archived";
  fee: number | null;
  currency: string | null;
  payment_terms: string | null;
  campaign_summary: string | null;
  closure_summary: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  brand_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
};
export type Deliverable = {
  id: string; deal_id: string; description: string; platform: string | null; due_date: string | null; status: string;
};
export type Payment = {
  id: string; deal_id: string; amount: number | null; currency: string | null; due_date: string | null;
  status: string; paid_at: string | null; note: string | null;
};
export type UsageRight = {
  id: string; deal_id: string; description: string | null; platforms: string | null;
  start_date: string | null; end_date: string | null; exclusivity: string | null;
};

const DEAL_SELECT = `SELECT d.*, b.name AS brand_name, c.name AS contact_name, c.email AS contact_email
  FROM deals d LEFT JOIN brands b ON b.id = d.brand_id LEFT JOIN contacts c ON c.id = d.contact_id`;

export function getDeal(userId: string, dealId: string) {
  return get<Deal>(`${DEAL_SELECT} WHERE d.id = ? AND d.user_id = ?`, dealId, userId);
}
export function listDeals(userId: string, archived = false) {
  return all<Deal>(
    `${DEAL_SELECT} WHERE d.user_id = ? AND d.status ${archived ? "=" : "!="} 'archived' ORDER BY d.updated_at DESC`,
    userId
  );
}
export const dealDeliverables = (dealId: string) =>
  all<Deliverable>("SELECT * FROM deliverables WHERE deal_id = ? ORDER BY due_date IS NULL, due_date", dealId);
export const dealPayments = (dealId: string) =>
  all<Payment>("SELECT * FROM payments WHERE deal_id = ? ORDER BY due_date IS NULL, due_date", dealId);
export const dealUsage = (dealId: string) =>
  all<UsageRight>("SELECT * FROM usage_rights WHERE deal_id = ? ORDER BY end_date IS NULL, end_date", dealId);

/** The deal's current terms, saved next to an extraction so the review shows original vs new. */
export function snapshotDeal(dealId: string) {
  const d = get<Deal>("SELECT * FROM deals WHERE id = ?", dealId);
  const u = dealUsage(dealId)[0];
  const p = dealPayments(dealId).find((x) => x.status !== "paid") ?? dealPayments(dealId)[0];
  return {
    fee: d?.fee ?? null,
    currency: d?.currency ?? null,
    payment_terms: d?.payment_terms ?? null,
    payment_due_date: p?.due_date ?? null,
    deliverables: dealDeliverables(dealId).map((x) => ({
      description: x.description, platform: x.platform, due_date: x.due_date,
    })),
    usage_rights: u
      ? { description: u.description, platforms: u.platforms, start_date: u.start_date, end_date: u.end_date, exclusivity: u.exclusivity }
      : null,
    campaign_summary: d?.campaign_summary ?? null,
  };
}

function findOrCreateBrand(userId: string, name: string | null) {
  if (!name) return null;
  const existing = get<{ id: string }>("SELECT id FROM brands WHERE user_id = ? AND lower(name) = lower(?)", userId, name);
  if (existing) return existing.id;
  const id = newId();
  run("INSERT INTO brands (id, user_id, name) VALUES (?, ?, ?)", id, userId, name);
  return id;
}

function findOrCreateContact(userId: string, brandId: string | null, name: string | null, email: string | null) {
  if (!email && !name) return null;
  const existing = email
    ? get<{ id: string; name: string | null; brand_id: string | null }>(
        "SELECT id, name, brand_id FROM contacts WHERE user_id = ? AND email = ?", userId, email)
    : undefined;
  if (existing) {
    run("UPDATE contacts SET name = coalesce(name, ?), brand_id = coalesce(brand_id, ?) WHERE id = ?", name, brandId, existing.id);
    return existing.id;
  }
  const id = newId();
  run("INSERT INTO contacts (id, user_id, brand_id, name, email) VALUES (?, ?, ?, ?, ?)", id, userId, brandId, name, email);
  return id;
}

/** Applies a creator-approved extraction to the deal. This is the only path from AI output to deal data. */
export function approveExtraction(userId: string, extractionId: string, data: Extracted) {
  return tx(() => {
    const ext = get<{ id: string; email_id: string | null; deal_id: string | null; category: string }>(
      "SELECT id, email_id, deal_id, category FROM extractions WHERE id = ? AND user_id = ? AND status = 'pending'",
      extractionId, userId
    );
    if (!ext) throw new Error("This item was already reviewed.");

    const brandId = findOrCreateBrand(userId, data.brand);
    const contactId = findOrCreateContact(userId, brandId, data.contact_name, data.contact_email);
    const now = new Date().toISOString();
    let dealId = ext.deal_id;

    if (dealId) {
      run(
        `UPDATE deals SET fee = coalesce(?, fee), currency = coalesce(?, currency), payment_terms = coalesce(?, payment_terms),
           campaign_summary = coalesce(?, campaign_summary), brand_id = coalesce(brand_id, ?), contact_id = coalesce(contact_id, ?),
           status = CASE WHEN ? = 'agreement' AND status = 'negotiating' THEN 'active' ELSE status END, updated_at = ?
         WHERE id = ? AND user_id = ?`,
        data.fee, data.currency, data.payment_terms, data.campaign_summary, brandId, contactId, ext.category, now, dealId, userId
      );
    } else {
      dealId = newId();
      const title = [data.brand ?? "New brand deal", data.campaign_summary ? shortTitle(data.campaign_summary) : null]
        .filter(Boolean).join(" – ");
      run(
        `INSERT INTO deals (id, user_id, brand_id, contact_id, title, status, fee, currency, payment_terms, campaign_summary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        dealId, userId, brandId, contactId, title, ext.category === "agreement" ? "active" : "negotiating",
        data.fee, data.currency, data.payment_terms, data.campaign_summary
      );
    }

    // Link the Gmail thread (and any other pending items from it) to this deal.
    if (ext.email_id) {
      const thread = get<{ thread_id: string }>("SELECT thread_id FROM emails WHERE id = ?", ext.email_id);
      if (thread) {
        run("UPDATE email_threads SET deal_id = ? WHERE id = ?", dealId, thread.thread_id);
        run(
          `UPDATE extractions SET deal_id = ? WHERE deal_id IS NULL AND status = 'pending'
           AND email_id IN (SELECT id FROM emails WHERE thread_id = ?)`,
          dealId, thread.thread_id
        );
      }
    }

    // Deliverables: a scope change replaces the not-yet-started list; anything else adds or updates.
    if (ext.category === "scope_change" && data.deliverables.length) {
      run("DELETE FROM deliverables WHERE deal_id = ? AND status = 'pending'", dealId);
    }
    for (const d of data.deliverables) {
      const match = get<{ id: string }>(
        "SELECT id FROM deliverables WHERE deal_id = ? AND lower(description) = lower(?)", dealId, d.description);
      if (match) {
        run("UPDATE deliverables SET due_date = coalesce(?, due_date), platform = coalesce(?, platform) WHERE id = ?",
          d.due_date, d.platform, match.id);
      } else {
        run("INSERT INTO deliverables (id, user_id, deal_id, description, platform, due_date) VALUES (?, ?, ?, ?, ?, ?)",
          newId(), userId, dealId, d.description, d.platform, d.due_date);
      }
    }

    // Payment: keep one open payment per deal in step with the agreed fee.
    if (data.fee != null || data.payment_due_date || data.payment_received) {
      const open = get<{ id: string }>(
        "SELECT id FROM payments WHERE deal_id = ? AND status != 'paid' ORDER BY created_at DESC LIMIT 1", dealId);
      const paid = data.payment_received === true;
      if (open) {
        run(
          `UPDATE payments SET amount = coalesce(?, amount), currency = coalesce(?, currency), due_date = coalesce(?, due_date),
             note = coalesce(?, note), status = CASE WHEN ? THEN 'paid' ELSE status END,
             paid_at = CASE WHEN ? THEN ? ELSE paid_at END WHERE id = ?`,
          data.fee, data.currency, data.payment_due_date, data.payment_terms, paid ? 1 : 0, paid ? 1 : 0, today(), open.id
        );
      } else if (!paid || data.fee != null) {
        run(
          `INSERT INTO payments (id, user_id, deal_id, amount, currency, due_date, status, paid_at, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          newId(), userId, dealId, data.fee, data.currency, data.payment_due_date,
          paid ? "paid" : "pending", paid ? today() : null, data.payment_terms
        );
      }
    }

    if (data.usage_rights) {
      const u = data.usage_rights;
      const existing = get<{ id: string }>("SELECT id FROM usage_rights WHERE deal_id = ? LIMIT 1", dealId);
      if (existing) {
        run(
          `UPDATE usage_rights SET description = coalesce(?, description), platforms = coalesce(?, platforms),
             start_date = coalesce(?, start_date), end_date = coalesce(?, end_date), exclusivity = coalesce(?, exclusivity) WHERE id = ?`,
          u.description, u.platforms, u.start_date, u.end_date, u.exclusivity, existing.id
        );
      } else {
        run(
          `INSERT INTO usage_rights (id, user_id, deal_id, description, platforms, start_date, end_date, exclusivity)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          newId(), userId, dealId, u.description, u.platforms, u.start_date, u.end_date, u.exclusivity
        );
      }
    }

    run("UPDATE extractions SET status = 'approved', reviewed_at = ?, data = ?, deal_id = ? WHERE id = ?",
      now, JSON.stringify(data), dealId, ext.id);
    return dealId;
  });
}

function shortTitle(s: string) {
  const t = s.replace(/\.$/, "");
  return t.length > 50 ? t.slice(0, 47) + "…" : t;
}

/** Marks overdue payments and creates in-app reminders. Safe to run many times a day. */
export function runDailyCheck(userId: string) {
  const t = today();
  const in7 = today(7);
  const in30 = today(30);
  return tx(() => {
    const overdue = run(
      "UPDATE payments SET status = 'overdue' WHERE user_id = ? AND status = 'pending' AND due_date < ?", userId, t
    ).changes;
    let created = 0;
    const add = (dealId: string, kind: string, refId: string, title: string, due: string | null) => {
      created += Number(run(
        "INSERT OR IGNORE INTO reminders (id, user_id, deal_id, kind, ref_id, title, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        newId(), userId, dealId, kind, refId, title, due
      ).changes);
    };
    const live = "d.status != 'archived'";

    for (const p of all<Payment & { title: string }>(
      `SELECT p.*, d.title FROM payments p JOIN deals d ON d.id = p.deal_id
       WHERE p.user_id = ? AND ${live} AND p.status != 'paid' AND p.due_date IS NOT NULL AND p.due_date <= ?`, userId, in7)) {
      if (p.due_date! < t) add(p.deal_id, "payment_overdue", p.id, `Payment overdue: ${money(p.amount, p.currency)} for ${p.title}`, p.due_date);
      else add(p.deal_id, "payment_due", p.id, `Payment due ${fmtDate(p.due_date)}: ${money(p.amount, p.currency)} for ${p.title}`, p.due_date);
    }
    for (const d of all<Deliverable & { title: string }>(
      `SELECT x.*, d.title FROM deliverables x JOIN deals d ON d.id = x.deal_id
       WHERE x.user_id = ? AND ${live} AND x.status != 'posted' AND x.due_date IS NOT NULL AND x.due_date <= ?`, userId, in7)) {
      add(d.deal_id, d.due_date! < t ? "deliverable_overdue" : "deliverable_due", d.id,
        `${d.due_date! < t ? "Overdue" : "Due " + fmtDate(d.due_date)}: ${d.description} (${d.title})`, d.due_date);
    }
    for (const u of all<UsageRight & { title: string }>(
      `SELECT u.*, d.title FROM usage_rights u JOIN deals d ON d.id = u.deal_id
       WHERE u.user_id = ? AND ${live} AND u.end_date IS NOT NULL AND u.end_date >= ? AND u.end_date <= ?`, userId, t, in30)) {
      add(u.deal_id, "usage_expiring", u.id, `Usage rights end ${fmtDate(u.end_date)} for ${u.title}`, u.end_date);
    }
    return { overdue: Number(overdue), created };
  });
}

/** A plain-English wrap-up written when a deal is archived. */
export function closureSummary(dealId: string) {
  const d = get<Deal>(`${DEAL_SELECT} WHERE d.id = ?`, dealId)!;
  const dels = dealDeliverables(dealId);
  const pays = dealPayments(dealId);
  const usage = dealUsage(dealId);
  const paid = pays.filter((p) => p.status === "paid").reduce((s, p) => s + (p.amount ?? 0), 0);
  const owed = pays.filter((p) => p.status !== "paid").reduce((s, p) => s + (p.amount ?? 0), 0);
  const posted = dels.filter((x) => x.status === "posted").length;
  const lines = [
    `${d.title}${d.brand_name ? ` with ${d.brand_name}` : ""}.`,
    `Agreed fee: ${money(d.fee, d.currency)}. Paid: ${money(paid, d.currency)}.${owed ? ` Still owed: ${money(owed, d.currency)}.` : ""}`,
    `Deliverables: ${posted} of ${dels.length} posted${dels.length ? ` (${dels.map((x) => x.description).join(", ")})` : ""}.`,
    usage.length
      ? `Usage rights: ${usage.map((u) => `${u.description ?? "usage"} until ${fmtDate(u.end_date)}`).join("; ")}.`
      : "No usage rights recorded.",
    `Closed on ${fmtDate(today())}.`,
  ];
  return lines.join("\n");
}
