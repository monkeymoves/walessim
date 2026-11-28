// A whole board game played with the keyboard only (package 11's "done when"): on the clock at fast
// speed, or step by step. Tab and Enter reach every button; Space plays and pauses; each stop
// takes the focus onto its own button. Prints the stops met and whether 2050 was reached.
// Usage: BASE=http://127.0.0.1:5412 node design/scripts/board-keyboard-check.mjs [clock|step] [en|cy]
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:5412";
const [, , mode = "clock", lang = "en"] = process.argv;
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.setDefaultTimeout(4000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(base + "/#/");
await page.evaluate(({ l, step, all }) => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", l);
  localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
  localStorage.setItem("etifeddiaeth.board.v2.prefs", JSON.stringify({ stepByStep: step, speed: "fast", holdWhileReading: true, stops: all ? Object.fromEntries(["warning", "keystone", "tier_open", "visit", "tipping", "chapter", "deal_due", "purse_full", "finished", "year"].map((k) => [k, true])) : { year: false, finished: false } }));
}, { l: lang, step: mode === "step", all: !!process.env.ALL });
await page.goto(base + "/#/bwrdd");
await page.reload();
await page.waitForSelector(".bw-start-sheet", { timeout: 20000 });

const focused = () => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName ?? "");
/** Tab until the element with this test id has the focus, then press Enter. */
async function tabTo(id, max = 120) {
  for (let i = 0; i < max; i++) {
    if ((await focused()) === id) { await page.keyboard.press("Enter"); return true; }
    await page.keyboard.press("Tab");
  }
  return false;
}
const has = async (id) => (await page.locator(`[data-testid="${id}"]`).count()) > 0;

if (!(await tabTo("bw-go"))) throw new Error("could not reach Start by keyboard");
await page.waitForSelector(".bw-board");
await page.waitForTimeout(800);
// build once, by keyboard: a council from the region list, Build here, the first open ticket, Build it
await page.locator(".bw-league-row").first().focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
await tabTo("bw-build-here");
await page.waitForTimeout(300);
await page.locator(".bw-ticket:not(.locked) .bw-ticket-face").first().focus();
await page.keyboard.press("Enter");
await tabTo("bw-build-it", 40);
await page.keyboard.press("Escape");
await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
if (mode === "clock") await page.keyboard.press("Space");

const seen = new Map();
const t0 = Date.now();
for (let i = 0; i < 3000 && Date.now() - t0 < 8 * 60_000; i++) {
  if (await has("bw-end") || await page.locator(".be-end, [data-testid=be-name]").count()) break;
  const f = await focused();
  if (await has("bw-respond")) { seen.set("respond", (seen.get("respond") ?? 0) + 1); if (f === "bw-respond-pick") await page.keyboard.press("Enter"); else await tabTo("bw-respond-pick", 30); await page.waitForTimeout(100); continue; }
  if (await has("bw-term")) {
    const k = (await page.locator("[data-testid=bw-term-on]").textContent())?.match(/2050/) ? "ended" : "election";
    seen.set(k, (seen.get(k) ?? 0) + 1);
    if (await has("bw-deal")) { seen.set("deal", (seen.get("deal") ?? 0) + 1); if (f !== "bw-deal") await tabTo("bw-deal", 60); else await page.keyboard.press("Enter"); await page.waitForTimeout(150); }
    await tabTo("bw-term-on", 80);
    await page.waitForTimeout(150);
    continue;
  }
  if (await has("bw-stop")) {
    const cls = (await page.locator("[data-testid=bw-stop]").getAttribute("class")) ?? "";
    const k = /bw-stop-([a-z_]+)/.exec(cls)?.[1] ?? "?";
    seen.set(k, (seen.get(k) ?? 0) + 1);
    if (f === "bw-stop-visit") { await page.keyboard.press("Tab"); }
    await tabTo("bw-stop-on", 10);
    await page.waitForTimeout(100);
    continue;
  }
  if (await page.locator(".bp, [data-testid=bp-visit], .bw-novisit").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(150); continue; }
  if (mode === "step") {
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
    await page.keyboard.press("Space");
    await page.waitForTimeout(30);
  } else {
    const playing = await page.locator("[data-testid=bw-play][aria-pressed=true]").count();
    if (!playing) { await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined)); await page.keyboard.press("Space"); }
    await page.waitForTimeout(250);
  }
}
const ended = (await has("bw-end")) || (await page.locator(".be-end, [data-testid=be-name]").count()) > 0;
console.log(mode, lang, "reached the end:", ended, "in", Math.round((Date.now() - t0) / 1000), "s. stops:", JSON.stringify(Object.fromEntries(seen)));
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
await browser.close();
