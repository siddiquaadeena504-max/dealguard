import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, deals } from "@/lib/db";
import { markPaid } from "@/lib/deal-ops";
import { verifyWebhook } from "@/lib/paypal";

// PayPal calls this when a brand pays. Register it in the PayPal dashboard for INVOICING.INVOICE.PAID.
export async function POST(req: Request) {
  const event = (await req.json().catch(() => null)) as { event_type?: string; resource?: { id?: string; invoice?: { id?: string } } } | null;
  if (!event) return NextResponse.json({ error: "bad json" }, { status: 400 });

  const verified = await verifyWebhook(req.headers, event).catch(() => false);
  if (!verified) {
    console.warn("[webhook] signature verification failed");
    return NextResponse.json({ error: "unverified" }, { status: 401 });
  }

  if (event.event_type === "INVOICING.INVOICE.PAID") {
    const invoiceId = event.resource?.invoice?.id ?? event.resource?.id;
    const deal = invoiceId ? db.select().from(deals).where(eq(deals.invoiceId, invoiceId)).get() : undefined;
    if (deal) markPaid(deal, "via PayPal");
  }
  return NextResponse.json({ ok: true });
}
