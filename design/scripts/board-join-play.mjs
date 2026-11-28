// One full board game, step by step on the real model, played as a player would: each year it
// opens a council, builds the best open project it can afford (tier first), answers every event,
// takes deals and visits, and reads every stop. Screenshots go to design/shots-build/board-join/.
// It prints the stops met, any sentence on screen with a raw key, an empty slot, "undefined" or
// "NaN", and console errors.
// Usage: BASE=http://127.0.0.1:4174 node design/scripts/board-join-play.mjs [en|cy]
import { mkdirSync } from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:4174";
const lang = process.argv[2] ?? "en";
const out = "design/shots-build/board-join";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(base + "/#/bwrdd");
await page.evaluate((l) => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", l);
  localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
  localStorage.setItem("etifeddiaeth.board.v2.prefs", JSON.stringify({ stepByStep: true, speed: "steady", holdWhileReading: true, stops: {} }));
}, lang);
await page.reload();
await page.waitForSelector("[data-testid=bw-go]", { timeout: 30000 });

const shots = new Set();
async function shot(name) {
  if (shots.has(name)) return;
  shots.add(name);
  await page.screenshot({ path: `${out}/${lang}-${name}.png` });
}
const visible = (id) => page.getByTestId(id).first().isVisible().catch(() => false);
const bad = new Set();
async function scan(where) {
  const text = await page.locator("[data-testid=board]").innerText().catch(() => "");
  for (const line of text.split("\n")) {
    if (/\{\w+\}|\bboard(ui)?\.[a-z_]+\.|undefined|NaN/.test(line)) bad.add(`${where}: ${line.trim().slice(0, 140)}`);
  }
}

await shot("01-start");
await page.getByTestId("bw-go").click();
await page.waitForSelector("[data-testid=bw-clock]", { timeout: 20000 });
await page.waitForTimeout(600);
await shot("02-board");

const rows = await page.locator(".bw-league-row").count();
let row = 0;
let lastBuildYear = "";
/** Open a council and build the best open project there, if any is affordable. */
async function tryBuild() {
  for (let attempt = 0; attempt < rows; attempt++) {
    const r = page.locator(".bw-league-row").nth(row % rows);
    row++;
    await r.click({ timeout: 3000 }).catch(() => undefined);
    if (!(await visible("bw-build-here"))) continue;
    await page.getByTestId("bw-build-here").click({ timeout: 3000 }).catch(() => undefined);
    if (!(await visible("bw-build"))) continue;
    const opts = page.locator("[data-testid^=bw-opt-]");
    const n = await opts.count();
    for (let i = n - 1; i >= 0; i--) {
      await opts.nth(i).click({ timeout: 2000 }).catch(() => undefined);
      const go = page.locator("[data-testid=bw-build-it]:not([disabled])");
      if (await go.count()) {
        await shot("03-build-preview");
        await go.first().click({ timeout: 2000 }).catch(() => undefined);
        await page.keyboard.press("Escape");
        return true;
      }
    }
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  }
  return false;
}

const seen = {};
const t0 = Date.now();
for (let guard = 0; guard < 1500 && Date.now() - t0 < 10 * 60_000; guard++) {
  if (await visible("bw-end")) break;
  if (await visible("bp-visit")) {
    await shot("05-visit");
    seen.visit = (seen.visit ?? 0) + 1;
    if (await page.getByTestId("bp-rhondda").count()) for (const i of [0, 1, 2]) await page.getByTestId("bp-tip").nth(i).check();
    else await page.locator("[data-testid^=bp-opt-]").first().click();
    await page.locator("[data-testid=bp-choose]:not([disabled])").click();
    await page.getByTestId("bp-done").click();
    continue;
  }
  if (await visible("bw-respond")) {
    seen.respond = (seen.respond ?? 0) + 1;
    await scan("respond");
    await shot("04-respond");
    const picks = page.locator("[data-testid=bw-respond-pick]:not([disabled])");
    const n = await picks.count();
    const pick = picks.nth(Math.max(0, n - 1));
    try { await pick.click({ timeout: 3000 }); } catch { seen.respondCovered = (seen.respondCovered ?? 0) + 1; await pick.press("Enter"); }
    continue;
  }
  if (await visible("bw-deals")) {
    seen.deal = (seen.deal ?? 0) + 1;
    await scan("deal");
    await shot("07-deal");
    await page.locator("[data-testid=bw-deal]:not([disabled])").first().click();
    continue;
  }
  if (await visible("bw-term")) {
    seen.term = (seen.term ?? 0) + 1;
    await scan("term");
    await shot(`06-term-${seen.term}`);
    await page.getByTestId("bw-term-on").click();
    continue;
  }
  if (await visible("bw-stop")) {
    const cls = (await page.getByTestId("bw-stop").getAttribute("class")) ?? "";
    const k = /bw-stop-([a-z_]+)/.exec(cls)?.[1] ?? "?";
    seen[k] = (seen[k] ?? 0) + 1;
    await scan(`stop ${k}`);
    await shot(`08-stop-${k}`);
    if (k === "visit" && (await page.getByTestId("bw-stop-visit").count())) await page.getByTestId("bw-stop-visit").click();
    else await page.getByTestId("bw-stop-on").click();
    continue;
  }
  const year = (await page.getByTestId("bw-year").textContent().catch(() => "")) ?? "";
  if (year !== lastBuildYear) {
    lastBuildYear = year;
    if (await tryBuild()) seen.built = (seen.built ?? 0) + 1;
    await scan("board");
    if (year.includes("2038")) await shot("09-board-2038");
    continue;
  }
  const run = page.locator("[data-testid=bw-run-next]:not([disabled])");
  if (await run.count()) await run.click({ timeout: 3000 }).catch(() => undefined);
  else await page.locator("[data-testid=bw-next-season]:not([disabled])").click({ timeout: 2000 }).catch(() => undefined);
  await page.waitForTimeout(40);
}
const ended = await visible("bw-end");
if (ended) {
  await page.waitForTimeout(1500);
  await scan("end");
  await shot("10-end-top");
  for (const id of ["be-name", "be-chapters", "be-thennow", "be-letter", "be-notbuilt", "be-count", "be-run"]) {
    await page.getByTestId(id).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${lang}-11-end-${id}.png` });
  }
  console.log("ghost map:", (await page.locator("[data-testid=be-notbuilt] figure").count()) > 1);
  console.log("chapters:", (await page.locator(".be-chapter").allInnerTexts()).map((x) => x.split("\n")[0]).join(" | "));
  console.log("ending:", await page.getByTestId("be-name").locator("h1").textContent());
}
console.log(lang, "reached the end:", ended, "in", Math.round((Date.now() - t0) / 1000), "s. seen:", JSON.stringify(seen));
console.log(bad.size ? "SUSPECT TEXT:\n" + [...bad].join("\n") : "no suspect text");
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();
