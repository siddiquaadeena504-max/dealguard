# DealGuard 🛡️

**Every deal, guarded.**
Get paid for every post, without the awkward follow-ups.

DealGuard is an AI agent for small creators (10K–200K followers) who manage their own brand deals. Paste a brand email → the AI extracts the deal → you approve → a PayPal invoice goes out → DealGuard tracks payment, chases late payers, pays your collaborators and guards your usage rights.

> Built for the PayPal AI Hackathon 2026. Payments run on the **PayPal sandbox**; no real money moves.

![Landing page](docs/screenshots/landing-desktop-light.png)

---

## The problem

Small creators are their own finance team. They deliver the content, then spend weeks chasing brands for payment over email, and they lose track of when a brand's right to reuse their content (usage rights) expires, so brands keep running their videos as ads for free.

## Who it's for

Independent creators with 10K–200K followers who negotiate brand deals themselves: no manager, no agency, no accountant.

## Features

| | |
|---|---|
| **Deal intake** | Paste any brand email, or pick from a demo inbox of 5 realistic offers. |
| **AI extraction** | Brand, contact, deliverables, fee + currency, due date, payment terms and usage rights animate in field by field, each with a confidence hint. The matching words light up in the email so you can see where every value came from. |
| **Approval first** | The agent never acts on its own. You see the exact PayPal invoice before anything is sent. |
| **PayPal invoice** | One line item per deliverable, sent through Invoicing API v2. |
| **Payment tracking** | Draft → sent → paid / overdue, through the PayPal webhook plus a "Refresh status" button that polls PayPal. |
| **Chase agent** | Friendly → firm → final reminders, with the AI picking the right tone for how late the brand is. You approve each one; it goes out through PayPal's reminder endpoint. |
| **Usage-rights guard** | Countdown ring per deal, flags rights expiring within 7 days, and drafts a paid renewal pitch. |
| **Collaborator payouts** | Add editors/designers with % splits. When the brand pays, DealGuard proposes payouts; on approval they're sent with PayPal Payouts. |
| **Agent insight** | One specific next step per deal ("Usually pays 10–14 days late. Send a firm reminder now."). |
| **Demo mode** | "Try the live demo" opens your own seeded workspace with deals in every state. Reset any time. |
| **Polish** | Light + dark mode, mobile bottom nav, command palette (Ctrl/⌘ K), skeleton loaders, toasts, a confetti + shield pulse when a brand pays, `prefers-reduced-motion` respected. |

## Screenshots

| Dashboard | New deal |
|---|---|
| ![Dashboard](docs/screenshots/dashboard-desktop-light.png) | ![New deal](docs/screenshots/new-deal-desktop-light.png) |
| **Deal (paid)** | **Dark mode, mobile** |
| ![Deal](docs/screenshots/deal-desktop-light.png) | ![Mobile dark](docs/screenshots/dashboard-mobile-dark.png) |

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[Next.js App Router UI<br/>Tailwind + shadcn/ui + Framer Motion<br/>AG Grid deals table]
  end
  subgraph Server["Next.js server (one Render service)"]
    SA[Server actions]
    AI[lib/ai<br/>timeouts · retries · Zod]
    PP[lib/paypal<br/>OAuth token cache]
    WH[/api/paypal/webhook/]
    DB[(SQLite via Drizzle)]
  end
  Groq[(Groq<br/>OpenAI-compatible)]
  Gemini[(Gemini)]
  PayPal[(PayPal REST<br/>sandbox)]

  UI -- "approve, refresh, remind" --> SA
  SA --> AI
  AI -- primary --> Groq
  AI -- fallback --> Gemini
  AI -. no keys .-> Rules[Built-in reader]
  SA --> PP --> PayPal
  PayPal -- INVOICING.INVOICE.PAID --> WH
  SA --> DB
  WH --> DB
```

All PayPal and AI calls happen on the server. Keys are read from environment variables and are never logged or sent to the browser.

## PayPal APIs used, and why

| API | Endpoint | Why |
|---|---|---|
| OAuth 2.0 | `POST /v1/oauth2/token` | Client-credentials token, cached until shortly before expiry. |
| Invoicing v2 | `POST /v2/invoicing/generate-next-invoice-number` | Proper sequential invoice numbers. |
| | `POST /v2/invoicing/invoices` | Creates the draft with one item per deliverable, the due date and terms. |
| | `POST /v2/invoicing/invoices/{id}/send` | Emails the invoice to the brand, who pays with PayPal or card. |
| | `GET /v2/invoicing/invoices/{id}` | "Refresh status": works locally without a public webhook URL. |
| | `POST /v2/invoicing/invoices/{id}/remind` | Sends the chase agent's approved reminder in PayPal's own thread. |
| Payouts v1 | `POST /v1/payments/payouts` | Pays collaborators their % share after the brand pays. |
| Webhooks | `POST /v1/notifications/verify-webhook-signature` | Verifies `INVOICING.INVOICE.PAID` events before marking a deal paid. |

Errors are turned into plain-English messages in the UI (e.g. *"The brand's email address looks invalid. Fix it and try again."*). 429 and 5xx responses are retried with backoff.

## How AI is used

AI does real work in four jobs (`src/lib/ai`):

1. **Extract deal terms** from a messy brand email into strict JSON (validated with Zod).
2. **Draft escalating payment reminders** (friendly → firm → final) using the deal facts and the creator's tone preference.
3. **Draft usage-rights renewal pitches** with a suggested extension fee.
4. **Write a one-line agent insight** per deal.

**Reliability:**
- **Providers:** Groq is the primary model, called through its OpenAI-compatible API with the OpenAI SDK. If Groq fails, DealGuard falls back to **Gemini**.
- **Timeouts and retries:** every call has a timeout. Only 429, 5xx and network errors are retried, with exponential backoff and jitter.
- **JSON checks:** an invalid JSON reply gets one repair prompt before the next provider is tried.
- **Logging:** logs record which model answered, never keys or prompts.
- **No keys or all failed:** a built-in rules-based reader and template writer keep the demo working. The UI says which one answered ("Read by Groq / Gemini / Built-in reader").

The AI never changes a deal or sends anything by itself. Every action waits for the creator to click Approve.

## Run it locally

Requirements: Node.js 22+ (tested on 24).

```bash
npm install
cp .env.example .env     # then fill in the keys (all optional for the demo)
npm run dev
```

Open http://localhost:3000 and click **Try the live demo**.

With no keys, DealGuard runs fully in demo mode: the built-in reader extracts deals, and PayPal calls are **simulated** (IDs start with `SIM-`, and the UI labels them). Add keys to switch to the real sandbox and AI.

### Environment variables

| Name | What |
|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox REST app credentials (developer.paypal.com → Apps & Credentials → Sandbox). |
| `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com` |
| `PAYPAL_BUSINESS_EMAIL` | The sandbox **business** account email (invoices are sent from it). |
| `PAYPAL_WEBHOOK_ID` | Optional. ID of the webhook you register for `INVOICING.INVOICE.PAID`. |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Any OpenAI-compatible provider. Groq: `https://api.groq.com/openai/v1`. OpenRouter: `https://openrouter.ai/api/v1` with a model like `google/gemma-4-31b-it:free`. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini fallback key and model name. |
| `DATA_DIR` | Optional. Folder for the SQLite file (default `./data`). |

### Useful scripts

| Command | What |
|---|---|
| `npm run dev` | Start locally on port 3000. |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript, both clean. |
| `node scripts/e2e.mjs` | Clicks through the whole core flow in a headless browser. |
| `node scripts/screenshots.mjs / /demo ...` | Screenshots each route in light/dark at mobile and desktop sizes. |

## Demo walkthrough (30 seconds)

1. Click **Try the live demo**. You land on a dashboard with deals in every state.
2. **Needs your attention** shows two late brands, one deal to approve and usage rights about to expire.
3. Click **New deal from email** → pick **GlowSkin** in the demo inbox → **Extract deal with AI**. Watch the fields fill in.
4. **Review invoice** → **Approve & send**. The invoice goes out and you land on the deal.
5. Click **Simulate brand payment** (or pay as the sandbox buyer and click **Refresh status**). Watch the confetti, then **Approve & send payouts**.
6. Open **Mamaearth** (9 days late) → the chase agent suggests a **firm** reminder → **Draft** → **Approve & send**.
7. Open **Nykaa** → usage rights end in 5 days → **Draft renewal pitch**.

See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the 2:30 video script.

## Deploy

See [docs/MANUAL_STEPS.md](docs/MANUAL_STEPS.md) for Render and PayPal webhook setup. `render.yaml` deploys it as one Node web service.

## Tech

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (customised) · Framer Motion · lucide-react · AG Grid Community · SQLite + Drizzle ORM · OpenAI SDK (Groq) · Google GenAI SDK (Gemini) · Zod · Playwright

## License

[MIT](LICENSE)
