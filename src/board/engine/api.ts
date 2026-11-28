/**
 * The board engine's API: the only engine file the UI imports (docs/design/v2-board.md sections 12
 * and 16.2.8). Small, typed, all pure functions of model and state. No DOM, no Math.random: every
 * draw comes from the game number through src/engine/rng.ts, so the same game number and the same
 * actions at the same steps give the same state, at any clock speed.
 *
 * There is no end of turn. Time runs in steps (a quarter of a year): `tick` runs one, `advance`
 * runs until a stop. The UI owns the speed, the pauses and the player's stop settings.
 *
 * | Function    | Module       | Package |
 * |-------------|--------------|---------|
 * | newBoard    | clock.ts     | 7       |
 * | act         | clock.ts     | 7       |
 * | tick        | clock.ts     | 7       |
 * | advance     | clock.ts     | 7       |
 * | options     | projects.ts  | 8       |
 * | preview     | projects.ts  | 8       |
 * | why         | explain.ts   | 8       |
 * | forecast    | events.ts    | 9       |
 * | election    | people.ts    | 9       |
 * | scores      | score.ts     | 9       |
 * | ending      | endings.ts   | 9       |
 * | timeline    | timeline.ts  | 9       |
 * | story       | story.ts     | 9       |
 * | councilView | view.ts      | 7       |
 * | frames      | here         | 7       |
 * | encodeRun   | runcode.ts   | 7       |
 * | decodeRun   | runcode.ts   | 7       |
 */
import * as clockMod from "./clock";
import * as projectsMod from "./projects";
import * as eventsMod from "./events";
import * as explainMod from "./explain";
import * as peopleMod from "./people";
import * as scoreMod from "./score";
import * as endingsMod from "./endings";
import * as timelineMod from "./timeline";
import * as storyMod from "./story";
import * as runcodeMod from "./runcode";
import { councilView as buildCouncilView } from "./view";
import type {
  Action, ActionOption, BoardModel, BoardState, CouncilCode, CouncilView, ElectionView, Ending, Forecast, Frame,
  Preview, Scores, StartId, Stop, StepReport, Story, TimelineView, Why, WhyTarget,
} from "./types";
import type { AdvanceOptions } from "./clock";

export * from "./types";
export type { AdvanceOptions } from "./clock";
export { BoardActionError, BoardModelError, BoardRunError } from "./errors";
export { boardFixture, FIXTURE_COUNCILS } from "./fixture";
/** Calendar helpers for the screens: the year and season of a step, and steps in a span of years. */
export { blockOf, closesYear, isElectionStep, perStep, seasonOf, stepOfYear, stepsOf, yearOfStep } from "./time";

/** A new game at step 0 (May 2026): the real board, the chosen start, and a future drawn from the game number. */
export function newBoard(model: BoardModel, gameNumber: number | string, start: StartId): BoardState {
  return clockMod.newBoard(model, gameNumber, start);
}

/** What can be done now (in one council, or everywhere), allowed or not, and why not. */
export function options(model: BoardModel, state: BoardState, council?: CouncilCode): ActionOption[] {
  return projectsMod.options(model, state, council);
}

/** The expected changes of an action by council, and the links they travel. Does not change state. */
export function preview(model: BoardModel, state: BoardState, action: Action): Preview {
  return projectsMod.preview(model, state, action);
}

/** Apply one action (build, upgrade, law, respond, visit, deal) at the current step, logged as `{ at: step, action }`. Throws `BoardActionError` if not allowed. */
export function act(model: BoardModel, state: BoardState, action: Action): BoardState {
  return clockMod.act(model, state, action);
}

/** One step (a quarter of a year). Throws `BoardActionError` while `phase` is "respond" or "ended". */
export function tick(model: BoardModel, state: BoardState): { state: BoardState; report: StepReport } {
  return clockMod.tick(model, state);
}

/** Steps until a hard stop, a stop named in `stopOn`, or `maxSteps`. Throws like `tick`. */
export function advance(model: BoardModel, state: BoardState, opts: AdvanceOptions): { state: BoardState; reports: StepReport[]; stopped: Stop | null } {
  return clockMod.advance(model, state, opts);
}

/** The warned events, each with its window, and a hint at the future. */
export function forecast(model: BoardModel, state: BoardState): Forecast {
  return eventsMod.forecast(model, state);
}

/** Why did this change? Reasons for one quantity over a span of steps, largest first. */
export function why(model: BoardModel, state: BoardState, target: WhyTarget): Why[] {
  return explainMod.why(model, state, target);
}

/** One council: real figures, estimates, groups and backing, momentum, a deal, links, projects. */
export function councilView(model: BoardModel, state: BoardState, council: CouncilCode): CouncilView {
  return buildCouncilView(model, state, council);
}

/** The election just held (on this step), or the projection if one were held now. */
export function election(model: BoardModel, state: BoardState): ElectionView {
  return peopleMod.election(model, state);
}

/** Both scores as they stand now, for the top strip (and the same call at the end). */
export function scores(model: BoardModel, state: BoardState): Scores {
  return scoreMod.scores(model, state);
}

/** The named ending, evidence, scores, letter, the Wales not built and the story. Call when the game is over. */
export function ending(model: BoardModel, state: BoardState): Ending {
  return endingsMod.ending(model, state);
}

/** The time line: the past, now, builds under way and what is ahead. */
export function timeline(model: BoardModel, state: BoardState): TimelineView {
  return timelineMod.timeline(model, state);
}

/** The chapters so far and the turning points. */
export function story(model: BoardModel, state: BoardState): Story {
  return storyMod.story(model, state);
}

/** One board a year, May 2026 first, for the time-lapse and then and now. */
export function frames(_model: BoardModel, state: BoardState): Frame[] {
  return state.history;
}

/** A short code: the game number, the start, the step reached and the log. Paste to replay. */
export function encodeRun(state: BoardState): string {
  return runcodeMod.encodeRun(state);
}

/** Replay a run code into a state. Throws `BoardRunError` if it cannot be read (a phase 1 code says so plainly). */
export function decodeRun(model: BoardModel, code: string): BoardState {
  return runcodeMod.decodeRun(model, code);
}
