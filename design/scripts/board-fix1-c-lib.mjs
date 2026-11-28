// Shared helpers for package C's fix shots (design/shots-build/board-fix1/C/).
import { mkdirSync } from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
export const base = process.env.BASE ?? "http://127.0.0.1:4317";
export const out = "design/shots-build/board-fix1/C";
mkdirSync(out, { recursive: true });

export async function open(lang = "en", prefs = { stepByStep: true, speed: "steady", holdWhileReading: true, stops: {} }, game) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base + "/#/bwrdd");
  await page.evaluate(([l, p]) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
    localStorage.setItem("etifeddiaeth.board.v2.prefs", JSON.stringify(p));
  }, [lang, prefs]);
  await page.reload();
  await page.waitForSelector("[data-testid=bw-go]", { timeout: 30000 });
  await page.getByTestId("bw-go").click();
  await page.waitForSelector("[data-testid=bw-clock]", { timeout: 20000 });
  await page.waitForTimeout(600);
  const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
  const visible = (id) => page.getByTestId(id).first().isVisible().catch(() => false);
  /** Lines of board text with more than one decimal, raw keys, empty slots, undefined or NaN. */
  const bad = new Set();
  async function scan(where) {
    const text = await page.locator("[data-testid=board]").innerText().catch(() => "");
    for (const line of text.split("\n")) {
      if (/\d\.\d\d|\{\w+\}|\bboard(ui)?\.[a-z_]+\.|undefined|NaN|project:[a-z]|Various/.test(line)) bad.add(`${where}: ${line.trim().slice(0, 160)}`);
    }
  }
  return { browser, page, errors, shot, visible, scan, bad };
}

/** Clear whatever is waiting: answer events (last option), take deals, read stops, leave visits. */
export async function clear(page, visible, onStop) {
  for (let i = 0; i < 30; i++) {
    if (await visible("bp-visit")) { await page.getByText(/Leave without choosing|Gadael heb ddewis/).first().click().catch(() => page.keyboard.press("Escape")); continue; }
    if (await visible("bw-respond")) { const p = page.locator("[data-testid=bw-respond-pick]:not([disabled])"); await p.nth(Math.max(0, (await p.count()) - 1)).click({ timeout: 3000 }).catch(() => undefined); continue; }
    if (await visible("bw-deals")) { await page.locator("[data-testid=bw-deal]:not([disabled])").first().click(); continue; }
    if (await visible("bw-term")) { if (onStop) await onStop("term"); await page.getByTestId("bw-term-on").click(); continue; }
    if (await visible("bw-stop")) { if (onStop) await onStop("stop"); await page.getByTestId("bw-stop-on").click(); continue; }
    return;
  }
}

export async function next(page) {
  const run = page.locator("[data-testid=bw-next-season]:not([disabled])");
  await run.click({ timeout: 2000 }).catch(() => undefined);
  await page.waitForTimeout(60);
}

/** Open a council by its row in the region list (by name), then the build menu. */
export async function openCouncil(page, name) {
  await page.keyboard.press("Escape");
  if (!(await page.getByTestId("bw-region").isVisible().catch(() => false))) {
    await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => undefined);
  }
  await page.locator(".bw-league-row", { hasText: name }).first().click();
  await page.waitForTimeout(700);
}
