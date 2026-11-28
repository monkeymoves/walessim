// Fix round 2, package D: a law's backing cost on the screen, the day it passes and years later
// (playtest 9 must-fix 2). Starts a board game, passes the local homes rule, and runs the clock.
// Usage: a vite dev server, then BASE=http://127.0.0.1:<its port> node design/scripts/board-fix2-d.mjs
// (a dev server, so the page reads public/board-model.json as built now).
import { mkdirSync } from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:4393";
const out = "design/shots-build/board-fix2/D";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(5000);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
await page.goto(base + "/#/");
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", "en");
});
await page.reload();
await page.waitForTimeout(1000);
await page.getByTestId("way-bwrdd").click();
await page.waitForSelector("[data-testid=bw-go]", { timeout: 30000 });
await page.getByTestId("bw-go").first().click();
await page.waitForSelector("[data-testid=bw-clock]", { timeout: 20000 });
await page.waitForTimeout(800);
for (const label of ["Got it", "Close", "Carry on"]) await page.getByRole("button", { name: label }).first().click({ timeout: 800 }).catch(() => undefined);
await page.keyboard.press("Escape").catch(() => undefined);
await shot("01-before-law");
await page.getByRole("button", { name: /Laws for the whole region/ }).first().click();
await page.waitForTimeout(500);
await shot("02-laws-sheet");
await page.getByRole("button", { name: /Pass this law/ }).first().click();
await page.waitForTimeout(600);
await shot("03-law-passed");
await page.getByRole("button", { name: /close|×/i }).first().click({ timeout: 800 }).catch(() => page.keyboard.press("Escape"));
await page.waitForTimeout(400);
await shot("04-board-after-law");
// run the clock on, answering whatever stops it, to about 2031
const year = async () => Number(((await page.getByTestId("bw-year").textContent().catch(() => "")) ?? "").replace(/\D/g, "").slice(0, 4));
await page.getByRole("button", { name: /^Fast$/ }).first().click().catch(() => undefined);
for (let i = 0; i < 160 && (await year()) < 2031; i++) {
  await page.getByRole("button", { name: /Start time|^Play/ }).first().click({ timeout: 500 }).catch(() => undefined);
  await page.waitForTimeout(700);
  for (const name of [/^Carry on/, /Clear up|Let it|Wish them|Accept|Leave without/, /Lift /]) await page.getByRole("button", { name }).first().click({ timeout: 300 }).catch(() => undefined);
}
await page.keyboard.press("Escape").catch(() => undefined);
await page.waitForTimeout(500);
await shot("05-board-2031");
await page.getByRole("button", { name: /Laws for the whole region/ }).first().click().catch(() => undefined);
await page.waitForTimeout(500);
await shot("06-laws-2031");
console.log("year reached", await year());
await browser.close();
