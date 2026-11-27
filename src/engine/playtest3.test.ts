/** Regressions from playtest 3 (docs/design/playtest-3.md). */
import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";
import { playBot, thoughtfulBot, carelessBot } from "./bots";

const m = testModel();

function planAt(term: number, seed = 3): E.GameState {
  let s = E.newGame(m, seed, { runs: 20, previewRuns: 20, caretakerGhost: false });
  while (!(s.step === "plan" && s.term === term)) {
    s =
      s.step === "opening" ? E.dispatch(m, s, { type: "open" })
      : s.step === "pledge" ? E.dispatch(m, s, { type: "pledge", strand: null })
      : s.step === "plan" ? E.dispatch(m, s, { type: "commit", plays: { cards: [] } })
      : s.step === "visit" ? E.dispatch(m, s, { type: "visit", choice: null })
      : s.step === "passing" ? E.dispatch(m, s, { type: "respond", response: 0 })
      : s.step === "changed" ? E.dispatch(m, s, { type: "continue" })
      : s.step === "election" ? E.dispatch(m, { ...s, trust: 60 }, { type: "next" })
      : E.dispatch(m, s, { type: "caretaker", shadowPledge: "culture" });
  }
  return { ...s, budget: { ...s.budget, available: 10 } };
}
const withHand = (s: E.GameState, cards: string[]) => ({ ...s, hand: [...cards, ...s.hand.filter((c) => !cards.includes(c))].slice(0, 5) });

describe("the preview shows what the card does", () => {
  for (const term of [0, 5]) {
    const s = withHand(planAt(term), ["restore-upland-peat", "welsh-medium-childcare"]);
    const p = E.preview(m, s, { cards: [{ card: "restore-upland-peat", region: "mid" }, { card: "welsh-medium-childcare" }] });
    const peat = p.perCard.find((x) => x.card === "restore-upland-peat")!;
    const wm = p.perCard.find((x) => x.card === "welsh-medium-childcare")!;
    it(`term ${term + 1}: never shows a slow card lowering a strand its ticket helps`, () => {
      for (const id of m.cards.find((c) => c.id === "restore-upland-peat")!.helps!) {
        expect(peat.strands[id].delta, id).toBeGreaterThanOrEqual(0);
        expect(peat.stock[id].delta, id).toBeGreaterThanOrEqual(0);
      }
      expect(peat.real).toContain("resilient");
      expect(peat.thisTerm.resilient.delta).toBe(0);
      expect(wm.strands.culture.delta).toBeGreaterThan(0);
    });
    it(`term ${term + 1}: says when each card lands, and whether after 2050`, () => {
      expect(peat.landsInTerm).toBe(term + 2);
      expect(peat.landsYear).toBe(2026 + 4 * (term + 2));
      expect(peat.landsAfterGame).toBe(term + 2 > 5);
      expect(wm.landsAfterGame).toBe(term + 3 > 5);
    });
    it(`term ${term + 1}: a card alone gives the same effect whatever is played beside it, on strands the other does not touch`, () => {
      const alone = E.preview(m, s, { cards: [{ card: "restore-upland-peat", region: "mid" }] }).perCard[0]!;
      expect(alone.strands.resilient.delta).toBeCloseTo(peat.strands.resilient.delta, 2);
    });
  }
});

describe("the place invitation follows the ticket", () => {
  it("offers the place named by the card that was played, names it, and offers the other as a choice", () => {
    let s = withHand(planAt(1, 4), ["community-owned-energy", "make-coal-tips-safe"]);
    s = { ...s, options: { ...s.options, firstGame: false } };
    const only = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "community-owned-energy", region: "north" }] } });
    expect(only.visitOffer?.place).toBe("bethesda");
    expect(only.visitOffer?.triggeredBy).toEqual(["community-owned-energy"]);
    const both = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "community-owned-energy", region: "north" }, { card: "make-coal-tips-safe", region: "southeast" }] } });
    const places = [both.visitOffer!.place, ...(both.visitOffer!.alternatives ?? []).map((a) => a.place)].sort();
    expect(places).toEqual(["bethesda", "rhondda"]);
    for (const a of [both.visitOffer!, ...(both.visitOffer!.alternatives ?? [])]) expect(a.triggeredBy.length).toBeGreaterThan(0);
    const alt = both.visitOffer!.alternatives![0]!;
    const g = E.gradeVisit(m, both, { place: alt.place, threads: [] });
    expect(g.place).toBe(alt.place);
  });
  it("never lets the first game's script replace a card's own invitation", () => {
    let s = withHand(planAt(1, 4), ["community-owned-energy"]);
    s = { ...s, options: { ...s.options, firstGame: true } };
    const after = E.dispatch(m, s, { type: "commit", plays: { cards: [{ card: "community-owned-energy", region: "north" }] } });
    expect(after.visitOffer?.place).toBe("bethesda");
  });
});

describe("grades, promises, slips and the last hand", () => {
  const games = [thoughtfulBot, carelessBot].flatMap((b) => [1, 2, 3, 4, 5, 6].map((seed) => playBot(m, b, seed, { runs: 8 })));
  it("grades two tests of three held as well, and never takes Trust for a visit that held a majority", () => {
    for (const g of games)
      for (const h of g.history) {
        if (!h.visit || h.visit.stayed) continue;
        const held = h.visit.tests.filter((t) => t.pass).length;
        if (held >= 2) {
          expect(["well", "very_well"]).toContain(h.visit.grade);
          expect(h.trust.reasons.filter((r) => r.code === "visit").every((r) => r.points >= 0)).toBe(true);
        }
      }
  });
  it("puts the promise result first among the Trust reasons", () => {
    for (const g of games)
      for (const h of g.history) if (h.pledge) expect(h.trust.top[0]!.code, `${h.year}`).toBe(h.pledge.kept ? "pledge_kept" : "pledge_broken");
  });
  it("never shows a held or unexpected slip for a strand that moved, nor the same one two terms running", () => {
    for (const g of games)
      g.history.forEach((h, t) => {
        const moved = new Set(h.slips.filter((x) => x.pipChange).map((x) => x.strand));
        for (const x of h.slips.filter((y) => y.unexpected)) {
          expect(moved.has(x.strand), `${h.year} ${x.strand}`).toBe(false);
          const prev = g.history[t - 1]?.slips ?? [];
          expect(prev.some((y) => y.strand === x.strand && y.cause.id === x.cause.id), `${h.year} ${x.strand} ${x.cause.id}`).toBe(false);
        }
      });
  });
  it("reports a shock's response from the term it landed, never another term's", () => {
    for (const g of games)
      for (const h of g.history)
        for (const x of h.slips.filter((y) => y.response)) {
          const landed = g.history[x.cause.term]!.shock!;
          expect(x.response).toEqual({ pips: landed.response, hit: landed.hit, prepared: landed.prepared });
        }
  });
  it("deals a last hand with at least one card that lands by 2050", () => {
    // tightened in playtest 4: lands in full by 2050 (see playtest4.test.ts)
    for (const g of games) {
      const last = (g.sim as { hands: string[][] }).hands[5]!;
      expect(last.some((id) => (m.cards.find((c) => c.id === id)!.arrival!.full ?? 0) === 0), last.join(",")).toBe(true);
    }
  });
});
