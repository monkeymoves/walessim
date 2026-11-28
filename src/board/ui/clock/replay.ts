/**
 * Replay a saved game with its step reports, so a resumed game has its time line, its term
 * reports and its ticker back. The engine's own replay (inside `decodeRun`) gives the state only;
 * this runs the same log through the public API (`newBoard`, `advance`, `act`) and keeps the
 * reports. Both must reach the same state: replay.test.ts checks it.
 */
import type { BoardModel, BoardState, LoggedAction, StartId, StepReport } from "../../engine/api";
import { act, advance, BoardRunError, newBoard } from "../../engine/api";

export interface Replayed {
  state: BoardState;
  reports: StepReport[];
}

export function replayWithReports(model: BoardModel, gameNumber: number | string, start: StartId, log: readonly LoggedAction[], stepReached: number): Replayed {
  let state = newBoard(model, gameNumber, start);
  const reports: StepReport[] = [];
  const runTo = (step: number) => {
    while (state.step < step) {
      if (state.phase !== "play") throw new BoardRunError(`The saved game cannot run past step ${state.step}`);
      const out = advance(model, state, { maxSteps: step - state.step });
      state = out.state;
      reports.push(...out.reports);
    }
  };
  for (const entry of log) {
    runTo(entry.at);
    state = act(model, state, entry.action);
  }
  runTo(Math.min(stepReached, model.game.steps));
  return { state, reports };
}
