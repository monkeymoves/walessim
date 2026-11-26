// Place visits: the Rhondda (tips, what sits below, the rule with its distance slider, honest
// sources) and Bethesda and Dyffryn Ogwen (ten options, five flags, three threads). The grade
// comes from the engine after the choice and is never shown before it.
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TRIGGERS = {
  rhondda: /coal tips|Slow the flow|Buses and rail/i,
  bethesda: /Homes for locals|Community-owned|Tourism pays|Welsh-medium/i,
};

async function start(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/yfory");
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.v1.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", "en");
    localStorage.setItem("etifeddiaeth.v1.yfory.onboard", JSON.stringify(["__skip"]));
  });
  await page.reload();
  await expect(page.locator(".yf")).toBeVisible({ timeout: 30_000 });
  return errors;
}

/** Advance terms until the hand holds a card that asks for `place`, play it, and accept the visit. */
async function reach(page: Page, place: "rhondda" | "bethesda"): Promise<void> {
  for (let guard = 0; guard < 60; guard++) {
    const s = await page.locator(".yf").getAttribute("data-step");
    if (s === "plan") {
      const names = await page.locator(".yf-hand .ticket").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
      const i = names.findIndex((n) => TRIGGERS[place].test(n));
      if (i >= 0) {
        const slot = page.locator(".yf-hand .yf-ticket-slot").nth(i);
        await slot.locator(".yf-ticket-press").click();
        const region = slot.locator(".yf-where .yf-region:not([disabled])");
        if (await region.count()) await region.first().click();
        else await slot.locator(".yf-where .btn-stamp").first().click();
      }
      await page.locator(".yf-commit").click();
    } else if (s === "visit") {
      const h = (await page.locator(".yf-visit-offer h2").textContent()) ?? "";
      if ((place === "bethesda") === /Bethesda/i.test(h)) {
        await page.locator(".yf-visit-offer .btn-stamp").click();
        await expect(page.locator(".pl-ledger")).toBeVisible({ timeout: 20_000 });
        return;
      }
      await page.locator(".yf-visit-offer .btn-tab").click();
    } else if (s === "passing") {
      const shock = page.locator(".yf-shock .btn-tab");
      if (await shock.count()) await shock.first().click();
      else await page.waitForTimeout(400);
    } else if (s === "caretaker") {
      await page.locator(".yf-shadow button").first().click();
      await page.locator(".yf-rail .yf-go").click();
    } else if (s === "ended") {
      throw new Error(`${place} never asked for you`);
    } else {
      await page.locator(".yf-rail .yf-go").first().click();
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`could not reach ${place}`);
}

test("the Rhondda: tips, what sits below, the rule and its slider, three threads, a grade", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await start(page);
  await reach(page, "rhondda");
  await expect(page.locator(".pl-ledger tbody tr")).toHaveCount(17);
  await expect(page.locator(".pl-prompt")).toContainText("more tips than thread");
  // what sits below one tip
  await page.locator(".pl-rowbtn").nth(8).click();
  const below = page.locator(".pl-below");
  await expect(below).toBeVisible();
  await expect(below).toContainText("Homes land below");
  await expect(below).toContainText(/BGS|OpenStreetMap/);
  // the rule card: honest about the register, and the slider changes the counts
  await below.locator(".threadlink").click();
  const rule = page.locator(".pl-rule");
  await expect(rule).toContainText("not open data");
  const before = await below.locator(".pl-fig").textContent();
  await rule.locator("input[type=range]").fill("1500");
  await expect(rule).toContainText("1500 m");
  const after = await below.locator(".pl-fig").textContent();
  expect(Number.parseFloat(after ?? "0")).toBeGreaterThanOrEqual(Number.parseFloat(before ?? "0"));
  // no grade before the choice: only the tests are named
  await expect(page.locator(".pl-grade")).toHaveCount(0);
  // as many threads as the money covers (three, or two for the buses or slow-the-flow), and no more
  const max = await page.locator(".pl-spool").count();
  expect(max === 2 || max === 3).toBe(true);
  for (const r of [12, 2, 8].slice(0, max)) {
    await page.locator(".pl-rowbtn").nth(r).click();
    await page.locator(".pl-below .btn-stitch").click();
  }
  await page.locator(".pl-rowbtn").nth(5).click();
  await expect(page.locator(".pl-below .btn-stitch")).toBeDisabled();
  await expect(page.locator(".pl-ledger .pl-tag.stitched")).toHaveCount(max);
  const res = await new AxeBuilder({ page }).include(".yf").disableRules(["region"]).analyze();
  expect(res.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  await page.locator(".pl-foot .btn-stamp").click();
  await expect(page.locator(".pl-grade .stampmark")).toHaveText(/poorly|adequately|well/i);
  await expect(page.locator(".pl-tests li")).toHaveCount(3);
  await page.locator(".pl-grade .btn-stamp").click();
  await expect(page.locator(".pl-visit")).toHaveCount(0, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("Bethesda and Dyffryn Ogwen: ten options with their flags, three threads, fold back without playing", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await start(page);
  await reach(page, "bethesda");
  await expect(page.locator(".pl-ledger tbody tr")).toHaveCount(10);
  await expect(page.locator(".pl-ledger thead")).toContainText("Iaith");
  await page.locator(".pl-rowbtn").nth(6).click();
  await expect(page.locator(".pl-below")).toContainText("The catch");
  await page.locator(".pl-below .btn-stitch").click();
  await expect(page.locator(".pl-spools")).toContainText(/1 of [23]/);
  // keyboard: the rows are buttons, Escape closes the card
  await page.locator(".pl-rowbtn").nth(3).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".pl-below")).toContainText(/Park and ride/i);
  await page.keyboard.press("Escape");
  // fold back without playing resolves adequately
  await page.locator(".pl-foot .btn-tab").click();
  await expect(page.locator(".pl-visit")).toHaveCount(0, { timeout: 15_000 });
  expect(errors).toEqual([]);
});
