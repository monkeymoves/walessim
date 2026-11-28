// Cold playtest 10, package B: the clock, the lane, the cards and the keys, at 1280 x 800 and
// 1440 x 900. One game each, played on the clock at Fast as a first-time player, checking as it goes:
// - must fix 5: every button and link on every card reads against the card behind it (4.5:1, 3:1 large);
// - must fix 10: Space on a card, a focused button too, pauses or plays and never answers;
// - must fix 11: one card at a time (a card waits behind a reopened term report), the lesson clear
//   of Pause, Close the build menu on one line, time line labels never overlapping; a reopened term
//   report steps aside under a card and comes back after;
// - must fix 14: the rule book's Back returns to the game at the step left;
// - should fix 9: Escape closes one thing at a time.
import { expect, test, type Page } from "@playwright/test";

import { BOARD_KEY as KEY } from "./board-key";
type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box | null, b: Box | null) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function fresh(page: Page, holdWhileReading = true): Promise<void> {
  await page.goto("/#/bwrdd");
  await page.evaluate(([key, hold]) => {
    for (const k of ["run", "prefs", "clocktaught"]) localStorage.removeItem(key + k);
    localStorage.setItem(key + "guide", "done");
    localStorage.setItem("etifeddiaeth.v1.lang", "en");
    const stops = { warning: true, keystone: true, tier_open: true, tipping: true, visit: true, chapter: false, deal_due: true, purse_full: true, finished: false, year: false };
    localStorage.setItem(key + "prefs", JSON.stringify({ stepByStep: false, holdWhileReading: hold, stops }));
  }, [KEY, holdWhileReading] as const);
  await page.reload();
  await page.getByTestId("bw-go").click();
  await expect(page.getByTestId("bw-play")).toBeVisible({ timeout: 30_000 });
}

/** Buttons and links inside `selector` whose words do not stand out from what is behind them. */
async function lowContrast(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).first().evaluate((root) => {
    const parse = (s: string) => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1]!.split(/[ ,/]+/).filter(Boolean).map(Number);
      return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3]! : 1 };
    };
    const lum = (c: number[]) => {
      const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const behind = (el: Element | null): number[] => {
      for (let e = el; e; e = e.parentElement) {
        const b = parse(getComputedStyle(e).backgroundColor);
        if (b && b.a > 0.5) return b.rgb;
      }
      return [245, 243, 234];
    };
    const out: string[] = [];
    for (const el of Array.from(root.querySelectorAll("button, a[href]"))) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || cs.visibility === "hidden" || !(el.textContent ?? "").trim()) continue;
      const fg = parse(cs.color);
      if (!fg) continue;
      const [a, b] = [lum(fg.rgb), lum(behind(el))];
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) out.push(`${(el.textContent ?? "").trim().slice(0, 40)}: ${ratio.toFixed(2)}`);
    }
    return out;
  });
}

/** Time line labels that run into each other. */
async function labelOverlaps(page: Page): Promise<string[]> {
  const boxes = await page.locator(".bw-tl-mark > span.small, .bw-tl-warning-where").evaluateAll((els) =>
    els.filter((e) => getComputedStyle(e).display !== "none").map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, t: e.textContent ?? "" }; }));
  const out: string[] = [];
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) if (meets(boxes[a]!, boxes[b]!)) out.push(`${boxes[a]!.t} | ${boxes[b]!.t}`);
  return out;
}

for (const vp of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
  test(`the clock and the cards over a game at ${vp.width} x ${vp.height}`, async ({ page }) => {
    test.setTimeout(420_000);
    await page.setViewportSize(vp);
    await fresh(page);
    const play = page.getByTestId("bw-play");
    await play.click();
    // the lesson on pause and speed sits clear of Pause and the speeds
    const lesson = await page.getByTestId("bw-clock-lesson").boundingBox();
    expect(lesson).not.toBeNull();
    expect(meets(lesson, await play.boundingBox())).toBe(false);
    expect(meets(lesson, await page.locator(".bw-clock-speeds").boundingBox())).toBe(false);
    await play.click();
    await play.click();

    const seen = new Set<string>();
    let behind = false, spaced = false;
    for (let i = 0; i < 3000; i++) {
      const year = Number(await page.getByTestId("bw-year").textContent());
      if (await page.getByTestId("bw-respond").count()) {
        if (!seen.has("respond")) {
          seen.add("respond");
          expect(await lowContrast(page, "[data-testid=bw-respond]"), "event card").toEqual([]);
          // Space with an answer focused: the card is still there, unanswered
          await page.getByTestId("bw-respond-pick").first().focus();
          await page.keyboard.press(" ");
          await expect(page.getByTestId("bw-respond")).toBeVisible();
          await page.keyboard.press(" ");
        }
        await page.getByTestId("bw-respond-pick").first().click();
        continue;
      }
      if (await page.getByTestId("bw-term").count()) {
        if (!seen.has("term")) { seen.add("term"); expect(await lowContrast(page, "[data-testid=bw-term]"), "term report").toEqual([]); }
        if (await page.getByTestId("bw-deal").count()) await page.getByTestId("bw-deal").first().click();
        await page.getByTestId("bw-term-on").click();
        if (!behind && year >= 2030) {
          behind = true;
          // reading no longer holds the clock: reopen the term report and let time run until a card comes
          await page.getByTestId("bw-settings-open").click();
          await page.locator(".bw-settings input[type=checkbox]").nth(1).uncheck();
          await page.getByTestId("bw-settings-open").click();
          await page.locator(".bw-tl-term").last().click();
          if ((await play.getAttribute("aria-pressed")) !== "true") await play.click();
          const card = page.locator("[data-testid=bw-stop], [data-testid=bw-respond]");
          await expect(card.first()).toBeVisible({ timeout: 120_000 });
          // one card at a time: the reopened report steps aside under the card
          await expect(page.getByTestId("bw-term")).toHaveCount(0);
          // and comes back once the card is answered
          if (await page.getByTestId("bw-respond").count()) await page.getByTestId("bw-respond-pick").first().click();
          else await page.getByTestId("bw-stop-on").click();
          if ((await play.getAttribute("aria-pressed")) === "true") await play.click();
          while (await card.count()) {
            if (await page.getByTestId("bw-respond").count()) await page.getByTestId("bw-respond-pick").first().click();
            else await page.getByTestId("bw-stop-on").click();
          }
          await expect(page.getByTestId("bw-term")).toBeVisible();
          // Escape closes it
          await page.keyboard.press("Escape");
          await expect(page.getByTestId("bw-term")).toHaveCount(0);
          await page.getByTestId("bw-settings-open").click();
          await page.locator(".bw-settings input[type=checkbox]").nth(1).check();
          await page.getByTestId("bw-settings-open").click();
        }
        continue;
      }
      if (await page.getByTestId("bw-stop").count()) {
        const kind = ((await page.getByTestId("bw-stop").getAttribute("class")) ?? "").match(/bw-stop-([a-z_]+)/)?.[1] ?? "";
        if (!seen.has(kind)) {
          seen.add(kind);
          expect(await lowContrast(page, "[data-testid=bw-stop]"), `${kind} card`).toEqual([]);
          // the card has the focus, not one of its buttons
          expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("bw-stop");
        }
        if (!spaced) {
          spaced = true;
          // Space on the focused Carry on: the card stays, and time is set to stay paused after it
          const was = await play.getAttribute("aria-pressed");
          await page.getByTestId("bw-stop-on").focus();
          await page.keyboard.press(" ");
          await expect(page.getByTestId("bw-stop")).toBeVisible();
          expect(await play.getAttribute("aria-pressed")).not.toBe(was);
          await page.keyboard.press(" ");
        }
        await page.getByTestId("bw-stop-on").click();
        continue;
      }
      if (i % 20 === 0) expect(await labelOverlaps(page), `labels in ${year}`).toEqual([]);
      if (year >= 2035 && behind) break;
      if ((await play.getAttribute("aria-pressed")) === "false") await play.click();
      await page.waitForTimeout(100);
    }
    expect(behind).toBe(true);
    expect(seen.has("runup"), [...seen].join(", ")).toBe(true);

    // Escape closes one thing at a time: Why?, then the build menu, then the council
    await play.click();
    if ((await play.getAttribute("aria-pressed")) === "true") await play.click();
    await page.locator(".bw-league-row").first().click();
    await page.getByTestId("bw-build-here").click();
    const close = await page.getByTestId("bw-build-here").boundingBox();
    expect(close!.height, "Close the build menu on one line").toBeLessThan(60);
    await page.getByTestId("bw-backing-why").click();
    await expect(page.locator(".bw-why-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".bw-why-panel")).toHaveCount(0);
    await expect(page.locator(".bw-build")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".bw-build")).toHaveCount(0);
    await expect(page.getByTestId("bw-council")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bw-council")).toHaveCount(0);

    // the rule book and Back: the same game, at the same step
    const when = `${await page.getByTestId("bw-year").textContent()} ${await page.locator(".bw-yearnote b").textContent()}`;
    await page.goto("/#/llyfr/bwrdd");
    await page.waitForTimeout(500);
    await page.goBack();
    await expect(page.getByTestId("bw-year")).toBeVisible({ timeout: 30_000 });
    expect(`${await page.getByTestId("bw-year").textContent()} ${await page.locator(".bw-yearnote b").textContent()}`).toBe(when);
  });
}
