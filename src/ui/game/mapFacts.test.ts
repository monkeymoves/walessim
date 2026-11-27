import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compileFromDisk } from "../../../scripts/model-files";
import { dispatch, newGame, resolve, type GameState } from "../../engine/api";
import {
  cardIndicator, placedCards, regionAtRisk, regionLastCard, regionSpread, sinceEstimate, trackedIndicator, trendHere, widestGaps, indicatorsOf,
} from "./mapFacts";

const model = compileFromDisk().model!;
const CONWY = "W06000003";
const RCT = "W06000016";
const POWYS = "W06000023";

function atPlan(seed = 7): GameState {
  let s = newGame(model, seed, { runs: 6, previewRuns: 4 });
  for (let i = 0; i < 4 && s.step !== "plan"; i++) s = dispatch(model, s, s.step === "pledge" ? { type: "pledge", strand: null } : { type: "open" });
  expect(s.step).toBe("plan");
  return s;
}

describe("the map in play: figures", () => {
  it("finds where an area stands out, leaving out plain counts", () => {
    const g = widestGaps(model, CONWY, 3);
    expect(g).toHaveLength(3);
    expect(g.map((i) => i.id)).not.toContain("pop");
  });
  it("compares a region with published area figures only: its highest and lowest area", () => {
    const ind = indicatorsOf(model).get("flood_exposure")!;
    const north = model.regions.find((r) => r.id === "north")!.authorities;
    const sp = regionSpread(model, ind, "north")!;
    expect(north).toContain(sp.high.code);
    expect(north).toContain(sp.low.code);
    expect(sp.high.v).toBeGreaterThanOrEqual(sp.low.v);
    expect(sp.high.v).toBe(Math.max(...north.map((c) => ind.laValues[c] ?? -Infinity)));
  });
  it("follows flood walls on the flood measure", () => {
    const walls = model.cards.find((c) => c.id === "build-flood-walls")!;
    expect(trackedIndicator(model, walls)).toBe("flood_exposure");
    if (walls.fact) expect(cardIndicator(model, walls.id)?.id).toBe(walls.fact.indicator);
  });
  it("says how a slow change bears on a place: the wet decade hits the valleys harder", () => {
    const wet = model.curveballs.find((c) => c.id === "wet-decade")!;
    expect(trendHere(model, wet, RCT)).toBe("hard");
    expect(trendHere(model, wet, POWYS)).toBe("wales");
  });
});

describe("the map in play: your cards", () => {
  it("has no cards on the map at the start, and shows a drafted card as planned", () => {
    const s = atPlan();
    expect(placedCards(model, s)).toEqual([]);
    const draft = [{ card: "build-flood-walls", region: "north" as const }];
    const placed = placedCards(model, s, draft);
    expect(placed).toHaveLength(1);
    expect(placed[0]!.status).toBe("planned");
    expect(placed[0]!.regions).toEqual(["north"]);
  });
  it("reads when each region last had a card, and which will cost Trust", () => {
    const s = atPlan();
    const last = regionLastCard(model, s);
    expect(Object.values(last)).toEqual([-1, -1, -1, -1]);
    expect(regionAtRisk(s, -1)).toBe(false); // no Trust is lost for neglect in the first turn
    const withDraft = regionLastCard(model, s, [{ card: "build-flood-walls", region: "mid" }]);
    expect(withDraft.mid).toBe(0);
    expect(withDraft.north).toBe(-1);
  });
  it("marks a played card working or on its way after the turn, and estimates change since 2026 as a direction", () => {
    const s0 = atPlan();
    expect(sinceEstimate(model, s0, "flood_exposure", CONWY)?.dir).toBe("same");
    // a regional card from this hand that the game follows on a measured quantity
    const card = s0.hand.map((id) => model.cards.find((c) => c.id === id)!).find((c) => c.scope !== "national" && trackedIndicator(model, c) && s0.budget.available >= c.cost)!;
    expect(card).toBeTruthy();
    const region = (card.regions ?? ["north"])[0]!;
    const s1 = resolve(model, s0, { cards: [{ card: card.id, region }] }, null, 0);
    const placed = placedCards(model, s1);
    expect(placed.map((p) => p.card)).toContain(card.id);
    expect(["working", "on_way"]).toContain(placed.find((p) => p.card === card.id)!.status);
    const la = model.regions.find((r) => r.id === region)!.authorities[0]!;
    const e = sinceEstimate(model, s1, trackedIndicator(model, card)!, la)!;
    expect(["up", "down", "same"]).toContain(e.dir);
    expect(["most", "some", "against", "none"]).toContain(e.mine);
  });
});

describe("facts copy", () => {
  const root = join(__dirname, "..", "..", "..");
  const load = (l: string) => JSON.parse(readFileSync(join(root, "model", "i18n", l, "facts.json"), "utf8")) as Record<string, string>;
  const en = load("en");
  const cy = load("cy");
  it("has every facts key the code uses, in English and Welsh", () => {
    const used = new Set<string>();
    for (const d of ["game", "atlas"]) {
      const dir = join(root, "src", "ui", d);
      for (const f of readdirSync(dir)) {
        if (!/\.tsx?$/.test(f) || f.endsWith(".test.ts")) continue;
        for (const m of readFileSync(join(dir, f), "utf8").matchAll(/t\(\s*"facts\.([\w.]+)"/g)) used.add(m[1]!);
      }
    }
    expect(used.size).toBeGreaterThan(40);
    expect([...used].filter((k) => !(k in en))).toEqual([]);
    expect([...used].filter((k) => !(k in cy))).toEqual([]);
  });
  it("has the same keys in both languages, a measure and unit for every indicator with data, no dashes, and is marked for Welsh review", () => {
    const keys = (o: Record<string, string>) => Object.keys(o).filter((k) => !k.startsWith("_")).sort();
    expect(keys(cy)).toEqual(keys(en));
    for (const id of Object.keys(model.la_data)) {
      expect(en[`measure.${id}`], id).toBeTruthy();
      expect(`unit.${id}` in en, id).toBe(true);
    }
    for (const v of [...Object.values(en), ...Object.values(cy)]) if (typeof v === "string") expect(v).not.toMatch(/[\u2013\u2014]/);
    expect((cy as unknown as { _cy_review: boolean })._cy_review).toBe(true);
  });
});
