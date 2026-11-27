// Playtest 7 (cold players), layout: the Rhondda's "Make this tip safe" in view without scrolling and
// the tip table inside its panel; the end screen's Play again bar never over the letter or the
// detail; no guide note on the Play button; and a click on the map chooses a region, never plays.
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import * as E from "../../src/engine/api";
import type { CompiledModel } from "../../src/model/schema";

const SKIP = JSON.stringify(["__skip", "hand", "ticket", "play", "region", "post", "commit", "strands", "pull", "trust"]);
const SIZES = [["en", 1440, 900], ["cy", 1280, 800]] as const;

type Want = "rhondda" | "bethesda" | "ended" | "plan";
const cache = new Map<Want, string>();

/** A save at the step wanted, found by playing seeds through the engine (cards played where they can be). */
async function saveFor(request: APIRequestContext, want: Want): Promise<string> {
  if (cache.has(want)) return cache.get(want)!;
  const model = (await (await request.get("/model.json")).json()) as CompiledModel;
  for (let seed = 1; seed < 300; seed++) {
    let s = E.newGame(model, seed, { runs: 10, previewRuns: 5, firstGame: false, caretakerGhost: false });
    for (let i = 0; i < 80; i++) {
      if (want === "ended" && s.step === "ended") { cache.set(want, E.saveGame(s)); return E.saveGame(s); }
      if (want === "plan" && s.step === "plan" && s.term === 1 && s.hand.includes("homes-for-locals")) { cache.set(want, E.saveGame(s)); return E.saveGame(s); }
      if ((want === "rhondda" || want === "bethesda") && s.step === "visit" && s.visitOffer?.place === want) { cache.set(want, E.saveGame(s)); return E.saveGame(s); }
      if (s.step === "ended") break;
      if (s.step === "plan") {
        const cards: E.Plays["cards"] = [];
        let left = s.budget.available;
        for (const id of s.hand) {
          const c = model.cards.find((x) => x.id === id)!;
          if (cards.length >= s.cardLimit || c.cost > left - 1) continue;
          const where = c.scope === "national" ? {} : c.scope === "two_regions" ? { regions: ["southeast", "southwest"] } : { region: c.regions?.[0] ?? "southeast" };
          const next = [...cards, { card: id, ...where } as E.Plays["cards"][number]];
          if (E.validatePlays(model, s, { cards: next }).length) continue;
          cards.push(next[next.length - 1]!); left -= c.cost;
        }
        s = E.dispatch(model, s, { type: "commit", plays: { cards } });
      } else if (s.step === "opening") s = E.dispatch(model, s, { type: "open" });
      else if (s.step === "pledge") s = E.dispatch(model, s, { type: "pledge", strand: null });
      else if (s.step === "visit") s = E.dispatch(model, s, { type: "visit", choice: null });
      else if (s.step === "passing") s = E.dispatch(model, s, { type: "respond", response: 0 });
      else if (s.step === "changed") s = E.dispatch(model, s, { type: "continue" });
      else if (s.step === "election") s = E.dispatch(model, s, { type: "next" });
      else s = E.dispatch(model, s, { type: "caretaker", shadowPledge: "culture" });
    }
  }
  throw new Error(`no seed gave ${want}`);
}

async function load(page: Page, lang: string, w: number, h: number, save: string): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: w, height: h });
  await page.goto("/#/yfory");
  await page.evaluate(({ lang, save, skip }) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.v1.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", lang);
    localStorage.setItem("etifeddiaeth.v1.yfory.onboard", skip);
    localStorage.setItem("etifeddiaeth.v1.yfory.letters", JSON.stringify(["hollow"]));
    localStorage.setItem("etifeddiaeth.v1.save", save);
  }, { lang, save, skip: SKIP });
  await page.reload();
  await expect(page.locator(".yf")).toBeVisible({ timeout: 30_000 });
  return errors;
}

/** Fully on screen, inside every scrolling box around it, and the top element at its centre. */
const inView = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => {
  const r = e.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) return "off screen";
  for (let p = e.parentElement; p; p = p.parentElement) {
    if (!/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowY)) continue;
    const q = p.getBoundingClientRect();
    if (r.top < q.top - 1 || r.bottom > q.bottom + 1) return `clipped by ${p.className}`;
  }
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return hit && (hit === e || e.contains(hit)) ? "ok" : `covered by ${(hit as HTMLElement | null)?.className}`;
});

for (const [lang, w, h] of SIZES) {
  for (const place of ["rhondda", "bethesda"] as const) {
    test(`${place}: the table fits its panel and the choose button is in view (${lang}, ${w}x${h})`, async ({ page, request }) => {
      const errors = await load(page, lang, w, h, await saveFor(request, place));
      await page.locator(".yf-visit-offer .yf-actions .btn-stamp").first().click();
      await expect(page.locator(".pl-ledger")).toBeVisible({ timeout: 20_000 });
      const fit = await page.locator(".pl-table-wrap").evaluate((wrap) => ({
        over: wrap.scrollWidth - wrap.clientWidth,
        cut: [...wrap.querySelectorAll("td, th")].filter((c) => c.scrollWidth > c.clientWidth + 1).length,
      }));
      expect(fit.over, "the table is no wider than its panel").toBeLessThanOrEqual(1);
      expect(fit.cut, "no clipped cells").toBe(0);
      // the row with the most to lose, eighth or last: its card's button shows without scrolling
      const rows = page.locator(".pl-ledger .pl-rowbtn");
      await rows.nth(Math.min(7, (await rows.count()) - 1)).click();
      await expect(page.locator(".pl-below")).toBeVisible();
      expect(await inView(page, ".pl-below .pl-below-foot button:last-child")).toBe("ok");
      if (place === "rhondda") {
        await expect(page.locator(".pl-below .pl-below-foot button:last-child")).toHaveText(lang === "en" ? "Make this tip safe" : /domen/);
        await expect(page.getByTestId("rh-hint")).toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }

  test(`the end screen: Play again never covers the letter or the detail (${lang}, ${w}x${h})`, async ({ page, request }) => {
    const errors = await load(page, lang, w, h, await saveFor(request, "ended"));
    await expect(page.getByTestId("end-screen")).toBeVisible();
    // the bar is below the scrolling sheet, never over it
    const apart = await page.evaluate(() => {
      const bar = document.querySelector(".end-actions")!.getBoundingClientRect();
      const sheet = document.querySelector(".end-scroll")!.getBoundingClientRect();
      return bar.top >= sheet.bottom - 1;
    });
    expect(apart).toBe(true);
    expect(await inView(page, "[data-testid=play-again]")).toBe("ok");
    await page.getByTestId("open-letter").scrollIntoViewIfNeeded();
    expect(await inView(page, "[data-testid=open-letter]")).toBe("ok");
    await page.getByTestId("open-letter").click();
    await page.waitForTimeout(900);
    // the letter scrolls to the top of the sheet, its heading and first lines in view
    expect(await inView(page, "#end-letter-head")).toBe("ok");
    await page.locator("[data-testid=end-detail] summary").scrollIntoViewIfNeeded();
    expect(await inView(page, "[data-testid=end-detail] summary")).toBe("ok");
    expect(errors).toEqual([]);
  });

  test(`a click on the map chooses a region and the button plays it (${lang}, ${w}x${h})`, async ({ page, request }) => {
    const errors = await load(page, lang, w, h, await saveFor(request, "plan"));
    for (let g = 0; g < 8 && (await page.locator(".yf").getAttribute("data-step")) !== "plan"; g++) {
      if ((await page.locator(".yf").getAttribute("data-step")) === "pledge") await page.locator(".yf-rail .btn-tab").first().click();
      else await page.locator(".yf-rail .yf-go").first().click();
      await page.waitForTimeout(400);
    }
    await page.locator('.yf-ticket-slot[data-card="homes-for-locals"] .yf-ticket-press').click();
    await expect(page.getByTestId("region-compare")).toBeVisible();
    await page.waitForTimeout(900);
    // click the map over a council area in North Wales (Gwynedd, by its label point)
    const box = (await page.locator("canvas.paper-map-national").boundingBox())!;
    let chosen = false;
    for (const [fx, fy] of [[0.55, 0.22], [0.5, 0.25], [0.6, 0.2], [0.5, 0.35]] as const) {
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(300);
      if (await page.getByTestId("map-choice").count()) { chosen = true; break; }
    }
    expect(chosen, "a map click chose a region").toBe(true);
    await expect(page.locator('.yf-ticket-slot[data-card="homes-for-locals"].played')).toHaveCount(0);
    await page.getByTestId("map-play").click();
    await expect(page.locator('.yf-ticket-slot[data-card="homes-for-locals"].played')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test(`no guide note covers the Play button or Trust (${lang}, ${w}x${h})`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/#/yfory");
    await page.evaluate((lang) => {
      for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.v1.")) localStorage.removeItem(k);
      localStorage.setItem("etifeddiaeth.v1.lang", lang);
    }, lang);
    await page.goto("/#/yfory?seed=20261126");
    await page.reload();
    await expect(page.locator(".yf")).toBeVisible({ timeout: 30_000 });
    const got = async (id: string) => {
      const b = page.locator(`.yf-note[data-note="${id}"] .yf-note-btn`);
      if (await b.count()) { await b.click(); await page.waitForTimeout(200); }
    };
    const covers = () => page.evaluate(() => [...document.querySelectorAll(".yf-note")].flatMap((n) => {
      const a = n.getBoundingClientRect();
      return [...document.querySelectorAll('[data-testid="play-card"], [data-testid="trust"], [data-testid="end-turn"], .yf-tray .yf-region')].filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      }).map((e) => `${n.getAttribute("data-note")} on ${e.getAttribute("data-testid") ?? e.className}`);
    }));
    await page.locator(".yf-hook .btn-stamp").click();
    await page.getByTestId("show-cards").click();
    await got("slow_change");
    await got("hand");
    await page.locator('.yf-ticket-slot[data-card="build-flood-walls"] .yf-ticket-press').click();
    await page.locator('.yf-tray [data-region="southeast"]').click();
    await got("slow_card");
    // a card opened while the coins note shows: its Play button stays clear
    await page.locator('.yf-ticket-slot[data-card="warm-homes"] .yf-ticket-press').click();
    await expect(page.getByTestId("play-card")).toBeVisible();
    await page.waitForTimeout(400);
    expect(await covers()).toEqual([]);
    await got("coins_left");
    await page.locator('.yf-ticket-slot[data-card="warm-homes"] .yf-ticket-press').click();
    await page.getByTestId("end-turn").click();
    const sheet = page.getByTestId("end-sheet");
    if (await sheet.isVisible().catch(() => false)) {
      for (const id of ["end-save", "end-lose", "end-anyway"]) { const b = sheet.getByTestId(id); if (await b.count()) { await b.click(); break; } }
    }
    for (let g = 0; g < 40; g++) {
      const s = await page.locator(".yf").getAttribute("data-step");
      if (s === "changed") break;
      if (s === "visit") await page.locator(".yf-visit-stay .btn-tab").click();
      else await page.waitForTimeout(400);
    }
    await page.waitForTimeout(2600);
    await got("why");
    await page.locator(".yf-rail .yf-panel-foot .btn-stamp").click();
    // the election: Trust's note sits beside the Trust box, not on it
    await expect(page.locator('.yf-note[data-note="trust"]')).toBeVisible();
    await page.waitForTimeout(400);
    expect(await covers()).toEqual([]);
  });
}
