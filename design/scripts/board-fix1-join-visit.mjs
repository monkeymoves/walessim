// The join after fix round 1: the Gwent Levels visit (playtest 8, must-fix 17, overlapping option
// cards) and its stop card, in English, step by step. Shots in design/shots-build/board-fix1/join/.
// Usage: BASE=http://localhost:4321 node design/scripts/board-fix1-join-visit.mjs
import { mkdirSync } from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:4321";
const out = "design/shots-build/board-fix1/join";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const visible = (id) => page.getByTestId(id).first().isVisible().catch(() => false);

await page.goto(base + "/#/bwrdd");
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", "en");
  localStorage.setItem("etifeddiaeth.board.v2.prefs", JSON.stringify({ stepByStep: true, speed: "steady", holdWhileReading: true, stops: { finished: true, year: false } }));
});
await page.reload();
await page.waitForSelector("[data-testid=bw-go]", { timeout: 30000 });
await page.getByTestId("bw-go").first().click();
await page.waitForSelector("[data-testid=bw-clock]", { timeout: 20000 });
for (let i = 0; i < 4 && (await visible("bw-guide")); i++) await page.getByText(/^Got it$/).first().click().catch(() => page.keyboard.press("Escape"));
if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
await page.locator(".bw-league-row", { hasText: "Newport" }).first().click();
await page.waitForTimeout(400);
await page.getByTestId("bw-build-here").click();
await page.getByTestId("bw-opt-coast-wetlands").first().click();
await page.locator("[data-testid=bw-build-it]:not([disabled])").first().click();
await page.keyboard.press("Escape");

let seen = false;
for (let guard = 0; guard < 120 && !seen; guard++) {
  if (await visible("bp-visit")) {
    await page.screenshot({ path: `${out}/80-visit-gwent.png` });
    const opts = page.locator("[data-testid^=bp-opt-]");
    await opts.first().click().catch(() => undefined);
    await page.screenshot({ path: `${out}/81-visit-gwent-picked.png` });
    const boxes = [];
    for (let i = 0; i < (await opts.count()); i++) boxes.push(await opts.nth(i).boundingBox());
    console.log("option boxes:", JSON.stringify(boxes.map((b) => b && [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)])));
    seen = true;
    break;
  }
  if (await visible("bw-stop")) {
    const cls = (await page.getByTestId("bw-stop").getAttribute("class")) ?? "";
    if (/bw-stop-visit/.test(cls)) { await page.screenshot({ path: `${out}/82-stop-visit.png` }); await page.getByTestId("bw-stop-visit").click(); await page.waitForTimeout(500); continue; }
    await page.getByTestId("bw-stop-on").click().catch(() => undefined); continue;
  }
  if (await visible("bw-respond")) { await page.locator("[data-testid=bw-respond-pick]:not([disabled])").first().click().catch(() => undefined); continue; }
  if (await visible("bw-term")) { await page.locator("[data-testid=bw-deal]:not([disabled])").first().click().catch(() => undefined); await page.getByTestId("bw-term-on").click().catch(() => undefined); continue; }
  if (await page.getByTestId("bw-council-visit").isEnabled().catch(() => false)) { await page.getByTestId("bw-council-visit").click(); await page.waitForTimeout(500); continue; }
  await page.locator("[data-testid=bw-next-season]:not([disabled])").click({ timeout: 2000 }).catch(() => undefined);
  await page.waitForTimeout(60);
}
console.log(seen ? "visit seen" : "no visit offered");
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no page errors");
await browser.close();
