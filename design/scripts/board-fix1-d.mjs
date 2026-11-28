// Package D's screenshots for playtest 8 fixes, round 1: the headline before the 2030 election in
// a Skilled game (things move early), an event warning stop and an event landing (event names in
// sentences), in English and Welsh. Usage:
//   npx tsx design/scripts/board-fix1-d-saves.ts > saves.json (drop npm notice lines), then
//   BASE=http://localhost:5437 node design/scripts/board-fix1-d.mjs saves.json
// Saves design/shots-build/board-fix1/d/<name>-<lang>.png and prints the stop words and console errors.
import { createRequire } from "module";
import { mkdirSync, readFileSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const saves = JSON.parse(readFileSync(process.argv[2], "utf8"));
const base = process.env.BASE ?? "http://localhost:5437";
const dir = "design/shots-build/board-fix1/d";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const errors = [];

async function open(lang, run) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);
  page.on("pageerror", (e) => errors.push(`${lang}: ${e}`));
  page.on("console", (m) => (m.type() === "error" || (m.type() === "warning" && /slot|missing key/.test(m.text()))) && errors.push(`${lang}: ${m.text()}`));
  await page.goto(base + "/#/");
  await page.evaluate(({ l, run }) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
    localStorage.setItem("etifeddiaeth.board.v2.clocktaught", "done");
    localStorage.setItem("etifeddiaeth.board.v2.run", run);
  }, { l: lang, run });
  await page.goto(base + "/#/bwrdd");
  await page.reload();
  await page.waitForSelector('[data-testid="bw-resume"]', { timeout: 20000 });
  await page.locator('[data-testid="bw-resume"]').first().click();
  await page.waitForSelector(".bw-board", { timeout: 20000 });
  await page.waitForTimeout(1200);
  return page;
}
const shot = async (page, name) => { await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/${name}.png` }); };
const text = async (page, sel) => (await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, " ") : "";

for (const lang of ["en", "cy"]) {
  let page = await open(lang, saves.early);
  await shot(page, `01-early-2030-${lang}`);
  console.log(lang, "headline:", await text(page, '[data-testid="bw-headline"]'), "|", await text(page, '[data-testid="bw-head-since"]'), "|", await text(page, '[data-testid="bw-head-building"]'));
  await page.context().close();

  for (const name of ["warn", "respond"]) {
    page = await open(lang, saves[name]);
    // Run time on to the next stop: the warning or the event comes in the next season.
    if (await page.locator('[data-testid="bw-next-season"]').count()) await page.locator('[data-testid="bw-next-season"]').click();
    else await page.locator('[data-testid="bw-play"]').click();
    await page.waitForSelector('[data-testid="bw-stop"], [data-testid="bw-respond"]', { timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    await shot(page, `02-${name}-${lang}`);
    console.log(lang, name, ":", await text(page, '[data-testid="bw-stop"]'), "|", await text(page, '[data-testid="bw-respond"]'));
    await page.context().close();
  }
}
console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
