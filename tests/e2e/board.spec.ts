// The board (#/bwrdd) end to end (docs/design/v2-board.md 16.7, package 12): a full game step by
// step in English and in Cymraeg with a place visit each, one game on the clock at fast speed with
// pause and resume and a hard stop that holds the clock, the end screen in order, the run code
// round trip, axe on each screen, the board's rule book pages, and #/yfory still plays a v1 turn.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const KEY = "etifeddiaeth.board.v2.";

interface Setup { lang: "en" | "cy"; stepByStep: boolean; speed?: string; softStops?: boolean }

/** A fresh board: no saved run, the guide done, the language and clock settings chosen. */
async function fresh(page: Page, s: Setup): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/bwrdd");
  await page.evaluate(({ key, s }) => {
    for (const k of ["run", "endings", "prefs"]) localStorage.removeItem(key + k);
    localStorage.setItem(key + "guide", "done");
    localStorage.setItem("etifeddiaeth.v1.lang", s.lang);
    const off = { warning: false, keystone: false, tier_open: false, tipping: false, chapter: false, deal_due: false, purse_full: false, finished: false, year: false };
    localStorage.setItem(key + "prefs", JSON.stringify({ stepByStep: s.stepByStep, speed: s.speed ?? "steady", holdWhileReading: true, stops: s.softStops ? {} : off }));
  }, { key: KEY, s });
  await page.reload();
  await expect(page.getByTestId("board")).toBeVisible({ timeout: 30_000 });
  return errors;
}

async function axe(page: Page, label: string): Promise<void> {
  const res = await new AxeBuilder({ page }).include("[data-testid=board]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  // soft, so one screen's failure is reported without hiding the checks of the screens after it
  expect.soft(serious.map((v) => `${label}: ${v.id} ${v.nodes.length} ${v.nodes[0]?.target}`)).toEqual([]);
}

/** Click a button: nothing on the board may cover it. */
async function activate(page: Page, loc: ReturnType<Page["locator"]>): Promise<void> {
  await loc.click({ timeout: 5000 });
}

const visible = async (page: Page, id: string) => page.getByTestId(id).first().isVisible().catch(() => false);
const enabled = (page: Page, id: string) => page.locator(`[data-testid="${id}"]:not([disabled])`);

/** Start a game with the first start, then build one project in a council by its row in the region panel. */
async function startAndBuild(page: Page, council: RegExp, project: string): Promise<void> {
  await page.getByTestId("bw-go").click();
  await expect(page.getByTestId("bw-clock")).toBeVisible({ timeout: 20_000 });
  await page.locator(".bw-league-row", { hasText: council }).first().click();
  await expect(page.getByTestId("bw-council")).toBeVisible();
  await page.getByTestId("bw-build-here").click();
  await expect(page.getByTestId("bw-build")).toBeVisible();
  await page.getByTestId(`bw-opt-${project}`).click();
  await enabled(page, "bw-build-it").first().click();
}

/** Settle a place visit: pick (T3 one option, T1 the first three tips), choose, see the grade, go back. */
async function doVisit(page: Page, checkAxe: boolean): Promise<string> {
  await expect(page.getByTestId("bp-visit")).toBeVisible({ timeout: 10_000 });
  const kind = (await page.getByTestId("bp-rhondda").count()) ? "rhondda" : "light";
  if (kind === "rhondda") {
    const tips = page.getByTestId("bp-tip");
    for (const i of [0, 1, 2]) await tips.nth(i).check();
  } else {
    await page.locator("[data-testid^=bp-opt-]").first().click();
  }
  if (checkAxe) await axe(page, `place ${kind}`);
  await enabled(page, "bp-choose").click();
  await expect(page.getByTestId("bp-graded")).toBeVisible();
  await expect(page.locator(".bp-stamp")).toBeVisible();
  await page.getByTestId("bp-done").click();
  await expect(page.getByTestId("bp-visit")).toHaveCount(0);
  return kind;
}

interface Seen { visit: string | null; respond: boolean; term: boolean; axeBoard: boolean; axeTerm: boolean }

/** Settle whatever is on screen. Returns true when something was settled. */
async function settle(page: Page, seen: Seen): Promise<boolean> {
  if (await visible(page, "bp-visit")) { seen.visit = await doVisit(page, true); return true; }
  if (await visible(page, "bw-respond")) {
    await activate(page, enabled(page, "bw-respond-pick").first());
    seen.respond = true;
    return true;
  }
  if (await visible(page, "bw-deals")) { await activate(page, enabled(page, "bw-deal").first()); return true; }
  if (await visible(page, "bw-term")) {
    if (!seen.axeTerm) { await axe(page, "term report"); seen.axeTerm = true; }
    seen.term = true;
    await activate(page, enabled(page, "bw-term-on"));
    return true;
  }
  if (await visible(page, "bw-stop")) {
    if (!seen.visit && (await page.getByTestId("bw-stop-visit").count())) await activate(page, page.getByTestId("bw-stop-visit"));
    else await activate(page, page.getByTestId("bw-stop-on").first());
    return true;
  }
  if (await visible(page, "bw-settings")) { await page.keyboard.press("Escape"); return true; }
  return false;
}

/** Step by step to 2050: settle what is on screen, else "Run to the next moment". */
async function stepToEnd(page: Page, seen: Seen): Promise<void> {
  for (let guard = 0; guard < 400; guard++) {
    if (await visible(page, "bw-end")) return;
    if (await settle(page, seen)) continue;
    if (!seen.axeBoard) { await axe(page, "board"); seen.axeBoard = true; }
    // the place may wait in the council panel when its stop is off
    const ask = page.locator(".bw-council button", { hasText: /visit|ymweld/i });
    if (!seen.visit && (await ask.count())) {
      await ask.first().click({ timeout: 3000 }).catch(() => undefined);
      continue;
    }
    const run = enabled(page, "bw-run-next");
    if (await run.count()) await run.click({ timeout: 3000 }).catch(() => undefined);
    else await enabled(page, "bw-next-season").click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(60);
  }
  throw new Error("the board did not reach 2050");
}

/** The end screen in its order, and the run code round trip. */
async function checkEnd(page: Page, lang: "en" | "cy"): Promise<void> {
  const end = page.getByTestId("bw-end");
  await expect(end).toBeVisible();
  const order = ["be-lapse", "be-name", "be-chapters", "be-thennow", "be-letter", "be-notbuilt", "be-count", "be-run"];
  const tops: number[] = [];
  for (const id of order) {
    await expect(page.getByTestId(id)).toBeVisible();
    tops.push((await page.getByTestId(id).boundingBox())!.y);
  }
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  await expect(page.locator(".be-chapter")).toHaveCount(6);
  await expect(page.getByTestId("be-name").locator("h1")).not.toBeEmpty();
  // the count is folded shut until opened
  await expect(page.getByTestId("be-band")).toBeHidden();
  await page.getByTestId("be-count-open").click();
  await expect(page.getByTestId("be-band")).toBeVisible();
  await expect(page.getByTestId("be-found")).toContainText(/1/);
  await axe(page, "end");
  // the run code: open the same code, see the same game; an old code gets the plain line
  const code = await page.getByTestId("be-code").inputValue();
  expect(code).toMatch(/^b2\./);
  const name = await page.getByTestId("be-name").locator("h1").textContent();
  await page.getByTestId("be-paste").fill(code);
  await page.getByTestId("be-open").click();
  await expect(page.locator(".be-opened")).toBeVisible();
  await expect(page.getByTestId("be-code")).toHaveValue(code);
  await expect(page.getByTestId("be-name").locator("h1")).toHaveText(name ?? "");
  await page.getByTestId("be-back").click();
  await expect(page.locator(".be-opened")).toHaveCount(0);
  await page.getByTestId("be-paste").fill("b1.WzEsIngiXQ");
  await page.getByTestId("be-open").click();
  await expect(page.getByTestId("be-code-error")).toHaveText(lang === "en" ? "This code is from an older version of the game." : "Mae'r cod hwn o fersiwn hŷn o'r gêm.");
  // a saved run comes back to the end after a reload
  await page.reload();
  await expect(page.getByTestId("bw-resume")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("bw-resume").click();
  await expect(page.getByTestId("be-code")).toHaveValue(code);
}

for (const lang of ["en", "cy"] as const) {
  test(`a full board game step by step in ${lang === "en" ? "English" : "Cymraeg"}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = await fresh(page, { lang, stepByStep: true, softStops: true });
    await expect(page.getByTestId("bw-go")).toBeVisible();
    await axe(page, "start");
    // English visits a light place (the Gwent Levels), Cymraeg the Rhondda's tips
    if (lang === "en") await startAndBuild(page, /Newport/, "coast-wetlands");
    else await startAndBuild(page, /Rhondda/, "coal-tips-safe");
    const seen: Seen = { visit: null, respond: false, term: false, axeBoard: false, axeTerm: false };
    await stepToEnd(page, seen);
    expect(seen.term, "an election term report").toBe(true);
    expect(seen.visit, "a place visit").toBe(lang === "en" ? "light" : "rhondda");
    await expect(page.locator(".be-stills")).toBeVisible();
    await checkEnd(page, lang);
    expect(await page.locator("html").getAttribute("lang")).toBe(lang);
    expect(errors).toEqual([]);
  });
}

test("a board game on the clock at fast speed, with pause, resume and a hard stop", async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await fresh(page, { lang: "en", stepByStep: false, speed: "fast" });
  await page.getByTestId("bw-go").click();
  await expect(page.getByTestId("bw-play")).toBeVisible({ timeout: 20_000 });
  const year = () => page.getByTestId("bw-year").textContent();
  // the game opens paused: nothing moves until play
  const opening = await year();
  await page.waitForTimeout(1600);
  expect(await year()).toBe(opening);
  await page.getByTestId("bw-play").click();
  await expect(page.getByTestId("bw-play")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(year, { timeout: 15_000 }).not.toBe(opening);
  // pause holds the date; play carries on
  await page.getByTestId("bw-play").click();
  await expect(page.getByTestId("bw-play")).toHaveAttribute("aria-pressed", "false");
  const paused = await year();
  await page.waitForTimeout(2000);
  expect(await year()).toBe(paused);
  await page.getByTestId("bw-play").click();
  // play carries on, until an event or the election holds it again
  const moved = async () => (await year()) !== paused || (await visible(page, "bw-respond")) || (await visible(page, "bw-term"));
  await expect.poll(moved, { timeout: 15_000 }).toBe(true);
  // the first election (May 2030) is a hard stop: the clock holds while the term report is open
  await expect(page.getByTestId("bw-term").or(page.getByTestId("bw-respond"))).toBeVisible({ timeout: 60_000 });
  const held = await year();
  await page.waitForTimeout(2000);
  expect(await year()).toBe(held);
  const seen: Seen = { visit: "none", respond: false, term: false, axeBoard: true, axeTerm: false };
  for (let guard = 0; guard < 600; guard++) {
    if (await visible(page, "bw-end")) break;
    if (await settle(page, seen)) continue;
    const play = page.getByTestId("bw-play");
    if ((await play.count()) && (await play.getAttribute("aria-pressed")) === "false" && (await play.isEnabled())) await play.click();
    await page.waitForTimeout(250);
  }
  await expect(page.getByTestId("bw-end")).toBeVisible();
  expect(seen.term).toBe(true);
  // the time-lapse plays on the map, can be paused, skipped and scrubbed
  await expect(page.getByTestId("be-lapse")).toBeVisible();
  // the year strip under the time-lapse runs the width of the map
  expect((await page.getByTestId("be-lapse").locator(".bw-tl-track").boundingBox())!.width).toBeGreaterThan(600);
  await page.getByTestId("be-lapse-pause").click();
  await page.getByTestId("be-lapse-skip").click();
  await expect(page.getByTestId("be-lapse-again")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the board's pages in the rule book, beside v1's", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("etifeddiaeth.v1.lang", "en"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/llyfr");
  await expect(page.getByTestId("book-contents")).toBeVisible();
  await page.getByTestId("book-board-tab").click();
  await expect(page.getByTestId("board-book")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("board-rule-S1").click();
  await expect(page.getByTestId("board-rule-page")).toBeVisible();
  for (const p of ["links", "projects", "events", "endings", "chapters"]) {
    await page.goto(`/#/llyfr/bwrdd/${p}`);
    await expect(page.getByTestId(`board-${p}`)).toBeVisible();
  }
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(res.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  // v1's own pages are unchanged
  await page.goto("/#/llyfr/R05");
  await expect(page.getByTestId("rule-page")).toBeVisible();
});

test("#/yfory still plays a v1 turn", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/yfory");
  await page.evaluate(() => {
    for (const k of ["etifeddiaeth.v1.save", "etifeddiaeth.v1.yfory.letters", "etifeddiaeth.v1.yfory.daily"]) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", "en");
    localStorage.setItem("etifeddiaeth.v1.yfory.onboard", JSON.stringify(["__skip", "hand", "ticket", "play", "region", "post", "commit", "strands", "pull", "trust"]));
  });
  await page.goto("/#/yfory?seed=20261126");
  await page.reload();
  await expect(page.locator(".yf")).toBeVisible({ timeout: 30_000 });
  await page.locator(".yf-hook .btn-stamp").click();
  await expect(page.locator(".yf-hand")).toBeVisible();
  const first = await page.locator(".topbar-year").textContent();
  await page.getByTestId("end-turn").click();
  const sheet = page.getByTestId("end-sheet");
  if (await sheet.isVisible().catch(() => false)) {
    for (const id of ["end-save", "end-lose", "end-anyway"]) {
      const b = sheet.getByTestId(id);
      if (await b.count()) { await b.click(); break; }
    }
  }
  for (let guard = 0; guard < 30; guard++) {
    if ((await page.locator(".topbar-year").textContent()) !== first) break;
    const shock = page.locator(".yf-shock .btn-tab");
    if (await shock.count()) await shock.first().click();
    const go = page.locator(".yf-rail .yf-go");
    if (await go.count()) await go.first().click().catch(() => undefined);
    await page.waitForTimeout(400);
  }
  expect(await page.locator(".topbar-year").textContent()).not.toBe(first);
  expect(errors).toEqual([]);
});
