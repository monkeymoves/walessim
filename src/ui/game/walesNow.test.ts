import { describe, expect, it } from "vitest";
import { compileFromDisk } from "../../../scripts/model-files";
import { dispatch, newGame, type GameState } from "../../engine/api";
import { indicatorsOf } from "./mapFacts";
import { walesMover } from "./walesNow";

const model = compileFromDisk().model!;

/** Play a few turns making no choices, to the plan step of turn `term`. */
function toTerm(term: number, seed = 11): GameState {
  let s = newGame(model, seed, { runs: 6, previewRuns: 4, firstGame: false });
  for (let i = 0; i < 60 && s.step !== "ended" && !(s.step === "plan" && s.term === term); i++) {
    switch (s.step) {
      case "opening": s = dispatch(model, s, { type: "open" }); break;
      case "pledge": s = dispatch(model, s, { type: "pledge", strand: null }); break;
      case "plan": s = dispatch(model, s, { type: "commit", plays: { cards: [] } }); break;
      case "visit": s = dispatch(model, s, { type: "visit", choice: null }); break;
      case "passing": s = dispatch(model, s, { type: "respond", response: 0 }); break;
      case "changed": s = dispatch(model, s, { type: "continue" }); break;
      case "election": s = dispatch(model, s, { type: "next" }); break;
      default: s = dispatch(model, s, { type: "caretaker", shadowPledge: "culture" });
    }
  }
  return s;
}

describe("Wales now", () => {
  it("says nothing before the first four years have passed", () => {
    expect(walesMover(model, newGame(model, 3, { runs: 4, previewRuns: 2 }))).toBeNull();
  });
  it("names a real measure with a Wales figure and a source once years have passed", () => {
    const m = walesMover(model, toTerm(2));
    expect(m).not.toBeNull();
    const ind = indicatorsOf(model).get(m!.indicator)!;
    expect(ind.wales).not.toBeNull();
    expect(ind.sources.length).toBeGreaterThan(0);
    expect(["up", "down"]).toContain(m!.dir);
  });
});
