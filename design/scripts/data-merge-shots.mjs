// Screenshots of the atlas with 87 measures: the "Colour the map by" list, the explorer table and
// its column chooser, and the dot chart picker, at 1440x900 and 1280x800, in English and Welsh.
// Serve the built app first (npm run build; npx vite preview --port 4175 --strictPort), then:
//   node design/scripts/data-merge-shots.mjs [base]
// Writes PNGs to design/shots-build/data-merge/ and prints layout problems it can measure:
// anything poking outside the window, page-level sideways scroll, and cut-off text in the lists.
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const base = process.argv[2] ?? "http://localhost:4175";
const dir = "design/shots-build/data-merge";
mkdirSync(dir, { recursive: true });
const VPS = [["1440", 1440, 900], ["1280", 1280, 800]];
const browser = await chromium.launch();
const errors = [];
const problems = [];

async function fresh(vp, lang) {
  const ctx = await browser.newContext({ viewport: { width: vp[1], height: vp[2] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("console", (m) => /missing key/.test(m.text()) && errors.push(m.text()));
  await page.addInitScript((l) => {
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    localStorage.removeItem("etifeddiaeth.v1.atlas.lens");
    localStorage.removeItem("etifeddiaeth.v1.atlas.columns");
  }, lang);
  await page.goto(base + "/#/heddiw");
  await page.getByTestId("atlas").waitFor();
  await page.locator("canvas.paper-map-national").waitFor();
  await page.waitForTimeout(700);
  return page;
}

/** Anything in `sel` outside the window, and any clipped text inside it. */
async function measure(page, name, sel) {
  const r = await page.evaluate((sel) => {
    const out = [];
    const W = innerWidth, H = innerHeight;
    if (document.documentElement.scrollWidth > W) out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${W})`);
    for (const el of document.querySelectorAll(sel)) {
      const b = el.getBoundingClientRect();
      if (b.left < 0 || b.right > W + 0.5 || b.top < 0 || b.bottom > H + 0.5) out.push(`${sel} outside the window: ${Math.round(b.left)},${Math.round(b.top)} to ${Math.round(b.right)},${Math.round(b.bottom)}`);
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${sel} scrolls sideways (${el.scrollWidth} > ${el.clientWidth})`);
      // text inside the table's own sideways scroller and screen reader text are not counted
      for (const t of el.querySelectorAll("span, label, button, legend, p")) {
        if (t.closest(".ledger-scroll, .sr-only")) continue;
        if (t.scrollWidth > t.clientWidth + 1 && getComputedStyle(t).overflow !== "visible") out.push(`clipped: "${t.textContent.trim().slice(0, 50)}"`);
        const tb = t.getBoundingClientRect();
        if (tb.width && (tb.right > b.right + 1 || tb.left < b.left - 1)) out.push(`sticks out: "${t.textContent.trim().slice(0, 50)}"`);
      }
    }
    return out;
  }, sel);
  for (const p of r) problems.push(`${name}: ${p}`);
}

async function shot(page, name) {
  await page.screenshot({ path: `${dir}/${name}.png` });
  console.log("wrote", `${dir}/${name}.png`);
}

for (const vp of VPS) {
  for (const lang of ["en", "cy"]) {
    const tag = `${vp[0]}-${lang}`;
    let page = await fresh(vp, lang);

    // 1. the lens list as it opens: the current measure's goal open, the others folded
    await page.locator(".lenspicker-foot .btn-tab, .lenspicker-foot button").last().click();
    await page.locator("#lens-list").waitFor();
    await measure(page, `lens-open-${tag}`, "#lens-list");
    await shot(page, `lens-open-${tag}`);

    // 2. the biggest goals open (Work and pay 14, Health 14): the list scrolls, Done stays in reach
    await page.getByTestId("lensgroup-culture").click();
    await page.getByTestId("lensgroup-prosperous").click();
    await page.getByTestId("lensgroup-healthier").click();
    await measure(page, `lens-two-goals-${tag}`, "#lens-list");
    await shot(page, `lens-two-goals-${tag}`);
    await page.getByTestId("lens-healthy_life_exp").check();
    await page.locator("#lens-list").evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(400);
    await shot(page, `lens-scrolled-${tag}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await shot(page, `lens-healthy-life-${tag}`);

    // 3. explorer: the column chooser with Health open, then a wide table
    await page.getByTestId("explorer-toggle").click();
    await page.getByTestId("explorer-table").waitFor();
    await page.locator("[aria-controls=column-chooser]").click();
    await page.getByTestId("colgroup-healthier").click();
    await measure(page, `columns-${tag}`, "#column-chooser");
    await shot(page, `columns-${tag}`);
    for (const id of ["healthy_life_exp", "premature_deaths", "disabled_limited_lot"]) await page.getByTestId(`col-${id}`).check();
    await page.getByTestId("colgroup-equal").click();
    for (const id of ["child_low_income", "free_school_meals"]) await page.getByTestId(`col-${id}`).check();
    await page.getByTestId("colgroup-cohesive").click();
    for (const id of ["social_housing", "temp_accommodation"]) await page.getByTestId(`col-${id}`).check();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.getByTestId("sort-healthy_life_exp").click();
    await measure(page, `table-wide-${tag}`, ".explorer");
    await shot(page, `table-wide-${tag}`);
    await page.locator(".ledger-scroll").evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await page.waitForTimeout(200);
    await shot(page, `table-wide-scrolled-${tag}`);

    // 4. the dot chart with two new measures
    await page.getByTestId("tab-scatter").click();
    await page.getByTestId("scatter").waitFor();
    await page.getByTestId("scatter-x").selectOption("child_low_income");
    await page.getByTestId("scatter-y").selectOption("healthy_life_exp");
    await page.waitForTimeout(300);
    await measure(page, `scatter-${tag}`, ".explorer");
    const opts = await page.getByTestId("scatter-x").locator("option").count();
    const groups = await page.getByTestId("scatter-x").locator("optgroup").count();
    if (opts !== 87 || groups !== 7) problems.push(`scatter-${tag}: picker has ${opts} options in ${groups} groups`);
    await shot(page, `scatter-${tag}`);
    await page.context().close();

    // 5. the longest measure name: the card grows, the list, key and place panel stack below it
    page = await fresh(vp, lang);
    await page.locator(".lenspicker-foot .btn-tab, .lenspicker-foot button").last().click();
    await page.getByTestId("lensgroup-healthier").click();
    await page.getByTestId("lens-disabled_limited_lot").check();
    await page.waitForTimeout(300);
    await measure(page, `long-name-list-${tag}`, "#lens-list");
    await shot(page, `long-name-list-${tag}`);
    await page.keyboard.press("Escape");
    await page.goto(base + "/#/heddiw/W06000015");
    await page.getByTestId("place-panel").waitFor();
    await page.getByTestId("explorer-toggle").click();
    await page.waitForTimeout(500);
    await measure(page, `long-name-drawer-${tag}`, ".float-lens, .float-key, .float-panel");
    const boxes = await page.evaluate(() => [".float-lens", ".float-key", ".float-panel"].map((s) => document.querySelector(s)?.getBoundingClientRect()).map((b) => b && [b.top, b.bottom]));
    for (let i = 0; i + 1 < boxes.length; i++) if (boxes[i] && boxes[i + 1] && boxes[i][1] > boxes[i + 1][0] + 1) problems.push(`long-name-drawer-${tag}: piece ${i} overlaps piece ${i + 1}`);
    await shot(page, `long-name-drawer-${tag}`);
    await page.context().close();
  }
}

// the sources page lists the new datasets
const page = await fresh(VPS[0], "en");
await page.goto(base + "/#/llyfr/attributions");
await page.getByTestId("attributions-page").waitFor();
await page.waitForTimeout(400);
await shot(page, "attributions-1440-en");
await page.context().close();

await browser.close();
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "no console errors");
console.log(problems.length ? "PROBLEMS:\n" + problems.join("\n") : "no layout problems measured");
