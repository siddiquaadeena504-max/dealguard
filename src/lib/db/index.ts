import "server-only";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// Tables are created on boot, so a fresh disk (e.g. a Render restart) just works.
const DDL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, niche TEXT, payout_email TEXT,
  currency TEXT NOT NULL DEFAULT 'INR', reminder_tone TEXT NOT NULL DEFAULT 'balanced',
  is_demo INTEGER NOT NULL DEFAULT 0, onboarded INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand TEXT NOT NULL, contact_name TEXT, contact_email TEXT, title TEXT NOT NULL, currency TEXT NOT NULL,
  fee REAL, deliverables TEXT NOT NULL DEFAULT '[]', due_date TEXT, payment_terms TEXT,
  usage_days INTEGER, usage_start TEXT, status TEXT NOT NULL DEFAULT 'draft',
  invoice_id TEXT, invoice_number TEXT, invoice_url TEXT, source_email TEXT, confidence TEXT, insight TEXT,
  sent_at TEXT, paid_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS deals_ws ON deals(workspace_id);
CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  deal_id TEXT REFERENCES deals(id) ON DELETE CASCADE, kind TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_ws ON activity(workspace_id, created_at);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY, deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE, tone TEXT NOT NULL,
  subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', sent_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS collaborators (
  id TEXT PRIMARY KEY, deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE, name TEXT NOT NULL,
  email TEXT NOT NULL, role TEXT, share_pct REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY, deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  collaborator_id TEXT NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE, amount REAL NOT NULL,
  currency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'proposed', batch_id TEXT, sent_at TEXT, created_at TEXT NOT NULL
);
`;

declare global {
  var __dgDb: BetterSQLite3Database<typeof schema> | undefined;
}

function open() {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const sqlite = new Database(path.join(dir, "dealguard.db"));
  sqlite.exec(DDL);
  return drizzle(sqlite, { schema });
}

export const db = (globalThis.__dgDb ??= open());
export * from "./schema";
export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
