/**
 * Deals told true over many games (playtest 10 must-fix 1: "Newport: broken" with a Welsh-medium
 * school working there). On the real board, careless and careful bots: no deal is offered already
 * met, no deal is judged broken while a project that lifts its measure worked in its council by its
 * last step, and every kept deal names a project that `buildCountsForDeal` says counts.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { assembleBoardModel } from "../../../scripts/board/assemble";
import { readBoardInputs } from "../../../scripts/board/read-inputs";
import { playGame, random, skilled, startFor } from "./bots";
import { siteCouncils } from "./conditions";
import { buildCountsForDeal, dealKeptBy, dealLastStep, dealProgress } from "./deals";
import type { BoardModel, BoardState, Deal } from "./types";

let model: BoardModel;
beforeAll(() => {
  model = assembleBoardModel(readBoardInputs()).model;
});

describe("deals told true", () => {
  it("are never offered met, never broken while a counting project worked, and kept only by one that counts", () => {
    let offers = 0;
    let broken = 0;
    let kept = 0;
    for (const [bot, games] of [[random, 8], [skilled(), 1]] as const) {
      for (let g = 1; g <= games; g++) {
        const watch = (s: BoardState) => {
          for (const p of s.pending) {
            if (p.kind !== "deal") continue;
            for (const c of p.choices) {
              offers++;
              const d: Deal = { ...c, madeStep: s.step, dueStep: s.step + 16, kept: null };
              expect(dealKeptBy(model, s, d), `offer ${c.council} ${c.measure} in game ${g}`).toBeNull();
              expect(dealProgress(model, s, d)).toEqual([]);
            }
          }
        };
        const end = playGame(model, bot, g, startFor(model, g), undefined, watch);
        for (const d of end.deals) {
          const last = dealLastStep(model, d);
          const counting = end.projects.filter((p) => p.readyStep <= last && p.status !== "building"
            && buildCountsForDeal(model, { ...d, kept: null }, p.project, siteCouncils(model, p), p.readyStep) === "counts");
          if (d.kept === false) {
            broken++;
            expect(counting, `broken deal with ${d.council} in game ${g}`).toEqual([]);
          } else if (d.kept === true) {
            kept++;
            expect(counting.length, `kept deal with ${d.council} in game ${g}`).toBeGreaterThan(0);
          }
        }
      }
    }
    expect(offers).toBeGreaterThan(0);
    expect(broken + kept).toBeGreaterThan(0);
  }, 60_000);
});
