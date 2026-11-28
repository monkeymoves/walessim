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
 * | headway     | score.ts     | D       |
 * | ending      | endings.ts   | 9       |
 * | timeline    | timeline.ts  | 9       |
 * | story       | story.ts     | 9       |
 * | councilView | view.ts      | 7       |
 * | frames      | here         | 7       |
 * | encodeRun   | runcode.ts   | 7       |
 * | decodeRun   | runcode.ts   | 7       |
 * | runBoard    | runcode.ts   | 14      |
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
  Action, ActionOption, BoardId, BoardModel, BoardState, CouncilCode, CouncilView, ElectionView, Ending, Forecast, Frame,
  Preview, Scores, StartId, Stop, StepReport, Story, TimelineView, Why, WhyTarget,
} from "./types";
import type { AdvanceOptions } from "./clock";

export * from "./types";
export type { AdvanceOptions } from "./clock";
export { BoardActionError, BoardModelError, BoardRunError } from "./errors";
export { boardFixture, FIXTURE_COUNCILS } from "./fixture";
/** Calendar helpers for the screens: the year and season of a step, and steps in a span of years. */
export { blockOf, closesYear, isElectionStep, keystoneLastStep, perStep, seasonOf, shownYear, stepOfYear, stepsOf, yearOfStep } from "./time";
/** An event's noun key for the middle of a sentence (board.json `event.<id>`), and the river it names in a council. */
export { eventNoun, riverAt } from "./events";
/** Playtest 10 must-fix 7: the one river a landed flood came down, kept on its record. */
export { eventRiver, isRiverEvent } from "./events";
/**
 * Playtest 10 must-fix 1: the deal rule. Any project that lifts the deal's measure, working in its
 * council by `dealLastStep`, keeps it; `buildCountsForDeal` says whether a build (with its
 * `readyStep`) counts and why not; `dealProgress` lists the projects there that lift it.
 */
export { buildCountsForDeal, dealKeptBy, dealLastStep, dealProgress } from "./deals";
export type { DealCount } from "./deals";
/** Playtest 10 must-fix 4: what a council asks for, and what a new build there would answer (rule P7). */
export { answersOf, askingFor } from "./asked";
export { councilLever } from "./levers";
/** Playtest 9 must-fix 2 and 9: a law's lasting backing per council, the standing parts now, a broken deal's fade. */
export { brokenShare, lawBacking, standingParts } from "./standing";
/** Playtest 9 should-fix 1: points better than four years ago that people expect now (rule P1). */
export { expectedGain } from "./people-moods";
export type { Headway } from "./score";
export type { OnTheWay } from "./on-the-way";

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

/**
 * What is on the way in Left for 2050: points built or started but not yet on the board (builds,
 * bedding in, ramps), the year the last lands, and the same per council and measure for the bars.
 */
export function headway(model: BoardModel, state: BoardState): scoreMod.Headway {
  return scoreMod.headway(model, state);
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

/** A short code: the board, the game number, the start, the step reached and the log. Paste to replay. */
export function encodeRun(state: BoardState): string {
  return runcodeMod.encodeRun(state);
}

/** The board a run code was made on, to load that board's model before `decodeRun`. Throws `BoardRunError` if it cannot be read. */
export function runBoard(code: string): BoardId {
  return runcodeMod.runBoard(code);
}

/** Replay a run code into a state. Throws `BoardRunError` if it cannot be read, is from an older version or another board. */
export function decodeRun(model: BoardModel, code: string): BoardState {
  return runcodeMod.decodeRun(model, code);
}
