// Yfory end to end: a full game to 2050 by clicking, in English and in Welsh, with a Rhondda
// visit, a Bethesda visit, a shock response, a pulled thread and the end screen; no console
// errors; axe on the game screen, a place visit and the end screen.
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SAVE_KEYS = ["etifeddiaeth.v1.save", "etifeddiaeth.v1.yfory.letters", "etifeddiaeth.v1.yfory.onboard", "etifeddiaeth.v1.yfory.daily"];

async function fresh(page: Page, lang: "en" | "cy", skipGuide = true): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/yfory");
  await page.evaluate(({ keys, lang, skip }) => {
    for (const k of keys) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", lang);
    if (skip) localStorage.setItem("etifeddiaeth.v1.yfory.onboard", JSON.stringify(["__skip", "hand", "ticket", "play", "region", "post", "commit", "strands", "pull", "trust"]));
  }, { keys: SAVE_KEYS, lang, skip: skipGuide });
  // a fixed seed so the game is the same every run (the first game in a browser is the guided one)
  await page.goto("/#/yfory?seed=20261126");
  await page.reload();
  await expect(page.locator(".yf")).toBeVisible({ timeout: 30_000 });
  return errors;
}

const step = (page: Page) => page.locator(".yf").getAttribute("data-step");

async function axe(page: Page, label: string): Promise<void> {
  const res = await new AxeBuilder({ page }).include(".yf").disableRules(["region"]).analyze();
  const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${label}: ${v.id} ${v.nodes.length} ${v.nodes[0]?.target}`)).toEqual([]);
}

/** Play the cards the plan can afford, preferring the ones that trigger the place we want next. */
async function plan(page: Page, want: "rhondda" | "bethesda" | null): Promise<void> {
  const hand = page.locator(".yf-hand .yf-ticket-slot");
  const n = await hand.count();
  const order = [...Array(n).keys()];
  const triggers: Record<string, RegExp> = {
    rhondda: /coal tips|tomenni glo|Slow the flow|Arafu|Buses and rail|Bysiau/i,
    bethesda: /Homes for locals|Cartrefi i bobl leol|Community-owned|berchnogaeth gymunedol|Tourism pays|Twristiaeth|Welsh-medium|cyfrwng Cymraeg/i,
  };
  if (want) {
    const names = await hand.locator(".ticket").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    order.sort((a, b) => Number(triggers[want]!.test(names[b]!)) - Number(triggers[want]!.test(names[a]!)));
  }
  let played = 0;
  for (const i of order) {
    if (played >= 2) break;
    const slot = hand.nth(i);
    if (await slot.locator(".ticket-why, .ticket-figs.blocked").count()) continue;
    await slot.locator(".yf-ticket-press").click();
    const where = page.locator(".yf-tray .yf-where");
    const regions = where.locator(".yf-region:not([disabled])");
    const stamp = where.locator(".btn-stamp:not([disabled])");
    const before = await page.locator(".yf-ticket-slot.played").count();
    if (await regions.count()) {
      // two-region cards need two picks and a stamp
      await regions.nth(0).click();
      if ((await page.locator(".yf-ticket-slot.played").count()) === before && (await regions.count()) > 1) {
        await regions.nth(1).click();
        if (await stamp.count()) await stamp.first().click();
      }
    } else if (await stamp.count()) {
      await stamp.first().click();
    }
    if ((await page.locator(".yf-ticket-slot.played").count()) > before) played += 1;
    else await slot.locator(".yf-ticket-press").click();
  }
  await page.locator(".yf-commit").click();
}

/** Place the threads at a place, check axe once, confirm, and fold back. */
async function visit(page: Page, checkAxe: boolean): Promise<string> {
  await page.locator(".yf-visit-offer .btn-stamp").click();
  await expect(page.locator(".pl-ledger")).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  const place = (await page.locator(".pl-bethesda").count()) ? "bethesda" : "rhondda";
  const rows = page.locator(".pl-rowbtn");
  const picks = place === "rhondda" ? [7, 8, 13] : [0, 7, 3];
  for (const r of picks) {
    await rows.nth(r).click();
    const stitch = page.locator(".pl-below .btn-stitch:not([disabled])");
    if (await stitch.count()) await stitch.click();
  }
  if (place === "rhondda") {
    await page.locator(".pl-rhondda .threadlink").first().click();
    await expect(page.locator(".pl-rule input[type=range]")).toBeVisible();
    await page.locator(".pl-rule input[type=range]").fill("700");
  }
  if (checkAxe) await axe(page, `place ${place}`);
  await page.locator(".pl-foot .btn-stamp").click();
  await expect(page.locator(".pl-grade")).toBeVisible();
  await expect(page.locator(".pl-grade .stampmark")).toBeVisible();
  await page.locator(".pl-grade .btn-stamp").click();
  await expect(page.locator(".pl-visit")).toHaveCount(0, { timeout: 15_000 });
  return place;
}

interface Seen { places: Set<string>; shock: boolean; trace: boolean; axeGame: boolean; axePlace: boolean }

async function playToEnd(page: Page, seen: Seen): Promise<void> {
  for (let guard = 0; guard < 80; guard++) {
    const s = await step(page);
    if (s === "ended") return;
    if (s === "opening" || s === "pledge" || s === "election") {
      await page.locator(".yf-rail .yf-go").first().click();
    } else if (s === "plan") {
      if (!seen.axeGame) { await axe(page, "game"); seen.axeGame = true; }
      const want = !seen.places.has("rhondda") ? "rhondda" : !seen.places.has("bethesda") ? "bethesda" : null;
      await plan(page, want);
    } else if (s === "visit") {
      const name = (await page.locator(".yf-visit-offer h2").textContent()) ?? "";
      const isBeth = /Bethesda/i.test(name);
      const need = isBeth ? !seen.places.has("bethesda") : !seen.places.has("rhondda");
      if (need) seen.places.add(await visit(page, !seen.axePlace).then((p) => { seen.axePlace = true; return p; }));
      else await page.locator(".yf-visit-offer .btn-tab").click();
    } else if (s === "passing") {
      const shock = page.locator(".yf-shock");
      if (await shock.count()) {
        const respond = shock.locator(".btn-stamp:not([disabled])");
        if (await respond.count()) await respond.click();
        else await shock.locator(".btn-tab").first().click();
        seen.shock = true;
      } else {
        await page.waitForTimeout(300);
        const run = page.locator(".yf-rail .yf-go");
        if ((await step(page)) === "passing" && (await run.count())) await run.click();
      }
    } else if (s === "changed") {
      if (!seen.trace) {
        await page.locator(".yf-slip-paper .threadlink").first().click();
        await expect(page.locator(".yf-trace")).toBeVisible();
        await expect(page.locator(".yf-trace-end")).toBeVisible();
        await page.keyboard.press("Escape");
        seen.trace = true;
      }
      await page.locator(".yf-rail .yf-go").click();
    } else if (s === "caretaker") {
      await page.locator(".yf-shadow button").first().click();
      await page.locator(".yf-rail .yf-go").click();
    }
    await page.waitForFunction((prev) => document.querySelector(".yf")?.getAttribute("data-step") !== prev || prev === "plan", s, { timeout: 15_000 }).catch(() => undefined);
  }
  throw new Error("the game did not reach 2050");
}

for (const lang of ["en", "cy"] as const) {
  test(`a full game to 2050 in ${lang === "en" ? "English" : "Welsh"}`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = await fresh(page, lang);
    await expect(page.locator(".yf-hook")).toBeVisible();
    const seen: Seen = { places: new Set(), shock: false, trace: false, axeGame: false, axePlace: false };
    await playToEnd(page, seen);
    // the end screen: the letter, then Lived and Left
    await page.locator(".end-envelope .btn-stamp").click();
    await expect(page.locator(".end-letter")).toBeVisible();
    await expect(page.locator(".end-bands")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".end-band")).toHaveCount(2);
    await axe(page, "end");
    expect(seen.places.has("rhondda"), "visited the Rhondda").toBe(true);
    expect(seen.places.has("bethesda"), "visited Bethesda").toBe(true);
    expect(seen.shock, "responded to a shock").toBe(true);
    expect(seen.trace, "pulled a thread").toBe(true);
    // language attribute follows the toggle
    expect(await page.locator(".yf").getAttribute("lang")).toBe(lang);
    expect(errors).toEqual([]);
  });
}

test("switching language mid-game keeps the game", async ({ page }) => {
  const errors = await fresh(page, "en");
  await page.locator(".yf-hook .btn-stamp").click();
  await expect(page.locator(".yf-hand")).toBeVisible();
  await page.locator(".yf-hand .yf-ticket-press").first().click();
  const year = await page.locator(".topbar-year").textContent();
  await page.getByRole("button", { name: "Cymraeg" }).click();
  await expect(page.locator(".yf")).toHaveAttribute("lang", "cy");
  await expect(page.locator(".topbar-year")).toHaveText(year ?? "");
  await expect(page.locator(".yf").getAttribute("data-step")).resolves.toBe("plan");
  await page.getByRole("button", { name: "English" }).click();
  expect(errors).toEqual([]);
});

test("the first term can be played by keyboard, and the game resumes after a reload", async ({ page }) => {
  await fresh(page, "en", false);
  // the guide's first note is there and can be skipped
  await page.locator(".yf-hook .btn-stamp").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-note="hand"]')).toBeVisible();
  // one tab stop for the hand: focus the first ticket, arrow down, P plays a national card or asks where
  await page.locator(".yf-hand .yf-ticket-press").first().focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator(".yf-where")).toBeVisible();
  const region = page.locator(".yf-where .yf-region:not([disabled])").first();
  if (await region.count()) { await region.focus(); await page.keyboard.press("Enter"); }
  else { await page.locator(".yf-where .btn-stamp").focus(); await page.keyboard.press("Enter"); }
  await expect(page.locator(".yf-ticket-slot.played")).toHaveCount(1);
  await page.locator(".yf-commit").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".yf")).not.toHaveAttribute("data-step", "plan");
  const before = await page.locator(".yf").getAttribute("data-step");
  await page.reload();
  await expect(page.locator(".yf")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".yf")).toHaveAttribute("data-step", before ?? "");
});

test("the Cymraeg toggle on the title screen switches the language and carries into the game", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.v1.")) localStorage.removeItem(k); });
  await page.reload();
  const hook = page.locator(".title-hook");
  const before = await hook.textContent();
  await page.getByRole("button", { name: "Cymraeg" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "cy");
  await expect(hook).not.toHaveText(before ?? "");
  await page.goto("/#/yfory");
  await expect(page.locator(".yf")).toHaveAttribute("lang", "cy", { timeout: 30_000 });
});
