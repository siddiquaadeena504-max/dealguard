# Devpost submission text (copy and paste)

## Project name
DealGuard

## Tagline
Every deal, guarded. An AI agent that gets creators paid for every brand deal, without the awkward follow-ups.

## Links
- Repo: https://github.com/siddiquaadeena504-max/dealguard
- Hosted demo: (paste your Render link)
- Video: (paste your YouTube link)

---

## Description

### Inspiration
Creators with 10K–200K followers are their own finance team. They deliver a sponsored post, then spend weeks chasing the brand over email to get paid. They also lose track of when a brand's right to reuse their content expires, so brands keep running their videos as ads for free.

### What it does
DealGuard is an AI agent for creators who manage their own brand deals.

1. **Reads the brand's email.** Paste an offer email and the AI pulls out the brand, contact, fee and currency, deliverables, due date, payment terms and usage rights. Each field shows a confidence hint, and the matching words light up in the email.
2. **Waits for approval.** The agent never acts on its own. The creator sees the exact invoice and clicks Approve.
3. **Sends a PayPal invoice** with one line item per deliverable (PayPal Invoicing API v2).
4. **Tracks payment.** Sent, paid or overdue, read from PayPal with "Refresh status" and a webhook for `INVOICING.INVOICE.PAID`.
5. **Chases late payers.** The chase agent drafts friendly, then firm, then final reminders, picks the right tone for how late the brand is, and sends the approved one through PayPal's reminder endpoint.
6. **Guards usage rights.** A countdown per deal, a warning 7 days before rights expire, and an AI-written pitch for a paid renewal.
7. **Splits earnings.** Add collaborators with % shares; when the brand pays, DealGuard proposes payouts for approval (PayPal Payouts).
8. **Gives one next step per deal**, e.g. "Usually pays 10–14 days late. Send a firm reminder now."

### How we built it
- **Next.js 15 (App Router) + TypeScript**, one app for frontend and backend, deployed as one Render web service.
- **PayPal REST APIs (sandbox):** OAuth client credentials with a cached token; Invoicing v2 (generate number, create draft, send, get status, remind); Payouts v1; webhook signature verification. All calls run on the server.
- **AI:** OpenRouter through the OpenAI SDK, with a list of models tried in order, an optional Gemini fallback, and a built-in rules-based reader as the last resort. Replies are strict JSON validated with Zod, with one repair attempt.
- **SQLite + Drizzle** for storage. Every visitor to the demo gets their own seeded workspace.
- **Tailwind, shadcn/ui, Framer Motion, AG Grid** for a complete product experience: landing page, onboarding, dashboard, deal pages, light and dark mode, mobile.

### What is real in the hosted demo
- **Real PayPal sandbox:** invoices for USD and EUR deals, payment reminders, and payment status.
- **Simulated and clearly labelled:** invoices for INR deals (PayPal can't invoice in INR from a US sandbox account), the "Simulate brand payment" button, the seeded sample deals, and collaborator payouts (Payouts isn't enabled on this sandbox account).

### Built during the hackathon
DealGuard started as an earlier prototype: a local tool that read Gmail and extracted deal terms with an on-device model. During the hackathon it was rebuilt around PayPal. The PayPal integration (Invoicing, reminders, Payouts, webhook), the chase agent, the usage-rights guard, the approval flow, the dashboard, demo mode and the whole design system are new.

### Challenges
- Sandbox permissions and currencies: Invoicing had to be enabled on a US sandbox app, and INR invoices are refused. DealGuard now explains this in the UI instead of failing.
- Free AI models are slow and sometimes busy, so every AI task has a time budget, skips busy models, and falls back to a built-in reader.
- A production-only bug where link prefetching silently reset each visitor's demo.

### Accomplishments
- A full, working flow from email to paid invoice on the real PayPal sandbox.
- An agent that is useful but never acts without the creator's approval.
- A product that feels finished, not a proof of concept.

### What we learned
How PayPal Invoicing, reminders and webhooks fit together, and how to design AI features that stay dependable when a model is slow or wrong.

### What's next
Gmail inbox connection, real collaborator payouts, multi-currency invoicing for India-based accounts, and contract (PDF) reading.

---

## Tools section (AI used and how)

- **OpenRouter** (OpenAI-compatible API, called with the OpenAI SDK). Models: `nvidia/nemotron-3.5-super-vl:free`, then `openrouter/free`, tried in order. Used inside the product for four jobs: extracting deal terms from brand emails as validated JSON, drafting escalating payment reminders, drafting usage-rights renewal pitches, and writing a one-line insight per deal.
- **Google Gemini** (Google GenAI SDK): supported as an optional fallback model; not enabled in the hosted demo.
- **Built-in rules-based reader:** non-AI fallback used when no model answers in time.
- **Claude Code (Anthropic):** AI coding assistant used to help build and test the app.

## Built with
Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, Framer Motion, AG Grid, SQLite, Drizzle ORM, PayPal Invoicing API, PayPal Payouts API, PayPal Webhooks, OpenRouter, OpenAI SDK, Zod, Playwright, Render
