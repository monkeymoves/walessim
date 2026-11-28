// The join after fix round 1 (playtest 8): one full board game in English as a first-time player
// would play it: from the title page, on the clock at the default speed (not step by step), with a
// screenshot of every screen type in design/shots-build/board-fix1/join/ and a read of every
// screen's text for raw decimals, raw keys, empty slots and doubled words.
// Usage: BASE=http://127.0.0.1:4321 node design/scripts/board-fix1-join.mjs
import { mkdirSync } from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:4321";
const out = "design/shots-build/board-fix1/join";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const taken = new Set();
const shot = async (name, full = false) => { if (taken.has(name)) return; taken.add(name); await page.screenshot({ path: `${out}/${name}.png`, fullPage: full }); };
const visible = (id) => page.getByTestId(id).first().isVisible().catch(() => false);
const t0 = Date.now();
const log = (s) => console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s ${s}`);

// text faults a reader would trip on
const faults = new Map();
async function scan(where) {
  const text = await page.locator("body").innerText().catch(() => "");
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    const f = [];
    if (/\d\.\d{2,}/.test(s) && !/\d\.\d{2,}\.\d/.test(s)) f.push("raw decimal");
    if (/\{\w+\}|undefined|NaN|\bboard(ui|end|clock)?\.[a-z]/.test(s)) f.push("raw key or empty slot");
    if (/\b(\w{3,}) \1\b/i.test(s)) f.push("doubled word");
    if (/\s[.,]|\s{2,}/.test(s)) f.push("gap in sentence");
    if (/[a-z] (The|A) [a-z]+ [a-z]/.test(s) && /: (The|A) |to (The|A) |of (The|A) /.test(s)) f.push("title in a sentence");
    if (/[\u2013\u2014]/.test(s)) f.push("dash");
    for (const x of f) { const k = `${x}: ${s.slice(0, 160)}`; if (!faults.has(k)) faults.set(k, where); }
  }
}

// a first-time player: no board save, English
await page.goto(base + "/#/");
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", "en");
});
await page.reload();
await page.waitForTimeout(1200);
await scan("title"); await shot("00-title");
await page.getByTestId("way-bwrdd").click();
await page.waitForSelector("[data-testid=bw-go]", { timeout: 30000 });
await page.waitForTimeout(600);
await scan("start"); await shot("01-start");
await page.getByTestId("bw-go").first().click();
await page.waitForSelector("[data-testid=bw-clock]", { timeout: 20000 });
await page.waitForTimeout(900);
await scan("board"); await shot("02-board-first");

async function openCouncil(name) {
  if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
  const row = typeof name === "number" ? page.locator(".bw-league-row").nth(name) : page.locator(".bw-league-row", { hasText: name }).first();
  await row.click().catch(() => undefined);
  await page.waitForTimeout(400);
}

// the first build, as the guide asks: a council, Build, point at a project, build it
await openCouncil("Merthyr");
await scan("council"); await shot("03-council-guide");
await page.getByTestId("bw-build-here").click().catch(() => undefined);
await page.waitForTimeout(400);
await scan("build"); await shot("04-build-menu");
const first = page.locator("[data-testid^=bw-opt-]").first();
await first.hover().catch(() => undefined); await page.waitForTimeout(300);
await first.click().catch(() => undefined); await page.waitForTimeout(400);
await scan("preview"); await shot("05-build-preview");
await page.locator("[data-testid=bw-build-it]:not([disabled])").first().click().catch(() => undefined);
await page.waitForTimeout(400);
await scan("after build"); await shot("06-after-build");
await page.keyboard.press("Escape");
log("first build done");

// start time, read the clock lesson, and leave it at the default speed
await page.getByTestId("bw-play").click();
await page.waitForTimeout(1500);
await scan("lesson"); await shot("07-clock-lesson");
await page.getByTestId("bw-clock-lesson").getByRole("button").click().catch(() => undefined);

const year = async () => Number(((await page.getByTestId("bw-year").textContent().catch(() => "")) ?? "").replace(/\D/g, "").slice(0, 4));
const councils = ["Newport", "Rhondda", "Caerphilly", "Blaenau", "Bridgend", "Torfaen", "Vale", "Cardiff", "Monmouth", "Merthyr"];
let lastYear = 0, ci = 0, built = 1, extras = false;

/** Spend coins as a careful player: the council furthest down the list, the dearest project it can afford. */
async function buildSomewhere(shots) {
  await openCouncil(councils[ci++ % councils.length]);
  if (shots) { await scan("council running"); await shot("20-council-running"); }
  if (!(await visible("bw-build-here"))) { await page.keyboard.press("Escape"); return; }
  await page.getByTestId("bw-build-here").click().catch(() => undefined);
  await page.waitForTimeout(250);
  if (shots) { await scan("held by build"); await shot("21-build-held"); }
  const opts = page.locator("[data-testid^=bw-opt-]");
  const n = await opts.count();
  for (let k = n - 1; k >= 0; k--) {
    await opts.nth(k).click({ timeout: 1200 }).catch(() => undefined);
    const go = page.locator("[data-testid=bw-build-it]:not([disabled])");
    if (await go.count()) { await go.first().click().catch(() => undefined); built++; break; }
  }
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

for (let guard = 0; guard < 20000; guard++) {
  if (await visible("bw-end")) break;
  if (await visible("bp-visit")) {
    await scan("visit"); await shot("30-visit");
    const opt = page.locator("[data-testid^=bp-opt-], [data-testid=bp-tip]");
    if (await opt.count()) await opt.first().click().catch(() => undefined);
    await shot("31-visit-picked");
    const choose = page.locator("[data-testid=bp-choose]:not([disabled])");
    if (await choose.count()) {
      await choose.first().click().catch(() => undefined); await page.waitForTimeout(300);
      await scan("visit result"); await shot("32-visit-result");
      await page.getByTestId("bp-done").click().catch(() => page.keyboard.press("Escape"));
    } else await page.getByTestId("bp-leave").click().catch(() => page.keyboard.press("Escape"));
    continue;
  }
  if (await visible("bw-stop")) {
    const cls = (await page.getByTestId("bw-stop").getAttribute("class")) ?? "";
    const k = /bw-stop-([a-z_]+)/.exec(cls)?.[1] ?? "x";
    await scan(`stop ${k}`); await shot(`40-stop-${k}`);
    log(`stop ${k}`);
    if (k === "visit" && (await page.getByTestId("bw-stop-visit").isEnabled().catch(() => false))) { await page.getByTestId("bw-stop-visit").click(); await page.waitForTimeout(400); continue; }
    if (k === "warning" && !taken.has("41-warning-look")) {
      await page.getByTestId("bw-stop-look").click().catch(() => undefined); await page.waitForTimeout(500);
      await scan("look"); await shot("41-warning-look"); await page.keyboard.press("Escape");
      await page.waitForTimeout(300); await shot("42-after-look");
      continue;
    }
    await page.getByTestId("bw-stop-on").click().catch(() => undefined);
    await page.waitForTimeout(200);
    continue;
  }
  if (await visible("bw-respond")) {
    await scan("respond"); await shot("43-respond");
    const p = page.locator("[data-testid=bw-respond-pick]:not([disabled])");
    await p.nth(Math.max(0, (await p.count()) - 1)).click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    await scan("after respond"); await shot("44-after-respond");
    log("responded");
    // the clock stays paused after an answer: the player presses play again
    if (await page.getByTestId("bw-play").getAttribute("aria-pressed").catch(() => null) === "false") await page.getByTestId("bw-play").click().catch(() => undefined);
    continue;
  }
  if (await visible("bw-term")) {
    const y = await year();
    await scan(`term ${y}`); await shot(`50-term-${y}`);
    log(`term ${y}`);
    if (await visible("bw-election")) { await page.getByTestId("bw-election").scrollIntoViewIfNeeded().catch(() => undefined); await scan("election"); await shot(`51-election-${y}`); }
    if (await visible("bw-deals")) { await page.getByTestId("bw-deals").scrollIntoViewIfNeeded().catch(() => undefined); await scan("deals"); await shot("52-deal"); await page.locator("[data-testid=bw-deal]:not([disabled])").first().click().catch(() => undefined); }
    await page.getByTestId("bw-term-on").click().catch(() => undefined);
    await page.waitForTimeout(300);
    if (await page.getByTestId("bw-play").getAttribute("aria-pressed").catch(() => null) === "false") await page.getByTestId("bw-play").click().catch(() => undefined);
    continue;
  }
  const y = await year();
  if (y && y !== lastYear) {
    lastYear = y;
    log(`year ${y}`);
    await scan(`board ${y}`);
    if (y === 2028 || y === 2031 || y === 2036 || y === 2044 || y === 2049) await shot(`60-board-${y}`);
    if (y % 2 === 0) await buildSomewhere(y === 2028);
    if (y >= 2031 && !extras) {
      extras = true;
      await openCouncil("Newport");
      await scan("council 2031"); await shot("61-council-2031");
      const why = page.locator("[data-testid=bw-council] .bw-why").first();
      if (await why.count()) { await why.click(); await page.waitForTimeout(500); await scan("why"); await shot("62-why"); await page.keyboard.press("Escape"); }
      await page.keyboard.press("Escape");
      if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
      await scan("region"); await shot("63-region");
      await page.getByTestId("bw-tree-open").click().catch(() => undefined); await page.waitForTimeout(400); await scan("tree"); await shot("64-tree"); await page.keyboard.press("Escape");
      await page.getByText("Laws for the whole region").first().click().catch(() => undefined); await page.waitForTimeout(400); await scan("laws"); await shot("65-laws"); await page.keyboard.press("Escape");
      await page.getByTestId("bw-settings-open").click().catch(() => undefined); await page.waitForTimeout(300); await scan("settings"); await shot("66-settings"); await page.keyboard.press("Escape");
      await page.locator("[data-testid=bw-timeline]").hover().catch(() => undefined); await page.waitForTimeout(300); await shot("67-timeline-hover");
      // pause by the space bar, as the lesson says
      await page.locator("body").click({ position: { x: 5, y: 450 } }).catch(() => undefined);
      await page.keyboard.press("Space"); await page.waitForTimeout(400); await scan("paused"); await shot("68-paused");
      await page.keyboard.press("Space");
    }
  }
  // nothing open and the clock paused (after Look, say): the player reads, then presses Play
  if ((await page.getByTestId("bw-play").getAttribute("aria-pressed").catch(() => null)) === "false" && /Play/.test((await page.getByTestId("bw-play").textContent().catch(() => "")) ?? "")) {
    if (!taken.has("45-paused-nothing-open")) { await scan("paused"); await shot("45-paused-nothing-open"); }
    await page.waitForTimeout(1500);
    await page.getByTestId("bw-play").click().catch(() => undefined);
  }
  await page.waitForTimeout(250);
}
log(`end, ${built} builds`);

await page.waitForSelector("[data-testid=bw-end]", { timeout: 30000 }).catch(() => undefined);
await page.waitForTimeout(1000);
await scan("end opening"); await shot("70-end-open");
await page.getByTestId("be-lapse-skip").click().catch(() => undefined);
await page.waitForTimeout(400);
await page.getByTestId("be-count-open").click().catch(() => undefined);
await page.waitForTimeout(500);
await scan("end");
const sections = ["be-verdict", "be-record", "be-turns", "be-lapse", "be-name", "be-chapters", "be-thennow", "be-letter", "be-notbuilt", "be-count", "be-found", "be-run"];
let i = 0;
for (const id of sections) {
  if (!(await visible(id))) continue;
  await page.getByTestId(id).first().scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(250);
  await shot(`71-end-${String(i++).padStart(2, "0")}-${id}`);
}
await shot("79-end-full", true);

console.log(`shots: ${taken.size} in ${out}`);
console.log(faults.size ? "FAULTS:\n" + [...faults].map(([k, w]) => `${w} | ${k}`).join("\n") : "no text faults found");
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();
