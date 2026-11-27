// Screenshots for the playtest 4 fixes, from save strings made by find-saves.ts.
// Usage: npx tsx design/scripts/find-saves.ts > /tmp/saves.json; node design/scripts/fix5-shots.mjs /tmp/saves.json [only]
import { createRequire } from "module";
import { readFileSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const saves = JSON.parse(readFileSync(process.argv[2], "utf8"));
const only = process.argv[3] ?? "";
const base = process.env.BASE ?? "http://localhost:5173";
const dir = "design/shots-build/fix-5";
const VPS = [["1440", 1440, 900], ["1280", 1280, 800]];
const browser = await chromium.launch();
const errors = [];

async function open(vp, lang, save) {
  const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base + "/#/yfory");
  await page.evaluate(({ l, save }) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.v1.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    localStorage.setItem("etifeddiaeth.v1.yfory.onboard", JSON.stringify(["__skip", "hand", "ticket", "play", "region", "post", "commit", "strands", "pull", "trust"]));
    localStorage.setItem("etifeddiaeth.v1.yfory.letters", JSON.stringify(["hollow"]));
    if (save) localStorage.setItem("etifeddiaeth.v1.save", save);
  }, { l: lang, save });
  await page.reload();
  await page.locator(".yf").waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  return page;
}

/** Report anything in the rail that is cut off or needs a scroll. */
async function fits(page, label) {
  const r = await page.evaluate(() => {
    const rail = document.querySelector(".yf-rail").getBoundingClientRect();
    const btns = [...document.querySelectorAll(".yf-rail button")].filter((b) => b.offsetParent);
    const hidden = btns.filter((b) => { const r = b.getBoundingClientRect(); return r.bottom > rail.bottom + 1 || r.bottom > innerHeight; }).map((b) => b.textContent.trim());
    const scrolls = [...document.querySelectorAll(".yf-rail .yf-scroll")].map((e) => e.scrollHeight - e.clientHeight);
    return { hidden, scrolls };
  });
  console.log(label, JSON.stringify(r));
}

for (const vp of VPS) for (const lang of ["en", "cy"]) {
  const tag = `${vp[0]}-${lang}`;
  if ((!only || only === "two") && saves.two) {
    const page = await open(vp, lang, saves.two);
    await fits(page, `two ${tag}`);
    await page.screenshot({ path: `${dir}/two-invitations-${tag}.png` });
    // go to Bethesda: the board with this term's conditions
    const beth = page.locator(".yf-visit-offer").filter({ hasText: /Bethesda|Fethesda/ }).locator("button");
    await beth.click();
    await page.locator(".pl-ledger").waitFor({ timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${dir}/bethesda-board-${tag}.png` });
    await page.context().close();
  }
  if ((!only || only === "caretaker") && saves.caretaker) {
    const page = await open(vp, lang, saves.caretaker);
    await page.screenshot({ path: `${dir}/caretaker-${tag}.png` });
    await page.context().close();
  }
  if ((!only || only === "strands") && saves.plan) {
    const page = await open(vp, lang, saves.plan);
    // hover each ticket so the ghost heading is at its widest, and check strand names fit
    const tickets = page.locator(".yf-hand .yf-ticket-press");
    const n = await tickets.count();
    for (let i = 0; i < n; i++) {
      await tickets.nth(i).hover();
      await page.waitForTimeout(700);
      const cut = await page.evaluate(() => [...document.querySelectorAll(".meter-name, .meter .other, .meter-ghostlabel")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
      if (cut.length) console.log(`cut ${tag} ticket ${i}:`, cut.join(" | "));
      if (i === 0 || cut.length) await page.screenshot({ path: `${dir}/strands-${tag}-t${i}.png`, clip: { x: 0, y: 0, width: vp[1], height: 100 } });
    }
    await page.context().close();
  }
  if ((!only || only === "partner") && saves.partner) {
    const page = await open(vp, lang, saves.partner);
    const t = page.locator(".yf-hand .yf-ticket-slot").filter({ hasText: /Regional compact|Compact rhanbarthol|compact/i }).locator(".yf-ticket-press");
    if (await t.count()) { await t.first().hover(); await page.waitForTimeout(900); }
    const head = await page.evaluate(() => { const e = document.querySelector(".yf-ghosthead"); return e ? [e.textContent, e.scrollHeight > e.clientHeight + 1] : null; });
    console.log(`partner ${tag}:`, JSON.stringify(head));
    await page.screenshot({ path: `${dir}/partner-${tag}.png` });
    await page.context().close();
  }
  if ((!only || only === "bethcond") && saves.bethCond) {
    const page = await open(vp, lang, saves.bethCond);
    await page.locator(".yf-visit-offer[data-place=bethesda] button").click();
    await page.locator(".pl-ledger").waitFor({ timeout: 20000 });
    await page.waitForTimeout(2500);
    console.log(`conditions ${tag}:`, await page.locator(".pl-conditions").innerText().catch(() => "none"));
    await page.screenshot({ path: `${dir}/bethesda-conditions-${tag}.png` });
    await page.context().close();
  }
  if ((!only || only === "verywell") && saves.veryWell) {
    const page = await open(vp, lang, saves.veryWell);
    await page.locator(".yf-visit-offer[data-place=bethesda] button").click();
    await page.locator(".pl-ledger").waitFor({ timeout: 20000 });
    await page.waitForTimeout(2000);
    for (const n of saves.veryWellN.split(",").map(Number)) {
      await page.locator(".pl-rowbtn").nth(n).click();
      const st = page.locator(".pl-below .btn-stitch:not([disabled])");
      if (await st.count()) await st.click();
    }
    await page.locator(".pl-foot .btn-stamp").click();
    await page.locator(".pl-grade .stampmark").waitFor();
    await page.waitForTimeout(600);
    console.log(`grade ${tag}:`, await page.locator(".pl-grade .stampmark").innerText());
    await page.screenshot({ path: `${dir}/very-well-grade-${tag}.png` });
    await page.locator(".pl-grade .btn-stamp").click();
    for (let g = 0; g < 30; g++) {
      const st = await page.locator(".yf").getAttribute("data-step");
      if (st === "changed") break;
      if (st === "passing") { const sh = page.locator(".yf-shock .btn-tab"); if (await sh.count()) await sh.first().click(); }
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/very-well-changed-${tag}.png` });
    // on to the next plan and the ledger drawer's place grades
    for (let g = 0; g < 30; g++) {
      const st = await page.locator(".yf").getAttribute("data-step");
      if (st === "plan") break;
      if (st === "caretaker") { await page.locator(".yf-shadow button").first().click(); }
      await page.locator(".yf-rail .yf-go").first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await page.locator("#yf-ledger-open").click();
    await page.waitForTimeout(800);
    await page.locator(".yf-grade-line").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/very-well-ledger-${tag}.png` });
    await page.context().close();
  }
}
await browser.close();
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
