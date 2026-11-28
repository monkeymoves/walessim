// Cold playtest 10, must fix 13 (package C): the map never shrinks into a framed window or ends
// short of the stage. Its zoom eases from a snapshot and fitted to the size it had when it began,
// so a stage that changed size during the ease (a sheet closing, the window resizing) left the
// map drawn small, framed in sea. Here the window changes size while the map zooms back out from
// a council, after the build menu is opened and closed, and at odd sizes; once settled, the top
// band of the map must be land and paper, not the plain sea fill the ease leaves around a frame.
import { expect, test, type Page } from "@playwright/test";

import { BOARD_KEY as KEY } from "./board-key";

async function fresh(page: Page): Promise<void> {
  await page.goto("/#/bwrdd");
  await page.evaluate((key) => {
    for (const k of ["run", "prefs"]) localStorage.removeItem(key + k);
    localStorage.setItem(key + "guide", "done");
    localStorage.setItem(key + "clocktaught", "done");
    localStorage.setItem("etifeddiaeth.v1.lang", "en");
    localStorage.setItem(key + "prefs", JSON.stringify({ stepByStep: true, holdWhileReading: true, stops: {} }));
  }, KEY);
  await page.reload();
  await page.getByTestId("bw-go").click();
  await expect(page.getByTestId("bw-clock")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
}

/**
 * The map's fit, read from its pixels: the share of the canvas's top band and left band that is
 * the flat sea fill (one colour, many pixels alike). A framed map shows a wide band of it.
 */
async function frameShare(page: Page): Promise<number> {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(".bw-map canvas");
    if (!c) return 1;
    const ctx = c.getContext("2d")!;
    const w = c.width, h = c.height;
    // two thin bands just inside the top and left edges, clear of the panels on the right and the key at the bottom left
    const bands = [ctx.getImageData(Math.round(w * 0.05), Math.round(h * 0.03), Math.round(w * 0.5), 1).data, ctx.getImageData(Math.round(w * 0.02), Math.round(h * 0.05), 1, Math.round(h * 0.4)).data];
    let flat = 0, all = 0;
    for (const d of bands) {
      const counts = new Map<string, number>();
      for (let i = 0; i < d.length; i += 4) { const k = `${d[i]},${d[i + 1]},${d[i + 2]}`; counts.set(k, (counts.get(k) ?? 0) + 1); all++; }
      // the ease's sea fill is one exact colour; the paper relief is never one colour for long
      const top = Math.max(...counts.values());
      if (top / (d.length / 4) > 0.3) flat += top;
    }
    return all ? flat / all : 1;
  });
}

async function openAndCloseCouncil(page: Page, withMenu: boolean, resizeTo?: { width: number; height: number }): Promise<void> {
  await page.locator(".bw-league-row").first().click();
  await page.waitForTimeout(700);
  if (withMenu) {
    await page.getByTestId("bw-build-here").click();
    await page.waitForTimeout(600);
    await page.getByTestId("bw-build-here").click();
    await page.waitForTimeout(100);
  }
  await page.locator("[data-testid=bw-council] .bw-council-head button").first().click();
  // change the window while the map eases back out to the region
  if (resizeTo) { await page.waitForTimeout(60); await page.setViewportSize(resizeTo); }
  await page.waitForTimeout(1500);
}

test("the map fills the stage after closing the build menu, at odd sizes, and when the window changes mid zoom", async ({ page }) => {
  for (const size of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1100, height: 820 }]) {
    await page.setViewportSize(size);
    await fresh(page);
    await openAndCloseCouncil(page, true);
    const canvas = await page.locator(".bw-map canvas").first().boundingBox();
    const stage = await page.locator(".bw-stage").first().boundingBox();
    expect(Math.abs(canvas!.width - stage!.width), `${size.width}`).toBeLessThan(2);
    expect(Math.abs(canvas!.height - stage!.height), `${size.width}`).toBeLessThan(2);
    expect(await frameShare(page), `framed at ${size.width} x ${size.height}`).toBeLessThan(0.2);
  }
  // the window grows and shrinks while the map zooms out: once settled, it fills the new stage
  await page.setViewportSize({ width: 1100, height: 760 });
  await fresh(page);
  await openAndCloseCouncil(page, true, { width: 1440, height: 900 });
  expect(await frameShare(page), "after growing mid zoom").toBeLessThan(0.2);
  await openAndCloseCouncil(page, false, { width: 1280, height: 720 });
  expect(await frameShare(page), "after shrinking mid zoom").toBeLessThan(0.2);
});
