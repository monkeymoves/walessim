// Screenshots and checks for board fix 2, package B: stop cards and warnings in the lane beside the
// build menu (never over it, never clipped), Space on a focused button, Waiting against Paused,
// what time does after a card, the tier card naming its builds, the income reason and the keystone
// mark on the time line.
// Usage: BASE=http://127.0.0.1:4521 node design/scripts/board-fix2-b.mjs [en|cy] [1440|1280]
// Saves design/shots-build/board-fix2/B/<name>-<size>-<lang>.png and prints what it checked.
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:4521";
const dir = "design/shots-build/board-fix2/B";
mkdirSync(dir, { recursive: true });
const lang = process.argv[2] ?? "en";
const size = process.argv[3] ?? "1440";
const vp = size === "1280" ? { width: 1280, height: 800 } : { width: 1440, height: 900 };
const tag = `${size}-${lang}`;
const browser = await chromium.launch();
const errors = [];
const notes = [];
const page = await (await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })).newPage();
page.setDefaultTimeout(1500);
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const shot = async (name) => { await page.waitForTimeout(300); await page.screenshot({ path: `${dir}/${name}-${tag}.png` }); };
const has = async (sel) => (await page.locator(sel).count()) > 0;
const text = async (sel) => ((await page.locator(sel).count()) ? ((await page.locator(sel).first().textContent()) ?? "").trim() : "");
const box = async (sel) => ((await page.locator(sel).count()) ? page.locator(sel).first().boundingBox() : null);
const meets = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const inside = (a, b) => a && b && a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.width <= b.x + b.width + 1 && a.y + a.height <= b.y + b.height + 1;
async function lane(label, sel) {
  const card = await box(sel), build = await box(".bw-build"), right = await box(".bw-right .bw-council, .bw-right .bw-region"), stage = await box(".bw-stage");
  const r = `${label}: over build menu ${meets(card, build)} | over council panel ${meets(card, right)} | inside stage ${inside(card, stage)} | card ${JSON.stringify(card)}`;
  notes.push(r);
  if (meets(card, build) || meets(card, right) || !inside(card, stage)) errors.push(`LANE FAIL ${r}`);
}
const pressed = async () => ((await page.getByTestId("bw-play").count()) ? page.getByTestId("bw-play").getAttribute("aria-pressed") : null);

await page.goto(base + "/#/bwrdd");
await page.evaluate((l) => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", l);
  localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
  localStorage.setItem("etifeddiaeth.board.v2.clocktaught", "done");
  const all = { warning: true, keystone: true, tier_open: true, tipping: true, chapter: false, deal_due: true, purse_full: true, finished: true, year: false };
  localStorage.setItem("etifeddiaeth.board.v2.prefs", JSON.stringify({ stepByStep: false, speed: "steady", holdWhileReading: true, stops: all }));
}, lang);
await page.reload();
await page.waitForSelector("[data-testid=bw-go]", { timeout: 30000 });
await page.getByTestId("bw-go").click();
await page.waitForSelector(".bw-board");
await page.waitForTimeout(800);

// Space on a focused button: the clock toggles once, the button is not pressed as well
await page.getByTestId("bw-play").click();
notes.push(`after click Start: pressed ${await pressed()} | status ${await text("[data-testid=bw-clock-status]")}`);
await page.getByTestId("bw-speed-fast").focus();
await page.keyboard.press(" ");
await page.waitForTimeout(200);
notes.push(`Space on the Fast button: pressed ${await pressed()} (want false) | fast checked ${await page.getByTestId("bw-speed-fast").getAttribute("aria-checked")} (want false) | status ${await text("[data-testid=bw-clock-status]")}`);
if ((await pressed()) !== "false") errors.push("Space on a focused speed button did not pause");
if ((await page.getByTestId("bw-speed-fast").getAttribute("aria-checked")) === "true") errors.push("Space pressed the focused speed button too");
await shot("01-paused-by-you");
await page.getByTestId("bw-play").focus();
await page.keyboard.press(" ");
await page.waitForTimeout(200);
notes.push(`Space on the Play button: pressed ${await pressed()} (want true)`);
if ((await pressed()) !== "true") errors.push("Space on the focused Play button did not toggle exactly once");
await page.getByTestId("bw-speed-fast").click();

// a council and its build menu, then time runs until a card comes: the build menu is opened under it
await page.locator(".bw-league-row").first().click();
await page.waitForTimeout(300);
let gotCard = false;
for (let i = 0; i < 240 && !gotCard; i++) {
  await page.waitForTimeout(250);
  if (await has("[data-testid=bw-respond]")) { await page.getByTestId("bw-respond-pick").first().click().catch(() => undefined); continue; }
  if (await has("[data-testid=bw-term]")) {
    const deal = page.getByTestId("bw-deal");
    if (await deal.count()) await deal.first().click().catch(() => undefined);
    await page.getByTestId("bw-term-on").click().catch(() => undefined);
    continue;
  }
  if (await has("[data-testid=bw-stop]")) gotCard = true;
  if (!(await has("[data-testid=bw-stop]")) && (await pressed()) === "false") await page.getByTestId("bw-play").click().catch(() => undefined);
}
notes.push(`card: ${await text("[data-testid=bw-stop]")}`);
notes.push(`status with a card: ${await text("[data-testid=bw-clock-status]")} | button ${await text("[data-testid=bw-play]")}`);
await shot("02-card");
if (!(await has(".bw-council"))) await page.locator(".bw-league-row").first().click().catch(() => undefined);
await page.getByTestId("bw-build-here").click().catch(() => undefined);
await page.waitForTimeout(400);
await shot("03-card-and-build-menu");
await lane("stop card beside build menu", "[data-testid=bw-stop]");
const face = page.locator(".bw-ticket:not(.locked) .bw-ticket-face");
if (await face.count()) { await face.first().click(); await page.waitForTimeout(300); }
const buildIt = await box("[data-testid=bw-build-it]");
notes.push(`Build it button: ${JSON.stringify(buildIt)} | under the card ${meets(buildIt, await box("[data-testid=bw-stop]"))}`);
if (meets(buildIt, await box("[data-testid=bw-stop]"))) errors.push("the card covers Build it");
await shot("03b-card-and-build-it");

// cards one at a time: read each, note the counter and what time will do
for (let i = 0; i < 12 && (await has("[data-testid=bw-stop]")); i++) {
  notes.push(`card ${i}: ${await text("[data-testid=bw-stop]")}`);
  if (await has("[data-testid=bw-stop-opened]")) { await shot(`04-tier-card-${i}`); }
  if (await has("[data-testid=bw-stop-window]")) { await shot(`05-warning-card-${i}`); await lane("warning card", "[data-testid=bw-stop]"); }
  await page.getByTestId("bw-stop-on").click();
  await page.waitForTimeout(250);
}

// a warning from the time line while the build menu is open
const warn = page.locator(".bw-tl-warning").first();
if (await warn.count()) {
  await warn.click().catch(() => undefined);
  await page.waitForTimeout(300);
  if (await has("[data-testid=bw-warning]")) {
    await shot("06-warning-slip-and-build-menu");
    await lane("warning slip beside build menu", "[data-testid=bw-warning]");
    notes.push(`warning slip: ${await text("[data-testid=bw-warning]")}`);
    await page.keyboard.press("Escape");
  }
}

// run on, reading cards, to see the income reason and the keystone mark
await page.keyboard.press("Escape");
await page.locator(".bw-council .btn-close").first().click().catch(() => undefined);
let seenTier = await has("[data-testid=bw-stop-opened]");
let seenWhy = "";
for (let i = 0; i < 900; i++) {
  await page.waitForTimeout(100);
  if (await has("[data-testid=bw-end]")) break;
  if (await has("[data-testid=bw-respond]")) { await page.getByTestId("bw-respond-pick").first().click().catch(() => undefined); continue; }
  if (await has("[data-testid=bw-term]")) {
    const deal = page.getByTestId("bw-deal");
    if (await deal.count()) await deal.first().click().catch(() => undefined);
    await page.getByTestId("bw-term-on").click().catch(() => undefined);
    continue;
  }
  if (await has("[data-testid=bw-stop]")) {
    if (!seenTier && (await has("[data-testid=bw-stop-opened]"))) { seenTier = true; await shot("07-tier-card"); notes.push(`tier card: ${await text("[data-testid=bw-stop]")}`); }
    await page.getByTestId("bw-stop-on").click().catch(() => undefined);
    continue;
  }
  const why = await text("[data-testid=bw-coins-why]");
  if (why && !seenWhy) { seenWhy = why; await shot("08-income-why"); notes.push(`income reason: ${why} | note ${await text("[data-testid=bw-coins-note]")}`); }
  // build something now and then, so the purse empties and costs come in
  if (i % 20 === 5) {
    await page.locator(".bw-league-row").nth(i % 10).click().catch(() => undefined);
    await page.getByTestId("bw-build-here").click().catch(() => undefined);
    const t = page.locator(".bw-ticket:not(.locked) .bw-ticket-face");
    if (await t.count()) { await t.first().click().catch(() => undefined); await page.getByTestId("bw-build-it").click().catch(() => undefined); }
    await page.keyboard.press("Escape");
    await page.locator(".bw-council .btn-close").first().click().catch(() => undefined);
  }
  if ((await pressed()) === "false") await page.getByTestId("bw-play").click().catch(() => undefined);
  if (seenWhy && seenTier) break;
}
await page.getByTestId("bw-play").click().catch(() => undefined);
await shot("09-timeline");
const mark = page.locator(".bw-tl-mark-keystone_last_start");
notes.push(`keystone mark: ${await text(".bw-tl-mark-keystone_last_start span")} | tip ${(await mark.count()) ? await mark.first().getAttribute("title") : "none"}`);
console.log(notes.join("\n"));
console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no errors");
await browser.close();
