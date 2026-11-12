import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db, deals } from "@/lib/db";
import { DEMO_EMAILS } from "@/lib/demo/emails";
import { integrationStatus, requireWorkspace } from "@/lib/workspace";
import { NewDealClient, type DraftPrefill } from "@/components/app/new-deal";

export const metadata: Metadata = { title: "New deal" };

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ deal?: string }> }) {
  const ws = await requireWorkspace();
  const { deal: dealId } = await searchParams;
  const live = integrationStatus();

  let draft: DraftPrefill | null = null;
  if (dealId) {
    const d = db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.workspaceId, ws.id))).get();
    if (d && d.status === "draft")
      draft = {
        id: d.id,
        email: d.sourceEmail ?? "",
        data: {
          brand: d.brand, contactName: d.contactName, contactEmail: d.contactEmail, currency: d.currency, fee: d.fee,
          deliverables: d.deliverables, dueDate: d.dueDate, paymentTerms: d.paymentTerms, usageDays: d.usageDays,
          title: d.title, confidence: d.confidence ?? {},
        },
      };
  }

  return (
    <NewDealClient
      creator={{ name: ws.name, payoutEmail: ws.payoutEmail }}
      // USD and EUR offers first: those go out as real PayPal sandbox invoices.
      emails={["notion", "decathlon", "glowskin", "boat", "swiggy"]
        .map((id) => DEMO_EMAILS.find((e) => e.id === id)!)
        .map((e) => ({ ...e, body: e.body() }))}
      draft={draft}
      aiLive={live.groq || live.gemini}
      paypalLive={live.paypal}
    />
  );
}
