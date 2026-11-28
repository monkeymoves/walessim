// The clock's Waiting face in Welsh at 1280 x 800, with the build menu open (board fix 2, package B).
// Usage: BASE=http://127.0.0.1:4521 node design/scripts/board-fix2-b-clock.mjs
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:4521";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(base + "/#/bwrdd");
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", "cy");
  localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
  localStorage.setItem("etifeddiaeth.board.v2.clocktaught", "done");
});
await page.reload();
await page.getByTestId("bw-go").click();
await page.getByTestId("bw-play").click();
await page.locator(".bw-league-row").first().click();
await page.getByTestId("bw-build-here").click();
await page.waitForTimeout(600);
await page.screenshot({ path: "design/shots-build/board-fix2/B/10-waiting-cy-1280.png" });
const clock = await page.locator(".bw-clock").boundingBox();
const play = await page.getByTestId("bw-play").boundingBox();
console.log(`clock ${JSON.stringify(clock)} play ${JSON.stringify(play)} text ${await page.getByTestId("bw-play").textContent()}`);
await browser.close();
