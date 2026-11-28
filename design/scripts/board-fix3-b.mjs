// Board fix round 3, package B: the clock, the lane, the cards and the keys, played at 1280 x 800
// (or W x H), shots into design/shots-build/board-fix3/B/. Prints what it checked.
// Usage: BASE=http://localhost:4391 W=1280 H=800 node design/scripts/board-fix3-b.mjs
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:4391";
const W = +(process.env.W ?? 1280), H = +(process.env.H ?? 800);
const out = `design/shots-build/board-fix3/B/${W}`;
mkdirSync(out, { recursive: true });
const KEY = "etifeddiaeth.board.v2.";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const errors = [];
page.on("pageerror", (e) => { errors.push(String(e)); console.log("PAGE ERROR", String(e)); });
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text()); });
const log = (...a) => console.log(...a);
const shot = async (name) => page.screenshot({ path: `${out}/${name}.png` });
const box = async (sel) => (await page.locator(sel).first().count()) ? page.locator(sel).first().boundingBox() : null;
const meets = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

await page.goto(base + "/#/bwrdd");
await page.evaluate((key) => {
  for (const k of ["run", "prefs", "clocktaught"]) localStorage.removeItem(key + k);
  localStorage.setItem(key + "guide", "done");
  localStorage.setItem("etifeddiaeth.v1.lang", "en");
  const stops = { warning: true, keystone: true, tier_open: true, tipping: true, visit: true, chapter: false, deal_due: true, purse_full: true, finished: false, year: false };
  localStorage.setItem(key + "prefs", JSON.stringify({ stepByStep: false, speed: "fast", holdWhileReading: true, stops }));
}, KEY);
await page.reload();
await page.getByTestId("bw-go").click();
await page.getByTestId("bw-play").click();
await page.waitForTimeout(500);
// the lesson on pause and speed: clear of Pause and the speeds
const lesson = await box("[data-testid=bw-clock-lesson]");
log("lesson shown:", !!lesson, "over Pause:", meets(lesson, await box("[data-testid=bw-play]")), "over speeds:", meets(lesson, await box(".bw-clock-speeds")));
await shot("01-lesson");
await page.getByTestId("bw-play").click(); // pausing is the lesson; it goes
await page.getByTestId("bw-play").click();

const seen = new Set();
let spaceChecked = false, allChecked = false, behindChecked = false, runups = 0;
const t0 = Date.now();
for (let i = 0; i < 1500 && Date.now() - t0 < 240_000; i++) {
  const year = +(await page.getByTestId("bw-year").textContent().catch(() => "0"));
  if (await page.locator("[data-testid=bw-end], .bw-end").count()) break;
  if (await page.getByTestId("bw-respond").count()) {
    if (!seen.has("respond")) { seen.add("respond"); await page.waitForTimeout(400); await shot(`10-respond-${year}`); log("respond focus on card:", await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))); }
    // Space never answers: the card stays
    await page.keyboard.press(" ");
    await page.waitForTimeout(100);
    log("respond after Space still up:", (await page.getByTestId("bw-respond").count()) > 0);
    await page.getByTestId("bw-respond-pick").first().click().catch(() => undefined);
    continue;
  }
  if (await page.getByTestId("bw-term").count()) {
    if (!seen.has(`term${year}`)) { seen.add(`term${year}`); await page.waitForTimeout(400); await shot(`20-term-${year}`); }
    if (await page.getByTestId("bw-deal").count()) await page.getByTestId("bw-deal").first().click().catch(() => undefined);
    await page.getByTestId("bw-term-on").click().catch(() => undefined);
    // after the first election: open its term again, let time run (reading does not hold here), and a card must wait behind it
    if (!behindChecked && year >= 2030) {
      behindChecked = true;
      await page.evaluate((key) => { const p = JSON.parse(localStorage.getItem(key + "prefs")); p.holdWhileReading = false; localStorage.setItem(key + "prefs", JSON.stringify(p)); }, KEY);
      await page.getByTestId("bw-settings-open").click();
      const hold = page.locator(".bw-settings input[type=checkbox]").nth(1);
      if (await hold.isChecked()) await hold.uncheck();
      await page.getByTestId("bw-settings-open").click();
      await page.locator(".bw-tl-term").last().click();
      if ((await page.getByTestId("bw-play").getAttribute("aria-pressed")) !== "true") await page.getByTestId("bw-play").click();
      for (let k = 0; k < 200; k++) {
        const s = await page.getByTestId("bw-clock-status").textContent();
        if (/card is waiting/.test(s ?? "")) break;
        await page.waitForTimeout(150);
      }
      await page.waitForTimeout(400);
      await shot(`30-behind-term-${year}`);
      log("behind: term shown", await page.getByTestId("bw-term").count(), "card shown", await page.getByTestId("bw-stop").count() + await page.getByTestId("bw-respond").count(), "status:", await page.getByTestId("bw-clock-status").textContent());
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      await shot(`31-after-term-closed-${year}`);
      log("after Escape: term", await page.getByTestId("bw-term").count(), "card", await page.getByTestId("bw-stop").count() + await page.getByTestId("bw-respond").count());
      await page.getByTestId("bw-settings-open").click();
      if (!(await hold.isChecked())) await hold.check();
      await page.getByTestId("bw-settings-open").click();
    }
    continue;
  }
  if (await page.getByTestId("bw-stop").count()) {
    const kind = (await page.getByTestId("bw-stop").getAttribute("class")).match(/bw-stop-(\w+)/g).map((x) => x.slice(8)).find((k) => k !== "count" && k !== "all");
    if (!seen.has(kind)) {
      seen.add(kind);
      await page.waitForTimeout(400);
      await shot(`40-stop-${kind}-${year}`);
      log("card", kind, year, "focus:", await page.evaluate(() => document.activeElement?.getAttribute("data-testid")));
    }
    if (kind === "runup") { runups++; await shot(`41-runup-${year}`); log("runup", year, (await page.getByTestId("bw-runup").textContent()).slice(0, 400)); }
    if (!spaceChecked) {
      spaceChecked = true;
      await page.getByTestId("bw-stop-on").focus();
      const before = await page.getByTestId("bw-stop-note").textContent();
      await page.keyboard.press(" ");
      await page.waitForTimeout(150);
      log("Space on focused Carry on: card still up", await page.getByTestId("bw-stop").count(), "note was:", before, "now:", await page.getByTestId("bw-stop-note").textContent());
      await shot(`42-space-on-card`);
      await page.keyboard.press(" ");
    }
    if (!allChecked && await page.getByTestId("bw-stop-all").count()) {
      allChecked = true;
      await shot(`50-carry-all-${year}`);
      await page.getByTestId("bw-stop-all").click();
      await page.waitForTimeout(400);
      await shot(`51-after-all-${year}`);
      log("unread slips after Carry on past all:", await page.getByTestId("bw-unread-slip").count());
      continue;
    }
    await page.getByTestId("bw-stop-on").click().catch(() => undefined);
    continue;
  }
  if (!(await page.getByTestId("bw-play").count())) { log("no clock on screen at", year); await shot(`90-no-clock-${year}`); break; }
  if ((await page.getByTestId("bw-play").getAttribute("aria-pressed")) === "false") await page.getByTestId("bw-play").click();
  // the time line labels never overlap
  if (i % 25 === 0) {
    const boxes = await page.locator(".bw-tl-mark > span.small, .bw-tl-warning-where").evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== "none").map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, t: e.textContent }; }));
    for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) if (meets(boxes[a], boxes[b])) { log("LABELS OVERLAP", year, boxes[a].t, "|", boxes[b].t); await shot(`60-labels-${year}`); }
  }
  if (year >= 2041) break;
  await page.waitForTimeout(120);
}
await shot("70-board");
// the rule book and back: the same step, straight back to the board
const before = `${await page.getByTestId("bw-year").textContent()} ${await page.locator(".bw-yearnote b").textContent()}`;
await page.goto(base + "/#/llyfr/bwrdd");
await page.waitForTimeout(800);
await page.goBack();
await page.waitForTimeout(1200);
await shot("80-back-from-book");
const after = (await page.getByTestId("bw-year").count()) ? `${await page.getByTestId("bw-year").textContent()} ${await page.locator(".bw-yearnote b").textContent()}` : "start page";
log("rule book back:", before, "->", after);
log("seen:", [...seen].join(", "), "runups:", runups, "errors:", errors.length ? errors : "none");
await browser.close();
