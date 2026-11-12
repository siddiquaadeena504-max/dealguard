import "server-only";

/*
  PayPal REST (sandbox) — the one place DealGuard talks to PayPal.
  - OAuth2 client credentials, token cached until shortly before expiry
  - Invoicing v2: create draft → send → get status → send reminder
  - Payouts v1: pay collaborators their share
  - Webhook signature verification
  Without PAYPAL_* keys every function runs in SIMULATED mode so the demo still works;
  simulated IDs start with "SIM-" and the UI says so.
*/

const env = (k: string) => process.env[k]?.trim() || "";
export const paypalConfigured = () => !!(env("PAYPAL_CLIENT_ID") && env("PAYPAL_CLIENT_SECRET") && env("PAYPAL_BASE_URL"));
const base = () => env("PAYPAL_BASE_URL").replace(/\/$/, "");

export class PayPalError extends Error {
  constructor(message: string, public status?: number, public debugId?: string, public issue?: string) {
    super(message);
  }
}

/*
  So the hosted demo always works for testers: when PayPal itself refuses (missing app permission,
  unsupported currency, outage, network), fall back to a clearly labelled simulation.
  Problems the creator can fix (e.g. an invalid email) still surface as errors.
*/
function shouldFallBack(err: unknown) {
  if (!(err instanceof PayPalError)) return true; // network error or timeout
  const s = err.status ?? 500;
  return s === 401 || s === 403 || s >= 500 || /CURRENCY|PERMISSION|NOT_AUTHORIZED/i.test(err.issue ?? "");
}

async function orSimulate<T>(label: string, real: () => Promise<T>, simulated: () => T): Promise<T> {
  try {
    return await real();
  } catch (err) {
    if (!shouldFallBack(err)) throw err;
    console.warn(`[paypal] ${label} fell back to simulation (${(err as PayPalError).status ?? "network"} ${(err as PayPalError).issue ?? ""})`);
    return simulated();
  }
}

let token: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;
  const auth = Buffer.from(`${env("PAYPAL_CLIENT_ID")}:${env("PAYPAL_CLIENT_SECRET")}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new PayPalError("PayPal didn't accept the app credentials. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.", res.status);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return token.value;
}

type PayPalErrorBody = { name?: string; message?: string; debug_id?: string; details?: { issue?: string; description?: string; field?: string }[] };

function humanError(status: number, body: PayPalErrorBody | null) {
  const detail = body?.details?.[0];
  const issue = detail?.issue ?? body?.name ?? "";
  if (status === 401) return "PayPal session expired. Please try again.";
  if (status === 403) return "This PayPal app isn't allowed to do that yet. Enable the feature in the PayPal developer dashboard.";
  if (/CURRENCY/i.test(issue)) return "PayPal doesn't support that currency for this account. Try USD or EUR in the sandbox.";
  if (/EMAIL|RECIPIENT/i.test(issue)) return "The brand's email address looks invalid. Fix it and try again.";
  if (/DUPLICATE/i.test(issue)) return "An invoice with this number already exists on PayPal.";
  if (status === 422) return `PayPal couldn't process this: ${detail?.description ?? body?.message ?? "invalid request"}.`;
  if (status >= 500) return "PayPal is having trouble right now. Please try again in a minute.";
  return body?.message ?? `PayPal request failed (${status}).`;
}

async function pp<T>(path: string, init: RequestInit & { json?: unknown } = {}, attempt = 0): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 && attempt === 0) {
    token = null;
    return pp<T>(path, init, 1);
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt + Math.random() * 250));
    return pp<T>(path, init, attempt + 1);
  }
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const b = body as PayPalErrorBody | null;
    console.warn(`[paypal] ${init.method ?? "GET"} ${path} → ${res.status} debug_id=${b?.debug_id ?? "-"}`);
    throw new PayPalError(humanError(res.status, b), res.status, b?.debug_id, b?.details?.[0]?.issue ?? b?.name);
  }
  return body as T;
}

// ---------------------------------------------------------------- Invoicing v2

export type InvoiceInput = {
  creatorName: string;
  invoicerEmail?: string | null;
  brand: string;
  contactName: string | null;
  contactEmail: string;
  currency: string;
  dueDate: string | null;
  terms: string | null;
  items: { name: string; amount: number }[];
  memo: string;
};

export type InvoiceResult = { id: string; number: string; url: string | null; simulated: boolean; note?: string };

/** PayPal can't invoice in these from a non-local account (INR needs an India account). */
const UNSUPPORTED_CURRENCIES = new Set(["INR"]);
export type InvoiceStatus = "DRAFT" | "SENT" | "SCHEDULED" | "PAID" | "MARKED_AS_PAID" | "CANCELLED" | "PAYMENT_PENDING" | "PARTIALLY_PAID" | "UNPAID" | string;

const money = (currency: string, n: number) => ({ currency_code: currency, value: (Math.round(n * 100) / 100).toFixed(2) });

/** Creates a draft invoice with one line per deliverable, then sends it to the brand. */
function simulatedInvoice(): InvoiceResult {
  const n = Math.floor(1000 + Math.random() * 9000);
  return { id: `SIM-INV2-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, number: `INV-2026-${n}`, url: null, simulated: true };
}

export async function createAndSendInvoice(input: InvoiceInput): Promise<InvoiceResult> {
  if (!paypalConfigured()) return simulatedInvoice();
  if (UNSUPPORTED_CURRENCIES.has(input.currency))
    return { ...simulatedInvoice(), note: `PayPal's sandbox can't invoice in ${input.currency}, so this one is simulated. Try a USD or EUR deal for a real PayPal invoice.` };
  return orSimulate("invoice", () => realCreateAndSend(input), simulatedInvoice);
}

async function realCreateAndSend(input: InvoiceInput): Promise<InvoiceResult> {
  const { invoice_number } = await pp<{ invoice_number: string }>("/v2/invoicing/generate-next-invoice-number", { method: "POST" });
  const [given, ...rest] = (input.contactName ?? input.brand).split(" ");
  const draft = await pp<{ id: string }>("/v2/invoicing/invoices", {
    method: "POST",
    json: {
      detail: {
        invoice_number,
        currency_code: input.currency,
        note: input.memo,
        terms_and_conditions: input.terms ?? undefined,
        payment_term: input.dueDate ? { term_type: "DUE_ON_DATE_SPECIFIED", due_date: input.dueDate } : { term_type: "NET_30" },
      },
      invoicer: {
        name: { given_name: input.creatorName },
        ...(input.invoicerEmail || env("PAYPAL_BUSINESS_EMAIL") ? { email_address: input.invoicerEmail || env("PAYPAL_BUSINESS_EMAIL") } : {}),
      },
      primary_recipients: [
        {
          billing_info: {
            name: { given_name: given, surname: rest.join(" ") || undefined },
            email_address: input.contactEmail,
            business_name: input.brand,
          },
        },
      ],
      items: input.items.map((i) => ({ name: i.name.slice(0, 200), quantity: "1", unit_amount: money(input.currency, i.amount), unit_of_measure: "AMOUNT" })),
    },
  });
  const sent = await pp<{ href?: string; links?: { href: string; rel: string }[] }>(`/v2/invoicing/invoices/${draft.id}/send`, {
    method: "POST",
    json: { send_to_invoicer: true, send_to_recipient: true, subject: `Invoice from ${input.creatorName}`, note: input.memo },
  });
  const url = sent?.href ?? sent?.links?.find((l) => l.rel === "payer-view")?.href ?? null;
  return { id: draft.id, number: invoice_number, url, simulated: false };
}

export async function getInvoiceStatus(id: string): Promise<{ status: InvoiceStatus; url: string | null }> {
  if (id.startsWith("SIM-") || id.startsWith("DEMO-")) return { status: "SIMULATED", url: null };
  const inv = await pp<{ status: InvoiceStatus; detail?: { metadata?: { recipient_view_url?: string } } }>(`/v2/invoicing/invoices/${id}`);
  return { status: inv.status, url: inv.detail?.metadata?.recipient_view_url ?? null };
}

export const isPaidStatus = (s: InvoiceStatus) => s === "PAID" || s === "MARKED_AS_PAID";

export async function sendInvoiceReminder(id: string, subject: string, note: string) {
  if (id.startsWith("SIM-") || id.startsWith("DEMO-")) return { simulated: true };
  return orSimulate(
    "reminder",
    async () => {
      await pp(`/v2/invoicing/invoices/${id}/remind`, {
        method: "POST",
        json: { subject: subject.slice(0, 100), note: note.slice(0, 4000), send_to_invoicer: false, send_to_recipient: true },
      });
      return { simulated: false };
    },
    () => ({ simulated: true })
  );
}

// ---------------------------------------------------------------- Payouts v1

export async function sendPayouts(
  batchRef: string,
  items: { email: string; amount: number; currency: string; note: string; ref: string }[]
): Promise<{ batchId: string; simulated: boolean }> {
  const sim = () => ({ batchId: `SIM-BATCH-${batchRef.slice(0, 6).toUpperCase()}`, simulated: true });
  if (!paypalConfigured()) return sim();
  return orSimulate("payouts", () => realPayouts(batchRef, items), sim);
}

async function realPayouts(
  batchRef: string,
  items: { email: string; amount: number; currency: string; note: string; ref: string }[]
): Promise<{ batchId: string; simulated: boolean }> {
  const res = await pp<{ batch_header: { payout_batch_id: string } }>("/v1/payments/payouts", {
    method: "POST",
    json: {
      sender_batch_header: { sender_batch_id: `dg-${batchRef}`, email_subject: "You've received a payout via DealGuard" },
      items: items.map((i) => ({
        recipient_type: "EMAIL",
        receiver: i.email,
        amount: { value: (Math.round(i.amount * 100) / 100).toFixed(2), currency: i.currency },
        note: i.note,
        sender_item_id: i.ref,
      })),
    },
  });
  return { batchId: res.batch_header.payout_batch_id, simulated: false };
}

// ---------------------------------------------------------------- Webhooks

export async function verifyWebhook(headers: Headers, event: unknown) {
  if (!paypalConfigured() || !env("PAYPAL_WEBHOOK_ID")) return false;
  const res = await pp<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    json: {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: env("PAYPAL_WEBHOOK_ID"),
      webhook_event: event,
    },
  });
  return res.verification_status === "SUCCESS";
}
