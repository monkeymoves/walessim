// Screenshots for the plain-wales play screens (agent B): the title, the first-turn guide, the
// coins and the end-turn sheet, an opened card, a results step, and the end screen.
// Usage: BASE=http://localhost:5191 node design/scripts/plain-b-shots.mjs [endSave.json]
import { createRequire } from "module";
import { mkdirSync, readFileSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:5173";
const dir = "design/shots-build/plain-b";
mkdirSync(dir, { recursive: true });
const endSave = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")).ended : null;
const VPS = [["1440", 1440, 900], ["1280", 1280, 800]];
const browser = await chromium.launch();
const errors = [];

async function fresh(vp, lang, save, onboard) {
  const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base + "/#/yfory");
  await page.evaluate(({ l, save, onboard }) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.v1.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    if (onboard) localStorage.setItem("etifeddiaeth.v1.yfory.onboard", JSON.stringify(onboard));
    if (save) { localStorage.setItem("etifeddiaeth.v1.save", save); localStorage.setItem("etifeddiaeth.v1.yfory.letters", JSON.stringify(["hollow"])); }
  }, { l: lang, save, onboard });
  await page.reload();
  await page.locator(".yf").waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  return page;
}
const gotIt = async (page) => { const b = page.locator(".yf-note-btn").first(); if (await b.count()) { await b.click(); await page.waitForTimeout(400); } };

for (const vp of VPS) for (const lang of ["en", "cy"]) {
  const tag = `${vp[0]}-${lang}`;
  const page = await fresh(vp, lang, null, null);
  await page.screenshot({ path: `${dir}/00-title-${tag}.png` });
  await page.getByTestId("start").click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${dir}/01-how-${tag}.png` });
  await page.getByTestId("show-cards").click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${dir}/02-slow-change-${tag}.png` });
  await gotIt(page);
  await page.screenshot({ path: `${dir}/03-hand-${tag}.png` });
  await page.locator('.yf-ticket-slot[data-card="build-flood-walls"] .yf-ticket-press').click();
  await page.waitForTimeout(1500);
  await page.locator('.yf-where [data-region="southeast"]').hover();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/04-card-open-${tag}.png` });
  await page.locator('.yf-where [data-region="southeast"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${dir}/05-slow-card-${tag}.png` });
  await gotIt(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/06-coins-left-${tag}.png` });
  await gotIt(page);
  await page.getByTestId("end-turn").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/07-end-sheet-${tag}.png` });
  await page.getByTestId("end-save").click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/08-passing-${tag}.png` });
  await page.locator(".yf-panel-changed").waitFor({ timeout: 30000 });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${dir}/09-results-${tag}.png` });
  await gotIt(page);
  await page.locator(".yf-panel-changed .yf-panel-foot button").click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${dir}/10-trust-${tag}.png` });
  await gotIt(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/11-handoff-${tag}.png` });
  await page.context().close();

  if (endSave) {
    const p2 = await fresh(vp, lang, endSave, ["__skip"]);
    await p2.waitForTimeout(800);
    await p2.screenshot({ path: `${dir}/20-end-${tag}.png` });
    await p2.getByTestId("open-letter").click();
    await p2.waitForTimeout(6000);
    await p2.locator(".end").evaluate((e) => e.scrollTo(0, e.scrollHeight));
    await p2.waitForTimeout(400);
    await p2.screenshot({ path: `${dir}/21-end-letter-${tag}.png` });
    await p2.locator(".end-detail summary").click();
    await p2.waitForTimeout(400);
    await p2.locator(".end-detail").scrollIntoViewIfNeeded();
    await p2.screenshot({ path: `${dir}/22-end-detail-${tag}.png` });
    await p2.context().close();
  }
}
await browser.close();
console.log(errors.length ? "errors:\n" + [...new Set(errors)].join("\n") : "no page errors");
