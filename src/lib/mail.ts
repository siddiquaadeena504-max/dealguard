import "server-only";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import { all, get, run, newId } from "./db";
import { decrypt } from "./secret";
import { analyseEmail, looksLikeDeal } from "./ai";
import { snapshotDeal } from "./deals";

export type Account = {
  id: string;
  user_id: string;
  email: string;
  app_password_enc: string;
  status: string;
  sync_state: string;
  sync_message: string | null;
  last_sync_at: string | null;
  uid_validity: string | null;
  last_uid: number | null;
};

const MAX_AI_PER_RUN = 100; // keeps one sync from running for hours on a laptop CPU
const SKIP_CATEGORIES = "-category:promotions -category:social -category:forums";
const NO_REPLY = /(no-?reply|do-?not-?reply|notifications?|mailer-daemon|newsletter)@/i;

function imap(email: string, password: string) {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: email, pass: password },
    logger: false,
  });
}

/** Signs in to Gmail once to check the app password. Throws a friendly message on failure. */
export async function verifyGmail(email: string, password: string) {
  const client = imap(email, password);
  try {
    await client.connect();
    await client.logout();
  } catch {
    throw new Error(
      "Gmail did not accept that email and app password. Check both and make sure you used an app password, not your normal password."
    );
  }
}

export function getAccount(userId: string) {
  return get<Account>("SELECT * FROM connected_accounts WHERE user_id = ?", userId);
}

function setStatus(accountId: string, message: string) {
  run("UPDATE connected_accounts SET sync_message = ? WHERE id = ?", message, accountId);
}

type Candidate = {
  uid: number;
  threadId: string;
  messageId: string | null;
  references: string | null;
  outbound: boolean;
  fromEmail: string | null;
  fromName: string | null;
  toEmail: string | null;
  subject: string;
  date: string;
  text: string;
};

/** Starts a sync in the background. Returns false if one is already running. */
export function startSync(userId: string) {
  const account = getAccount(userId);
  if (!account || account.sync_state === "running") return false;
  run("UPDATE connected_accounts SET sync_state = 'running', sync_message = 'Connecting to Gmail…' WHERE id = ?", account.id);
  syncAccount(account)
    .then((msg) => {
      run(
        "UPDATE connected_accounts SET sync_state = 'idle', status = 'connected', sync_message = ?, last_sync_at = ? WHERE id = ?",
        msg,
        new Date().toISOString(),
        account.id
      );
    })
    .catch((err: Error) => {
      // Log the error type only, never email contents.
      console.error("[sync] failed:", err.name, err.message.slice(0, 200));
      run(
        "UPDATE connected_accounts SET sync_state = 'idle', status = 'error', sync_message = ? WHERE id = ?",
        `Sync failed: ${err.message.slice(0, 200)}`,
        account.id
      );
    });
  return true;
}

async function syncAccount(account: Account): Promise<string> {
  const client = imap(account.email, decrypt(account.app_password_enc));
  await client.connect();
  const candidates: Candidate[] = [];
  let newLastUid = account.last_uid ?? 0;
  let uidValidity = account.uid_validity;
  let remaining = 0;

  try {
    const boxes = await client.list();
    const allMail = boxes.find((b) => b.specialUse === "\\All")?.path ?? "INBOX";
    const lock = await client.getMailboxLock(allMail);
    try {
      const mailbox = client.mailbox as { uidValidity: bigint; uidNext: number };
      const validity = String(mailbox.uidValidity);
      const incremental = account.last_uid != null && account.uid_validity === validity;
      uidValidity = validity;
      // Everything currently in the mailbox counts as seen, unless the AI budget runs out below.
      newLastUid = Number(mailbox.uidNext) - 1;

      // First run: last 60 days. Later runs: only messages newer than the last one seen.
      const query = incremental
        ? { uid: `${account.last_uid! + 1}:*`, gmraw: SKIP_CATEGORIES }
        : { gmraw: `newer_than:60d ${SKIP_CATEGORIES}` };
      setStatus(account.id, "Looking for new emails…");
      let uids = ((await client.search(query, { uid: true })) || []) as number[];
      uids = uids.filter((u) => !incremental || u > account.last_uid!).sort((a, b) => a - b);

      const headers: Omit<Candidate, "text">[] = [];
      for (let i = 0; i < uids.length; i += 200) {
        const chunk = uids.slice(i, i + 200);
        for await (const msg of client.fetch(
          chunk,
          { uid: true, envelope: true, labels: true, threadId: true, headers: ["list-unsubscribe", "references"] },
          { uid: true }
        )) {
          const env = msg.envelope;
          const rawHeaders = msg.headers?.toString("utf8") ?? "";
          const from = env?.from?.[0];
          const outbound = msg.labels?.has("\\Sent") || from?.address?.toLowerCase() === account.email.toLowerCase();
          // Skip newsletters and automated senders before any AI work.
          if (!outbound && (/^list-unsubscribe:/im.test(rawHeaders) || NO_REPLY.test(from?.address ?? ""))) continue;
          if (env?.messageId && get("SELECT 1 FROM emails WHERE user_id = ? AND message_id = ?", account.user_id, env.messageId)) continue;
          headers.push({
            uid: msg.uid,
            threadId: String(msg.threadId ?? env?.messageId ?? msg.uid),
            messageId: env?.messageId ?? null,
            references: rawHeaders.match(/^references:\s*([\s\S]*?)(?:\r?\n\S|$)/im)?.[1]?.replace(/\s+/g, " ").trim() ?? null,
            outbound: !!outbound,
            fromEmail: from?.address ?? null,
            fromName: from?.name ?? null,
            toEmail: env?.to?.[0]?.address ?? null,
            subject: env?.subject ?? "(no subject)",
            date: (env?.date ?? new Date()).toISOString(),
          });
        }
      }

      // Download bodies only for messages worth reading. Bodies stay in memory and are never saved.
      let aiBudget = MAX_AI_PER_RUN;
      for (const [i, h] of headers.entries()) {
        const knownThread = get("SELECT 1 FROM email_threads WHERE user_id = ? AND gmail_thread_id = ?", account.user_id, h.threadId);
        if (h.outbound && !knownThread) continue;
        if (!h.outbound && aiBudget <= 0) {
          remaining++;
          // Stop advancing so the next sync picks up from here.
          newLastUid = Math.min(newLastUid, h.uid - 1);
          continue;
        }
        setStatus(account.id, `Reading emails… ${i + 1} of ${headers.length}`);
        const full = await client.fetchOne(String(h.uid), { source: true }, { uid: true });
        if (!full || !full.source) continue;
        const parsed = await simpleParser(full.source);
        const text = (parsed.text || "").replace(/\n{3,}/g, "\n\n").trim();
        if (!h.outbound && !knownThread && !looksLikeDeal(h.subject, text)) continue;
        if (!h.outbound) aiBudget--;
        candidates.push({ ...h, text });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  // AI pass happens after logging out of Gmail, so a slow model doesn't hold the connection open.
  let found = 0;
  const inbound = candidates.filter((c) => !c.outbound);
  for (const c of candidates) {
    if (!c.outbound) setStatus(account.id, `Analysing with local AI… ${inbound.indexOf(c) + 1} of ${inbound.length}`);
    if (await storeMessage(account, c)) found++;
  }

  run("UPDATE connected_accounts SET last_uid = ?, uid_validity = ? WHERE id = ?", newLastUid, uidValidity, account.id);
  const more = remaining ? ` ${remaining} more will be checked on the next sync.` : "";
  return `Checked ${candidates.length} emails, found ${found} deal update${found === 1 ? "" : "s"}.${more}`;
}

/** Saves a snippet + any extraction for one message. Returns true if it created a pending review. */
async function storeMessage(account: Account, c: Candidate): Promise<boolean> {
  const userId = account.user_id;
  let category = "other";
  let data = null;
  if (!c.outbound) {
    const result = await analyseEmail({
      from: `${c.fromName ?? ""} <${c.fromEmail ?? ""}>`,
      subject: c.subject,
      date: c.date,
      text: c.text,
    });
    category = result.category;
    data = result.data;
  }

  let thread = get<{ id: string; deal_id: string | null }>(
    "SELECT id, deal_id FROM email_threads WHERE user_id = ? AND gmail_thread_id = ?",
    userId,
    c.threadId
  );
  if (!thread && category === "other") return false; // not a deal email: store nothing
  if (!thread) {
    thread = { id: newId(), deal_id: null };
    run(
      "INSERT INTO email_threads (id, user_id, gmail_thread_id, subject, last_message_at) VALUES (?, ?, ?, ?, ?)",
      thread.id, userId, c.threadId, c.subject, c.date
    );
  } else {
    run("UPDATE email_threads SET last_message_at = max(coalesce(last_message_at, ''), ?) WHERE id = ?", c.date, thread.id);
  }

  const emailId = newId();
  run(
    `INSERT OR IGNORE INTO emails (id, user_id, thread_id, message_id, references_header, direction, from_email, from_name,
       to_email, subject, snippet, category, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    emailId, userId, thread.id, c.messageId, c.references, c.outbound ? "outbound" : "inbound",
    c.fromEmail, c.fromName, c.toEmail, c.subject, c.text.slice(0, 500), category, c.date
  );

  if (category === "other" || !data) return false;

  // Match to a deal: same Gmail thread first, then the sender's email address.
  let dealId = thread.deal_id;
  if (!dealId && c.fromEmail) {
    dealId =
      get<{ id: string }>(
        `SELECT d.id FROM deals d JOIN contacts ct ON ct.id = d.contact_id
         WHERE d.user_id = ? AND ct.email = ? AND d.status != 'archived' ORDER BY d.updated_at DESC LIMIT 1`,
        userId, c.fromEmail
      )?.id ?? null;
    if (dealId) run("UPDATE email_threads SET deal_id = ? WHERE id = ?", dealId, thread.id);
  }
  if (!data.contact_email && c.fromEmail) data.contact_email = c.fromEmail;
  if (!data.contact_name && c.fromName) data.contact_name = c.fromName;

  run(
    "INSERT INTO extractions (id, user_id, email_id, deal_id, category, data, original) VALUES (?, ?, ?, ?, ?, ?, ?)",
    newId(), userId, emailId, dealId, category, JSON.stringify(data),
    dealId ? JSON.stringify(snapshotDeal(dealId)) : null
  );
  return true;
}

/** Sends an email from the creator's Gmail, replying in the deal's thread when there is one. */
export async function sendFromGmail(
  userId: string,
  msg: { to: string; subject: string; body: string; dealId: string }
) {
  const account = getAccount(userId);
  if (!account) throw new Error("Connect Gmail in Settings before sending.");
  const last = get<{ message_id: string | null; references_header: string | null; subject: string | null; thread_id: string }>(
    `SELECT e.message_id, e.references_header, e.subject, e.thread_id FROM emails e
     JOIN email_threads t ON t.id = e.thread_id
     WHERE t.deal_id = ? AND e.user_id = ? AND e.message_id IS NOT NULL ORDER BY e.sent_at DESC LIMIT 1`,
    msg.dealId, userId
  );

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: account.email, pass: decrypt(account.app_password_enc) },
  });
  const references = last ? [last.references_header, last.message_id].filter(Boolean).join(" ") : undefined;
  const info = await transport.sendMail({
    from: account.email,
    to: msg.to,
    subject: msg.subject,
    text: msg.body,
    ...(last?.message_id ? { inReplyTo: last.message_id, references } : {}),
  });

  if (last) {
    run(
      `INSERT OR IGNORE INTO emails (id, user_id, thread_id, message_id, references_header, direction, from_email,
         to_email, subject, snippet, category, sent_at) VALUES (?, ?, ?, ?, ?, 'outbound', ?, ?, ?, ?, 'other', ?)`,
      newId(), userId, last.thread_id, info.messageId, references ?? null, account.email, msg.to,
      msg.subject, msg.body.slice(0, 500), new Date().toISOString()
    );
  }
}

export function threadEmails(userId: string, dealId: string) {
  return all(
    `SELECT e.* FROM emails e JOIN email_threads t ON t.id = e.thread_id
     WHERE t.deal_id = ? AND e.user_id = ? ORDER BY e.sent_at DESC`,
    dealId, userId
  );
}
