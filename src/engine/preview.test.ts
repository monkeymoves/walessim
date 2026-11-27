/** The ghost preview: per-card effects are marginal (paired runs), exact zero where a card reaches nothing. */
import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";

const m = testModel();

function planState(term: number): E.GameState {
  let s = E.newGame(m, 3, { runs: 30, previewRuns: 30, caretakerGhost: false });
  for (;;) {
    if (s.step === "opening") s = E.dispatch(m, s, { type: "open" });
    else if (s.step === "pledge") s = E.dispatch(m, s, { type: "pledge", strand: null });
    else if (s.step === "plan") {
      if (s.term === term) return { ...s, hand: ["welsh-medium-childcare", "land-a-big-employer", ...s.hand.filter((c) => c !== "welsh-medium-childcare" && c !== "land-a-big-employer")].slice(0, 5), budget: { ...s.budget, available: 8 } };
      s = E.dispatch(m, s, { type: "commit", plays: { cards: [] } });
    } else if (s.step === "visit") s = E.dispatch(m, s, { type: "visit", choice: null });
    else if (s.step === "passing") s = E.dispatch(m, s, { type: "respond", response: 0 });
    else if (s.step === "changed") s = E.dispatch(m, s, { type: "continue" });
    else if (s.step === "election") s = E.dispatch(m, { ...s, trust: 60 }, { type: "next" });
    else s = E.dispatch(m, s, { type: "caretaker", shadowPledge: "culture" });
  }
}

describe("the ghost preview", () => {
  for (const term of [0, 2]) {
    const s = planState(term);
    const plays: E.Plays = { cards: [{ card: "welsh-medium-childcare" }, { card: "land-a-big-employer", region: "southeast" }] };
    const p = E.preview(m, s, plays);
    it(`term ${term + 1}: Welsh-medium childcare previews exactly zero on strands it cannot reach`, () => {
      const pc = p.perCard.find((x) => x.card === "welsh-medium-childcare")!;
      for (const strand of ["resilient", "healthier", "global"] as const) {
        expect(pc.strands[strand].delta, strand).toBe(0);
        expect(pc.strands[strand].median, strand).toBe(0);
        expect(pc.strands[strand].p10, strand).toBe(0);
        expect(pc.strands[strand].p90, strand).toBe(0);
        expect(pc.strands[strand].sharp, strand).toBe(true);
      }
      expect(pc.strands.culture.delta).toBeGreaterThan(0);
    });
    it(`term ${term + 1}: per-card fields are all marginal (median equals delta, pips its rounding)`, () => {
      for (const pc of p.perCard) for (const v of Object.values(pc.strands)) {
        expect(v.median).toBe(v.delta);
        expect(v.pips).toBe(Math.round(v.delta));
        expect(v.p10).toBeLessThanOrEqual(v.p90);
      }
    });
    it(`term ${term + 1}: is stable across repeated calls and does not change the state`, () => {
      const before = JSON.stringify(s);
      expect(E.preview(m, s, plays)).toEqual(p);
      expect(JSON.stringify(s)).toBe(before);
    });
    it(`term ${term + 1}: shows the drift with no plays separately from the plan`, () => {
      for (const st of p.strands) expect(Number.isFinite(st.baseline.median)).toBe(true);
    });
  }
});
