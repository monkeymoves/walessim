// Screenshots for the fix-8 layout pass (playtest-7-cold items 1, 2, 10, 11, 12). Usage:
//   npx tsx design/scripts/fix8-saves.ts > saves.json (drop any npm notice lines), then
//   BASE=http://localhost:5291 node design/scripts/fix8-shots.mjs saves.json [only]
import { createRequire } from "module";
import { readFileSync, mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const saves = JSON.parse(readFileSync(process.argv[2], "utf8"));
const only = process.argv[3] ?? "";
const base = process.env.BASE ?? "http://localhost:5291";
const dir = "design/shots-build/fix-8";
mkdirSync(dir, { recursive: true });
const VPS = [["1440", 1440, 900], ["1280", 1280, 800]];
const SKIP = JSON.stringify(["__skip", "hand", "ticket", "play", "region", "post", "commit", "strands", "pull", "trust"]);
const browser = await chromium.launch();
const errors = [];
const report = [];

async function open(vp, lang, { save = null, guide = false, hash = "/#/yfory", letters = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base + "/#/yfory");
  await page.evaluate(({ l, save, guide, skip, letters }) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.v1.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    if (!guide) localStorage.setItem("etifeddiaeth.v1.yfory.onboard", skip);
    if (letters) localStorage.setItem("etifeddiaeth.v1.yfory.letters", JSON.stringify(["hollow"]));
    if (save) localStorage.setItem("etifeddiaeth.v1.save", save);
  }, { l: lang, save, guide, skip: SKIP, letters });
  await page.goto(base + hash);
  await page.reload();
  await page.waitForTimeout(1500);
  return page;
}
const shot = async (page, name) => { await page.waitForTimeout(450); await page.screenshot({ path: `${dir}/${name}.png` }); };
const step = (page) => page.locator(".yf").getAttribute("data-step");
async function toPlan(page) {
  for (let g = 0; g < 8 && (await step(page)) !== "plan"; g++) {
    if ((await step(page)) === "pledge") await page.locator(".yf-rail .btn-tab").first().click();
    else await page.locator(".yf-rail .yf-go").first().click();
    await page.waitForTimeout(500);
  }
}
/** Is the element fully inside the viewport and the top element at its centre? */
const inView = (page, sel) => page.evaluate((sel) => {
  const e = document.querySelector(sel);
  if (!e) return "missing";
  const r = e.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) return `off screen ${Math.round(r.top)}..${Math.round(r.bottom)}`;
  // inside any scrolling ancestor's box too
  for (let p = e.parentElement; p; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (/(auto|scroll|hidden)/.test(cs.overflowY)) {
      const q = p.getBoundingClientRect();
      if (r.top < q.top - 1 || r.bottom > q.bottom + 1) return `clipped by ${p.className}`;
    }
  }
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return hit && (e === hit || e.contains(hit)) ? "ok" : `covered by ${hit?.className}`;
}, sel);
const tableFit = (page) => page.evaluate(() => {
  const w = document.querySelector(".pl-table-wrap");
  if (!w) return "no table";
  const cut = [...w.querySelectorAll("td, th")].filter((c) => c.scrollWidth > c.clientWidth + 1).length;
  return `wrap ${w.clientWidth}, table ${w.scrollWidth}, cells cut ${cut}`;
});

for (const vp of VPS) for (const lang of ["en", "cy"]) try {
  const tag = `${vp[0]}-${lang}`;
  for (const k of ["visit", "beth"]) if ((!only || only === "visit") && saves[k]) {
    const page = await open(vp, lang, { save: saves[k] });
    await page.locator(".yf-visit-offer .yf-actions button").first().click();
    await page.waitForTimeout(3000);
    await shot(page, `${k}-1-board-${tag}`);
    report.push(`${tag} ${k} table: ${await tableFit(page)}`);
    // the biggest row: the one with most land, else the eighth
    const rows = page.locator(".pl-ledger .pl-rowbtn");
    await rows.nth(Math.min(7, (await rows.count()) - 1)).click();
    await page.waitForTimeout(600);
    await shot(page, `${k}-2-card-${tag}`);
    report.push(`${tag} ${k} choose button: ${await inView(page, ".pl-below .btn-stitch, .pl-below-foot button:last-child")}`);
    await page.context().close();
  }
  if ((!only || only === "end") && saves.ended) {
    const page = await open(vp, lang, { save: saves.ended });
    await page.waitForTimeout(1500);
    await shot(page, `end-0-${tag}`);
    report.push(`${tag} end open-letter ${await inView(page, "[data-testid=open-letter]")}, play-again ${await inView(page, "[data-testid=play-again]")}`);
    await page.getByTestId("open-letter").click();
    await page.waitForTimeout(6500);
    await shot(page, `end-1-letter-${tag}`);
    report.push(`${tag} end letter head ${await inView(page, "#end-letter-head")}`);
    await page.locator("[data-testid=end-detail] summary").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    report.push(`${tag} end detail summary ${await inView(page, "[data-testid=end-detail] summary")}`);
    await shot(page, `end-2-detail-${tag}`);
    await page.context().close();
  }
  if ((!only || only === "region") && saves.plan2) {
    const page = await open(vp, lang, { save: saves.plan2 });
    await toPlan(page);
    const ids = await page.locator(".yf-hand .yf-ticket-slot").evaluateAll((e) => e.map((x) => x.getAttribute("data-card")));
    let n = 0;
    for (const id of ids) {
      await page.locator(`.yf-ticket-slot[data-card="${id}"] .yf-ticket-press`).click();
      await page.waitForTimeout(500);
      const pick = await page.getByTestId("region-compare").count();
      if (pick) { await shot(page, `region-${n++}-${id}-${tag}`); }
      else if (/peat/.test(id ?? "")) await shot(page, `card-${id}-${tag}`);
      if (await page.locator(`.yf-ticket-slot[data-card="${id}"].sel`).count()) await page.locator(`.yf-ticket-slot[data-card="${id}"] .yf-ticket-press`).click();
      await page.waitForTimeout(300);
    }
    await page.context().close();
  }
  for (const k of ["arrive", "crisis"]) if ((!only || only === "opening") && saves[k]) {
    const page = await open(vp, lang, { save: saves[k] });
    await shot(page, `opening-${k}-${tag}`);
    const r = await page.evaluate(() => {
      const box = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
      const a = box(".yf-arrivals"), b = box(".mf-selline"), c = box(".rw-now");
      const hit = (x, y) => !!x && !!y && x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top;
      return { arrivals: !!a, overSel: hit(a, b), overNow: hit(a, c) };
    });
    report.push(`${tag} ${k} opening ${JSON.stringify(r)}`);
    await page.context().close();
  }
  if ((!only || only === "mapclick") && saves.plan2) {
    // a click on the map chooses the region; the card plays only from the button
    const page = await open(vp, lang, { save: saves.plan2 });
    await toPlan(page);
    await page.locator('.yf-ticket-slot[data-card="homes-for-locals"] .yf-ticket-press').click();
    await page.waitForTimeout(1200);
    const at = vp[0] === "1440" ? [565, 300] : [528, 282];
    await page.mouse.click(at[0], at[1]);
    await page.waitForTimeout(600);
    const played = await page.locator('.yf-ticket-slot[data-card="homes-for-locals"].played').count();
    await shot(page, `mapclick-0-chosen-${tag}`);
    report.push(`${tag} map click: choice ${await page.getByTestId("map-choice").count()}, played ${played}, play button ${await inView(page, "[data-testid=map-play]")}`);
    await page.getByTestId("map-play").click().catch(() => {});
    await page.waitForTimeout(600);
    report.push(`${tag} after button: played ${await page.locator('.yf-ticket-slot[data-card="homes-for-locals"].played').count()}`);
    await page.context().close();
  }
  if (!only || only === "guide") {
    // the guided first turn: a card opened while the coins note shows, then the election's Trust note
    const page = await open(vp, lang, { guide: true, letters: false, hash: "/#/yfory?seed=20261126" });
    const got = async (id) => { const b = page.locator(`.yf-note[data-note="${id}"] .yf-note-btn`); if (await b.count()) { await b.click(); await page.waitForTimeout(250); } };
    const cover = () => page.evaluate(() => [...document.querySelectorAll(".yf-note")].flatMap((n) => {
      const a = n.getBoundingClientRect();
      return [...document.querySelectorAll('[data-testid="play-card"], [data-testid="trust"], [data-testid="end-turn"], .yf-tray .yf-region')].filter((e) => {
        const b = e.getBoundingClientRect(); return b.width > 0 && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      }).map((e) => `${n.getAttribute("data-note")} on ${e.getAttribute("data-testid") ?? e.className}`);
    }));
    await page.locator(".yf-hook .btn-stamp").click();
    await page.getByTestId("show-cards").click();
    await got("slow_change"); await got("hand");
    await page.locator('.yf-ticket-slot[data-card="build-flood-walls"] .yf-ticket-press').click();
    await page.waitForTimeout(500);
    await page.locator('.yf-tray [data-region="southeast"]').click();
    await page.waitForTimeout(600);
    await got("slow_card");
    await page.locator('.yf-ticket-slot[data-card="warm-homes"] .yf-ticket-press').click();
    await page.waitForTimeout(800);
    await shot(page, `guide-0-play-${tag}`);
    report.push(`${tag} guide with card open: notes ${await page.locator(".yf-note").count()}, covers ${JSON.stringify(await cover())}`);
    await got("coins_left");
    await page.locator('.yf-ticket-slot[data-card="warm-homes"] .yf-ticket-press').click();
    await page.waitForTimeout(300);
    await page.getByTestId("end-turn").click();
    await page.waitForTimeout(500);
    for (const id of ["end-save", "end-lose", "end-anyway"]) { const b = page.getByTestId(id); if (await b.count()) { await b.click(); break; } }
    for (let g = 0; g < 40; g++) {
      const st = await step(page);
      if (st === "changed") break;
      if (st === "visit") await page.locator(".yf-visit-stay .btn-tab").click();
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(2800);
    await got("why");
    await page.locator(".yf-rail .yf-panel-foot .btn-stamp").click();
    await page.waitForTimeout(800);
    await shot(page, `guide-1-trust-${tag}`);
    report.push(`${tag} guide at election: notes ${await page.locator(".yf-note").count()} ${await page.locator(".yf-note").getAttribute("data-note").catch(() => "")}, covers ${JSON.stringify(await cover())}`);
    await page.context().close();
  }
} catch (e) { report.push(`${vp[0]}-${lang} FAILED: ${String(e).split("\n")[0]}`); }
await browser.close();
console.log(report.join("\n"));
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
