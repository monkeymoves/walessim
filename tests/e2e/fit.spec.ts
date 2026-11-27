// Playtest 6 (cold players): the real figures inside the decision and the play screen's fit. The hand
// shows every card at 1440x900 and 1280x800 in both languages; a card asking "Where?" colours the map
// by its measure, with the key and source; the card cap sits beside the coins; "Wales now" opens a
// later turn; Play again is in view on the end screen. Games are found with the engine against the
// model the page serves and handed to the page as its save.
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import * as E from "../../src/engine/api";
import type { CompiledModel } from "../../src/model/schema";

const SAVE_KEYS = ["etifeddiaeth.v1.save", "etifeddiaeth.v1.yfory.letters", "etifeddiaeth.v1.yfory.onboard", "etifeddiaeth.v1.yfory.daily"];
const SKIP = ["__skip", "hand", "ticket", "play", "region", "post", "commit", "strands", "pull", "trust"];

type Want = "plan2" | "ended";
const cache = new Map<Want, string>();

/** A turn 2 plan with a full hand, or a game played to 2050. */
async function findSave(request: APIRequestContext, want: Want): Promise<string> {
  if (cache.has(want)) return cache.get(want)!;
  const model = (await (await request.get("/model.json")).json()) as CompiledModel;
  for (let seed = 1; seed < 200; seed++) {
    let s = E.newGame(model, seed, { runs: 10, previewRuns: 5, firstGame: false, caretakerGhost: false });
    for (let i = 0; i < 80; i++) {
      if (want === "plan2" && s.step === "plan" && s.term === 1) {
        if (s.hand.length >= 5) { cache.set(want, E.saveGame(s)); return cache.get(want)!; }
        break;
      }
      if (s.step === "ended") {
        if (want === "ended") { cache.set(want, E.saveGame(s)); return cache.get(want)!; }
        break;
      }
      if (s.step === "plan") {
        // the cheapest legal cards, one in each region it needs, so the game reaches 2050
        const cards: E.Plays["cards"] = [];
        let left = s.budget.available;
        for (const id of [...s.hand].sort((a, b) => model.cards.find((c) => c.id === a)!.cost - model.cards.find((c) => c.id === b)!.cost)) {
          const c = model.cards.find((x) => x.id === id)!;
          if (cards.length >= s.cardLimit || c.cost > left) continue;
          const play = c.scope === "two_regions" ? { card: id, regions: ["north", "mid"] } : c.scope === "region" ? { card: id, region: c.regions?.[0] ?? "north" } : { card: id };
          const next = { cards: [...cards, play as E.Plays["cards"][number]] };
          if (E.validatePlays(model, s, next).length) continue;
          cards.push(play as E.Plays["cards"][number]); left -= c.cost;
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

async function load(page: Page, lang: "en" | "cy", w: number, h: number, save: string): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: w, height: h });
  await page.goto("/#/yfory");
  await page.evaluate(({ keys, lang, save, skip }) => {
    for (const k of keys) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", lang);
    localStorage.setItem("etifeddiaeth.v1.yfory.onboard", JSON.stringify(skip));
    localStorage.setItem("etifeddiaeth.v1.yfory.letters", JSON.stringify(["hollow"]));
    localStorage.setItem("etifeddiaeth.v1.save", save);
  }, { keys: SAVE_KEYS, lang, save, skip: SKIP });
  await page.reload();
  await expect(page.locator(".yf")).toBeVisible({ timeout: 30_000 });
  return errors;
}

const step = (page: Page) => page.locator(".yf").getAttribute("data-step");

async function toPlan(page: Page): Promise<void> {
  for (let i = 0; i < 6 && (await step(page)) !== "plan"; i++) {
    if ((await step(page)) === "pledge") await page.locator(".yf-rail .btn-tab").first().click();
    else await page.locator(".yf-rail .yf-go").first().click();
    await page.waitForTimeout(300);
  }
  await expect.poll(() => step(page)).toBe("plan");
}

/** i18n keys that reached the screen unfilled, such as "play2.card.scope_region". */
const rawKeys = (page: Page) => page.evaluate(() =>
  document.body.innerText.match(/\b(?:play\d?|game|parts|place|engine|shell|atlas|book|facts)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*\b/g) ?? []);

/** Tickets with any part below the hand's fold, and whether the "more below" cue shows. */
const handCut = (page: Page) => page.evaluate(() => {
  const list = document.querySelector(".yf-hand")!;
  const bottom = list.getBoundingClientRect().bottom;
  const cut = [...list.querySelectorAll(".yf-ticket-slot")].filter((e) => e.getBoundingClientRect().bottom > bottom + 2).map((e) => e.getAttribute("data-card"));
  return { cut, more: !!document.querySelector(".yf-more") };
});

for (const [lang, w, h] of [["en", 1440, 900], ["cy", 1440, 900], ["en", 1280, 800], ["cy", 1280, 800]] as const) {
  test(`the hand shows every card, closed and open (${lang}, ${w}x${h})`, async ({ page, request }) => {
    const errors = await load(page, lang, w, h, await findSave(request, "plan2"));
    await toPlan(page);
    const ids = await page.locator(".yf-hand .yf-ticket-slot").evaluateAll((e) => e.map((x) => x.getAttribute("data-card")!));
    expect(ids.length).toBeGreaterThanOrEqual(5);
    expect(await handCut(page)).toEqual({ cut: [], more: false });
    for (const id of ids) {
      const press = page.locator(`.yf-ticket-slot[data-card="${id}"] .yf-ticket-press`);
      await press.click();
      await expect(page.getByTestId("card-open")).toBeVisible();
      expect({ id, ...(await handCut(page)) }).toEqual({ id, cut: [], more: false });
      expect({ id, keys: await rawKeys(page) }).toEqual({ id, keys: [] });
      await press.click();
    }
    // the cap sits beside the coins
    await expect(page.getByTestId("coin-cap")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("a card asking Where? colours the map by its measure, with the key and its source", async ({ page, request }) => {
  const errors = await load(page, "en", 1440, 900, await findSave(request, "plan2"));
  await toPlan(page);
  const model = (await (await request.get("/model.json")).json()) as CompiledModel;
  const ids = await page.locator(".yf-hand .yf-ticket-slot").evaluateAll((e) => e.map((x) => x.getAttribute("data-card")!));
  const id = ids.find((c) => { const card = model.cards.find((x) => x.id === c); return card?.scope === "region" && !!card.fact; });
  test.skip(!id, "no region card with a figure in this hand");
  await page.locator(`.yf-ticket-slot[data-card="${id}"] .yf-ticket-press`).click();
  const cmp = page.getByTestId("region-compare");
  await expect(cmp).toBeVisible();
  await expect(cmp.locator(".lenskey")).toBeVisible();
  await expect(cmp.locator(".docket").first()).toBeVisible();
  await expect(page.getByTestId("compare-regions")).toHaveAttribute("aria-pressed", "true");
  // "Back to the plain map" turns it off
  await page.getByTestId("compare-regions").click();
  await expect(cmp.locator(".lenskey")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Wales now: a later turn opens with the measure that moved most, beside its real start and source", async ({ page, request }) => {
  const errors = await load(page, "en", 1440, 900, await findSave(request, "plan2"));
  await toPlan(page);
  const now = page.getByTestId("wales-now");
  await expect(now).toBeVisible();
  await expect(now).toContainText("Game estimate");
  await expect(now.locator(".docket")).toBeVisible();
  // a card asking Where? takes the left of the map; Wales now gives way
  expect(errors).toEqual([]);
});

for (const [lang, w, h] of [["en", 1440, 900], ["cy", 1280, 800]] as const) {
  test(`the end screen keeps Play again in view (${lang}, ${w}x${h})`, async ({ page, request }) => {
    const errors = await load(page, lang, w, h, await findSave(request, "ended"));
    await expect.poll(() => step(page)).toBe("ended");
    const again = page.getByTestId("play-again");
    await expect(again).toBeVisible();
    const box = (await again.boundingBox())!;
    const stage = (await page.locator(".yf-stage").boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(Math.min(h, stage.y + stage.height));
    expect(box.y).toBeGreaterThanOrEqual(stage.y);
    expect(errors).toEqual([]);
  });
}
