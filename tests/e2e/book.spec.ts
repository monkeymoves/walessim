import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("etifeddiaeth.v1.lang", "en");
    if (!sessionStorage.getItem("seeded")) {
      localStorage.removeItem("etifeddiaeth.v1.overrides");
      sessionStorage.setItem("seeded", "1");
    }
  });
});

test("the model book lists the rules and shows one", async ({ page }) => {
  await page.goto("/#/llyfr");
  const contents = page.getByTestId("book-contents");
  await expect(contents).toBeVisible();
  await expect(contents.locator("a.rulelink")).toHaveCount(35);
  await page.getByTestId("rule-link-R05").click();
  await expect(page).toHaveURL(/#\/llyfr\/R05$/);
  await expect(page.getByTestId("rule-title")).toHaveText("The grid gets cleaner anyway");
  await expect(page.getByTestId("rule-sentence")).not.toBeEmpty();
  await expect(page.getByTestId("rule-page")).toContainText("Linear");
  await expect(page.getByTestId("rule-page").locator("button.docket")).not.toHaveCount(0);
});

test("changing a parameter shows the modified rule set badge, and putting it back clears it", async ({ page }) => {
  await page.goto("/#/llyfr/R05");
  await expect(page.getByTestId("modified-badge")).toHaveCount(0);
  const slider = page.locator("input[type=range]").first();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("modified-badge")).toBeVisible();
  await expect(page.getByTestId("modified-badge")).toContainText("You are playing a modified rule set");
  await expect(page).toHaveURL(/rules=R05\.coef:/);
  const stored = await page.evaluate(() => localStorage.getItem("etifeddiaeth.v1.overrides"));
  expect(stored).toContain("R05.coef");
  // the badge is app-wide
  await page.goto("/#/heddiw");
  await expect(page.getByTestId("modified-badge")).toBeVisible();
  await page.getByRole("button", { name: "Put the rules back" }).click();
  await expect(page.getByTestId("modified-badge")).toHaveCount(0);
  await expect(page).not.toHaveURL(/rules=/);
});

test("a shared link with rules applies them", async ({ page }) => {
  await page.goto("/?rules=R05.coef:0.3#/llyfr/R05");
  await expect(page.getByTestId("modified-badge")).toBeVisible();
  await expect(page.getByTestId("param-R05.coef")).toContainText("0.30");
});

test("the other book pages render", async ({ page }) => {
  const pages: [string, string][] = [["indicators", "indicators-page"], ["strands", "strands-page"], ["cards", "cards-page"], ["curveballs", "curveballs-page"], ["sources", "sources-page"]];
  for (const [hash, id] of pages) {
    await page.goto(`/#/llyfr/${hash}`);
    await expect(page.getByTestId(id)).toBeVisible();
  }
});
