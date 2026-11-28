// The needs-you outline and the chip (v3-wales.md section 2), at 1280 x 800 and 1440 x 900, on the
// main moments: just opened (Play), a card (Carry on), an event (answers), a sheet held (Close),
// paused and idle, step by step (Next season), and Welsh. For a whole game played by following the
// outline, see board-needs-play.mjs.
// Usage: BASE=http://localhost:4620 OUT=design/shots-build/<round>/needs node design/scripts/board-needs-shots.mjs
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://localhost:4620";
const out = process.env.OUT ?? "design/shots-build/v3-a1/13";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function open(vp, { lang = "en", step = false, flashing = true } = {}) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  await page.goto(base + "/#/bwrdd");
  await page.evaluate(async ([lang, step, flashing]) => {
    // the save key comes from the model (package 14 adds the board id to it)
    const key = (await (await fetch("board-model.json")).json()).game.save_key;
    for (const k of ["run", "prefs", "clocktaught", "guide"]) localStorage.removeItem(key + k);
    localStorage.setItem(key + "guide", "done");
    localStorage.setItem(key + "clocktaught", "done");
    localStorage.setItem("etifeddiaeth.v1.lang", lang);
    localStorage.setItem(key + "prefs", JSON.stringify({ stepByStep: step, holdWhileReading: true, flashingOutline: flashing }));
  }, [lang, step, flashing]);
  await page.reload();
  await page.getByTestId("bw-go").click();
  await page.getByTestId("bw-play").waitFor({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  return page;
}
const where = async (page) => page.evaluate(() => {
  const n = document.querySelector('[data-testid="bw-needs"]');
  return n ? `${n.getAttribute("data-needs-on")} ${JSON.stringify(n.getBoundingClientRect())} chip="${document.querySelector('[data-testid="bw-needs-chip"]')?.textContent}"` : "none";
});

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  const tag = `${vp.width}`;
  const page = await open(vp);
  await page.screenshot({ path: `${out}/${tag}-01-opened.png` });
  console.log(tag, "opened", await where(page));
  // play until a card or an answer
  await page.getByTestId("bw-play").click();
  await page.waitForSelector('[data-testid="bw-stop"], [data-testid="bw-respond"], [data-testid="bw-term"]', { timeout: 120000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${tag}-02-card.png` });
  console.log(tag, "card", await where(page));
  // the chip takes the focus to the card's heading
  await page.getByTestId("bw-needs-chip").click();
  console.log(tag, "focus after chip", await page.evaluate(() => `${document.activeElement?.tagName} ${document.activeElement?.id} ${document.activeElement?.textContent?.slice(0, 40)}`));
  // carry on through cards until an event to answer
  for (let i = 0; i < 40; i++) {
    if (await page.getByTestId("bw-respond").count()) break;
    const on = page.locator('[data-needs="carry-on"]');
    if (await on.count()) await on.first().click().catch(() => {});
    const deal = page.getByTestId("bw-deal");
    if (await deal.count()) await deal.first().click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  if (await page.getByTestId("bw-respond").count()) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${tag}-03-answer.png` });
    console.log(tag, "answer", await where(page));
    await page.getByTestId("bw-respond-pick").first().click();
  }
  // clear cards, then a sheet held while running
  for (let i = 0; i < 10 && (await page.locator('[data-needs="carry-on"]').count()); i++) { await page.locator('[data-needs="carry-on"]').first().click().catch(() => {}); await page.waitForTimeout(300); }
  if ((await page.getByTestId("bw-play").getAttribute("data-face")) !== "pause" && (await page.getByTestId("bw-play").getAttribute("data-face")) !== "held") await page.getByTestId("bw-play").click();
  await page.locator('button:has-text("Branches"), [data-testid="bw-tree-open"]').first().click().catch(() => {});
  await page.waitForTimeout(500);
  if (!(await page.getByTestId("bw-tree").count())) { await page.getByTestId("bw-settings-open").click(); await page.waitForTimeout(400); }
  await page.screenshot({ path: `${out}/${tag}-04-sheet.png` });
  console.log(tag, "sheet", await where(page));
  await page.keyboard.press("Escape");
  await page.getByTestId("bw-settings-open").click().catch(() => {});
  await page.waitForTimeout(300);
  if (await page.getByTestId("bw-settings").count()) {
    await page.getByTestId("bw-settings").screenshot({ path: `${out}/${tag}-05-settings.png` });
    await page.locator('[data-needs-close="settings"] .btn-close').click();
  }
  // pause and leave it: Play after 8 seconds
  await page.waitForTimeout(300);
  for (let i = 0; i < 10 && (await page.locator('[data-needs="carry-on"]').count()); i++) { await page.locator('[data-needs="carry-on"]').first().click().catch(() => {}); await page.waitForTimeout(300); }
  if ((await page.getByTestId("bw-play").getAttribute("aria-pressed")) === "true") await page.getByTestId("bw-play").click();
  console.log(tag, "paused at once", await where(page));
  await page.waitForTimeout(8600);
  await page.screenshot({ path: `${out}/${tag}-06-idle.png` });
  console.log(tag, "paused idle", await where(page));
  await page.context().close();
}

// step by step, and Welsh
{
  const page = await open({ width: 1280, height: 800 }, { step: true });
  await page.screenshot({ path: `${out}/1280-07-step.png` });
  console.log("step", await where(page));
  await page.context().close();
}
{
  const page = await open({ width: 1280, height: 800 }, { lang: "cy" });
  await page.getByTestId("bw-play").click();
  await page.waitForSelector('[data-testid="bw-stop"], [data-testid="bw-respond"], [data-testid="bw-term"]', { timeout: 120000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/1280-08-card-cy.png` });
  console.log("cy", await where(page));
  await page.context().close();
}
await browser.close();
