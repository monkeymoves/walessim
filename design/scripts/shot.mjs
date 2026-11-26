// Screenshot a local HTML mockup headlessly.
// Usage: node design/scripts/shot.mjs <html-file> <out.png> [width] [height] [lang]
// lang "cy" clicks nothing; it appends ?lang=cy so pages can read it.
import { createRequire } from "module";
import path from "path";
const require = createRequire("../foresight-games/package.json");
const { chromium } = require("playwright");
const [, , file, out, w = "1440", h = "900", lang = ""] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto("file://" + path.resolve(file) + (lang ? "?lang=" + lang : ""));
await page.waitForTimeout(1500);
await page.screenshot({ path: out });
await browser.close();
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
