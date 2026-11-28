/**
 * Package 8 on the real board model, built from the files on disk as `npm run board:build` does:
 * roots, need, momentum, the bounded two sided S3 and the purse play a whole game together,
 * replay byte for byte, keep every young adult share inside its bounds, and leave every change
 * with a Why? that ends at a rule.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel } from "../../../scripts/board/assemble";
import { readBoardInputs } from "../../../scripts/board/read-inputs";
import { replay } from "./clock";
import { why } from "./explain";
import { playGame, type PlayResult } from "./test-play";
import type { BoardModel } from "./types";
import { MEASURE_IDS } from "./types";

let model: BoardModel;
const games: PlayResult[] = [];

beforeAll(() => {
  model = assembleBoardModel(readBoardInputs()).model;
  for (const [n, i] of [[2026, 0], [7, 1]] as const) games.push(playGame(model, n, model.starts[i % model.starts.length]!.id));
});

describe("growth and spread on the real board", () => {
  it("carries the R1 to R4 cards, the purse and the bounded S3", () => {
    for (const id of ["R1", "R2", "R3", "R4"]) expect(model.rules.some((r) => r.id === id), id).toBe(true);
    expect(model.rules.find((r) => r.id === "B1")?.params.purse_max?.default).toBe(16);
    expect(model.rules.find((r) => r.id === "S3")?.params.floor_share?.default).toBe(0.85);
  });

  it("plays to May 2050 with roots grown, and replays the log to the same state", () => {
    for (const { state } of games) {
      expect(state.step).toBe(model.game.steps);
      expect(state.projects.some((p) => p.roots > 1)).toBe(true);
      expect(JSON.stringify(replay(model, state.gameNumber, state.start, state.log, state.step))).toBe(JSON.stringify(state));
    }
  });

  it("keeps every council's young adults between 0.6 and 1.5 of its real 2026 share in every year", () => {
    for (const { state } of games) {
      for (const f of state.history) {
        for (const code of model.game.councils) {
          const real = model.councils.find((c) => c.code === code)!.real.young_adults!;
          expect(f.councils[code]!.young).toBeGreaterThanOrEqual(0.6 * real - 1e-3);
          expect(f.councils[code]!.young).toBeLessThanOrEqual(1.5 * real + 1e-3);
        }
      }
    }
  });

  it("never holds more coins than the purse when a year closes", () => {
    for (const { state } of games) for (const f of state.history) expect(f.coins).toBeLessThanOrEqual(model.rules.find((r) => r.id === "B1")!.params.purse_max!.default + 1e-9);
  });

  it("folds the ledger by year, and every change of a quarter point or more over a year has a Why? ending at a rule", () => {
    const ruleIds = new Set(model.rules.map((r) => r.id));
    const contentPage = /^(project|pair|law|event|place):/;
    for (const { state } of games) {
      expect(state.ledger.length).toBeLessThan(30000);
      for (let t = 0; t + 1 < state.history.length; t++) {
        const before = state.history[t]!;
        const after = state.history[t + 1]!;
        for (const code of model.game.councils) {
          for (const m of MEASURE_IDS) {
            const change = after.councils[code]!.measures[m] - before.councils[code]!.measures[m];
            const reasons = why(model, state, { council: code, measure: m, fromStep: before.step, toStep: after.step - 1 });
            expect(reasons.reduce((a, w) => a + w.delta, 0), `${code} ${m} ${before.year}`).toBeCloseTo(change, 3);
            if (Math.abs(change) < 0.25) continue;
            for (const w of reasons) expect(ruleIds.has(w.rule) || contentPage.test(w.rule), `rule ${w.rule}`).toBe(true);
          }
        }
      }
    }
  });
});
