// Screenshots of the board on the clock (v2 phase 2, #/bwrdd), package 11. Plays a whole game by
// keyboard and mouse: the clock at fast speed first, then step by step, through every stop.
// Usage: BASE=http://localhost:5411 node design/scripts/board-clock-shots.mjs [only-size] [only-lang]
// Saves design/shots-build/board-clock/<name>-<size>-<lang>.png and prints the stops met and console errors.
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:5412";
const dir = "design/shots-build/board-clock";
mkdirSync(dir, { recursive: true });
const [, , onlySize = "", onlyLang = ""] = process.argv;
const VPS = [["1440", 1440, 900], ["1280", 1280, 800]].filter((v) => !onlySize || v[0] === onlySize);
const LANGS = ["en", "cy"].filter((l) => !onlyLang || l === onlyLang);
const browser = await chromium.launch();
const errors = [];

async function open(vp, lang) {
  const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(4000);
  page.on("pageerror", (e) => errors.push(`${vp[0]} ${lang}: ${e}`));
  page.on("console", (m) => (m.type() === "error" || (m.type() === "warning" && /slot|missing key/.test(m.text()))) && errors.push(`${vp[0]} ${lang}: ${m.text()}`));
  await page.goto(base + "/#/");
  await page.evaluate((l) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
  }, lang);
  await page.goto(base + "/#/bwrdd");
  await page.reload();
  await page.waitForSelector(".bw-start-sheet", { timeout: 20000 });
  await page.waitForTimeout(1200);
  return page;
}
const shot = async (page, name, tag) => { await page.waitForTimeout(350); await page.screenshot({ path: `${dir}/${name}-${tag}.png` }); };
const has = async (page, sel) => (await page.locator(sel).count()) > 0;
const click = async (page, sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(250); };

for (const vp of VPS) for (const lang of LANGS) {
  const tag = `${vp[0]}-${lang}`;
  const seen = new Set();
  const page = await open(vp, lang);
  await shot(page, "01-start", tag);
  await click(page, '[data-testid="bw-go"]');
  await page.waitForSelector(".bw-board");
  await page.waitForTimeout(1500);
  await shot(page, "02-board-paused", tag);
  await page.locator(".bw-league-row").first().click();
  await page.waitForTimeout(800);
  await shot(page, "03-council", tag);
  await click(page, '[data-testid="bw-build-here"]');
  const first = page.locator(".bw-ticket:not(.locked) .bw-ticket-face").first();
  await first.hover();
  await page.waitForTimeout(400);
  await first.click();
  await shot(page, "04-build", tag);
  await click(page, '[data-testid="bw-build-it"]');
  await page.locator(".bw-build .btn-close").click().catch(() => undefined);
  await page.locator(".bw-council .btn-close").click().catch(() => undefined);
  await page.waitForTimeout(500);
  await shot(page, "05-built-guide-play", tag);
  // play by keyboard: Space, then 3 for fast
  const blur = () => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await blur();
  await page.keyboard.press("Space");
  await page.keyboard.press("3");
  await page.waitForTimeout(1900);
  await shot(page, "06-running", tag);

  // run on the clock until a few stops have been met, answering each
  let built = 1;
  const handle = async (mode) => {
    if (await has(page, '[data-testid="bw-respond"]')) {
      if (!seen.has("respond")) { seen.add("respond"); await shot(page, "s-respond", tag); }
      const b = page.locator('[data-testid="bw-respond-pick"]:not([disabled])');
      if (await b.count()) await b.first().click(); else return false;
      return true;
    }
    if (await has(page, '[data-testid="bw-term"]')) {
      const ended = (await page.locator('[data-testid="bw-term-on"]').textContent())?.includes("2050");
      const k = ended ? "ended" : "election";
      if (!seen.has(k)) { seen.add(k); await shot(page, `s-${k}`, tag); }
      if (await has(page, '[data-testid="bw-deal"]:not([disabled])')) { if (!seen.has("deal")) { seen.add("deal"); await shot(page, "s-deal", tag); } await click(page, '[data-testid="bw-deal"]:not([disabled])'); }
      await click(page, '[data-testid="bw-term-on"]');
      return true;
    }
    if (await has(page, '[data-testid="bw-stop"]')) {
      const cls = await page.locator('[data-testid="bw-stop"]').getAttribute("class");
      const kind = /bw-stop-([a-z_]+)/.exec(cls ?? "")?.[1] ?? "stop";
      if (!seen.has(kind)) { seen.add(kind); await shot(page, `s-${kind}`, tag); }
      if (kind === "warning" && !seen.has("look")) { seen.add("look"); await click(page, '[data-testid="bw-stop-look"]'); await shot(page, "s-warning-look", tag); await page.keyboard.press("Escape"); if (mode === "clock") await page.keyboard.press("Space"); return true; }
      // Space carries on from a soft stop; the end is a hard stop with its own button
      if (kind === "ended") { await click(page, '[data-testid="bw-stop-on"]'); await page.waitForTimeout(1500); return true; }
      await blur();
      await page.keyboard.press("Space");
      return true;
    }
    return false;
  };
  const step = async () => (await page.locator('[data-testid="bw-year"]').textContent().catch(() => "")) ?? "";
  for (let i = 0; i < 160 && seen.size < 4; i++) {
    if (await has(page, '[data-testid="bw-end"], .be-end, [data-testid="board-end"]')) break;
    if (await handle("clock")) { await page.waitForTimeout(200); continue; }
    await page.waitForTimeout(400);
  }
  await page.keyboard.press("Space").catch(() => undefined);
  await shot(page, "07-midgame-clock", tag);
  // a past term from the time line, a Why? from the ticker, a warning, the settings
  if (await has(page, ".bw-tl-election.held")) { await click(page, ".bw-tl-election.held"); await shot(page, "08-past-term", tag); await page.keyboard.press("Escape"); }
  const why = page.locator(".bw-ticker .threadlink").first();
  if (await why.count()) { await why.click(); await page.waitForTimeout(300); await shot(page, "09-why", tag); await page.keyboard.press("Escape"); }
  if (await has(page, ".bw-tl-warning")) { await click(page, ".bw-tl-warning"); await shot(page, "10-warning", tag); await page.keyboard.press("Escape"); }
  await click(page, '[data-testid="bw-settings-open"]');
  await shot(page, "11-settings", tag);
  // switch to step by step for the rest, and stop on years too for one shot
  await click(page, '[data-testid="bw-pref-step"]');
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await shot(page, "12-step-mode", tag);
  // a saved game comes back where it was, with its time line
  await page.reload();
  await page.waitForSelector('[data-testid="bw-resume"]', { timeout: 20000 });
  await click(page, '[data-testid="bw-resume"]');
  await page.waitForSelector(".bw-board");
  await page.waitForTimeout(1200);
  await shot(page, "12b-resumed", tag);
  for (let i = 0; i < 300; i++) {
    if (await has(page, '[data-testid="bw-end"], .be-end, [data-testid="board-end"]') || !(await has(page, ".bw-board"))) break;
    if (await handle("step")) continue;
    if (i % 6 === 2 && built < 9) {
      await page.locator(".bw-league-row").nth(built % 10).click().catch(() => undefined);
      await page.waitForTimeout(300);
      if (await has(page, '[data-testid="bw-build-here"]')) {
        await click(page, '[data-testid="bw-build-here"]');
        const t = page.locator(".bw-ticket:not(.locked) .bw-ticket-face");
        if (await t.count()) { await t.last().click(); if (await has(page, '[data-testid="bw-build-it"]')) { await click(page, '[data-testid="bw-build-it"]'); built++; } }
        await page.locator(".bw-build .btn-close").click().catch(() => undefined);
        await page.locator(".bw-council .btn-close").click().catch(() => undefined);
        if (built === 5) await shot(page, "13-builds-under-way", tag);
      }
    }
    if (await has(page, '[data-testid="bw-run-next"]:not([disabled])')) await click(page, '[data-testid="bw-run-next"]');
    else await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1200);
  await shot(page, "20-end", tag);
  console.log(tag, "stops met:", [...seen].join(", "), "built", built, "year", await step());
  await page.context().close();
}
await browser.close();
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
