// Before and after screenshots for the polish pass.
// Usage: node design/scripts/polish-shots.mjs <before|after> [only]
import { createRequire } from "module";
const require = createRequire("package.json");
const { chromium } = require("playwright");
const tag = process.argv[2] ?? "after";
const only = process.argv[3] ?? "";
const base = "http://localhost:4174";
const out = (name, vp, lang) => `design/shots-build/polish-${name}-${tag}-${vp}-${lang}.png`;
const VPS = [["1440", 1440, 900], ["1280", 1280, 800]];
const browser = await chromium.launch();
const errors = [];

async function fresh(vp, lang) {
  const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base + "/#/yfory");
  await page.evaluate((l) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.v1.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    localStorage.setItem("etifeddiaeth.v1.yfory.onboard", JSON.stringify(["__skip"]));
  }, lang);
  await page.reload();
  return page;
}

const TRIG = /Homes for locals|Community-owned|Tourism pays|Welsh-medium|Cartrefi|Ynni|Twristiaeth|Cyfrwng Cymraeg/i;
async function reachBethesda(page) {
  for (let g = 0; g < 80; g++) {
    const s = await page.locator(".yf").getAttribute("data-step");
    if (s === "plan") {
      const names = await page.locator(".yf-hand .ticket").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
      const i = names.findIndex((n) => TRIG.test(n));
      if (i >= 0) {
        await page.locator(".yf-hand .yf-ticket-slot").nth(i).locator(".yf-ticket-press").click();
        const region = page.locator(".yf-tray .yf-where .yf-region:not([disabled])");
        if (await region.count()) await region.first().click();
        else await page.locator(".yf-tray .yf-where .btn-stamp").first().click();
      }
      await page.locator(".yf-commit").click();
    } else if (s === "visit") {
      const h = (await page.locator(".yf-visit-offer h2").textContent()) ?? "";
      if (/Bethesda/i.test(h)) { await page.locator(".yf-visit-offer .btn-stamp").click(); await page.locator(".pl-ledger").waitFor({ timeout: 20000 }); return true; }
      await page.locator(".yf-visit-offer .btn-tab").click();
    } else if (s === "passing") {
      const shock = page.locator(".yf-shock .btn-tab");
      if (await shock.count()) await shock.first().click(); else await page.waitForTimeout(400);
    } else if (s === "caretaker") {
      await page.locator(".yf-shadow button").first().click();
      await page.locator(".yf-rail .yf-go").click();
    } else if (s === "ended") return false;
    else await page.locator(".yf-rail .yf-go").first().click();
    await page.waitForTimeout(150);
  }
  return false;
}

for (const vp of VPS) for (const lang of ["en", "cy"]) {
  if (!only || only === "atlas") {
    const page = await fresh(vp, lang);
    await page.goto(base + "/#/heddiw");
    await page.waitForTimeout(2500);
    await page.locator("[data-testid=explorer-toggle]").click();
    await page.waitForTimeout(800);
    const row = page.locator("[data-testid=explorer-table] tbody tr").nth(6);
    await row.hover();
    await page.waitForTimeout(500);
    await page.screenshot({ path: out("atlas", vp[0], lang) });
    await page.context().close();
  }
  if (!only || only === "book") {
    const page = await fresh(vp, lang);
    await page.goto(base + "/#/llyfr");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: out("book", vp[0], lang) });
    await page.goto(base + "/#/llyfr/R29");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: out("rule", vp[0], lang) });
    await page.goto(base + "/#/llyfr/attributions");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: out("attrib", vp[0], lang) });
    await page.context().close();
  }
  if (!only || only === "bethesda" || only === "strands") {
    const page = await fresh(vp, lang);
    await page.locator(".yf").waitFor({ timeout: 30000 });
    // strand meters after the first term
    if (!only || only === "strands") {
      await page.locator(".yf-commit").click().catch(() => {});
      for (let g = 0; g < 12; g++) {
        if (await page.locator(".meter-move").count()) break;
        const s = await page.locator(".yf").getAttribute("data-step");
        if (s === "passing") { const sh = page.locator(".yf-shock .btn-tab"); if (await sh.count()) await sh.first().click(); }
        else if (s !== "plan") await page.locator(".yf-rail .yf-go").first().click().catch(() => {});
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(800);
      await page.screenshot({ path: out("strands", vp[0], lang) });
    }
    if (!only || only === "bethesda") {
      const ok = await reachBethesda(page);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: out("bethesda", vp[0], lang) });
      if (!ok) console.log("bethesda not reached", vp[0], lang);
    }
    await page.context().close();
  }
}
await browser.close();
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
