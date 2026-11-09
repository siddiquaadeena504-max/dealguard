import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { activity, db, deals, workspaces } from "./db";

export const WS_COOKIE = "dg_ws";

export async function getWorkspace() {
  const id = (await cookies()).get(WS_COOKIE)?.value;
  if (!id) return null;
  return db.select().from(workspaces).where(eq(workspaces.id, id)).get() ?? null;
}

export async function requireWorkspace() {
  const ws = await getWorkspace();
  if (!ws) redirect("/demo");
  return ws;
}

export function listDeals(workspaceId: string) {
  return db.select().from(deals).where(and(eq(deals.workspaceId, workspaceId), ne(deals.status, "cancelled"))).orderBy(desc(deals.createdAt)).all();
}

export function listActivity(workspaceId: string, limit = 12) {
  return db.select().from(activity).where(eq(activity.workspaceId, workspaceId)).orderBy(desc(activity.createdAt)).limit(limit).all();
}

/** Which integrations are live. Without keys, DealGuard runs in demo mode with a simulated PayPal and built-in AI. */
export function integrationStatus() {
  const has = (...k: string[]) => k.every((x) => !!process.env[x]?.trim());
  return {
    paypal: has("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_BASE_URL"),
    groq: has("AI_API_KEY", "AI_BASE_URL", "AI_MODEL"),
    gemini: has("GEMINI_API_KEY", "GEMINI_MODEL"),
  };
}
