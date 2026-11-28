/**
 * The step and the calendar (docs/design/v2-board.md section 16.2.1, ADR 0007). The only module
 * that knows how long a step is: every other engine file turns years into steps, and rates per
 * year into amounts per step, through these helpers.
 *
 * Step 0 is May 2026. A step lasts `game.years_per_step` (a quarter of a year in play, two years
 * in the equivalence test). The clock moves from step s to s + 1 in one `tick`; things that happen
 * "when a year closes" or "on an election step" happen on arriving at step s + 1.
 */
import type { BoardModel, Season } from "./types";

/** Whole steps in a span of years, rounded (a half step rounds up). */
export const stepsOf = (model: BoardModel, years: number): number => Math.round(years / model.game.years_per_step);

/** The amount for one step of a rate given per year. */
export const perStep = (model: BoardModel, ratePerYear: number): number => ratePerYear * model.game.years_per_step;

/** Years from May 2026 to the start of a step (a fraction inside a year). */
export const yearsAt = (model: BoardModel, step: number): number => step * model.game.years_per_step;

/** The calendar year a step falls in (May 2026 to April 2027 is 2026). */
export const yearOfStep = (model: BoardModel, step: number): number =>
  model.game.first_year + Math.floor(yearsAt(model, step) + 1e-9);

/** The first step of a calendar year (the step that reaches May of that year). */
export const stepOfYear = (model: BoardModel, year: number): number => Math.ceil((year - model.game.first_year) / model.game.years_per_step - 1e-9);

/**
 * The last step a keystone can be started: the first step of `keystone_last_start_year` (May 2044).
 * One answer for the build blocker, the time line mark, the tier card and the build menu (fix round
 * 2: the blocker allowed Spring 2045 while game.yaml said May 2044). projects.test.ts checks that a
 * keystone started here at its full build time opens by the last step.
 */
export const keystoneLastStep = (model: BoardModel): number => stepOfYear(model, model.game.keystone_last_start_year);

/** True when arriving at `step` closes at least one year (every fourth step at a quarter year). */
export const closesYear = (model: BoardModel, step: number): boolean => step > 0 && yearsClosed(model, step) > 0;

/**
 * Whole years that close on arriving at `step`: 1 every fourth step at a quarter year, 2 on every
 * step at a two year step, 0 otherwise. Yearly rules (moods, passed over, momentum) scale by it.
 */
export function yearsClosed(model: BoardModel, step: number): number {
  if (step <= 0) return 0;
  return Math.floor(yearsAt(model, step) + 1e-9) - Math.floor(yearsAt(model, step - 1) + 1e-9);
}

/** True when arriving at `step` closes a span of `years` counted from May 2026 (for example each two year block). */
export function closesSpan(model: BoardModel, step: number, years: number): boolean {
  if (step <= 0 || years <= 0) return false;
  return Math.floor(yearsAt(model, step) / years + 1e-9) > Math.floor(yearsAt(model, step - 1) / years + 1e-9);
}

/** The two year block (`game.track_years`) a step falls in: 0 for 2026 to 2028. Futures keep one track value per block. */
export const blockOf = (model: BoardModel, step: number): number => Math.floor(yearsAt(model, step) / model.game.track_years + 1e-9);

/** The first step of a block. */
export const stepOfBlock = (model: BoardModel, block: number): number => stepsOf(model, block * model.game.track_years);

/** The season of a step: summer, autumn, winter, spring in turn (`game.seasons`). */
export function seasonOf(model: BoardModel, step: number): Season {
  const perYear = Math.max(1, stepsOf(model, 1));
  const seasons = model.game.seasons;
  if (perYear < seasons.length) return seasons[0];
  return seasons[Math.floor(((step % perYear) * seasons.length) / perYear)] ?? seasons[0];
}

/** True when an election is held on arriving at `step`: the first step of an election year. */
export function isElectionStep(model: BoardModel, step: number): boolean {
  return step > 0 && model.game.election_years.some((y) => stepOfYear(model, y) === step);
}

/** The step a span of years ends at, counted from a step (for terms, deals and windows). */
export const stepAfter = (model: BoardModel, from: number, years: number): number => from + stepsOf(model, years);

/**
 * The last step an event may land on. The final step is never used: an answer given then could
 * change nothing, and the game would end with the answer still waiting. A game of one step a
 * block (the equivalence test) keeps every step.
 */
export const lastLandingStep = (model: BoardModel): number =>
  stepsOf(model, 1) >= model.game.seasons.length ? model.game.steps - 2 : model.game.steps - 1;
