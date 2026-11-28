/**
 * A small player for the UI's own tests, through the public API only (the board UI may not reach
 * past api.ts, boundaries.test.ts). Each year it answers any event with its first allowed answer,
 * makes a place visit and takes a deal when offered, builds the cheapest allowed thing, then runs
 * on to the next year or stop. No chance: the same game number gives the same log.
 */
import type { BoardModel, BoardState } from "../engine/api";
import { act, advance, newBoard, options, stepsOf } from "../engine/api";

export function playForTest(model: BoardModel, gameNumber: number, start = model.starts[0]!.id): BoardState {
  let s = newBoard(model, gameNumber, start);
  for (let guard = 0; guard < model.game.steps * 4 && s.phase !== "ended"; guard++) {
    for (const kind of ["respond", "visit", "deal"] as const) {
      const o = options(model, s).find((x) => x.allowed && x.action.kind === kind);
      if (o) s = act(model, s, o.action);
    }
    const b = options(model, s).filter((x) => x.allowed && x.action.kind === "build").sort((x, y) => x.cost - y.cost)[0];
    if (b) s = act(model, s, b.action);
    if (s.phase !== "play") continue;
    s = advance(model, s, { maxSteps: stepsOf(model, 1) }).state;
  }
  return s;
}
