import "server-only";
import { eq } from "drizzle-orm";
import { activity, collaborators, db, deals, newId, nowIso, payouts, type Deal } from "./db";
import { money } from "./format";

export function logActivity(workspaceId: string, dealId: string | null, kind: typeof activity.$inferInsert.kind, message: string) {
  db.insert(activity).values({ id: newId(), workspaceId, dealId, kind, message, createdAt: nowIso() }).run();
}

/** Once a brand pays, each collaborator's share is proposed (never sent) until the creator approves. */
export function proposePayouts(dealId: string) {
  const d = db.select().from(deals).where(eq(deals.id, dealId)).get();
  if (!d?.fee) return;
  for (const c of db.select().from(collaborators).where(eq(collaborators.dealId, dealId)).all()) {
    const exists = db.select().from(payouts).where(eq(payouts.collaboratorId, c.id)).get();
    if (!exists)
      db.insert(payouts).values({
        id: newId(), dealId, collaboratorId: c.id, amount: Math.round(d.fee * c.sharePct) / 100,
        currency: d.currency, status: "proposed", createdAt: nowIso(),
      }).run();
  }
}

export function markPaid(d: Deal, via: string) {
  if (d.status === "paid") return;
  db.update(deals).set({ status: "paid", paidAt: nowIso() }).where(eq(deals.id, d.id)).run();
  logActivity(d.workspaceId, d.id, "paid", `${d.brand} paid ${d.invoiceNumber} (${money(d.fee, d.currency)}) ${via}. Shield up. 💚`);
  proposePayouts(d.id);
}
