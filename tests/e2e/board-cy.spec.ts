// The board in Cymraeg (playtest 8, must-fix 19): one full game step by step, with the two place
// visits, reading every screen for an English string where a Welsh one exists, a council or town
// left unmutated after its preposition, an article not joined ("o yr haf"), a capital article mid
// sentence, a raw key or empty slot, and a thousands comma. The check is design/scripts/board-cy-lib.mjs.
import { expect, test, type Page } from "@playwright/test";
import { englishOnly, welshFaults } from "../../design/scripts/board-cy-lib.mjs";

const KEY = "etifeddiaeth.board.v2.";
const eng = englishOnly(process.cwd());

async function scan(page: Page, where: string, found: Map<string, string>): Promise<void> {
  const text = await page.locator("body").innerText().catch(() => "");
  for (const line of text.split("\n")) for (const f of welshFaults(line, eng)) {
    const k = `${f}: ${line.trim().slice(0, 160)}`;
    if (!found.has(k)) found.set(k, where);
  }
}

const shown = (page: Page, id: string) => page.getByTestId(id).first().isVisible().catch(() => false);

async function buildThis(page: Page, council: string, project: string): Promise<void> {
  await page.keyboard.press("Escape");
  if (!(await shown(page, "bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click();
  await page.locator(".bw-league-row", { hasText: council }).first().click();
  await page.getByTestId("bw-build-here").click();
  await page.getByTestId(`bw-opt-${project}`).first().click();
  await page.locator("[data-testid=bw-build-it]:not([disabled])").first().click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

test("no Welsh board screen shows English where Welsh exists, or a broken mutation", async ({ page }) => {
  test.setTimeout(600_000);
  const found = new Map<string, string>();
  page.setDefaultTimeout(10_000);
  await page.goto("/#/bwrdd");
  await page.evaluate((key) => {
    for (const k of ["run", "endings", "prefs"]) localStorage.removeItem(key + k);
    localStorage.setItem(key + "guide", "done");
    localStorage.setItem("etifeddiaeth.v1.lang", "cy");
    localStorage.setItem(key + "prefs", JSON.stringify({ stepByStep: true, speed: "steady", holdWhileReading: true, stops: {} }));
  }, KEY);
  await page.reload();
  await expect(page.getByTestId("bw-go")).toBeVisible({ timeout: 30_000 });
  await scan(page, "start", found);
  await page.getByTestId("bw-go").click();
  await expect(page.getByTestId("bw-clock")).toBeVisible({ timeout: 20_000 });
  await scan(page, "board", found);
  await buildThis(page, "Rhondda", "coal-tips-safe");
  await buildThis(page, "Casnewydd", "coast-wetlands");
  await page.keyboard.press("Escape");
  if (!(await shown(page, "bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click();
  await page.locator(".bw-league-row").nth(2).click();
  await scan(page, "council", found);
  await page.getByTestId("bw-build-here").click();
  await scan(page, "build menu", found);
  await page.keyboard.press("Escape");

  for (let guard = 0; guard < 900; guard++) {
    if (await shown(page, "bw-end")) break;
    if (await shown(page, "bp-visit")) {
      await scan(page, "visit", found);
      const opt = page.locator("[data-testid^=bp-opt-], [data-testid=bp-tip]");
      if (await opt.count()) await opt.first().click().catch(() => undefined);
      const choose = page.locator("[data-testid=bp-choose]:not([disabled])");
      if (await choose.count()) { await choose.first().click(); await scan(page, "visit result", found); await page.getByTestId("bp-done").click(); }
      else await page.getByTestId("bp-leave").click();
      continue;
    }
    if (await shown(page, "bw-stop")) {
      await scan(page, "stop", found);
      const go = page.getByTestId("bw-stop-visit");
      if ((await go.isVisible().catch(() => false)) && (await go.isEnabled())) { await go.click(); continue; }
      await page.getByTestId("bw-stop-on").click();
      continue;
    }
    if (await shown(page, "bw-respond")) {
      await scan(page, "respond", found);
      await page.locator("[data-testid=bw-respond-pick]:not([disabled])").first().click();
      continue;
    }
    if (await shown(page, "bw-term")) {
      await scan(page, "term report", found);
      if (await shown(page, "bw-deals")) await page.locator("[data-testid=bw-deal]:not([disabled])").first().click();
      await page.getByTestId("bw-term-on").click();
      continue;
    }
    await page.locator("[data-testid=bw-next-season]:not([disabled])").click({ timeout: 2000 }).catch(() => undefined);
  }
  await expect(page.getByTestId("bw-end")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("be-lapse-skip").click().catch(() => undefined);
  await page.getByTestId("be-count-open").click().catch(() => undefined);
  await scan(page, "end", found);
  expect([...found].map(([k, where]) => `${where} | ${k}`)).toEqual([]);
});
