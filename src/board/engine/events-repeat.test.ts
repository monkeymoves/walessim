/**
 * Playtest 8, should-fix 9: the same event came three times in one game ("surgery and fuel three
 * times"). On the real board model no event, from outside or grown from the board, comes more
 * than E1 `repeat_max` times a game, or again within `repeat_gap_years` of the last time.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { hashSeed } from "../../engine/rng";
import { assembleBoardModel } from "../../../scripts/board/assemble";
import { readBoardInputs } from "../../../scripts/board/read-inputs";
import { drawFuture, outsideSchedule, scheduledSeverity } from "./events";
import { repeatLimits } from "./events-schedule";
import { param } from "./rules";
import { playGame } from "./test-play";
import { stepsOf } from "./time";
import type { BoardModel } from "./types";
import { RULE_IDS } from "./types";

let model: BoardModel;
beforeAll(() => {
  model = assembleBoardModel(readBoardInputs()).model;
});

/** Every pair of landings of one event, as [event, earlier step, later step], and counts. */
function repeats(landings: { event: string; step: number }[]): { counts: Map<string, number>; gaps: [string, number][] } {
  const counts = new Map<string, number>();
  const last = new Map<string, number>();
  const gaps: [string, number][] = [];
  for (const l of [...landings].sort((a, b) => a.step - b.step)) {
    counts.set(l.event, (counts.get(l.event) ?? 0) + 1);
    const was = last.get(l.event);
    if (was !== undefined) gaps.push([l.event, l.step - was]);
    last.set(l.event, l.step);
  }
  return { counts, gaps };
}

describe("an event does not keep coming back", () => {
  it("the real E1 card limits repeats", () => {
    const { most, gapYears } = repeatLimits(model);
    expect(most).toBeLessThanOrEqual(2);
    expect(gapYears).toBeGreaterThanOrEqual(6);
  });

  it("outside events: 300 game numbers, none more than repeat_max times or within the gap, and the fairness rule still holds", () => {
    const { most, gapYears } = repeatLimits(model);
    for (let g = 1; g <= 300; g++) {
      const seed = hashSeed(g);
      const future = drawFuture(model, seed);
      const { counts, gaps } = repeats(outsideSchedule(model, seed, future));
      for (const [e, n] of counts) expect(n, `game ${g} ${e}`).toBeLessThanOrEqual(most);
      for (const [e, d] of gaps) expect(d, `game ${g} ${e}`).toBeGreaterThanOrEqual(stepsOf(model, gapYears));
      const sev = scheduledSeverity(model, seed, future);
      expect(sev, `game ${g}`).toBeGreaterThanOrEqual(param(model, RULE_IDS.severity, "min"));
      expect(sev, `game ${g}`).toBeLessThanOrEqual(param(model, RULE_IDS.severity, "max"));
    }
  });

  it("grown events in whole games: none more than repeat_max times, none back within the gap", () => {
    const { most, gapYears } = repeatLimits(model);
    const grown = new Set(model.events.filter((e) => e.origin === "grown").map((e) => e.id));
    for (const g of [1, 2, 3, 4]) {
      const { state } = playGame(model, g, model.starts[g % model.starts.length]!.id, 1);
      const { counts, gaps } = repeats(state.events.filter((e) => grown.has(e.event)));
      for (const [e, n] of counts) expect(n, `game ${g} ${e}`).toBeLessThanOrEqual(most);
      for (const [e, d] of gaps) expect(d, `game ${g} ${e}`).toBeGreaterThanOrEqual(stepsOf(model, gapYears));
    }
  });
});
