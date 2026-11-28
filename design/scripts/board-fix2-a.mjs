// Package A's screenshots for playtest 9 fixes, round 2: the end screen and the story, from three
// finished games (Skilled with two keystones, a careless gambler, an idle game), in English and
// Welsh. Usage:
//   npx tsx design/scripts/board-fix2-a-saves.ts > saves.json (drop npm notice lines), then
//   BASE=http://127.0.0.1:4393 node design/scripts/board-fix2-a.mjs saves.json
// Saves design/shots-build/board-fix2/a/<game>-<lang>-<part>.png and prints the end text faults.
import { createRequire } from "module";
import { mkdirSync, readFileSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const saves = JSON.parse(readFileSync(process.argv[2], "utf8"));
const base = process.env.BASE ?? "http://127.0.0.1:4393";
const dir = "design/shots-build/board-fix2/a";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const errors = [];

async function open(lang, run) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => errors.push(`${lang}: ${e}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${lang}: ${m.text()}`));
  await page.goto(base + "/#/");
  await page.evaluate(({ l, run }) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.board.v2.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", l);
    localStorage.setItem("etifeddiaeth.board.v2.guide", "done");
    localStorage.setItem("etifeddiaeth.board.v2.clocktaught", "done");
    localStorage.setItem("etifeddiaeth.board.v2.run", run);
  }, { l: lang, run });
  await page.goto(base + "/#/bwrdd");
  await page.reload();
  // a finished game's save offers "see the end" on the start screen
  await page.locator('[data-testid="bw-resume"]').first().click({ timeout: 20000 });
  await page.waitForSelector('[data-testid="bw-end"]', { timeout: 30000 });
  await page.waitForTimeout(1500);
  return page;
}

const faults = [];
for (const [name, run] of Object.entries(saves).filter(([k]) => k !== "notes")) {
  for (const lang of name === "skilled" || name === "gamble" ? ["en", "cy"] : ["en"]) {
    const page = await open(lang, run);
    await page.screenshot({ path: `${dir}/${name}-${lang}-full.png`, fullPage: true });
    for (const id of ["be-verdict", "be-name", "be-chapters", "be-letter", "be-notbuilt"]) {
      const el = page.getByTestId(id).first();
      for (let tryN = 0; tryN < 3; tryN++) {
        try {
          if (!(await el.count())) break;
          await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
          await el.screenshot({ path: `${dir}/${name}-${lang}-${id}.png` });
          break;
        } catch { await page.waitForTimeout(1000); }
      }
    }
    const text = await page.locator("body").innerText();
    for (const line of text.split("\n").map((x) => x.trim()).filter(Boolean)) {
      if (/\{\w+\}|undefined|NaN|\bboard(ui|end|clock)?\.[a-z]/.test(line) || /[\u2013\u2014]/.test(line) || /\s[.,]/.test(line)) faults.push(`${name} ${lang}: ${line.slice(0, 160)}`);
    }
    await page.context().close();
  }
}
await browser.close();
console.log(JSON.stringify({ notes: saves.notes, faults, errors }, null, 1));
