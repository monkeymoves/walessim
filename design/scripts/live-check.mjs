// Load a URL headlessly, report console errors and a screenshot. Usage: node live-check.mjs <url> <out.png>
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const [, , url, out] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
const res = await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(2000);
await p.screenshot({ path: out });
console.log("status", res?.status(), "title", await p.title());
console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "no console errors");
await b.close();
