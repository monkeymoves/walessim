import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SCREENS: [string, string, string][] = [
  ["title", "#/", "main"],
  ["atlas", "#/heddiw/W06000015", "[data-testid=place-panel]"],
  ["book contents", "#/llyfr", "[data-testid=book-contents]"],
  ["book rule", "#/llyfr/R05", "[data-testid=rule-page]"],
];

async function serious(page: Page): Promise<string[]> {
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return res.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
}

for (const lang of ["en", "cy"] as const) {
  for (const [name, hash, ready] of SCREENS) {
    test(`${name} has no serious accessibility violations (${lang})`, async ({ page }) => {
      await page.addInitScript((l) => localStorage.setItem("etifeddiaeth.v1.lang", l), lang);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/" + hash);
      await expect(page.locator(ready).first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      expect(await serious(page)).toEqual([]);
    });
  }
}

test("the explorer drawer has no serious violations", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("etifeddiaeth.v1.lang", "en"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/heddiw");
  await page.getByTestId("explorer-toggle").click();
  await expect(page.getByTestId("explorer-table")).toBeVisible();
  expect(await serious(page)).toEqual([]);
  await page.getByTestId("tab-scatter").click();
  expect(await serious(page)).toEqual([]);
});

test("keyboard focus is drawn as the cobalt stitch", async ({ page }) => {
  await page.goto("/#/heddiw");
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const cs = getComputedStyle(el);
    return `${cs.outlineStyle} ${cs.outlineColor}`;
  });
  expect(outline).toContain("dashed");
});
