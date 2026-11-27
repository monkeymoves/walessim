// Screenshots for the fix-7 pass (playtest-6-cold layout, facts in play). Usage:
//   npx tsx design/scripts/fix7-saves.ts > saves.json (drop any npm notice lines), then
//   BASE=http://localhost:5191 node design/scripts/fix7-shots.mjs saves.json [only]
import { createRequire } from "module";
import { readFileSync, mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const saves = JSON.parse(readFileSync(process.argv[2], "utf8"));
const only = process.argv[3] ?? "";
const base = process.env.BASE ?? "http://localhost:5191";
const dir = "design/shots-build/fix-7";
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
/** Hand fit: tickets below the hand's fold, and the "more below" cue. */
const handFit = (page) => page.evaluate(() => {
  const list = document.querySelector(".yf-hand");
  if (!list) return "no hand";
  const b = list.getBoundingClientRect().bottom;
  const slots = [...list.querySelectorAll(".yf-ticket-slot")];
  const cut = slots.filter((e) => e.getBoundingClientRect().bottom > b + 2).length;
  const titles = [...list.querySelectorAll(".yf-ticket-slot")].filter((s) => { const t = s.querySelector(".ticket-title"); return t && t.scrollWidth > t.clientWidth + 1; }).length;
  return `cards ${slots.length}, cut ${cut}, more ${!!document.querySelector(".yf-more")}, rail overflow ${(() => { const r = document.querySelector(".yf-rail"); return r ? r.scrollHeight - r.clientHeight : null; })()}, titles cut ${titles}`;
});

for (const vp of VPS) for (const lang of ["en", "cy"]) try {
  const tag = `${vp[0]}-${lang}`;
  if (!only || only === "title") {
    const page = await open(vp, lang, { hash: "/#/" });
    await shot(page, `title-${tag}`);
    await page.context().close();
  }
  if (!only || only === "first") {
    const page = await open(vp, lang, { guide: true, letters: false, hash: "/#/yfory?seed=20261126" });
    await shot(page, `first-0-hook-${tag}`);
    await page.locator(".yf-hook .btn-stamp").click();
    await page.getByTestId("show-cards").click();
    await page.waitForTimeout(700);
    await shot(page, `first-1-plan-${tag}`);
    report.push(`${tag} first plan: ${await handFit(page)}; cap line "${await page.locator('[data-testid="coin-cap"]').textContent().catch(() => "none")}"`);
    await page.context().close();
  }
  for (const k of ["plan2", "plan4"]) if ((!only || only === "plan") && saves[k]) {
    const page = await open(vp, lang, { save: saves[k] });
    await shot(page, `${k}-0-opening-${tag}`);
    await toPlan(page);
    await page.waitForTimeout(500);
    report.push(`${tag} ${k}: ${await handFit(page)}`);
    await shot(page, `${k}-1-hand-${tag}`);
    // open each card in turn: the hand must still fit; a region card colours the map
    const ids = await page.locator(".yf-hand .yf-ticket-slot").evaluateAll((e) => e.map((x) => x.getAttribute("data-card")));
    let lensShot = false;
    for (const id of ids) {
      const press = page.locator(`.yf-ticket-slot[data-card="${id}"] .yf-ticket-press`);
      if (!(await press.count())) { report.push(`${tag} ${k} ${id} missing; hand now ${JSON.stringify(await page.locator(".yf-hand .yf-ticket-slot").evaluateAll((e) => e.map((x) => x.getAttribute("data-card"))))}`); await shot(page, `${k}-err-${tag}`); continue; }
      await press.click();
      await page.waitForTimeout(500);
      const fit = await handFit(page);
      const pick = await page.getByTestId("region-compare").count();
      const lens = await page.evaluate(() => !!document.querySelector(".mf-compare .lenskey"));
      report.push(`${tag} ${k} open ${id}: ${fit}; where ${pick}; lens ${lens}; key ${await page.locator(".mf-key").count()}`);
      if (pick && !lensShot) { lensShot = true; await shot(page, `${k}-2-where-lens-${tag}`); }
      if (id === ids[ids.length - 1]) await shot(page, `${k}-3-last-open-${tag}`);
      if (await page.locator(`.yf-ticket-slot[data-card="${id}"].sel`).count()) await press.click();
      await page.waitForTimeout(300);
    }
    await page.context().close();
  }
  for (const k of ["visit", "beth"]) if ((!only || only === "visit") && saves[k]) {
    const page = await open(vp, lang, { save: saves[k] });
    await shot(page, `${k}-0-invite-${tag}`);
    report.push(`${tag} ${k} invite figures: ${await page.locator(".yf-visit-offer [data-testid='invite-fact']").count()}`);
    await page.locator(".yf-visit-offer .yf-actions button").first().click();
    await page.waitForTimeout(3000);
    await shot(page, `${k}-1-place-${tag}`);
    await page.context().close();
  }
  if ((!only || only === "changed") && saves.changed) {
    const page = await open(vp, lang, { save: saves.changed });
    await page.waitForTimeout(2600);
    await shot(page, `changed-0-${tag}`);
    const why = page.locator(".yf-slip-paper .threadlink").first();
    if (await why.count()) { await why.click(); await page.waitForTimeout(1500); await shot(page, `changed-1-why-${tag}`); }
    await page.context().close();
  }
  if ((!only || only === "end") && saves.ended) {
    const page = await open(vp, lang, { save: saves.ended });
    await page.waitForTimeout(1500);
    await shot(page, `end-0-${tag}`);
    const r = await page.evaluate(() => {
      const b = (id) => { const e = document.querySelector(`[data-testid=${id}]`); if (!e) return null; const x = e.getBoundingClientRect(); return Math.round(x.bottom); };
      return { playAgain: b("play-again"), letter: b("open-letter"), h: innerHeight, stageBottom: Math.round(document.querySelector(".yf-stage").getBoundingClientRect().bottom) };
    });
    report.push(`${tag} end buttons ${JSON.stringify(r)}`);
    await page.context().close();
  }
} catch (e) { report.push(`${vp[0]}-${lang} FAILED: ${String(e).split("\n")[0]}`); }
await browser.close();
console.log(report.join("\n"));
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
