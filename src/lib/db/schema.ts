import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type Deliverable = { description: string; platform: string | null; amount: number | null };

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  niche: text("niche"),
  payoutEmail: text("payout_email"),
  currency: text("currency").notNull().default("INR"),
  reminderTone: text("reminder_tone", { enum: ["gentle", "balanced", "direct"] }).notNull().default("balanced"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  onboarded: integer("onboarded", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  brand: text("brand").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  title: text("title").notNull(),
  currency: text("currency").notNull(),
  fee: real("fee"),
  deliverables: text("deliverables", { mode: "json" }).$type<Deliverable[]>().notNull().default([]),
  dueDate: text("due_date"),
  paymentTerms: text("payment_terms"),
  usageDays: integer("usage_days"),
  usageStart: text("usage_start"),
  /** draft = extracted, waiting for approval; sent/paid follow the PayPal invoice */
  status: text("status", { enum: ["draft", "sent", "paid", "cancelled"] }).notNull().default("draft"),
  invoiceId: text("invoice_id"),
  invoiceNumber: text("invoice_number"),
  invoiceUrl: text("invoice_url"),
  sourceEmail: text("source_email"),
  confidence: text("confidence", { mode: "json" }).$type<Record<string, number>>(),
  insight: text("insight"),
  sentAt: text("sent_at"),
  paidAt: text("paid_at"),
  createdAt: text("created_at").notNull(),
});

export const activity = sqliteTable("activity", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  dealId: text("deal_id").references(() => deals.id, { onDelete: "cascade" }),
  kind: text("kind", {
    enum: ["email", "extracted", "approved", "invoice_sent", "reminder", "paid", "payout", "rights", "renewal"],
  }).notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  tone: text("tone", { enum: ["friendly", "firm", "final"] }).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["draft", "sent"] }).notNull().default("draft"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull(),
});

export const collaborators = sqliteTable("collaborators", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role"),
  sharePct: real("share_pct").notNull(),
});

export const payouts = sqliteTable("payouts", {
  id: text("id").primaryKey(),
  dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  collaboratorId: text("collaborator_id").notNull().references(() => collaborators.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status", { enum: ["proposed", "sent", "failed"] }).notNull().default("proposed"),
  batchId: text("batch_id"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type Collaborator = typeof collaborators.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
