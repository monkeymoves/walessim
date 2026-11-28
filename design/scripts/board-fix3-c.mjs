// Package C's fix round 3 shots (cold playtest 10): the council panel under the line (what holds
// it, what would lift it, the next election), Why? on backing, a deal and which builds count, the
// election card (councils to tip the next one, the law change a win gives), the laws sheet on an
// election step, a source with a rough guess, a build card's price, and the map after closing the
// build menu at several window sizes (must-fix 13).
// Usage: npx tsx design/scripts/board-fix3-c-saves.ts > saves.json; SAVES=saves.json BASE=http://localhost:4613 node design/scripts/board-fix3-c.mjs [en|cy]
import { mkdirSync, readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:4613";
const lang = process.argv[2] ?? "en";
const saves = JSON.parse(readFileSync(process.env.SAVES, "utf8"));
const out = "design/shots-build/board-fix3/C";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const checks = [];
const bad = new Set();

async function open(save, size = { width: 1440, height: 900 }) {
  const page = await (await browser.newContext({ viewport: size })).newPage();
  page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base + "/#/bwrdd");
  await page.evaluate(([l, code]) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
    localStorage.setItem("etifeddiaeth.board.v2.prefs", JSON.stringify({ stepByStep: true, speed: "steady", holdWhileReading: true, stops: {} }));
    if (code) localStorage.setItem("etifeddiaeth.board.v2.run", code);
  }, [lang, save ?? null]);
  await page.reload();
  if (save) { await page.getByTestId("bw-resume").first().click({ timeout: 30000 }); }
  else { await page.waitForSelector("[data-testid=bw-go]", { timeout: 30000 }); await page.getByTestId("bw-go").click(); }
  await page.waitForSelector("[data-testid=bw-clock]", { timeout: 20000 });
  await page.waitForTimeout(700);
  return page;
}
const shot = (page, name) => page.screenshot({ path: `${out}/${lang}-${name}.png` });
const visible = (page, id) => page.getByTestId(id).first().isVisible().catch(() => false);
async function scan(page, where) {
  const text = await page.locator("[data-testid=board]").innerText().catch(() => "");
  for (const line of text.split("\n")) {
    if (/\d\.\d\d|\{\w+\}|\bboard(ui)?\.[a-z_]+\.|undefined|NaN|\b[a-z]+_[a-z_]+\b|\b1 years\b|Placeholder|to check|here are content|Everyone here are/.test(line)) bad.add(`${where}: ${line.trim().slice(0, 160)}`);
  }
}
async function council(page, name) {
  await page.keyboard.press("Escape");
  if (!(await visible(page, "bw-region"))) await page.locator("[data-testid=bw-council] .bw-council-head button").first().click().catch(() => undefined);
  await page.locator(".bw-league-row", { hasText: name }).first().click({ timeout: 2500 });
  await page.waitForTimeout(700);
}
/** The council furthest under the line, by the league's backing column ("does not, 4.6"). */
async function lowest(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll(".bw-league-row")].map((r) => ({ name: r.querySelector(".bw-league-name")?.textContent ?? "", text: r.querySelector(".bw-league-backs")?.textContent ?? "" }));
    const scored = rows.map((r) => ({ ...r, b: Number((r.text.match(/(\d+(?:[.,]\d)?)\s*$/) ?? [])[1]?.replace(",", ".") ?? 10) })).filter((r) => r.b < 5).sort((a, b) => a.b - b.b);
    return scored[0]?.name.trim() ?? null;
  });
}

// 1. mid term, an open deal, councils under the line
{
  const page = await open(saves.deal);
  await scan(page, "deal-region"); await shot(page, "01-region");
  const low = await lowest(page);
  checks.push(["a council under the line in the league", !!low]);
  if (low) {
    await council(page, low);
    checks.push(["holds section on a council under 5", await visible(page, "bw-holds")]);
    checks.push(["next election line on the council", await visible(page, "bw-target-here")]);
    await scan(page, "council-under"); await shot(page, "02-council-under");
    await page.getByTestId("bw-backing-why").click();
    await page.waitForTimeout(400);
    checks.push(["Why? on backing has reasons", (await page.locator(".bw-why-item").count()) > 0]);
    checks.push(["Why? on backing opens since 2026", await page.locator(".bw-why-span[aria-checked=true]").last().evaluate((b) => b === b.parentElement.querySelectorAll(".bw-why-span")[2]).catch(() => false)]);
    checks.push(["Why? lists what holds it", await visible(page, "bw-why-holds")]);
    await scan(page, "why-backing"); await shot(page, "03-why-backing");
    // a rough-guess source docket, if any reason has one
    const rough = page.locator(".bw-why-sources .docket", { hasText: /Rough guess|Amcangyfrif bras/ }).first();
    if (await rough.count()) { await rough.click(); await page.waitForTimeout(300); await shot(page, "04-source-rough"); }
    await page.keyboard.press("Escape");
  }
  // the deal's council, its panel and its build menu
  await page.keyboard.press("Escape");
  await page.locator("[data-testid=bw-council] .bw-council-head button").first().click().catch(() => undefined);
  await page.waitForTimeout(400);
  const names = await page.evaluate(() => [...document.querySelectorAll(".bw-league-row .bw-league-name")].map((r) => r.textContent?.trim() ?? ""));
  for (const n of names.length ? names : []) {
    if (!n) continue;
    await council(page, n).catch(() => undefined);
    if (await visible(page, "bw-council-deal")) {
      await scan(page, "council-deal"); await shot(page, "05-council-deal");
      await page.getByTestId("bw-build-here").click();
      await page.waitForTimeout(500);
      checks.push(["build cards say whether they count for the deal", (await page.getByTestId("bw-ticket-deal").count()) > 0]);
      const first = page.getByTestId("bw-ticket-deal").first();
      await first.scrollIntoViewIfNeeded().catch(() => undefined);
      await scan(page, "build-deal"); await shot(page, "06-build-deal");
      break;
    }
  }
  await page.context().close();
}

// 2. the season before a win: the election card with the law change and the next election's councils
{
  const page = await open(saves.preWin);
  await page.getByTestId("bw-next-season").click();
  await page.waitForTimeout(800);
  for (let i = 0; i < 10 && !(await visible(page, "bw-term")); i++) {
    if (await visible(page, "bw-respond")) { await shot(page, "14-respond"); await page.locator("[data-testid=bw-respond-pick]:not([disabled])").first().click().catch(() => undefined); }
    else if (await visible(page, "bw-stop")) await page.getByTestId("bw-stop-on").click().catch(() => undefined);
    await page.waitForTimeout(400);
  }
  checks.push(["term report after the win", await visible(page, "bw-term")]);
  checks.push(["election card asks for the law change", await visible(page, "bw-election-choose-law")]);
  checks.push(["election card names the next election's councils", await visible(page, "bw-targets")]);
  await scan(page, "election-won"); await shot(page, "07-election-won");
  await page.locator(".bw-term-scroll").evaluate((e) => e.scrollTo(0, e.scrollHeight)).catch(() => undefined);
  await page.waitForTimeout(300);
  await shot(page, "08-election-won-foot");
  await page.getByTestId("bw-election-choose-law").click().catch(() => undefined);
  await page.waitForTimeout(600);
  checks.push(["laws open from the card", await page.locator(".bw-laws").isVisible().catch(() => false)]);
  await scan(page, "laws"); await shot(page, "09-laws-at-election");
  await page.context().close();
}

// 3. the season before a loss: the deal to pick and the councils to bring round
{
  const page = await open(saves.preLoss);
  await page.getByTestId("bw-next-season").click();
  await page.waitForTimeout(800);
  for (let i = 0; i < 10 && !(await visible(page, "bw-term")); i++) {
    if (await visible(page, "bw-respond")) { await shot(page, "14-respond"); await page.locator("[data-testid=bw-respond-pick]:not([disabled])").first().click().catch(() => undefined); }
    else if (await visible(page, "bw-stop")) await page.getByTestId("bw-stop-on").click().catch(() => undefined);
    await page.waitForTimeout(400);
  }
  checks.push(["term report after the loss", await visible(page, "bw-term")]);
  await scan(page, "election-lost"); await shot(page, "10-election-lost");
  await page.locator(".bw-term-scroll").evaluate((e) => e.scrollTo(0, e.scrollHeight)).catch(() => undefined);
  await page.waitForTimeout(300);
  await shot(page, "11-election-lost-foot");
  await page.context().close();
}

// 4. a new game: a build card's price, and the map after closing the build menu, at several sizes
for (const size of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1100, height: 820 }]) {
  const page = await open(null, size);
  const tag = `${size.width}x${size.height}`;
  const name = await page.evaluate(() => document.querySelector(".bw-league-row .bw-league-name")?.textContent?.trim() ?? "");
  await council(page, name);
  await page.getByTestId("bw-build-here").click();
  await page.waitForTimeout(600);
  if (size.width === 1440) {
    await scan(page, "build-new"); await shot(page, "12-build-prices");
    // build the first card, the mouse left where it clicked: nothing previews until it moves (should-fix 4)
    await page.locator(".bw-ticket-face").first().click();
    await page.waitForTimeout(300);
    await page.getByTestId("bw-build-it").click();
    await page.waitForTimeout(600);
    const strip = await page.locator("body").innerText();
    checks.push(["no 'if you build it' straight after building", !/left if you build it|If you build it/.test(strip)]);
    await shot(page, "15-after-build");
  }
  await page.getByTestId("bw-build-here").click();
  await page.waitForTimeout(150);
  await page.locator("[data-testid=bw-council] .bw-council-head button").first().click();
  await page.waitForTimeout(1500);
  // the map fills the stage: the canvas is the stage's size and its top band is land, not the sea's edge colour
  const fit = await page.evaluate(() => {
    const stage = document.querySelector(".bw-stage")?.getBoundingClientRect();
    const canvas = document.querySelector(".bw-map canvas");
    const c = canvas?.getBoundingClientRect();
    return stage && c ? { dw: Math.abs(stage.width - c.width), dh: Math.abs(stage.height - c.height) } : null;
  });
  checks.push([`map canvas fills the stage at ${tag}`, !!fit && fit.dw < 2 && fit.dh < 2]);
  await shot(page, `13-map-after-build-${tag}`);
  await page.context().close();
}

await browser.close();
for (const [name, ok] of checks) console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
for (const b of bad) console.log(`text: ${b}`);
for (const e of errors) console.log(`error: ${e}`);
