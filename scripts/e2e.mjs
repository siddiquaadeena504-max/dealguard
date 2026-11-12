// End-to-end check of the core flow (dev server must be running).
// Usage: node scripts/e2e.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const step = async (name, fn) => {
  const t = Date.now();
  try {
    await fn();
    console.log(`✓ ${name} (${Date.now() - t}ms)`);
  } catch (err) {
    await page.screenshot({ path: `screenshots/e2e-fail.png`, fullPage: true });
    console.log(`✗ ${name}: ${err.message.split("\n")[0]}`);
    await browser.close();
    process.exit(1);
  }
};

await step("open demo dashboard", async () => {
  await page.goto(BASE + "/demo");
  await page.getByText("Needs your attention").waitFor();
});
await step("open new deal, pick Swiggy email (INR, simulated PayPal)", async () => {
  await page.goto(BASE + "/app/new");
  await page.getByText("Swiggy Instamart: festive").click();
  await page.getByRole("button", { name: /Extract deal with AI/ }).click();
});
await step("fields animate in with values", async () => {
  await page.getByRole("button", { name: /Review invoice/ }).waitFor({ timeout: 60000 });
  const brand = await page.getByLabel("Brand", { exact: true }).inputValue();
  const fee = await page.getByLabel("Total fee").inputValue();
  if (brand !== "Swiggy" || fee !== "40000") throw new Error(`got brand=${brand} fee=${fee}`);
});
await step("approval modal shows invoice preview", async () => {
  await page.getByRole("button", { name: /Review invoice/ }).click();
  await page.getByRole("dialog").getByText("What happens when you approve").waitFor();
  await page.screenshot({ path: "screenshots/e2e-approval.png" });
});
await step("approve sends invoice and opens deal", async () => {
  await page.getByRole("button", { name: /Approve & send/ }).click();
  await page.getByText(/On its way to Swiggy/).waitFor({ timeout: 20000 });
  await page.waitForURL(/\/app\/deals\//, { timeout: 15000 });
  await page.getByText("Chase agent").waitFor();
});
await step("chase agent drafts and sends a reminder", async () => {
  await page.getByRole("button", { name: /Draft .* reminder/ }).click();
  await page.getByRole("button", { name: /Approve & send/ }).first().waitFor({ timeout: 45000 });
  await page.getByRole("button", { name: /Approve & send/ }).first().click();
  await page.getByText(/Nudge sent/).first().waitFor({ timeout: 15000 });
});
await step("add collaborator", async () => {
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Name").fill("Riya Sen");
  await page.getByLabel("PayPal email").fill("riya@example.com");
  await page.getByLabel("Share percent").fill("10");
  await page.getByRole("button", { name: "Add collaborator" }).click();
  await page.getByText("riya@example.com").waitFor();
});
await step("simulated payment marks Paid and proposes payout", async () => {
  await page.getByRole("button", { name: /Simulate brand payment/ }).click();
  await page.getByText("Payouts ready for approval").waitFor({ timeout: 15000 });
  await page.screenshot({ path: "screenshots/e2e-paid.png" });
});
await step("approve payouts", async () => {
  await page.getByRole("button", { name: /Approve & send payouts/ }).click();
  await page.getByText(/Sent 1 payout/).waitFor({ timeout: 15000 });
});
await step("payouts page lists it", async () => {
  await page.goto(BASE + "/app/payouts");
  await page.getByText("Payout history").waitFor();
  await page.getByText(/10% of Swiggy/).first().waitFor();
});
await step("settings save", async () => {
  await page.goto(BASE + "/app/settings");
  await page.getByRole("radio", { name: /Direct/ }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText(/Saved/).waitFor();
});
await step("command palette opens with Ctrl+K", async () => {
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Search deals or jump to…").fill("Mamaearth");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/app\/deals\//);
});
await step("onboarding creates a workspace", async () => {
  const p2 = await (await browser.newContext()).newPage();
  await p2.goto(BASE + "/onboarding");
  await p2.getByLabel("Your name").fill("Test Creator");
  await p2.getByRole("button", { name: /Continue/ }).click();
  await p2.getByRole("button", { name: /Continue/ }).click();
  await p2.getByRole("button", { name: "Go to dashboard" }).click();
  await p2.waitForURL(/\/app$/);
  await p2.getByText(/Test Creator/).first().waitFor();
});

console.log(errors.length ? `\n⚠ ${errors.length} console error(s):\n- ${[...new Set(errors)].slice(0, 5).join("\n- ")}` : "\nNo console errors.");
await browser.close();
