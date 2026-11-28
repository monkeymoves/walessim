// Package C's fix shots (playtest 8): the council panel's backing and "on the map", the build menu
// with the road to each keystone and named discounts, rings grouped on the map, "Look at" buttons,
// Why?, the tree, a visit blocked by the one-a-year rule, and a lost election with its deal.
// Usage: BASE=http://127.0.0.1:4317 node design/scripts/board-fix1-c.mjs [en|cy] [a|b]
import { clear, next, open, openCouncil } from "./board-fix1-c-lib.mjs";
const lang = process.argv[2] ?? "en";
const scen = process.argv[3] ?? "a";
const p = `${lang}-${scen}`;
const { browser, page, shot, visible, scan, bad, errors } = await open(lang, { stepByStep: true, speed: "steady", holdWhileReading: true, stops: { finished: true } });
const taken = new Set();
const once = async (name) => { if (taken.has(name)) return; taken.add(name); await shot(`${p}-${name}`); };
const year = async () => Number(((await page.getByTestId("bw-year").textContent().catch(() => "")) ?? "").replace(/\D/g, "").slice(0, 4));

async function buildIn(name, n = 1) {
  if (!(await openCouncil(page, name).then(() => true, () => false))) return 0;
  if (!(await visible("bw-build-here"))) return 0;
  await page.getByTestId("bw-build-here").click();
  let built = 0;
  for (let k = 0; k < n; k++) {
    const opts = page.locator("[data-testid^=bw-opt-]");
    const c = await opts.count();
    let ok = false;
    for (let i = 0; i < c && !ok; i++) {
      await opts.nth(i).click().catch(() => undefined);
      const go = page.locator("[data-testid=bw-build-it]:not([disabled])");
      if (await go.count()) { await go.first().click(); ok = true; built++; }
    }
    if (!ok) break;
  }
  await page.keyboard.press("Escape");
  return built;
}

if (scen === "a") {
  await scan("start"); await once("01-region");
  await openCouncil(page, "Merthyr");
  await once("02-council-merthyr");
  await page.getByTestId("bw-build-here").click();
  await page.waitForTimeout(300);
  await once("03-build-menu");
  await page.locator(".bw-build-scroll").evaluate((e) => e.scrollTo(0, 900));
  await once("03b-build-menu-lower");
  await page.keyboard.press("Escape");
  await buildIn("Merthyr", 2);
  await page.waitForTimeout(700);
  await once("04-rings-two-in-merthyr");
  const councils = lang === "cy" ? ["Blaenau", "Rhondda", "Caerffili", "Tor", "Merthyr", "Casnewydd", "Pen-y-bont", "Caerdydd"] : ["Blaenau", "Rhondda", "Caerphilly", "Torfaen", "Merthyr", "Newport", "Bridgend", "Cardiff"];
  let ci = 0, lastYear = 0;
  for (let guard = 0; guard < 400; guard++) {
    if (await visible("bw-end")) break;
    if (await visible("bw-stop")) {
      const cls = (await page.getByTestId("bw-stop").getAttribute("class")) ?? "";
      const k = /bw-stop-([a-z_]+)/.exec(cls)?.[1] ?? "?";
      await scan(`stop ${k}`);
      await once(`10-stop-${k}`);
      if (k === "visit") {
        const go = page.getByTestId("bw-stop-visit");
        if (await go.isEnabled()) { await go.click(); await page.waitForTimeout(400); await once("11-visit"); await page.keyboard.press("Escape"); }
        else { await once("11-visit-blocked"); await page.getByTestId("bw-stop-on").click(); }
        continue;
      }
      if (k === "warning" && !taken.has("12-look")) {
        await page.getByTestId("bw-stop-look").click(); await page.waitForTimeout(700); await once("12-look"); await page.keyboard.press("Escape"); continue;
      }
      await page.getByTestId("bw-stop-on").click();
      continue;
    }
    if (await visible("bp-visit")) { await page.keyboard.press("Escape"); continue; }
    if (await visible("bw-respond")) { await once("13-respond"); }
    if (await visible("bw-term")) { await scan("term"); await once(`14-term-${await year()}`); }
    await clear(page, visible);
    const y = await year();
    if (y !== lastYear) {
      lastYear = y;
      await buildIn(councils[ci++ % councils.length], 1);
      await page.waitForTimeout(500);
      await scan(`board ${y}`);
      if (y === 2028 || y === 2031 || y === 2035) await once(`20-map-${y}`);
      if (y === 2030) {
        await openCouncil(page, "Merthyr");
        await once("21-council-2030");
        const why = page.locator("[data-testid=bw-council] .bw-why").first();
        if (await why.count()) { await why.click(); await page.waitForTimeout(400); await page.locator("[data-testid=bw-why] button[role=radio]").nth(2).click(); await page.waitForTimeout(300); await scan("why"); await once("22-why"); await page.keyboard.press("Escape"); }
        await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
      }
      if (y === 2033) {
        await page.keyboard.press("Escape");
        if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] .btn-close, [data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
        await page.waitForTimeout(300);
        await page.getByTestId("bw-tree-open").click().catch(() => undefined); await page.waitForTimeout(400); await scan("tree"); await once("23-tree-2033"); await page.keyboard.press("Escape");
        await openCouncil(page, "Rhondda"); await page.getByTestId("bw-build-here").click(); await page.waitForTimeout(300); await scan("build"); await once("24-build-2033"); await page.keyboard.press("Escape");
      }
      if (y >= 2040) break;
    }
    await next(page);
  }
} else if (scen === "c") {
  // two visits offered together: make one, and the other must say why it waits (one visit a year)
  async function buildThis(name, id) {
    await openCouncil(page, name);
    await page.getByTestId("bw-build-here").click();
    await page.getByTestId(`bw-opt-${id}`).first().click();
    await page.locator("[data-testid=bw-build-it]:not([disabled])").first().click();
    await page.keyboard.press("Escape");
  }
  await buildThis(lang === "cy" ? "Rhondda" : "Rhondda", "coal-tips-safe");
  await buildThis(lang === "cy" ? "Casnewydd" : "Newport", "coast-wetlands");
  await shot(`${p}-39-after-builds`);
  // both places now ask for a visit; make the Newport one from its council panel
  await page.getByTestId("bw-council-visit").click();
  await page.waitForTimeout(400);
  await shot(`${p}-40-visit-open`);
  await page.locator("[data-testid^=bp-opt-]").first().click();
  await page.locator("[data-testid=bp-choose]:not([disabled])").click();
  await page.getByTestId("bp-done").click();
  await page.waitForTimeout(300);
  await openCouncil(page, "Rhondda");
  await page.waitForTimeout(600);
  await page.getByTestId("bw-council-visit").scrollIntoViewIfNeeded().catch(() => undefined);
  await shot(`${p}-42-rhondda-visit-waits`);
  console.log("rhondda visit button:", await page.getByTestId("bw-council-visit").innerText().catch(() => "none"), "disabled:", await page.getByTestId("bw-council-visit").isDisabled().catch(() => "?"));
} else {
  // a careless game: build nothing, lose the 2033 election, see the deal
  for (let guard = 0; guard < 200; guard++) {
    if (await visible("bw-term")) {
      const y = await year();
      await scan("term"); await shot(`${p}-30-term-${y}`);
      if (await visible("bw-deals")) {
        await shot(`${p}-31-deal-in-sight`);
        await page.locator("[data-testid=bw-deal]:not([disabled])").first().click();
        await page.waitForTimeout(300);
        await shot(`${p}-32-after-deal`);
        await page.getByTestId("bw-term-on").click();
        await page.waitForTimeout(300);
        await shot(`${p}-33-carried-on`);
        break;
      }
      await page.getByTestId("bw-term-on").click();
      continue;
    }
    if (await visible("bw-stop")) { await page.getByTestId("bw-stop-on").click(); continue; }
    if (await visible("bw-respond")) { const q = page.locator("[data-testid=bw-respond-pick]:not([disabled])"); await q.first().click(); continue; }
    if (await visible("bp-visit")) { await page.keyboard.press("Escape"); continue; }
    await next(page);
  }
}
console.log(p, bad.size ? "SUSPECT TEXT:\n" + [...bad].join("\n") : "no suspect text");
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();
