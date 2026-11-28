/**
 * States along one real game for the UI's tests: the board at the end of each year as
 * `playForTest` plays it (testPlay.ts), so a test can check its words at many points, not only 2050.
 */
import type { BoardModel, BoardState } from "../engine/api";
import { act, advance, newBoard, options, stepsOf } from "../engine/api";

export function statesForTest(model: BoardModel, gameNumber: number, start = model.starts[0]!.id): BoardState[] {
  let s = newBoard(model, gameNumber, start);
  const out: BoardState[] = [s];
  for (let guard = 0; guard < model.game.steps * 4 && s.phase !== "ended"; guard++) {
    for (const kind of ["respond", "visit", "deal"] as const) {
      const o = options(model, s).find((x) => x.allowed && x.action.kind === kind);
      if (o) s = act(model, s, o.action);
    }
    const b = options(model, s).filter((x) => x.allowed && x.action.kind === "build").sort((x, y) => x.cost - y.cost)[0];
    if (b) s = act(model, s, b.action);
    out.push(s);
    if (s.phase !== "play") continue;
    s = advance(model, s, { maxSteps: stepsOf(model, 1) }).state;
  }
  out.push(s);
  return out;
}
