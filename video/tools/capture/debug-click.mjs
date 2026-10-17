// Debug helper: load demo, run sim, click a button by text and report which speed button is active.
// Usage: node tools/capture/debug-click.mjs "4×"
import * as lib from "./lib.mjs";
import { recipes } from "./recipes.mjs";
process.env.DGPU ??= "1";
const label = process.argv[2] ?? "4×";
const { browser, page } = await lib.launchBrowser({ mode: "headless-gpu" });
await recipes["run-sim"].preroll({ page });
await lib.clickText(page, "Run simulation", { moveMs: 100 });
await lib.sleep(1200);
await page.keyboard.press("Escape");
await lib.sleep(500);
const box = await lib.clickText(page, label, { moveMs: 200 });
await lib.sleep(500);
const state = await page.evaluate(() => Array.from(document.querySelectorAll("button")).filter((b) => /^\d×$/.test((b.textContent ?? "").trim())).map((b) => `${b.textContent.trim()}:${b.className.includes("bg-[#1d2430]") ? "ON" : "off"}`));
const hit = await page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${String(e.className).slice(0, 60)} "${(e.textContent ?? "").slice(0, 20)}"` : null; }, box);
console.log({ box, state, hit });
await page.screenshot({ path: "out/debug-click.png" });
await browser.close();
