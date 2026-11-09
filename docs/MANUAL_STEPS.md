# Manual steps (things only you can click)

## 1. Get the keys (about 10 minutes)

**PayPal sandbox**
1. Go to https://developer.paypal.com and log in.
2. **Apps & Credentials** → make sure the toggle says **Sandbox** → **Create App** → name it `DealGuard`, type **Merchant** → **Create App**.
3. Copy **Client ID** → `PAYPAL_CLIENT_ID`, and **Secret** → `PAYPAL_CLIENT_SECRET`.
4. **Testing Tools → Sandbox Accounts**. You'll see a **Business** and a **Personal** account.
   - Business email → `PAYPAL_BUSINESS_EMAIL` (invoices come from here).
   - Personal account → use it to *pay* invoices during the demo (click the account → **View/Edit account** to see its password).
5. `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`

**OpenRouter** (primary AI): https://openrouter.ai → **Keys** → **Create Key** → `AI_API_KEY`.
Set `AI_BASE_URL=https://openrouter.ai/api/v1` and `AI_MODEL=nvidia/nemotron-3.5-super-vl:free,openrouter/free` (a list, tried in order).
Free models are slow (10–40 s per email) and sometimes busy. A few dollars of OpenRouter credit, with a paid model, makes extraction take a couple of seconds.
(Groq works too: `AI_BASE_URL=https://api.groq.com/openai/v1` with a Groq key and model.)

**Gemini** (optional extra fallback): https://aistudio.google.com → **Get API key** → `GEMINI_API_KEY`. Set `GEMINI_MODEL` to a model from their list.

Paste them into `.env` locally (never into chat or git).

## 2. Put the code on GitHub

1. Create a new **public** repository on github.com called `dealguard` (no README, since we have one).
2. In the `dealguard` folder:
   ```bash
   git remote add origin https://github.com/<your-username>/dealguard.git
   git push -u origin main
   ```
3. Check that `.env` is **not** in the repo on GitHub (it's in `.gitignore`).

## 3. Deploy on Render (about 5 minutes)

1. Go to https://render.com → sign in with GitHub.
2. **New +** → **Blueprint** → pick the `dealguard` repo. Render reads `render.yaml`.
3. It asks for the secret values: paste the same keys as in your `.env`.
4. Click **Apply**. The first build takes a few minutes. Your URL looks like `https://dealguard-xxxx.onrender.com`.
5. Open it → **Try the live demo** to check.

Note: on the free plan the service sleeps after 15 minutes idle. The first visit after that takes ~30 seconds to wake. Open the URL a minute before judges do.

## 4. Register the PayPal webhook (needs the Render URL)

1. developer.paypal.com → **Apps & Credentials** → your `DealGuard` app → scroll to **Sandbox Webhooks** → **Add Webhook**.
2. URL: `https://<your-render-url>/api/paypal/webhook`
3. Tick **Invoicing → Invoice paid** (`INVOICING.INVOICE.PAID`) → **Save**.
4. Copy the **Webhook ID** → add it in Render as `PAYPAL_WEBHOOK_ID` → Render redeploys.

Locally there's no public URL, so use the **Refresh status** button on a deal instead. It asks PayPal directly.

## 5. Test the real sandbox flow once

1. In the hosted app: **New deal** → paste an email **with your sandbox Personal account's email as the contact** (so the invoice lands somewhere you can pay it), or edit the contact email field before approving.
2. **Approve & send**.
3. Log in to https://www.sandbox.paypal.com as the **Personal** account → find the invoice → **Pay**.
4. Back in DealGuard → **Refresh status** (or wait for the webhook) → it flips to **Paid** with the celebration.
5. Add a collaborator using another sandbox account email → **Approve & send payouts**.

If PayPal rejects INR for your sandbox accounts, switch the deal's currency to USD before approving.
