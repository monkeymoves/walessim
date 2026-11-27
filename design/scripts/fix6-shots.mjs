// Screenshots for the cold playtest layout and guide fixes (docs/design/playtest-5-cold.md).
// Usage: npx tsx design/scripts/fix6-saves.ts > saves.json (drop any npm notice lines), then
//   BASE=http://localhost:5173 node design/scripts/fix6-shots.mjs saves.json [only]
import { createRequire } from "module";
import { readFileSync, mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const saves = JSON.parse(readFileSync(process.argv[2], "utf8"));
const only = process.argv[3] ?? "";
const base = process.env.BASE ?? "http://localhost:5173";
const dir = "design/shots-build/fix-6";
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
const notes = (page) => page.locator(".yf-note").count();
/** Every note on screen: is it clear of the controls it must not cover? */
async function noteCheck(page, label) {
  const r = await page.evaluate(() => {
    const keep = ['[data-testid="end-turn"]', '[data-testid="play-card"]', ".yf-tray .yf-region", '[data-testid="scoreboard"]', '[data-testid="trust"]', ".yf-rail .btn-stamp", '[data-testid="card-open"]'];
    return [...document.querySelectorAll(".yf-note")].map((n) => {
      const a = n.getBoundingClientRect();
      const hits = [...document.querySelectorAll(keep.join(","))].filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      }).map((e) => e.getAttribute("data-testid") || e.className);
      return { id: n.getAttribute("data-note"), hits };
    });
  });
  report.push(`${label}: notes ${JSON.stringify(r)}`);
}
const gotIt = async (page, id) => { const b = page.locator(`.yf-note[data-note="${id}"] .yf-note-btn`); if (await b.count()) { await b.click(); await page.waitForTimeout(200); } };

for (const vp of VPS) for (const lang of ["en", "cy"]) {
  const tag = `${vp[0]}-${lang}`;
  // ---- title screen: the language toggle
  if (!only || only === "title") {
    const page = await open(vp, lang, { hash: "/#/" });
    await shot(page, `title-${tag}`);
    await page.context().close();
  }
  // ---- the guided first turn
  if (!only || only === "guide") {
    const page = await open(vp, lang, { guide: true, letters: false, hash: "/#/yfory?seed=20261126" });
    await shot(page, `guide-0-hook-${tag}`);
    await page.locator(".yf-hook .btn-stamp").click();
    await page.getByTestId("show-cards").click();
    await page.waitForTimeout(600);
    await gotIt(page, "slow_change");
    await gotIt(page, "hand");
    await page.locator('.yf-ticket-slot[data-card="build-flood-walls"] .yf-ticket-press').click();
    await page.waitForTimeout(600);
    report.push(`${tag} card open: notes ${await notes(page)}`);
    await noteCheck(page, `${tag} card_place`);
    await shot(page, `guide-1-card-open-${tag}`);
    await page.locator('.yf-tray [data-region="southeast"]').click();
    await page.waitForTimeout(800);
    report.push(`${tag} after play: card open ${await page.getByTestId("card-open").count()}, notes ${await notes(page)}`);
    await noteCheck(page, `${tag} slow_card`);
    await shot(page, `guide-2-slow-card-${tag}`);
    await gotIt(page, "slow_card");
    await page.waitForTimeout(400);
    await noteCheck(page, `${tag} coins_left`);
    await shot(page, `guide-3-coins-left-${tag}`);
    await gotIt(page, "coins_left");
    // play Warm homes too, so the passing hand has two played tickets with stamps
    await page.locator('.yf-ticket-slot[data-card="warm-homes"] .yf-ticket-press').click();
    await page.getByTestId("play-card").click();
    await page.getByTestId("end-turn").click();
    const sheet = page.getByTestId("end-sheet");
    if (await sheet.isVisible().catch(() => false)) {
      for (const id of ["end-save", "end-lose", "end-anyway"]) { const b = sheet.getByTestId(id); if (await b.count()) { await b.click(); break; } }
    }
    for (let g = 0; g < 30; g++) {
      const st = await page.locator(".yf").getAttribute("data-step");
      if (st === "passing") { await page.waitForTimeout(300); await shot(page, `guide-4-passing-${tag}`); report.push(`${tag} passing year ${await page.locator(".topbar-year").textContent()} button "${await page.locator(".yf-rail .yf-go").textContent().catch(() => "")}"`); break; }
      if (st === "visit") await page.locator(".yf-visit-stay .btn-tab").click();
      await page.waitForTimeout(250);
    }
    for (let g = 0; g < 40 && (await page.locator(".yf").getAttribute("data-step")) !== "changed"; g++) await page.waitForTimeout(300);
    await page.waitForTimeout(2800);
    await noteCheck(page, `${tag} why`);
    await shot(page, `guide-5-changed-${tag}`);
    await gotIt(page, "why");
    await page.locator(".yf-slip-paper .threadlink").first().click();
    await page.waitForTimeout(1600);
    await shot(page, `guide-6-why-${tag}`);
    await page.locator(".yf-rail .yf-panel-foot .btn-stamp").click();
    await page.waitForTimeout(900);
    report.push(`${tag} election: trace ${await page.locator(".yf-trace").count()}, thread ${await page.locator(".yf-thread-overlay").count()}`);
    await noteCheck(page, `${tag} trust`);
    await shot(page, `guide-7-election-trust-${tag}`);
    await gotIt(page, "trust");
    await noteCheck(page, `${tag} handoff`);
    await gotIt(page, "handoff");
    // on to turn 2's plan: the Look it up note
    for (let g = 0; g < 20; g++) {
      const st = await page.locator(".yf").getAttribute("data-step");
      if (st === "plan") break;
      if (st === "pledge") { await gotIt(page, "promise"); await page.locator(".yf-rail .btn-tab").first().click(); }
      else if (st === "opening" || st === "election") await page.locator(".yf-rail .yf-go").first().click();
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(800);
    report.push(`${tag} turn 2: lookup note ${await page.locator('.yf-note[data-note="lookup"]').count()}, notes ${await notes(page)}`);
    await noteCheck(page, `${tag} lookup`);
    await shot(page, `guide-8-turn2-lookup-${tag}`);
    await page.context().close();
  }
  // ---- turn 2 plan, guide off: a card open with its atlas link; a council area panel; the notebook
  if ((!only || only === "plan") && saves.plan2) {
    const page = await open(vp, lang, { save: saves.plan2 });
    for (let g = 0; g < 6 && (await page.locator(".yf").getAttribute("data-step")) !== "plan"; g++) {
      if ((await page.locator(".yf").getAttribute("data-step")) === "pledge") await page.locator(".yf-rail .btn-tab").first().click();
      else await page.locator(".yf-rail .yf-go").first().click();
      await page.waitForTimeout(500);
    }
    const slots = page.locator(".yf-hand .yf-ticket-slot");
    await slots.first().locator(".yf-ticket-press").click();
    await page.waitForTimeout(900);
    await shot(page, `plan-card-open-${tag}`);
    // a council area by keyboard on the map
    await page.locator(".yf-map").focus();
    await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(900);
    const cut = await page.evaluate(() => { const b = document.querySelector(".mf-body"); return b ? b.scrollHeight - b.clientHeight : null; });
    report.push(`${tag} area panel overflow ${cut}, figures ${await page.locator(".mf-fig").count()}`);
    await shot(page, `plan-area-${tag}`);
    await page.getByTestId("notebook").click();
    await page.waitForTimeout(300);
    await shot(page, `plan-notebook-${tag}`);
    await page.context().close();
  }
  // ---- what happened: a crisis slip that moved nothing; for-scale figures that fit their goal
  for (const k of ["shockHeld", "offGoal"]) if ((!only || only === "changed") && saves[k]) {
    const page = await open(vp, lang, { save: saves[k] });
    await page.waitForTimeout(2600);
    const scales = await page.locator(".yf-slip-paper").evaluateAll((els) => els.map((e) => `${e.querySelector(".yf-slip-head")?.textContent?.trim()} | ${e.querySelector(".rw-scale")?.textContent?.trim() ?? "no figure"}`));
    report.push(`${tag} ${k}: ${scales.join(" || ")}`);
    await shot(page, `changed-${k}-${tag}`);
    await page.context().close();
  }
  // ---- Bethesda's column heads
  if ((!only || only === "beth") && saves.beth) {
    const page = await open(vp, lang, { save: saves.beth });
    await page.locator(".yf-visit-offer[data-place=bethesda] button").first().click();
    await page.locator(".pl-ledger").waitFor({ timeout: 20000 });
    await page.waitForTimeout(2500);
    const ov = await page.evaluate(() => {
      const p = document.querySelector(".pl-prompt")?.getBoundingClientRect();
      const heads = [...document.querySelectorAll(".pl-flaghead")].map((e) => e.getBoundingClientRect());
      const rail = document.querySelector(".pl-foot")?.getBoundingClientRect();
      return { overlapPrompt: heads.some((h) => p && h.top < p.bottom), footBottom: rail?.bottom, h: innerHeight };
    });
    report.push(`${tag} bethesda ${JSON.stringify(ov)}`);
    await shot(page, `bethesda-${tag}`);
    await page.context().close();
  }
  // ---- after Play again: the hook offers "Show me how to play"
  if (!only || only === "again") {
    const page = await open(vp, lang, { hash: "/#/yfory?seed=7" });
    await page.evaluate(() => window.__yfory.game.start({ firstGame: false }));
    await page.waitForTimeout(600);
    await shot(page, `again-hook-${tag}`);
    await page.getByTestId("replay-guide").click();
    await page.waitForTimeout(900);
    report.push(`${tag} replay: how ${await page.getByTestId("how-it-works").count()}, hand ${JSON.stringify(await page.locator(".yf-hand .yf-ticket-slot").evaluateAll((e) => e.map((x) => x.getAttribute("data-card"))))}`);
    await shot(page, `again-replay-${tag}`);
    await page.context().close();
  }
}
await browser.close();
console.log(report.join("\n"));
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
