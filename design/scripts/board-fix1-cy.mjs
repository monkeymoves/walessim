// The Welsh pass (playtest 8, must-fix 19): one full board game in Cymraeg, step by step, with a
// screenshot of every screen type in design/shots-build/board-fix1/cy/ and a read of every screen's
// text for English left behind, names not mutated, articles not joined, raw keys and empty slots.
// Usage: BASE=http://127.0.0.1:4319 node design/scripts/board-fix1-cy.mjs [a|b]
// a: a player who builds every year. b: a careless player who builds the two place projects
// (Rhondda tips, Gwent Levels wetlands), visits them, loses an election and takes a deal.
import { mkdirSync } from "fs";
import { createRequire } from "module";
import { englishOnly, welshFaults } from "./board-cy-lib.mjs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:4319";
const scen = process.argv[2] ?? "a";
const out = "design/shots-build/board-fix1/cy";
mkdirSync(out, { recursive: true });
const eng = englishOnly(process.cwd());

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const taken = new Set();
const shot = async (name, full = false) => { if (taken.has(name)) return; taken.add(name); await page.screenshot({ path: `${out}/${scen === "a" ? "" : scen + "-"}${name}.png`, fullPage: full }); };
const visible = (id) => page.getByTestId(id).first().isVisible().catch(() => false);
const found = new Map();
async function scan(where) {
  const text = await page.locator("body").innerText().catch(() => "");
  for (const line of text.split("\n")) {
    for (const f of welshFaults(line, eng)) {
      const k = `${f}: ${line.trim().slice(0, 170)}`;
      if (!found.has(k)) found.set(k, where);
    }
  }
}

// the title, in Welsh
await page.goto(base + "/#/");
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", "cy");
});
await page.reload();
await page.waitForTimeout(1200);
await scan("title"); await shot("00-title");

// the start screen, with the clock lesson still to come
await page.goto(base + "/#/bwrdd");
await page.evaluate(() => localStorage.setItem("etifeddiaeth.board.v2.prefs", JSON.stringify({ stepByStep: true, speed: "steady", holdWhileReading: true, stops: { finished: true, year: false } })));
await page.reload();
await page.waitForSelector("[data-testid=bw-go]", { timeout: 30000 });
await scan("start"); await shot("01-start");
await page.getByTestId("bw-go").click();
await page.waitForSelector("[data-testid=bw-clock]", { timeout: 20000 });
await page.waitForTimeout(700);
await scan("board"); await shot("02-board-guide");
for (let i = 0; i < 4 && (await visible("bw-guide")); i++) await page.getByText(/^Deall$/).first().click().catch(() => page.keyboard.press("Escape"));

async function openCouncil(i) {
  await page.keyboard.press("Escape");
  if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
  const rows = page.locator(".bw-league-row");
  await rows.nth(i % Math.max(1, await rows.count())).click().catch(() => undefined);
  await page.waitForTimeout(500);
}

async function buildOne(i, shots) {
  await openCouncil(i);
  if (shots) { await scan("council"); await shot("03-council"); }
  if (!(await visible("bw-build-here"))) return false;
  await page.getByTestId("bw-build-here").click().catch(() => undefined);
  await page.waitForTimeout(300);
  if (shots) { await scan("build"); await shot("04-build-menu"); }
  const opts = page.locator("[data-testid^=bw-opt-]");
  const n = await opts.count();
  for (let k = n - 1; k >= 0; k--) {
    await opts.nth(k).click({ timeout: 1500 }).catch(() => undefined);
    const go = page.locator("[data-testid=bw-build-it]:not([disabled])");
    if (await go.count()) {
      if (shots) { await scan("preview"); await shot("05-build-preview"); }
      await go.first().click();
      await page.keyboard.press("Escape");
      return true;
    }
  }
  await page.keyboard.press("Escape");
  return false;
}

async function visit() {
  await scan("visit"); await shot(`20-visit-${taken.size}`);
  const opt = page.locator("[data-testid^=bp-opt-], [data-testid=bp-tip]");
  if (await opt.count()) await opt.first().click().catch(() => undefined);
  const choose = page.locator("[data-testid=bp-choose]:not([disabled])");
  if (await choose.count()) {
    await choose.first().click().catch(() => undefined);
    await page.waitForTimeout(300);
    await scan("visit result"); await shot("21-visit-result");
    await page.getByTestId("bp-done").click().catch(() => page.keyboard.press("Escape"));
  } else {
    await page.getByTestId("bp-leave").click().catch(() => page.keyboard.press("Escape"));
  }
}

async function buildThis(name, id) {
  await page.keyboard.press("Escape");
  if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
  await page.locator(".bw-league-row", { hasText: name }).first().click().catch(() => undefined);
  await page.waitForTimeout(400);
  await page.getByTestId("bw-build-here").click().catch(() => undefined);
  await page.getByTestId(`bw-opt-${id}`).first().click().catch(() => undefined);
  await page.locator("[data-testid=bw-build-it]:not([disabled])").first().click().catch(() => undefined);
  await page.keyboard.press("Escape");
}
if (scen === "b") {
  await buildThis("Rhondda", "coal-tips-safe");
  await buildThis("Casnewydd", "coast-wetlands");
  await page.waitForTimeout(400);
  await scan("council visit"); await shot("06-council-visit");
  if (await page.getByTestId("bw-council-visit").isEnabled().catch(() => false)) { await page.getByTestId("bw-council-visit").click(); await page.waitForTimeout(500); }
}

const year = async () => Number(((await page.getByTestId("bw-year").textContent().catch(() => "")) ?? "").replace(/\D/g, "").slice(0, 4));
let lastYear = 0, ci = 0, sheets = false;
for (let guard = 0; guard < 900; guard++) {
  if (await visible("bw-end")) break;
  if (await visible("bp-visit")) { await visit(); continue; }
  if (await visible("bw-stop")) {
    const cls = (await page.getByTestId("bw-stop").getAttribute("class")) ?? "";
    const k = /bw-stop-([a-z_]+)/.exec(cls)?.[1] ?? "x";
    await scan(`stop ${k}`); await shot(`10-stop-${k}`);
    if (k === "visit" && (await page.getByTestId("bw-stop-visit").isEnabled().catch(() => false))) { await page.getByTestId("bw-stop-visit").click(); await page.waitForTimeout(400); continue; }
    if (k === "warning" && !taken.has("11-warning-slip")) {
      await page.getByTestId("bw-stop-look").click().catch(() => undefined); await page.waitForTimeout(500);
      await scan("warning"); await shot("11-warning-slip"); await page.keyboard.press("Escape"); continue;
    }
    await page.getByTestId("bw-stop-on").click().catch(() => undefined);
    continue;
  }
  if (await visible("bw-respond")) {
    await scan("respond"); await shot("12-respond");
    const p = page.locator("[data-testid=bw-respond-pick]:not([disabled])");
    await p.nth(scen === "b" ? 0 : Math.max(0, (await p.count()) - 1)).click({ timeout: 3000 }).catch(() => undefined);
    continue;
  }
  if (await visible("bw-term")) {
    const y = await year();
    await scan(`term ${y}`); await shot(`13-term-${y}`);
    if (await visible("bw-election")) { await page.getByTestId("bw-election").scrollIntoViewIfNeeded().catch(() => undefined); await shot(`14-election-${y}`); }
    if (await visible("bw-deals")) { await scan("deals"); await shot("15-deal"); await page.locator("[data-testid=bw-deal]:not([disabled])").first().click().catch(() => undefined); }
    await page.getByTestId("bw-term-on").click().catch(() => undefined);
    continue;
  }
  const y = await year();
  if (y !== lastYear) {
    lastYear = y;
    if (scen === "a") await buildOne(ci++, ci === 1);
    await scan(`board ${y}`);
    if (y === 2029 || y === 2037 || y === 2045) await shot(`30-board-${y}`);
    if (scen === "b" && y === 2032 && !taken.has("32-why")) {
      await openCouncil(2);
      const why = page.locator("[data-testid=bw-council] .bw-why").first();
      if (await why.count()) { await why.click(); await page.waitForTimeout(400); await scan("why"); await shot("32-why"); await page.keyboard.press("Escape"); }
      await page.keyboard.press("Escape");
    }
    if (y >= 2030 && !sheets && scen === "a") {
      sheets = true;
      await openCouncil(1);
      await scan("council 2030"); await shot("31-council-2030");
      const why = page.locator("[data-testid=bw-ticker] button", { hasText: "Pam?" }).first();
      if (await why.count()) { await why.click(); await page.waitForTimeout(500); await scan("why"); await shot("32-why"); await page.keyboard.press("Escape"); }
      await page.keyboard.press("Escape");
      await openCouncil(0); await page.keyboard.press("Escape");
      if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
      await page.getByTestId("bw-tree-open").click().catch(() => undefined); await page.waitForTimeout(400); await scan("tree"); await shot("33-tree"); await page.keyboard.press("Escape");
      await page.getByText("Cyfreithiau i'r rhanbarth i gyd").first().click().catch(() => undefined); await page.waitForTimeout(400); await scan("laws"); await shot("34-laws"); await page.keyboard.press("Escape");
      await page.getByTestId("bw-settings-open").click().catch(() => undefined); await page.waitForTimeout(300); await scan("settings"); await shot("35-settings"); await page.keyboard.press("Escape");
      await page.locator("[data-testid=bw-timeline]").hover().catch(() => undefined); await page.waitForTimeout(300); await shot("36-timeline-hover");
    }
  }
  await page.locator("[data-testid=bw-next-season]:not([disabled])").click({ timeout: 2000 }).catch(() => undefined);
  await page.waitForTimeout(40);
}

// the end screen, section by section
await page.waitForSelector("[data-testid=bw-end]", { timeout: 30000 }).catch(() => undefined);
await page.waitForTimeout(800);
await page.getByTestId("be-lapse-skip").click().catch(() => undefined);
await page.getByTestId("be-count-open").click().catch(() => undefined);
await page.waitForTimeout(500);
await scan("end");
const sections = ["be-verdict", "be-record", "be-turns", "be-lapse", "be-chapters", "be-thennow", "be-letter", "be-notbuilt", "be-count", "be-found", "be-run"];
let i = 0;
for (const id of sections) {
  if (!(await visible(id))) continue;
  await page.getByTestId(id).first().scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(250);
  await shot(`40-end-${String(i++).padStart(2, "0")}-${id}`);
}
await shot("49-end-full", true);

console.log(`shots: ${taken.size} in ${out}`);
console.log(found.size ? "WELSH FAULTS:\n" + [...found].map(([k, w]) => `${w} | ${k}`).join("\n") : "no Welsh faults found");
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();
