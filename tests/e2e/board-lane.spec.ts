// Cold playtest 9, must fix 4 and 5 (package B): a stop card or a warning never covers the build
// menu, its Build button or the council panel, and is never clipped, at 1280 x 800 and 1440 x 900.
// Space on a focused button works the clock and does not press the button too.
import { expect, test, type Page } from "@playwright/test";

import { BOARD_KEY as KEY } from "./board-key";
type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
// a slip is pinned askew (rotated about a degree), so its box may reach a few pixels past its edges
const inside = (a: Box, b: Box, slack = 6) => a.x >= b.x - slack && a.y >= b.y - slack && a.x + a.width <= b.x + b.width + slack && a.y + a.height <= b.y + b.height + slack;

async function fresh(page: Page): Promise<void> {
  await page.goto("/#/bwrdd");
  await page.evaluate((key) => {
    for (const k of ["run", "prefs"]) localStorage.removeItem(key + k);
    localStorage.setItem(key + "guide", "done");
    localStorage.setItem(key + "clocktaught", "done");
    localStorage.setItem("etifeddiaeth.v1.lang", "en");
    const stops = { warning: true, keystone: true, tier_open: true, tipping: true, chapter: false, deal_due: true, purse_full: true, finished: true, year: false };
    localStorage.setItem(key + "prefs", JSON.stringify({ stepByStep: false, holdWhileReading: true, stops }));
  }, KEY);
  await page.reload();
  await page.getByTestId("bw-go").click();
  await expect(page.getByTestId("bw-play")).toBeVisible({ timeout: 30_000 });
}

/** Run the clock until a soft stop card is up, settling events and term reports on the way. */
async function untilCard(page: Page): Promise<void> {
  for (let i = 0; i < 400; i++) {
    if (await page.getByTestId("bw-stop").count()) return;
    if (await page.getByTestId("bw-respond").count()) { await page.getByTestId("bw-respond-pick").first().click().catch(() => undefined); continue; }
    if (await page.getByTestId("bw-term").count()) {
      if (await page.getByTestId("bw-deal").count()) await page.getByTestId("bw-deal").first().click().catch(() => undefined);
      await page.getByTestId("bw-term-on").click().catch(() => undefined);
      continue;
    }
    if ((await page.getByTestId("bw-play").getAttribute("aria-pressed")) === "false") await page.getByTestId("bw-play").click();
    await page.waitForTimeout(150);
  }
  throw new Error("no stop card came");
}

async function boxOf(page: Page, testId: string): Promise<Box> {
  const b = await page.getByTestId(testId).first().boundingBox();
  expect(b, testId).not.toBeNull();
  return b!;
}

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`stop cards and warnings sit beside the build menu at ${vp.width} x ${vp.height}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(vp);
    await fresh(page);
    await page.locator(".bw-league-row").first().click();
    await untilCard(page);
    await page.getByTestId("bw-build-here").click();
    await page.locator(".bw-ticket:not(.locked) .bw-ticket-face").first().click();
    await page.waitForTimeout(600); // the cards slide in
    const stage = (await page.locator(".bw-stage").boundingBox())!;
    const build = (await page.locator(".bw-build").boundingBox())!;
    const panel = (await page.locator(".bw-right > *").first().boundingBox())!;
    const card = await boxOf(page, "bw-stop");
    const buildIt = await boxOf(page, "bw-build-it");
    expect(meets(card, build), "card over the build menu").toBe(false);
    expect(meets(card, buildIt), "card over Build it").toBe(false);
    expect(meets(card, panel), "card over the council panel").toBe(false);
    expect(inside(card, stage), "card inside the board").toBe(true);
    // the card's own buttons are on screen, not scrolled away
    expect(inside(await boxOf(page, "bw-stop-on"), stage)).toBe(true);
    // a warning opened from the time line, with the build menu still open
    await page.getByTestId("bw-stop-on").click();
    while (await page.getByTestId("bw-stop").count()) await page.getByTestId("bw-stop-on").click();
    const warn = page.locator(".bw-tl-warning").first();
    if (await warn.count()) {
      await warn.click();
      await page.waitForTimeout(600);
      if (await page.getByTestId("bw-warning").count()) {
        const slip = await boxOf(page, "bw-warning");
        if (await page.locator(".bw-build").count()) expect(meets(slip, (await page.locator(".bw-build").boundingBox())!)).toBe(false);
        expect(meets(slip, (await page.locator(".bw-right > *").first().boundingBox())!)).toBe(false);
        expect(inside(slip, stage)).toBe(true);
      }
    }
  });
}

test("Space on a focused button pauses, and does not press the button as well", async ({ page }) => {
  await fresh(page);
  const play = page.getByTestId("bw-play");
  await play.click();
  await expect(play).toHaveAttribute("aria-pressed", "true");
  const steady = page.getByTestId("bw-speed-steady");
  await steady.focus();
  await page.keyboard.press(" ");
  await expect(play).toHaveAttribute("aria-pressed", "false");
  await expect(steady).toHaveAttribute("aria-checked", "false");
  await expect(page.getByTestId("bw-clock-status")).toContainText("Paused by you");
  // the Play button itself: Space toggles it once, not twice
  await play.focus();
  await page.keyboard.press(" ");
  await expect(play).toHaveAttribute("aria-pressed", "true");
  // Enter on a focused button presses it once
  await play.press("Enter");
  await expect(play).toHaveAttribute("aria-pressed", "false");
});
