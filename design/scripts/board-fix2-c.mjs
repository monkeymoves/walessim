// Package C's fix round 2 shots (cold playtest 9): the build menu (one price, button in view, the
// keystone's blocker, upgrades apart, after the keystone), the tree, the laws with their backing
// costs, the council panel (on the rise, backing Why?), the wide term report and a deal.
// Usage: BASE=http://127.0.0.1:4393 node design/scripts/board-fix2-c.mjs [en|cy]
import { mkdirSync } from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.env.BASE ?? "http://127.0.0.1:4393";
const lang = process.argv[2] ?? "en";
const out = "design/shots-build/board-fix2/C";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: Number(process.env.W ?? 1440), height: Number(process.env.H ?? 900) } })).newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(base + "/#/bwrdd");
await page.evaluate(([l]) => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
  localStorage.setItem("etifeddiaeth.v1.lang", l);
  localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
  localStorage.setItem("etifeddiaeth.board.v2.prefs", JSON.stringify({ stepByStep: true, speed: "steady", holdWhileReading: true, stops: {} }));
}, [lang]);
await page.reload();
await page.waitForSelector("[data-testid=bw-go]", { timeout: 30000 });
await page.getByTestId("bw-go").click();
await page.waitForSelector("[data-testid=bw-clock]", { timeout: 20000 });
await page.waitForTimeout(600);
const p = `${lang}${process.env.W ? "-" + process.env.W : ""}`;
const shot = (name) => page.screenshot({ path: `${out}/${p}-${name}.png` });
const visible = (id) => page.getByTestId(id).first().isVisible().catch(() => false);
const bad = new Set();
async function scan(where) {
  const text = await page.locator("[data-testid=board]").innerText().catch(() => "");
  for (const line of text.split("\n")) {
    if (/\d\.\d\d|\{\w+\}|\bboard(ui)?\.[a-z_]+\.|undefined|NaN|\b[a-z]+_[a-z_]+\b|\b[a-z]+:[a-z][\w:-]*\b|\b1 years\b|\b0 years\b/.test(line)) bad.add(`${where}: ${line.trim().slice(0, 160)}`);
  }
}
async function clear(onTerm) {
  for (let i = 0; i < 30; i++) {
    if (await visible("bp-visit")) { await page.getByText(/Leave without choosing|Gadael heb ddewis/).first().click().catch(() => page.keyboard.press("Escape")); continue; }
    if (await visible("bw-respond")) { const r = page.locator("[data-testid=bw-respond-pick]:not([disabled])"); await r.nth(Math.max(0, (await r.count()) - 1)).click({ timeout: 3000 }).catch(() => undefined); continue; }
    if (await visible("bw-term")) { if (onTerm) await onTerm(); if (await visible("bw-deals")) await page.locator("[data-testid=bw-deal]:not([disabled])").first().click(); await page.getByTestId("bw-term-on").click({ timeout: 1500 }).catch(() => page.locator(".bw-term-foot button").first().click({ timeout: 1500 }).catch(() => page.keyboard.press("Escape"))); continue; }
    if (await visible("bw-deals")) { await page.locator("[data-testid=bw-deal]:not([disabled])").first().click(); continue; }
    if (await visible("bw-stop")) { await page.getByTestId("bw-stop-on").click().catch(() => undefined); continue; }
    return;
  }
}
const next = async () => { await page.locator("[data-testid=bw-next-season]:not([disabled])").click({ timeout: 2000 }).catch(() => undefined); await page.waitForTimeout(40); };
async function openCouncil(name) {
  await page.keyboard.press("Escape");
  if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] .bw-council-head button").first().click().catch(() => undefined);
  await page.locator(".bw-league-row", { hasText: name }).first().click({ timeout: 2500 }).catch(async () => { await clear(); });
  await page.waitForTimeout(500);
}
async function menu(name) {
  await openCouncil(name);
  await page.getByTestId("bw-build-here").click({ timeout: 2500 }).catch(() => undefined);
  await page.waitForTimeout(300);
}
/** Is an element's whole box inside the build menu's scroll area? */
const inView = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s), box = document.querySelector(".bw-build-scroll");
  if (!el || !box) return false;
  const a = el.getBoundingClientRect(), b = box.getBoundingClientRect();
  return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
}, sel);
const checks = [];

// 1. the build menu in the council with a fresh start, a card opened: its button in view
const BG = lang === "cy" ? "Blaenau" : "Blaenau";
await menu(BG);
await scan("menu"); await shot("01-menu-fresh");
await page.locator("[data-testid=bw-opt-frequent-trains]").first().click();
await page.waitForTimeout(400);
checks.push(["button in view after one click (frequent trains)", await inView("[data-testid=bw-build-it]")]);
await shot("02-card-open");
// the keystone at the foot of the valleys branch: one click shows its blocker in view
await page.locator("[data-testid=bw-opt-work-up-the-line]").first().click();
await page.waitForTimeout(400);
checks.push(["keystone blocker in view after one click", await inView(".bw-ticket.open .bw-ticket-act")]);
await shot("03-keystone-open");
// build the trains: the fresh start goes, prices go back to full
await page.locator("[data-testid=bw-opt-frequent-trains]").first().click();
await page.waitForTimeout(200);
await page.getByTestId("bw-build-it").click();
await page.waitForTimeout(400);
await shot("04-after-build");
// 2. the tree and the laws
await page.keyboard.press("Escape");
const toRegion = async () => { for (let i = 0; i < 3 && !(await visible("bw-region")); i++) { await page.keyboard.press("Escape"); await page.locator("[data-testid=bw-council] .bw-council-head button").first().click({ timeout: 1500 }).catch(() => undefined); } };
await toRegion();
await page.getByTestId("bw-tree-open").click().catch(() => undefined);
await page.waitForTimeout(400);
await scan("tree"); await shot("05-tree");
await page.keyboard.press("Escape");
await toRegion();
await page.locator(".bw-council-foot button").nth(1).click().catch(() => undefined);
await page.waitForTimeout(400);
await scan("laws"); await shot("06-laws");
await page.keyboard.press("Escape");

// 3. play careless: pass every law at once, build little, so an election is lost and a deal made
let passed = 0;
const passLaws = async () => {
  await toRegion();
  await page.locator("[data-testid=bw-region] .bw-council-foot button").nth(1).click().catch(() => undefined);
  await page.waitForTimeout(200);
  const btns = page.locator(".bw-law button:not([disabled])", { hasText: /Pass this law|Pasio/ });
  if (await btns.count()) { await btns.first().click(); passed++; await page.waitForTimeout(200); await shot(`07-law-passed-${passed}`); }
  await page.keyboard.press("Escape");
};
await passLaws();
let terms = 0, dealShot = false, upgradeShot = false, riseShot = false;
for (let guard = 0; guard < 400; guard++) {
  if (await visible("bw-end")) break;
  if (process.env.UNTIL && (await page.getByTestId("bw-year").textContent().catch(() => "") ?? "").replace(/\D/g, "").slice(0, 4) >= process.env.UNTIL) break;
  const y = Number(((await page.getByTestId("bw-year").textContent().catch(() => "")) ?? "").replace(/\D/g, "").slice(0, 4));
  await clear(async () => {
    terms++;
    await scan(`term ${y}`);
    await shot(`10-term-${y}`);
    if (await visible("bw-deals")) { dealShot = true; await shot(`11-deal-${y}`); }
    if (await visible("bw-term-deals")) await shot(`12-term-deals-${y}`);
  });
  if (y >= 2031 && y % 4 === 3 && passed < 3) await passLaws();
  if (!upgradeShot && y >= 2029) {
    await menu(BG);
    const up = page.locator(".bw-ticket.upgrade");
    if (await up.count()) {
      await up.first().scrollIntoViewIfNeeded();
      await shot("20-upgrades-apart");
      await up.first().locator(".bw-ticket-face").click().catch(() => undefined);
      await page.waitForTimeout(300);
      checks.push(["upgrade button says bigger", /bigger|fwy/i.test((await page.getByTestId("bw-build-it").textContent().catch(() => "")) ?? "")]);
      await shot("21-upgrade-open");
      upgradeShot = true;
    }
    await page.keyboard.press("Escape");
  }
  if (!riseShot) {
    const rising = await page.locator(".bw-momentum").count().catch(() => 0);
    if (rising) { await scan("council"); await shot("30-council-momentum"); riseShot = true; }
  }
  if (y % 5 === 0 && y > 2030) {
    await menu(["Merthyr", "Rhondda", "Caerphilly", "Newport"][y % 4]);
    await scan(`menu ${y}`);
    const go = page.locator(".bw-ticket:not(.locked):not(.upgrade) .bw-ticket-face");
    if (await go.count()) { await go.first().click().catch(() => undefined); await page.getByTestId("bw-build-it").click({ timeout: 2000 }).catch(() => undefined); }
    await page.keyboard.press("Escape");
  }
  if (y === 2043) {
    await menu("Merthyr");
    await page.locator(".bw-build-scroll").evaluate((e) => e.scrollTo(0, e.scrollHeight));
    await shot("40-menu-late-foot");
    const ks = page.locator(".bw-ticket.keystone .bw-ticket-face");
    if (await ks.count()) { await ks.last().click(); await page.waitForTimeout(400); checks.push(["late keystone action in view", await inView(".bw-ticket.open .bw-ticket-act")]); await shot("41-keystone-late-open"); }
    await page.keyboard.press("Escape");
  }
  await next();
}
await shot("90-end");
console.log(JSON.stringify({ terms, dealShot, upgradeShot, riseShot, passed, checks, bad: [...bad].slice(0, 30), errors: errors.slice(0, 10) }, null, 1));
await browser.close();
