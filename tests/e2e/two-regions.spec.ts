// The owner's stuck game (27 November 2026): Regions work together was stamped PLAYED from the region
// chooser with one region, so the turn could not end. Now the chooser picks two for that card, and the
// card is only played once two different regions are chosen; the turn can then end.
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import * as E from "../../src/engine/api";
import type { CompiledModel } from "../../src/model/schema";

const CARD = "regional-compact";
const SKIP = ["__skip", "hand", "ticket", "play", "region", "post", "commit", "strands", "pull", "trust"];

/** A plan step with the two-region card in hand, reached by cheap legal plays. */
async function saveWithCard(request: APIRequestContext): Promise<string> {
  const model = (await (await request.get("/model.json")).json()) as CompiledModel;
  for (let seed = 1; seed < 200; seed++) {
    let s = E.newGame(model, seed, { runs: 10, previewRuns: 5, firstGame: false, caretakerGhost: false });
    for (let i = 0; i < 80 && s.step !== "ended"; i++) {
      if (s.step === "plan") {
        if (s.hand.includes(CARD) && s.cardLimit >= 1) return E.saveGame(s);
        s = E.dispatch(model, s, { type: "commit", plays: { cards: [] } });
      } else if (s.step === "opening") s = E.dispatch(model, s, { type: "open" });
      else if (s.step === "pledge") s = E.dispatch(model, s, { type: "pledge", strand: null });
      else if (s.step === "visit") s = E.dispatch(model, s, { type: "visit", choice: null });
      else if (s.step === "passing") s = E.dispatch(model, s, { type: "respond", response: 0 });
      else if (s.step === "changed") s = E.dispatch(model, s, { type: "continue" });
      else if (s.step === "election") s = E.dispatch(model, s, { type: "next" });
      else s = E.dispatch(model, s, { type: "caretaker", shadowPledge: "culture" });
    }
  }
  throw new Error("no seed dealt the two-region card");
}

async function load(page: Page, save: string): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/yfory");
  await page.evaluate(({ save, skip }) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("etifeddiaeth.v1.")) localStorage.removeItem(k);
    localStorage.setItem("etifeddiaeth.v1.lang", "en");
    localStorage.setItem("etifeddiaeth.v1.yfory.onboard", JSON.stringify(skip));
    localStorage.setItem("etifeddiaeth.v1.yfory.letters", JSON.stringify(["hollow"]));
    localStorage.setItem("etifeddiaeth.v1.save", save);
  }, { save, skip: SKIP });
  await page.reload();
  await expect(page.locator(".yf")).toBeVisible({ timeout: 30_000 });
}

test("Regions work together plays only with two regions, chosen from the map's region list", async ({ page, request }) => {
  await load(page, await saveWithCard(request));
  const slot = page.locator(`.yf-ticket-slot[data-card="${CARD}"]`);
  await slot.locator(".yf-ticket-press").click();
  const cmp = page.getByTestId("region-compare");
  await expect(cmp).toBeVisible();
  const picks = cmp.locator(".mf-region-pick:not([disabled])");
  expect(await picks.count()).toBeGreaterThanOrEqual(2);
  // one region is not enough: the card stays unplayed
  await picks.nth(0).click();
  if (await page.getByTestId("map-play").isVisible()) await page.getByTestId("map-play").click();
  await expect(slot).not.toHaveClass(/played/);
  // the second region plays it
  await picks.nth(1).click();
  if (await page.getByTestId("map-play").isVisible()) await page.getByTestId("map-play").click();
  await expect(slot).toHaveClass(/played/);
  await expect(page.getByTestId("end-turn")).toBeEnabled();
});
