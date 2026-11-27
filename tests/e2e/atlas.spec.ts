import { expect, test, type Page } from "@playwright/test";

async function openAtlas(page: Page, hash = "#/heddiw"): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("etifeddiaeth.v1.lang", "en");
    localStorage.removeItem("etifeddiaeth.v1.atlas.lens");
    localStorage.removeItem("etifeddiaeth.v1.atlas.columns");
  });
  await page.goto("/" + hash);
  await expect(page.getByTestId("atlas")).toBeVisible();
  await expect(page.locator("canvas.paper-map-national")).toBeVisible();
}

test("the atlas loads with a lens and its key", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openAtlas(page);
  await expect(page.getByTestId("lens-name")).toHaveText("Welsh speakers aged 3 and over");
  await expect(page.getByRole("group", { name: "What the colours mean" })).toContainText("Wales");
  expect(errors).toEqual([]);
});

test("changing the lens changes the map", async ({ page }) => {
  await openAtlas(page);
  const canvas = page.locator("canvas.paper-map-national");
  await page.waitForTimeout(400);
  const before = await canvas.screenshot();
  await page.getByRole("button", { name: "Colour the map by..." }).click();
  // the list opens on the current measure's goal; other goals fold until opened
  await expect(page.getByTestId("lens-employment")).toHaveCount(0);
  await page.getByTestId("lensgroup-prosperous").click();
  await expect(page.getByTestId("lensgroup-prosperous")).toHaveAttribute("aria-expanded", "true");
  await page.getByTestId("lens-employment").check();
  await expect(page.getByTestId("lens-name")).toHaveText("Employment rate, 16 to 64");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
});

test("selecting Cardiff by keyboard shows its panel with sources", async ({ page }) => {
  await openAtlas(page);
  const cardiff = page.locator("button.kbd-la", { hasText: /^Cardiff/ });
  await cardiff.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByTestId("place-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2 })).toContainText("Cardiff");
  await expect(panel.getByRole("heading", { level: 2 })).toContainText("Caerdydd");
  await expect(page).toHaveURL(/#\/heddiw\/W06000015/);
  const dockets = panel.locator("button.docket");
  expect(await dockets.count()).toBeGreaterThanOrEqual(5);
  await dockets.first().click();
  await expect(panel.getByRole("dialog")).toContainText("Office for National Statistics");
  await expect(panel.getByRole("link", { name: "Open the source" })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("the explorer table sorts by a column", async ({ page }) => {
  await openAtlas(page);
  await page.getByTestId("explorer-toggle").click();
  const table = page.getByTestId("explorer-table");
  await expect(table).toBeVisible();
  const firstRow = () => table.locator("tbody tr").first().locator("th");
  await expect(firstRow()).toHaveText("Blaenau Gwent");
  await page.getByTestId("sort-pop").click();
  await expect(firstRow()).toHaveText("Cardiff");
  await expect(table.locator("th[aria-sort=descending]")).toHaveCount(1);
  await page.getByTestId("sort-pop").click();
  await expect(firstRow()).toHaveText("Merthyr Tydfil");
  await expect(table.locator("th[aria-sort=ascending]")).toHaveCount(1);
  // the column chooser folds by goal; a new measure can be added as a column and sorted
  await page.getByRole("button", { name: "Choose the columns" }).click();
  await page.getByTestId("colgroup-resilient").click();
  await page.getByTestId("col-woodland_cover").check();
  await page.keyboard.press("Escape");
  await page.getByTestId("sort-woodland_cover").click();
  await expect(firstRow()).toHaveText("Neath Port Talbot");
  await page.getByTestId("tab-scatter").click();
  await expect(page.getByTestId("scatter")).toBeVisible();
  await expect(page.getByTestId("scatter").locator("g.mark")).toHaveCount(22);
  await expect(page.getByTestId("scatter-x").locator("optgroup")).toHaveCount(7);
});

test("switching to Cymraeg changes the interface and the place names", async ({ page }) => {
  await openAtlas(page, "#/heddiw/W06000015");
  await expect(page.getByTestId("place-panel").getByRole("heading", { level: 2 }).locator("span").first()).toHaveText("Cardiff");
  await page.getByRole("button", { name: "Cymraeg" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "cy");
  await expect(page.getByRole("button", { name: /^Lliwio['’]r map yn ôl/ })).toBeVisible();
  await expect(page.getByTestId("place-panel").getByRole("heading", { level: 2 }).locator("span").first()).toHaveText("Caerdydd");
  await expect(page.getByTestId("lens-name")).toHaveText("Siaradwyr Cymraeg 3 oed a throsodd");
  await expect(page.locator("button.kbd-la", { hasText: /^Abertawe/ })).toHaveCount(1);
});

test("a narrow screen gets the notice and a stacked atlas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAtlas(page);
  await expect(page.getByTestId("phone-notice")).toBeVisible();
  await expect(page.getByTestId("explorer-table")).toBeVisible();
});

test("Home goes back to the title from the atlas and the rule book", async ({ page }) => {
  await openAtlas(page);
  await page.getByTestId("home").click();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto("/#/llyfr");
  await page.getByTestId("home").click();
  await expect(page).toHaveURL(/#\/$/);
});
