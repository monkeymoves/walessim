// The join after fix round 2 (playtest 9): one full board game in English as a first-time player
// would play it, from the title page, on the clock at the default speed. Two players:
// - careful: reads every card, builds every year, works one branch up to its keystone, keeps deals;
// - careless: builds now and then, takes the first answer, passes a law at once, ignores deals.
// A screenshot of every screen type goes to design/shots-build/board-fix2/join/<mode>-*.png, and
// every screen's text is read for raw decimals, raw keys, empty slots, doubled words, dashes,
// signed zeros and a page wider than the window. It prints each election's result.
// Usage: BASE=http://127.0.0.1:4321 node design/scripts/board-fix2-join.mjs careful|careless
import { mkdirSync } from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:4321";
const mode = process.argv[2] === "careless" ? "careless" : "careful";
const out = "design/shots-build/board-fix2/join";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const taken = new Set();
const shot = async (name, full = false) => { if (taken.has(name)) return; taken.add(name); await page.screenshot({ path: `${out}/${mode}-${name}.png`, fullPage: full }); };
const visible = (id) => page.getByTestId(id).first().isVisible().catch(() => false);
const t0 = Date.now();
const log = (s) => console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s ${s}`);

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
    if (/[\u2013\u2014]/.test(s)) f.push("dash");
    if (/(^|[^\d.,])[+\-−]0(?![.,]\d*[1-9])(\b|$)/.test(s)) f.push("signed zero");
    if (/need:[a-z_]+:\d|\b[a-z]+_[a-z_]+\b/.test(s)) f.push("raw id");
    if (/\b(in|of|to|for|from) Vale of Glamorgan/.test(s)) f.push("no article");
    if (/COST\b|Carreg glo|carreg glo/.test(s)) f.push("old word");
    for (const x of f) { const k = `${x}: ${s.slice(0, 170)}`; if (!faults.has(k)) faults.set(k, where); }
  }
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0);
  if (wide > 1) faults.set(`page wider than the window by ${wide}px`, where);
}

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
  const row = page.locator(".bw-league-row", { hasText: name }).first();
  await row.click().catch(() => undefined);
  await page.waitForTimeout(350);
}
const closeAll = async () => { for (let i = 0; i < 3; i++) await page.keyboard.press("Escape"); };

// The careful player works the landscape branch up to its keystone, then the homes branch.
const PREFER = ["rivers-room", "heat-and-homes", "valleys-park", "health-hub", "farms-hold-water", "homes-pay-bills", "slow-the-water", "coal-tips-safe", "coast-wetlands", "warm-terraces", "social-homes", "welsh-school", "repairs-team"];
const LAW_PASS = /^Pass/;
const VALLEYS = ["Merthyr", "Rhondda", "Blaenau", "Caerphilly", "Torfaen", "Bridgend", "Newport", "Cardiff", "Vale", "Monmouth"];
let ci = 0, built = 0, dealCouncil = null, dealMeasure = null;
const FOR_MEASURE = { "Welsh and culture": ["welsh-school"], "Nature and floods": ["slow-the-water", "coast-wetlands", "coal-tips-safe"], Health: ["repairs-team", "warm-terraces", "health-hub"], "Homes and community": ["social-homes", "warm-terraces"], "Work and pay": ["back-local-firms", "skills-college"], Climate: ["warm-terraces", "slow-the-water"] };
const elections = [];

async function tryBuild(council, careful, shots) {
  await openCouncil(council);
  if (shots) { await scan("council"); await shot("20-council"); }
  if (!(await visible("bw-build-here"))) { await closeAll(); return false; }
  await page.getByTestId("bw-build-here").click().catch(() => undefined);
  await page.waitForTimeout(300);
  if (shots) { await scan("build menu"); await shot("21-build-menu"); }
  // a new project, not "make it bigger" on one already here (a careful player spreads)
  const ids = await page.locator("li.bw-ticket:not(.upgrade) [data-testid^=bw-opt-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").slice(7)));
  const want = careful && dealCouncil === council && dealMeasure ? (FOR_MEASURE[dealMeasure] ?? []) : [];
  const order = careful ? [...want.filter((p) => ids.includes(p)), ...PREFER.filter((p) => ids.includes(p) && !want.includes(p)), ...ids.filter((p) => !PREFER.includes(p) && !want.includes(p))] : ids;
  for (const id of order) {
    const face = page.getByTestId(`bw-opt-${id}`).first();
    await face.click({ timeout: 1200 }).catch(() => undefined);
    await page.waitForTimeout(250);
    if (shots && !taken.has("22-build-opened")) { await scan("ticket"); await shot("22-build-opened"); }
    const go = page.locator("[data-testid=bw-build-it]:not([disabled])");
    if (await go.count()) {
      if (shots) { await scan("preview"); await shot("23-build-preview"); }
      await go.first().click().catch(() => undefined);
      built++;
      log(`built ${id} in ${council}`);
      await page.waitForTimeout(300);
      if (shots) { await scan("after build"); await shot("24-after-build"); }
      await closeAll();
      return true;
    }
    // a locked card: read why, once, then close it
    if (shots && !taken.has("25-locked")) { await scan("locked"); await shot("25-locked"); }
    await face.click({ timeout: 800 }).catch(() => undefined);
  }
  await closeAll();
  return false;
}

// the first build, as the guide asks
await tryBuild("Merthyr", mode === "careful", true);
await page.getByTestId("bw-play").click();
await page.waitForTimeout(1500);
await scan("lesson"); await shot("07-clock-lesson");
await page.getByTestId("bw-clock-lesson").getByRole("button").first().click().catch(() => undefined);

const year = async () => Number(((await page.getByTestId("bw-year").textContent().catch(() => "")) ?? "").replace(/\D/g, "").slice(0, 4));
let lastYear = 0, extras = false, lawDone = false, stuckSince = Date.now();
const play = async () => {
  if ((await page.getByTestId("bw-play").getAttribute("aria-pressed").catch(() => null)) === "false" && (await page.getByTestId("bw-play").isEnabled().catch(() => false))) await page.getByTestId("bw-play").click().catch(() => undefined);
};

for (let guard = 0; guard < 30000; guard++) {
  if (await visible("bw-end")) break;
  if (await visible("bp-visit")) {
    await scan("visit"); await shot("30-visit");
    const opt = page.locator("[data-testid^=bp-opt-], [data-testid=bp-tip]");
    if (await opt.count()) await opt.nth(mode === "careful" ? 0 : (await opt.count()) - 1).click().catch(() => undefined);
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
    if (mode === "careful") await page.waitForTimeout(1500);
    if (k === "visit" && mode === "careful" && (await page.getByTestId("bw-stop-visit").isEnabled().catch(() => false))) { await page.getByTestId("bw-stop-visit").click(); await page.waitForTimeout(400); continue; }
    if (k === "warning" && !taken.has("41-warning-look")) {
      await page.getByTestId("bw-stop-look").click().catch(() => undefined); await page.waitForTimeout(500);
      await scan("look"); await shot("41-warning-look"); await closeAll();
      await page.waitForTimeout(300); await shot("42-after-look"); await play();
      continue;
    }
    const all = page.getByTestId("bw-stop-all");
    if (mode === "careless" && (await all.count()) && (await all.isVisible().catch(() => false))) await all.click().catch(() => undefined);
    else await page.getByTestId("bw-stop-on").click().catch(() => undefined);
    await page.waitForTimeout(200);
    continue;
  }
  if (await visible("bw-respond")) {
    await scan("respond"); await shot("43-respond");
    if (mode === "careful") await page.waitForTimeout(2000);
    const p = page.locator("[data-testid=bw-respond-pick]:not([disabled])");
    const n = await p.count();
    await p.nth(mode === "careful" ? Math.max(0, n - 1) : 0).click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    await scan("after respond"); await shot("44-after-respond");
    continue;
  }
  if (await visible("bw-term")) {
    const y = await year();
    await scan(`term ${y}`); await shot(`50-term-${y}`);
    const result = (await page.locator("#bw-election-title").textContent().catch(() => "")) ?? "";
    const count = (await page.locator(".bw-election-count").textContent().catch(() => "")) ?? "";
    if (result) { elections.push(`${result.trim()} (${count.trim().slice(0, 60)})`); log(`election: ${result.trim()}`); }
    if (await visible("bw-term-more")) { await shot(`51-term-more-${y}`); await page.getByTestId("bw-term-more").click().catch(() => undefined); await page.waitForTimeout(600); await shot(`52-term-scrolled-${y}`); }
    if (await visible("bw-deal")) {
      await scan("deal"); await shot("53-deal");
      const deal = page.locator("[data-testid=bw-deal]:not([disabled])").first();
      const text = (await deal.textContent().catch(() => "")) ?? "";
      dealCouncil = VALLEYS.find((c) => text.includes(c)) ?? null;
      dealMeasure = Object.keys(FOR_MEASURE).find((m) => text.includes(m)) ?? null;
      await deal.click().catch(() => undefined);
      log(`deal: ${text.trim().slice(0, 80)}`);
    }
    await page.getByTestId("bw-term-on").click().catch(() => undefined);
    await page.waitForTimeout(300);
    await play();
    continue;
  }
  const y = await year();
  if (y !== lastYear) stuckSince = Date.now();
  else if (Date.now() - stuckSince > 90000) {
    stuckSince = Date.now();
    await shot(`99-stuck-${y}-${guard}`); log(`no new year for 90 s at ${y}: ${(await page.getByTestId("bw-clock-status").textContent().catch(() => "?"))}`);
  }
  if (y && y !== lastYear) {
    lastYear = y;
    await scan(`board ${y}`);
    if ([2028, 2033, 2040, 2045, 2049].includes(y)) await shot(`60-board-${y}`);
    if (mode === "careless" && !lawDone && y >= 2027) {
      lawDone = true;
      if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
      await page.getByText("Laws for the whole region").first().click().catch(() => undefined); await page.waitForTimeout(400);
      await scan("laws"); await shot("65-laws");
      const pass = page.getByRole("button", { name: LAW_PASS });
      if (await pass.count()) { await pass.first().click().catch(() => undefined); await page.waitForTimeout(400); await scan("law passed"); await shot("66-law-passed"); log("passed a law"); }
      await closeAll(); await play();
    }
    const buildNow = mode === "careful" ? true : y % 3 === 0;
    if (buildNow) {
      const turn = [...VALLEYS.slice(ci % VALLEYS.length), ...VALLEYS.slice(0, ci % VALLEYS.length)];
      ci++;
      const tries = mode === "careful" ? (dealCouncil ? [dealCouncil, ...turn] : turn) : [VALLEYS[((ci - 1) * 7) % VALLEYS.length]];
      for (const c of tries.slice(0, mode === "careful" ? 4 : 1)) if (await tryBuild(c, mode === "careful", y === 2028)) break;
      await play();
    }
    if (y >= 2031 && !extras) {
      extras = true;
      await openCouncil("Newport");
      await scan("council 2031"); await shot("61-council-2031");
      const why = page.locator("[data-testid=bw-council] .bw-why").first();
      if (await why.count()) { await why.click(); await page.waitForTimeout(500); await scan("why"); await shot("62-why"); await closeAll(); }
      if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
      await scan("region"); await shot("63-region");
      await page.getByTestId("bw-tree-open").click().catch(() => undefined); await page.waitForTimeout(400); await scan("tree"); await shot("64-tree"); await closeAll();
      if (mode === "careful") { await page.getByText("Laws for the whole region").first().click().catch(() => undefined); await page.waitForTimeout(400); await scan("laws"); await shot("65-laws"); await closeAll(); }
      await page.getByTestId("bw-settings-open").click().catch(() => undefined); await page.waitForTimeout(300); await scan("settings"); await shot("67-settings"); await closeAll();
      await page.locator("[data-testid=bw-timeline]").hover().catch(() => undefined); await page.waitForTimeout(300); await shot("68-timeline-hover");
      // pause by the space bar with a button focused, as the lesson says
      await page.getByTestId("bw-play").focus().catch(() => undefined);
      await page.keyboard.press("Space"); await page.waitForTimeout(400); await scan("paused"); await shot("69-space-paused");
      await play();
    }
  }
  await play();
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
const endText = await page.locator("[data-testid=bw-end]").innerText().catch(() => "");

console.log(`mode ${mode}: ${built} builds, shots ${taken.size} in ${out}`);
console.log("ELECTIONS:\n" + elections.join("\n"));
console.log("END TEXT:\n" + endText.slice(0, 6000));
console.log(faults.size ? "FAULTS:\n" + [...faults].map(([k, w]) => `${w} | ${k}`).join("\n") : "no text faults found");
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();
