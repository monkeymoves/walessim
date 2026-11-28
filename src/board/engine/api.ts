/**
 * The board engine's API: the only engine file the UI imports (docs/design/v2-board.md section 12).
 * Small, typed, all pure functions of model and state. No DOM, no Math.random: every draw comes
 * from the game number through src/engine/rng.ts, so the same game number and steps give the
 * same state.
 *
 * Each function delegates to the module that owns it (section 14.1). A module not yet written
 * throws `BoardNotBuiltError`; its owner replaces the body and keeps the signature here.
 *
 * | Function    | Module      | Package |
 * |-------------|-------------|---------|
 * | newBoard    | turn.ts     | 2       |
 * | options     | projects.ts | 2       |
 * | preview     | projects.ts | 2       |
 * | act         | turn.ts     | 2       |
 * | endTurn     | turn.ts     | 2       |
 * | forecast    | events.ts   | 3       |
 * | why         | explain.ts  | 2       |
 * | councilView | view.ts     | 0 (built) |
 * | election    | people.ts   | 3       |
 * | ending      | endings.ts  | 3       |
 * | frames      | here        | 0 (built) |
 * | encodeRun   | runcode.ts  | 2       |
 * | decodeRun   | runcode.ts  | 2       |
 */
import * as turnMod from "./turn";
import * as projectsMod from "./projects";
import * as eventsMod from "./events";
import * as explainMod from "./explain";
import * as peopleMod from "./people";
import * as endingsMod from "./endings";
import * as runcodeMod from "./runcode";
import { councilView as buildCouncilView } from "./view";
import type {
  Action, ActionOption, BoardModel, BoardState, CouncilCode, CouncilView, ElectionView, Ending, Forecast, Frame,
  Preview, StartId, TurnReport, Why, WhyTarget,
} from "./types";

export * from "./types";
export { BoardActionError, BoardModelError, BoardNotBuiltError, BoardRunError } from "./errors";
export { boardFixture, FIXTURE_COUNCILS } from "./fixture";

/** A new game: the real 2026 board, the chosen start, and a future drawn from the game number. */
export function newBoard(model: BoardModel, gameNumber: number | string, start: StartId): BoardState {
  return turnMod.newBoard(model, gameNumber, start);
}

/** What can be done now (in one council, or everywhere), allowed or not, and why not. */
export function options(model: BoardModel, state: BoardState, council?: CouncilCode): ActionOption[] {
  return projectsMod.options(model, state, council);
}

/** The expected changes of an action by council, and the links they travel. Does not change state. */
export function preview(model: BoardModel, state: BoardState, action: Action): Preview {
  return projectsMod.preview(model, state, action);
}

/** Apply one action (build, upgrade, law, respond, visit). Throws `BoardActionError` if not allowed. */
export function act(model: BoardModel, state: BoardState, action: Action): BoardState {
  return turnMod.act(model, state, action);
}

/** Two years pass: builds finish, effects spread, people move, events land, backing, budget, report. */
export function endTurn(model: BoardModel, state: BoardState): { state: BoardState; report: TurnReport } {
  return turnMod.endTurn(model, state);
}

/** The warned events for the end of this turn, with their places. */
export function forecast(model: BoardModel, state: BoardState): Forecast {
  return eventsMod.forecast(model, state);
}

/** Why did this change? Reasons for one quantity in one turn, largest first. */
export function why(model: BoardModel, state: BoardState, target: WhyTarget): Why[] {
  return explainMod.why(model, state, target);
}

/** One council: real figures, estimates, groups and backing, links, projects. */
export function councilView(model: BoardModel, state: BoardState, council: CouncilCode): CouncilView {
  return buildCouncilView(model, state, council);
}

/** The last election result, or the projection if one were held now. */
export function election(model: BoardModel, state: BoardState): ElectionView {
  return peopleMod.election(model, state);
}

/** The named ending, evidence, scores, letter and the Wales not built. Call when the game is over. */
export function ending(model: BoardModel, state: BoardState): Ending {
  return endingsMod.ending(model, state);
}

/** One board per turn, 2026 first, for the time-lapse and then and now. */
export function frames(_model: BoardModel, state: BoardState): Frame[] {
  return state.history;
}

/** A short code: the game number, the start and the steps. Paste to replay. */
export function encodeRun(state: BoardState): string {
  return runcodeMod.encodeRun(state);
}

/** Replay a run code into a state. Throws `BoardRunError` if it cannot be read. */
export function decodeRun(model: BoardModel, code: string): BoardState {
  return runcodeMod.decodeRun(model, code);
}
