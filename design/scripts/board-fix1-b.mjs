// Screenshots for board fix 1, package B: the title, the start, the guide, Start time, the clock
// lesson, Held, pause after an answer, the purse warning and the headline's movement.
// Usage: BASE=http://127.0.0.1:4317 node design/scripts/board-fix1-b.mjs [lang] [size]
// Saves design/shots-build/board-fix1/B/<name>-<size>-<lang>.png and prints what it checked.
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:4317";
const dir = "design/shots-build/board-fix1/B";
mkdirSync(dir, { recursive: true });
const lang = process.argv[2] ?? "en";
const size = process.argv[3] ?? "1440";
const vp = size === "1280" ? { width: 1280, height: 800 } : { width: 1440, height: 900 };
const tag = `${size}-${lang}`;
const browser = await chromium.launch();
const errors = [];
const notes = [];
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(5000);
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => (m.type() === "error" || (m.type() === "warning" && /missing key/.test(m.text()))) && errors.push(m.text()));
const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: `${dir}/${name}-${tag}.png` }); };
const has = async (sel) => (await page.locator(sel).count()) > 0;
const text = async (sel) => ((await page.locator(sel).first().textContent().catch(() => "")) ?? "").trim();
const click = async (sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(300); };
const blur = () => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));

await page.goto(base + "/#/");
await page.evaluate((l) => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", l);
}, lang);
await page.reload();
await page.waitForSelector(".title-ways", { timeout: 20000 });
await page.waitForTimeout(1500);
await shot("01-title");
await click('[data-testid="way-bwrdd"]');
await page.waitForSelector(".bw-start-sheet", { timeout: 20000 });
await page.waitForTimeout(1200);
await shot("02-start");
const startNumber = /(\d{4})/.exec(await text(".bw-start-go .small"))?.[1];
await click('[data-testid="bw-go"]');
await page.waitForSelector(".bw-board");
await page.waitForTimeout(1500);
await shot("03-board-fresh");
notes.push(`fresh button: ${await text('[data-testid="bw-play"]')} | status: ${await text('[data-testid="bw-clock-status"]')}`);
// Got it on the map note with no council open: the council note must not talk about bars
await click('[data-testid="bw-guide"] .btn');
await shot("04-gotit-no-council");
notes.push(`after Got it with no council: guide shown = ${await has('[data-testid="bw-guide"]')}`);
await page.locator(".bw-league-row").first().click();
await page.waitForTimeout(700);
await shot("05-council-note");
await click('[data-testid="bw-build-here"]');
const face = page.locator(".bw-ticket:not(.locked) .bw-ticket-face");
await face.nth(1).hover();
await page.waitForTimeout(500);
await shot("06-build-hover");
notes.push(`hover: coins note = ${await text('[data-testid="bw-coins-note"]')} | headline = ${await text('[data-testid="bw-score-left"]')}`);
await face.nth(1).click();
await click('[data-testid="bw-build-it"]');
await page.waitForTimeout(500);
await shot("07-after-build");
notes.push(`after build, menu open: coins note = ${await text('[data-testid="bw-coins-note"]')}`);
// close the council while the build menu is open: the menu goes too, nothing holds the clock
await page.locator(".bw-council .btn-close").first().click().catch(() => undefined);
await page.waitForTimeout(400);
notes.push(`council closed: build menu shown = ${await has(".bw-build")} | coins note = ${await text('[data-testid="bw-coins-note"]')}`);
await shot("08-council-closed");
// Start time: the lesson on pause and speed
await click('[data-testid="bw-play"]');
await page.waitForTimeout(1200);
await shot("09-running-lesson");
notes.push(`running: button = ${await text('[data-testid="bw-play"]')} | lesson = ${await has('[data-testid="bw-clock-lesson"]')} | status = ${await text('[data-testid="bw-clock-status"]')}`);
// open the branches while running: Held, and why
await click(".bw-right .btn-tab >> nth=0").catch(() => undefined);
await page.waitForTimeout(500);
await shot("10-held-reading");
notes.push(`reading: button = ${await text('[data-testid="bw-play"]')} (${await page.locator('[data-testid="bw-play"]').getAttribute("data-face")}) | status = ${await text('[data-testid="bw-clock-status"]')}`);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
notes.push(`closed: button = ${await text('[data-testid="bw-play"]')} | status = ${await text('[data-testid="bw-clock-status"]')}`);
// the lesson goes when the player pauses
await blur();
await page.keyboard.press("Space");
await page.waitForTimeout(300);
notes.push(`paused by Space: lesson = ${await has('[data-testid="bw-clock-lesson"]')} | status = ${await text('[data-testid="bw-clock-status"]')}`);
await shot("11-paused");
// run fast with no building, answering events, until the purse warns and fills
await page.keyboard.press("3");
await page.keyboard.press("Space");
let answered = false;
let soonShot = false;
let fullShot = false;
for (let i = 0; i < 400 && !(soonShot && fullShot && answered); i++) {
  if (await has('[data-testid="bw-respond"]')) {
    const b = page.locator('[data-testid="bw-respond-pick"]:not([disabled])');
    if (!answered) await shot("12-respond-held");
    if (await b.count()) await b.first().click();
    await page.waitForTimeout(400);
    if (!answered) {
      answered = true;
      notes.push(`after answer: button = ${await text('[data-testid="bw-play"]')} | pressed = ${await page.locator('[data-testid="bw-play"]').getAttribute("aria-pressed")} | status = ${await text('[data-testid="bw-clock-status"]')}`);
      await shot("13-after-answer");
    }
    await blur();
    await page.keyboard.press("Space");
    continue;
  }
  if (await has('[data-testid="bw-term"]')) {
    if (await has('[data-testid="bw-deal"]:not([disabled])')) await click('[data-testid="bw-deal"]:not([disabled])');
    await click('[data-testid="bw-term-on"]');
    continue;
  }
  if (await has('[data-testid="bw-stop"]')) {
    const cls = (await page.locator('[data-testid="bw-stop"]').getAttribute("class")) ?? "";
    if (/purse_full/.test(cls) && !fullShot) { fullShot = true; await shot("15-purse-full-stop"); notes.push(`purse full: ${await text('[data-testid="bw-coins"]')}`); }
    await blur();
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
    continue;
  }
  const kind = await page.locator(".bw-coins").getAttribute("class");
  if (/soon/.test(kind ?? "") && !soonShot) { soonShot = true; await shot("14-purse-soon"); notes.push(`purse soon: ${await text('[data-testid="bw-coins"]')}`); }
  if (/full/.test(kind ?? "") && !fullShot) { fullShot = true; await shot("15-purse-full"); notes.push(`purse full: ${await text('[data-testid="bw-coins"]')}`); }
  const pressed = await page.locator('[data-testid="bw-play"]').getAttribute("aria-pressed");
  if (pressed === "false") { await blur(); await page.keyboard.press("Space"); }
  await page.waitForTimeout(300);
}
notes.push(`headline later: ${await text('[data-testid="bw-score-left"]')}`);
await shot("16-later");
notes.push(`start screen number: ${startNumber}`);
console.log(notes.join("\n"));
console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
