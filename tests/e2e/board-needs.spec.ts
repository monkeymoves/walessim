// v3 package 13 (docs/design/v3-wales.md section 2): the needs-you outline. At 1280 x 800 and
// 1440 x 900, whenever the clock waits for the player exactly one red outline is drawn, round the
// right element: Start time when the game opens, the card's Carry on or answers, a sheet's Close,
// and Play once a paused game is left alone for 8 seconds. Nothing is outlined while time runs or
// just after the player pauses. The chip in the top strip takes the focus to the card's heading,
// never to an answer. The outline pulses, never below 40 in 100, and is steady under reduced
// motion or with "Flashing outline" off. The board stays axe clean with the outline up.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { BOARD_KEY } from "./board-key";

const GAP = 3;

async function fresh(page: Page, prefs: Record<string, unknown> = {}): Promise<void> {
  await page.goto("/#/bwrdd");
  await page.evaluate(({ key, prefs }) => {
    for (const k of ["run", "prefs"]) localStorage.removeItem(key + k);
    localStorage.setItem(key + "guide", "done");
    localStorage.setItem(key + "clocktaught", "done");
    localStorage.setItem("etifeddiaeth.v1.lang", "en");
    localStorage.setItem(key + "prefs", JSON.stringify({ stepByStep: false, holdWhileReading: true, ...prefs }));
  }, { key: BOARD_KEY, prefs });
  await page.reload();
  await page.getByTestId("bw-go").click();
  await expect(page.getByTestId("bw-play")).toBeVisible({ timeout: 30_000 });
}

/** The one outline is drawn round the one element `selector` finds. */
async function outlined(page: Page, selector: string): Promise<void> {
  await expect(page.getByTestId("bw-needs")).toHaveCount(1);
  const targets = page.locator(selector).filter({ visible: true });
  await expect(targets).toHaveCount(1);
  await expect(async () => {
    const ring = await page.getByTestId("bw-needs").boundingBox();
    const box = await targets.boundingBox();
    expect(ring && box).toBeTruthy();
    expect(Math.abs(ring!.x - (box!.x - GAP))).toBeLessThan(2);
    expect(Math.abs(ring!.y - (box!.y - GAP))).toBeLessThan(2);
    expect(Math.abs(ring!.width - (box!.width + 2 * GAP))).toBeLessThan(2.5);
    expect(Math.abs(ring!.height - (box!.height + 2 * GAP))).toBeLessThan(2.5);
  }).toPass({ timeout: 3000 });
  await expect(page.getByTestId("bw-needs")).toContainText("Waiting for you");
  await expect(page.getByTestId("bw-needs-chip")).toContainText("Waiting for you");
}

/** The ring's opacity, sampled every 50 ms for `ms`. */
const opacities = (page: Page, ms: number): Promise<number[]> => page.evaluate(async (ms) => {
  const out: number[] = [];
  for (let t = 0; t < ms; t += 50) {
    const r = document.querySelector('[data-testid="bw-needs-ring"]');
    if (r) out.push(Number(getComputedStyle(r).opacity));
    await new Promise((res) => setTimeout(res, 50));
  }
  return out;
}, ms);

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`the outline marks what the game waits for at ${vp.width} x ${vp.height}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(vp);
    await fresh(page);

    // just opened: Start time, and said once to a screen reader
    await outlined(page, '[data-needs="play"]');
    await expect(page.getByTestId("bw-needs-said")).toContainText("Waiting for you", { timeout: 2000 });
    expect((await new AxeBuilder({ page }).include("[data-testid=board]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);

    // time runs: nothing is outlined
    await page.getByTestId("bw-play").click();
    await expect(page.getByTestId("bw-needs")).toHaveCount(0);

    // a card (Fast is the default speed): its Carry on, or its answers
    await page.waitForSelector('[data-needs="carry-on"], [data-needs="answers"]', { timeout: 120_000 });
    const answer = await page.locator('[data-needs="answers"]').count();
    await outlined(page, answer ? '[data-needs="answers"]' : '[data-needs="carry-on"]');
    // the chip takes the focus to the card's heading, never to a button that answers
    await page.getByTestId("bw-needs-chip").click();
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const card = el?.closest("[data-needs-card]");
      return { tag: el?.tagName ?? "", heading: !!card && card.getAttribute("aria-labelledby") === el?.id };
    });
    expect(focused.tag).not.toBe("BUTTON");
    expect(focused.heading).toBe(true);
    expect((await new AxeBuilder({ page }).include("[data-testid=board]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);

    // clear the cards
    for (let i = 0; i < 30; i++) {
      const pick = page.locator('[data-needs="answers"] button:not([disabled]), [data-needs="deals"] button:not([disabled])');
      const on = page.locator('[data-needs="carry-on"]:not([disabled])');
      if (await pick.count()) await pick.first().click();
      else if (await on.count()) await on.first().click();
      else break;
      await page.waitForTimeout(150);
    }

    // a sheet holds the running clock: its Close (over a card that came meanwhile too, as the settings sit over the lane)
    await page.getByTestId("bw-settings-open").click();
    await outlined(page, '[data-needs-close="settings"] .btn-close');
    await page.locator('[data-needs-close="settings"] .btn-close').click();

    // the player pauses; a card already up keeps time paused after it
    if ((await page.getByTestId("bw-play").getAttribute("aria-pressed")) === "true") await page.getByTestId("bw-play").click();
    for (let i = 0; i < 30 && (await page.locator('[data-needs="carry-on"], [data-needs="answers"]').count()); i++) {
      const pick = page.locator('[data-needs="answers"] button:not([disabled])');
      if (await pick.count()) await pick.first().click(); else await page.locator('[data-needs="carry-on"]').first().click();
      await page.waitForTimeout(150);
    }
    await expect(page.getByTestId("bw-play")).toHaveAttribute("aria-pressed", "false");
    // nothing at once, Play once left alone for 8 seconds
    await page.waitForTimeout(1500);
    await expect(page.getByTestId("bw-needs")).toHaveCount(0);
    await page.waitForTimeout(7500);
    await outlined(page, '[data-needs="play"]');
    await expect(page.getByTestId("bw-needs-chip")).toContainText("press Play");
  });
}

test("the outline pulses for 5 seconds, never below 40 in 100, then stays steady", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await fresh(page);
  const first = await opacities(page, 1500);
  expect(Math.min(...first)).toBeLessThan(0.7);
  expect(Math.min(...first)).toBeGreaterThanOrEqual(0.39);
  await page.waitForTimeout(4000);
  const later = await opacities(page, 1200);
  expect(later.every((o) => o === 1)).toBe(true);
});

test("under reduced motion the outline does not move", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await fresh(page);
  await outlined(page, '[data-needs="play"]');
  const seen = await opacities(page, 1500);
  expect(seen.length).toBeGreaterThan(10);
  expect(seen.every((o) => o === 1)).toBe(true);
  expect(await page.evaluate(() => document.querySelector('[data-testid="bw-needs"]')!.getAnimations({ subtree: true }).length)).toBe(0);
});

test("with Flashing outline off the outline is steady, and the setting is kept", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await fresh(page, { flashingOutline: false });
  // paused at the start, the settings sheet holds nothing: Start time is still the thing to press
  await page.getByTestId("bw-settings-open").click();
  await expect(page.getByTestId("bw-pref-flashing")).not.toBeChecked();
  await outlined(page, '[data-needs="play"]');
  const seen = await opacities(page, 1500);
  expect(seen.every((o) => o === 1)).toBe(true);
});
