// Screenshots of the map demo at 1440x900, for design review.
// Usage: start `npx vite --port 5179`, then `node src/map/demo-shots.mjs [baseUrl]`.
// Writes design/shots-build/map-*.png and prints timings and console errors.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:5179";
const out = "design/shots-build";
mkdirSync(out, { recursive: true });
// CHANNEL=chromium uses the new headless mode with GPU canvas (closer to a laptop browser)
const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`${base}/src/map/demo.html`);
await page.waitForFunction(() => window.__map);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
const stats = () => page.evaluate(() => ({ ...window.__map.stats }));
console.log("national", await stats());
await page.screenshot({ path: `${out}/map-1-national.png` });

await page.evaluate(() => window.__demo.select("W06000016"));
await page.mouse.move(820, 300);
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/map-2-selected-hover.png` });

await page.evaluate(() => window.__demo.setLens("seq"));
await page.waitForTimeout(150);
console.log("lens seq", (await stats()).lastLensMs.toFixed(1), "ms");
await page.screenshot({ path: `${out}/map-3-lens-sequential.png` });
await page.evaluate(() => window.__demo.setLens("div"));
await page.evaluate(() => { window.__demo.stitch("W06000016"); window.__demo.stitch("W06000002", "planted"); });
await page.waitForTimeout(150);
console.log("lens div", (await stats()).lastLensMs.toFixed(1), "ms");
await page.screenshot({ path: `${out}/map-4-lens-diverging.png` });
await page.evaluate(() => { window.__demo.setLens("none"); window.__demo.highlight(["W06000013","W06000014","W06000015","W06000016","W06000018","W06000019","W06000020","W06000021","W06000022","W06000024"]); });
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/map-5-region.png` });
await page.evaluate(() => window.__demo.highlight([]));

// the fold, caught mid way, then settled
await page.evaluate(() => window.__demo.ready());
await page.evaluate(() => { window.__folding = new Promise((r) => window.__map.on("view", (v) => v === "folding" && r(performance.now()))); });
const tEnter = Date.now();
const entering = page.evaluate(() => window.__demo.enter());
await page.evaluate(() => window.__folding);
console.log("click to fold start", Date.now() - tEnter, "ms");
await page.waitForTimeout(560);
await page.screenshot({ path: `${out}/map-6-folding.png` });
await entering;
await page.waitForTimeout(300);
console.log("place", await stats());
await page.screenshot({ path: `${out}/map-7-rhondda.png` });

const items = await page.evaluate(() => window.__demo.items());
const wattstown = items.find((i) => i.name === "Wattstown Tip") ?? items[8];
await page.evaluate((id) => { window.__demo.pickTip(id); }, wattstown.id);
await page.evaluate((ids) => ids.forEach((id) => window.__demo.stitchTip(id)), [items[1].id, items[12].id]);
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/map-8-rhondda-tip.png` });

const spoil = items.find((i) => i.rings) ?? items[7];
await page.evaluate((id) => { window.__demo.pickTip(id); window.__map.place.zoomTo(132.6, 207.9, 2.6); }, spoil.id);
await page.waitForTimeout(900);
console.log("zoomed", await stats());
await page.screenshot({ path: `${out}/map-9-rhondda-zoomed.png` });

// drag to pan, then wheel zoom
await page.mouse.move(700, 450); await page.mouse.down(); await page.mouse.move(560, 380, { steps: 8 }); await page.mouse.up();
await page.mouse.move(700, 450); await page.mouse.wheel(0, -400);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/map-10-rhondda-panned.png` });

const exiting = page.evaluate(() => window.__demo.exit());
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/map-11-folding-up.png` });
await exiting;
await page.waitForTimeout(200);
await page.evaluate(() => window.__demo.lang("cy"));
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/map-12-national-cy.png` });

// reload timing: first render after data, measured cold
await page.reload();
await page.waitForFunction(() => window.__map);
console.log("cold reload", await stats());
await browser.close();
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
