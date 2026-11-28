// Screenshots of the board UI (v2, #/bwrdd), package 5. Plays a game by hand through the screens.
// Usage: BASE=http://localhost:5391 node design/scripts/board-ui-shots.mjs [only-size] [only-lang] [turns]
// Saves design/shots-build/board-ui/<step>-<size>-<lang>.png and prints console errors.
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:5391";
const dir = "design/shots-build/board-ui";
mkdirSync(dir, { recursive: true });
const [, , onlySize = "", onlyLang = "", turnsArg = "12"] = process.argv;
const VPS = [["1440", 1440, 900], ["1280", 1280, 800]].filter((v) => !onlySize || v[0] === onlySize);
const LANGS = ["en", "cy"].filter((l) => !onlyLang || l === onlyLang);
const TURNS = +turnsArg;
const browser = await chromium.launch();
const errors = [];

async function open(vp, lang, guide) {
  const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${vp[0]} ${lang}: ${e}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${vp[0]} ${lang}: ${m.text()}`));
  await page.goto(base + "/#/");
  await page.evaluate(({ l, guide }) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v1.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    if (!guide) localStorage.setItem("etifeddiaeth.board.v1.guide", "done");
  }, { l: lang, guide });
  await page.reload();
  await page.waitForTimeout(900);
  return page;
}
const shot = async (page, name, tag) => { await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/${name}-${tag}.png` }); };
const click = async (page, sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(350); };
/** Click a council on the map by its name, via the map's own anchor (keyboard focus API is not exposed). */
async function clickCouncil(page, nth) {
  const row = page.locator(".bw-league-row").nth(nth);
  if (await row.count()) { await row.click(); await page.waitForTimeout(700); return; }
  await page.locator(".bw-council .btn-close").click().catch(() => undefined);
  await page.waitForTimeout(300);
  if (await row.count()) { await row.click(); await page.waitForTimeout(700); }
}

for (const vp of VPS) for (const lang of LANGS) {
  const tag = `${vp[0]}-${lang}`;
  const page = await open(vp, lang, true);
  await shot(page, "00-title", tag);
  await click(page, '[data-testid="way-bwrdd"]');
  await page.waitForSelector(".bw-start-sheet");
  await page.waitForTimeout(1200);
  await shot(page, "01-start", tag);
  await click(page, '[data-testid^="bw-start-"]:nth-child(2)');
  await click(page, '[data-testid="bw-go"]');
  await page.waitForSelector(".bw-board");
  await page.waitForTimeout(1500);
  await shot(page, "02-board", tag);
  await clickCouncil(page, 0);
  await shot(page, "03-council", tag);
  await click(page, '[data-testid="bw-build-here"]');
  await page.waitForTimeout(400);
  const first = page.locator(".bw-ticket:not(.locked) .bw-ticket-face").first();
  await first.hover();
  await page.waitForTimeout(500);
  await shot(page, "04-build-hover", tag);
  await first.click();
  await shot(page, "05-build-open", tag);
  await click(page, '[data-testid="bw-build-it"]');
  await shot(page, "06-built", tag);
  await page.locator('[data-testid="bw-guide"] .btn-tab').first().click().catch(() => undefined);
  await click(page, '[data-testid="bw-end-turn"]');
  if (await page.locator('[data-testid="bw-end-anyway"]').count()) { await shot(page, "07-ask", tag); await click(page, '[data-testid="bw-end-anyway"]'); }
  await page.waitForTimeout(900);
  await shot(page, "08-passing", tag);
  await page.waitForTimeout(3200);
  await shot(page, "09-report", tag);
  const why = page.locator(".bw-report .threadlink").first();
  if (await why.count()) { await why.click(); await shot(page, "10-why", tag); await page.keyboard.press("Escape"); await page.locator(".bw-why-panel .btn-close").click().catch(() => undefined); }
  // play on: answer events, build the cheapest allowed thing somewhere, end turns
  for (let turn = 1; turn < TURNS; turn++) {
    for (let g = 0; g < 6; g++) {
      if (await page.locator('[data-testid="bw-respond"] .btn-tab:not([disabled])').count()) { await click(page, '[data-testid="bw-respond"] .btn-tab:not([disabled])'); continue; }
      if (await page.locator('[data-testid="bw-visit"]').count() && g === 0) { await click(page, '[data-testid="bw-visit"]'); await shot(page, `visit-t${turn}`, tag); await page.locator(".bw-novisit .btn-tab, [data-testid=place-leave]").first().click().catch(() => undefined); await page.waitForTimeout(300); continue; }
      if (await page.locator('[data-testid="bw-report-next"]:not([disabled])').count()) { await click(page, '[data-testid="bw-report-next"]'); continue; }
      if (await page.locator('[data-testid="bw-election"]').count()) { await shot(page, `election-t${turn}`, tag); await click(page, '[data-testid="bw-election-next"]'); continue; }
      break;
    }
    if (await page.locator('[data-testid="bw-end"]').count() || await page.locator('[data-testid="bw-end-turn"]').count() === 0) break;
    if (turn === 3) { await click(page, '[data-testid="bw-tree-open"]').catch(() => undefined); await shot(page, "11-tree", tag); await page.keyboard.press("Escape"); await page.waitForTimeout(200); }
    await clickCouncil(page, turn % 10);
    if (turn === 2) { await page.selectOption('[data-testid="bw-colour"]', "backing"); await shot(page, "12-colour-backing", tag); await page.selectOption('[data-testid="bw-colour"]', "work"); }
    await click(page, '[data-testid="bw-build-here"]');
    const t = page.locator(".bw-ticket:not(.locked) .bw-ticket-face");
    if (await t.count()) { await t.first().click(); await click(page, '[data-testid="bw-build-it"]'); }
    await page.locator(".bw-build .btn-close").click().catch(() => undefined);
    await page.locator(".bw-council .btn-close").click().catch(() => undefined);
    if (turn === 6) await shot(page, "13-midgame", tag);
    await click(page, '[data-testid="bw-end-turn"]');
    if (await page.locator('[data-testid="bw-end-anyway"]').count()) await click(page, '[data-testid="bw-end-anyway"]');
    await page.waitForTimeout(500);
    await page.keyboard.press("Space");
    await page.waitForTimeout(500);
  }
  for (let g = 0; g < 8; g++) {
    if (await page.locator('[data-testid="bw-end"]').count()) break;
    if (await page.locator('[data-testid="bw-respond"] .btn-tab:not([disabled])').count()) { await click(page, '[data-testid="bw-respond"] .btn-tab:not([disabled])'); continue; }
    if (await page.locator('[data-testid="bw-report-next"]:not([disabled])').count()) { await click(page, '[data-testid="bw-report-next"]'); continue; }
    if (await page.locator('[data-testid="bw-election-next"]').count()) { await click(page, '[data-testid="bw-election-next"]'); continue; }
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
  await shot(page, "20-end", tag);
  console.log(tag, "year", await page.locator('[data-testid="bw-year"]').textContent().catch(() => "(end)"));
  await page.context().close();
}
await browser.close();
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
