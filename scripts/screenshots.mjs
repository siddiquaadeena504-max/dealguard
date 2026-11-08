// Screenshots every listed screen in light + dark, at mobile + desktop sizes.
// Usage: node scripts/screenshots.mjs [/path ...]   (dev server must be running)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/style"];
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const route of routes) {
  for (const [sizeName, viewport] of Object.entries(sizes)) {
    for (const scheme of ["light", "dark"]) {
      const ctx = await browser.newContext({ viewport, colorScheme: scheme, reducedMotion: "reduce", deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const name = `${route.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "home"}-${sizeName}-${scheme}.png`;
      await page.screenshot({ path: `${OUT}/${name}`, fullPage: true });
      console.log(`${name}${overflow > 0 ? `  ⚠ horizontal overflow ${overflow}px` : ""}${errors.length ? `  ⚠ ${errors.length} console error(s): ${errors[0].slice(0, 120)}` : ""}`);
      await ctx.close();
    }
  }
}
await browser.close();
