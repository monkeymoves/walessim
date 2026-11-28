// Package D's fix round 3 shots (cold playtest 10): the lowest council under the line, its build
// menu and a build card that answers what it asks for (rule P7, the backing it gives once working),
// the open deal on the council panel, and Why? on its backing.
// Usage: npx tsx design/scripts/board-fix3-d-saves.ts > saves.json; SAVES=saves.json BASE=http://localhost:4613 node design/scripts/board-fix3-d.mjs
import { mkdirSync, readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:4613";
const saves = JSON.parse(readFileSync(process.env.SAVES, "utf8"));
const out = "design/shots-build/board-fix3/D";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
await page.goto(base + "/#/bwrdd");
await page.evaluate((code) => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", "en");
  localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
  localStorage.setItem("etifeddiaeth.board.v2.prefs", JSON.stringify({ stepByStep: true, speed: "steady", holdWhileReading: true, stops: {} }));
  localStorage.setItem("etifeddiaeth.board.v2.run", code);
}, saves.deal);
await page.reload();
await page.getByTestId("bw-resume").first().click({ timeout: 30000 });
await page.waitForSelector("[data-testid=bw-clock]", { timeout: 20000 });
await page.waitForTimeout(800);
await page.keyboard.press("Escape");
await shot("01-region");
// the council of the open deal: the first league row that does not back you
const low = await page.evaluate(() => {
  const rows = [...document.querySelectorAll(".bw-league-row")].map((r) => ({ name: r.querySelector(".bw-league-name")?.textContent ?? "", text: r.querySelector(".bw-league-backs")?.textContent ?? "" }));
  const scored = rows.map((r) => ({ ...r, b: Number((r.text.match(/(\d+(?:[.,]\d)?)\s*$/) ?? [])[1]?.replace(",", ".") ?? 10) })).filter((r) => r.b < 5).sort((a, b) => a.b - b.b);
  return scored[0]?.name.trim() ?? null;
});
console.log("lowest", low);
if (low) await page.locator(".bw-league-row", { hasText: low }).first().click({ timeout: 2500 }).catch(() => undefined);
await page.waitForTimeout(700);
await shot("02-council-under");
await page.getByRole("button", { name: /^Build in / }).first().click().catch(() => undefined);
await page.waitForTimeout(700);
await shot("03-build-menu");
// open each card until one names what the council asks for
const cards = page.locator(".bw-ticket, [data-testid=bw-ticket]");
const n = await cards.count();
let found = false;
for (let i = 0; i < n && !found; i++) {
  await cards.nth(i).click().catch(() => undefined);
  await page.waitForTimeout(400);
  const text = await page.locator("[data-testid=board]").innerText().catch(() => "");
  if (/is asking for .*Backing there rises/.test(text)) { found = true; await shot("04-build-answers"); }
}
console.log("answer note seen", found, "cards", n);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.getByTestId("bw-backing-why").click().catch(() => undefined);
await page.waitForTimeout(500);
await shot("05-why-backing");
console.log("errors", errors.length, errors.slice(0, 3));
await browser.close();
