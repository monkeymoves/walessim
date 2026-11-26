import { describe, expect, it } from "vitest";
import * as E from "./api";
import { testModel } from "./test-model";

// Saves can arrive from shared links, so they are untrusted input.
describe("loading an untrusted save", () => {
  const model = testModel();

  it("clamps a huge run count instead of freezing the tab", () => {
    const save = JSON.stringify({ ...JSON.parse(E.saveGame(E.newGame(model, 3, {}))), options: { ...JSON.parse(E.saveGame(E.newGame(model, 3, {}))).options, runs: 1e9, previewRuns: 1e9, timeBudgetMs: 1e12 } });
    const st = E.loadGame(model, save);
    expect(st.options.runs).toBeLessThanOrEqual(400);
    expect(st.options.previewRuns).toBeLessThanOrEqual(400);
    expect(st.options.timeBudgetMs).toBeLessThanOrEqual(2000);
  });

  it("refuses a save with an absurdly long action log", () => {
    const base = JSON.parse(E.saveGame(E.newGame(model, 3, {})));
    const save = JSON.stringify({ ...base, log: Array.from({ length: 5000 }, () => ({ type: "open" })) });
    expect(() => E.loadGame(model, save)).toThrow();
  });
});
