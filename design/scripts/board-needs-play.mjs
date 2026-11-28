// Play the board as a first-time player at the default speed (Fast) by headless Playwright, doing
// what the needs-you outline points at (docs/design/v3-wales.md section 2), and screenshot every
// moment the clock is held for the player. At each one it checks: exactly one outline, its tab
// says "Waiting for you", it sits round exactly one element of its kind, nothing covers that
// element. A help note on screen at the same time (the guide, the clock's lesson) is listed with
// the moment, to look at: they never hold the clock, so they are not faults.
// Nothing is set before the game: the guide and the clock's lesson show, and a Welsh player
// picks Cymraeg on the start screen.
//
//   BASE=http://localhost:4620 BOARD_LANG=en OUT=design/shots-build/v3-a1/join/en node design/scripts/board-needs-play.mjs
//   BOARD_LANG=cy UNTIL=2031 ...   stops after the first term in Cymraeg
//
// Prints one JSON line: the held moments, the faults found, console errors and the real time.
import { createRequire } from "module";
import { mkdirSync, readdirSync, unlinkSync } from "fs";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");

const base = process.env.BASE ?? "http://localhost:4620";
const lang = process.env.BOARD_LANG === "cy" ? "cy" : "en";
const until = Number(process.env.UNTIL ?? 9999);
const out = process.env.OUT ?? `design/shots-build/v3-a1/join/${lang}`;
mkdirSync(out, { recursive: true });
// the shots of the last run go, one by one, so the folder holds this game only
for (const f of readdirSync(out)) if (f.endsWith(".png")) unlinkSync(`${out}/${f}`);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const visible = (id) => page.getByTestId(id).first().isVisible().catch(() => false);
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(base + "/#/bwrdd");
await page.getByTestId("bw-go").waitFor({ timeout: 30000 });
// the player picks the language on the start screen, as a first-time player would
if (lang === "cy") await page.locator(".langtoggle button", { hasText: "Cymraeg" }).first().click();
await wait(600);
await page.screenshot({ path: `${out}/00-start.png` });
await page.getByTestId("bw-go").click();
await page.getByTestId("bw-clock").waitFor({ timeout: 30000 });
const t0 = Date.now();

/** What the outline says and where it is, read from the page. */
const read = () => page.evaluate(() => {
  const SEL = { answers: '[data-needs="answers"], [data-needs="deals"], [data-needs="visit-offer"]', carryOn: '[data-needs="carry-on"]', visit: '[data-needs="visit"]', play: '[data-needs="play"]', next: '[data-needs="next"]', close: "[data-needs-close] .btn-close" };
  const drawn = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const rings = [...document.querySelectorAll('[data-testid="bw-needs"]')];
  const ring = rings[0];
  const on = ring?.getAttribute("data-needs-on") ?? null;
  const targets = on ? [...document.querySelectorAll(SEL[on])].filter(drawn) : [];
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const rb = ring ? box(ring) : null, tb = targets[0] ? box(targets[0]) : null;
  const around = !!(rb && tb && Math.abs(rb.x - (tb.x - 3)) < 2.5 && Math.abs(rb.y - (tb.y - 3)) < 2.5 && Math.abs(rb.w - (tb.w + 6)) < 3);
  let covered = false;
  if (tb) {
    const hit = document.elementFromPoint(tb.x + Math.min(tb.w / 2, 20), tb.y + Math.min(tb.h / 2, 12));
    covered = !!hit && !targets[0].contains(hit) && !hit.closest('[data-testid="bw-needs"]');
  }
  const head = ["#bw-respond-title", "#bw-stop-title", "#bw-term-name", "#bp-title", "#bw-warn-title", "#bw-build-title", "#bw-why-title"].map((s) => document.querySelector(s)).find((e) => e && drawn(e));
  return {
    year: document.querySelector('[data-testid="bw-year"]')?.textContent?.trim() ?? "",
    rings: rings.length, on, n: targets.length, around, covered,
    tab: ring?.querySelector(".bw-needs-tab")?.textContent ?? "",
    chip: document.querySelector('[data-testid="bw-needs-chip"]')?.textContent?.trim() ?? "",
    head: head?.textContent?.trim().slice(0, 60) ?? "",
    alsoAsks: ['[data-testid="bw-guide"]', '[data-testid="bw-clock-lesson"]'].filter((s) => { const e = document.querySelector(s); return e && drawn(e); }),
    ended: !!document.querySelector('[data-testid="bw-end"]'),
  };
});

const yearOf = (s) => Number(String(s).replace(/\D/g, "").slice(0, 4)) || 0;
const TAB = lang === "cy" ? "Yn aros amdanoch chi" : "Waiting for you";
const held = [], faults = [];
let last = "", built = 0, lastBuildYear = 0, shot = 0;

/** A first-time player builds now and then: a council off the list, the first project it can afford. */
async function build() {
  if (!(await visible("bw-region"))) await page.locator("[data-testid=bw-council] button[aria-label]").first().click().catch(() => {});
  const rows = page.locator(".bw-league-row");
  const n = await rows.count();
  if (n === 0) return;
  await rows.nth((built * 3) % n).click().catch(() => {});
  await wait(300);
  if (!(await visible("bw-build-here"))) { await page.keyboard.press("Escape"); return; }
  await page.getByTestId("bw-build-here").click().catch(() => {});
  await wait(400);
  await look("build-menu");
  const ids = await page.locator("li.bw-ticket:not(.upgrade) [data-testid^=bw-opt-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").slice(7)));
  for (const id of ids) {
    await page.getByTestId(`bw-opt-${id}`).first().click({ timeout: 1200 }).catch(() => {});
    await wait(200);
    const go = page.locator("[data-testid=bw-build-it]:not([disabled])");
    if (await go.count()) { await go.first().click().catch(() => {}); built++; break; }
  }
  for (let i = 0; i < 3; i++) await page.keyboard.press("Escape");
}

/** Check and screenshot a held moment, once per new thing to act on. */
async function look(tag = "") {
  const s = await read();
  if (s.ended || !s.on) return s;
  const key = `${s.on}|${s.chip}|${s.head}`;
  if (key === last) return s;
  last = key;
  const name = `${String(++shot).padStart(2, "0")}-${yearOf(s.year) || "start"}-${s.on}${tag ? "-" + tag : ""}.png`;
  await page.screenshot({ path: `${out}/${name}` });
  const bad = [];
  if (s.rings !== 1) bad.push(`${s.rings} outlines`);
  if (s.tab !== TAB) bad.push(`tab says "${s.tab}"`);
  if (s.n !== 1) bad.push(`${s.n} elements of kind ${s.on}`);
  if (!s.around) bad.push("outline not round its target");
  if (s.covered) bad.push("target covered");
  held.push({ shot: name, year: s.year, on: s.on, chip: s.chip, head: s.head, notes: s.alsoAsks.length ? s.alsoAsks.map((n) => n.slice(15, -2)) : undefined });
  if (bad.length) faults.push({ shot: name, bad });
  return s;
}

for (let i = 0; i < 6000; i++) {
  const s = await look();
  if (s.ended || yearOf(s.year) >= until) break;
  // the guide's first notes: click a council and build; then once in two years
  const y = yearOf(s.year);
  if (built === 0 || (y - lastBuildYear >= 2 && s.on !== "answers" && s.on !== "carryOn" && s.on !== "visit" && s.on !== "close")) {
    lastBuildYear = y || 2026;
    await build();
    continue;
  }
  if (await visible("bw-clock-lesson")) { await wait(800); await page.getByTestId("bw-clock-lesson").getByRole("button").first().click().catch(() => {}); continue; }
  if (await visible("bw-guide")) { await page.getByTestId("bw-guide").getByRole("button").first().click().catch(() => {}); continue; }
  if (!s.on) { await wait(150); continue; }
  await wait(900); // a first-time player reads before acting
  if (s.on === "answers") {
    const picks = page.locator('[data-needs="answers"] button:not([disabled]), [data-needs="deals"] button:not([disabled]), [data-needs="visit-offer"] button:not([disabled])');
    const k = await picks.count();
    await picks.nth(k > 1 ? i % k : 0).click().catch(() => {});
  } else if (s.on === "carryOn") {
    await page.locator('[data-needs="carry-on"]').first().click().catch(() => {});
  } else if (s.on === "visit") {
    const opt = page.locator('[data-needs="visit"] [role="radio"], [data-needs="visit"] input').first();
    if (await opt.count()) await opt.click().catch(() => {});
    for (const id of ["bp-choose", "bp-done", "bp-leave"]) if (await visible(id)) { await page.getByTestId(id).click().catch(() => {}); await wait(300); await look("visit"); }
  } else if (s.on === "play" || s.on === "next") {
    await page.locator(`[data-needs="${s.on}"]`).click().catch(() => {});
  } else if (s.on === "close") {
    await page.locator("[data-needs-close] .btn-close").first().click().catch(() => {});
  }
  await wait(200);
}
await wait(2500);
await page.screenshot({ path: `${out}/99-end.png` });
console.log(JSON.stringify({ lang, seconds: Math.round((Date.now() - t0) / 1000), built, held: held.length, faults, errors: errors.slice(0, 10), moments: held }));
await browser.close();
