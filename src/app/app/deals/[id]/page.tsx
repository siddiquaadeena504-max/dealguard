import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { activity, collaborators, db, deals, payouts, reminders } from "@/lib/db";
import { dealState, rightsDaysLeft, rightsEnd } from "@/lib/deals";
import { integrationStatus, requireWorkspace } from "@/lib/workspace";
import { DealView } from "@/components/app/deal-view";

export const metadata: Metadata = { title: "Deal" };

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const ws = await requireWorkspace();
  const { id } = await params;
  const deal = db.select().from(deals).where(and(eq(deals.id, id), eq(deals.workspaceId, ws.id))).get();
  if (!deal || deal.status === "cancelled") notFound();
  if (deal.status === "draft") redirect(`/app/new?deal=${deal.id}`);

  return (
    <DealView
      paypalLive={integrationStatus().paypal}
      deal={{ ...deal, state: dealState(deal), rightsEnd: rightsEnd(deal), rightsDaysLeft: rightsDaysLeft(deal) }}
      reminders={db.select().from(reminders).where(eq(reminders.dealId, id)).orderBy(desc(reminders.createdAt)).all()}
      collaborators={db.select().from(collaborators).where(eq(collaborators.dealId, id)).all()}
      payouts={db.select().from(payouts).where(eq(payouts.dealId, id)).all()}
      events={db.select().from(activity).where(eq(activity.dealId, id)).orderBy(activity.createdAt).all()}
    />
  );
}
