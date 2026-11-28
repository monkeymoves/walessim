/**
 * Tipping points: rule R2 (docs/design/v2-board.md section 16.3.3). Owner: package 8.
 *
 * When a year closes, each council's mean of its six measures is compared with `over_years`
 * before. A council tips to "rising" at `rise_at` or more and to "slipping" at `slip_at` or
 * worse, and only settles back to "steady" once the change is back inside `settle_band`. The
 * gap between the two edges is the hysteresis: a tip lasts, it is not a wobble.
 *
 * While a council is rising or slipping: S3 counts it `pull_points` better or worse (spread.ts),
 * roots there grow `roots_bonus` faster or slower (roots.ts), Backing moves `backing_per_year`
 * (here), and a rising council pays `coins_per_year` (budget.ts). The first time
 * `region_turn_councils` are rising at once, the region turns: base income rises by
 * `region_turn_coins_per_year` for the rest of the game.
 *
 * With no R2 card every council stays "steady" and every helper here returns 0 or false, so the
 * board behaves as in phase 1. The clock compares each council's momentum before and after the
 * step and raises the `tipping` stop and the moment for any change.
 *
 * Stable API (package 9 reads it): `momentumOn`, `councilMean`, `momentumChange`, `nextMomentum`,
 * `updateMomentum`, `risingCount`, `regionTurnCouncils`, `regionTurnStep`, `regionTurned`,
 * `momentumPull`, `momentumRootsBonus`, `momentumCoinsPerYear`, `slipStartStep`.
 */
import type { StepCtx } from "./ctx";
import { frameAtYear } from "./frame";
import { shiftMoods } from "./people-moods";
import { optParam } from "./rules";
import { yearOfStep } from "./time";
import type { BoardModel, BoardState, Cause, CouncilCode, MeasureId, Momentum } from "./types";
import { MEASURE_IDS, RULE_IDS } from "./types";

const R2 = RULE_IDS.momentum;
const MOMENTUM: Cause = { kind: "momentum" };

/** Starting values for params a trimmed R2 card may leave out (the card in growth.yaml carries all of them). */
const R2_DEFAULTS: Record<string, number> = {
  rise_at: 0.3, slip_at: -0.3, settle_band: 0.1, over_years: 4, pull_points: 1, roots_bonus: 0.02,
  backing_per_year: 0.15, coins_per_year: 0.5, region_turn_councils: 5, region_turn_coins_per_year: 1,
};

/** True when the model carries the R2 card. */
export const momentumOn = (model: BoardModel): boolean => model.rules.some((r) => r.id === R2);

/** An R2 param: the card's value, else its starting value. Only read when the card is on. */
function p(model: BoardModel, name: string): number {
  return optParam(model, R2, name) ?? R2_DEFAULTS[name] ?? 0;
}

/** The plain mean of a council's six measures. */
export function councilMean(measures: Record<MeasureId, number>): number {
  return MEASURE_IDS.reduce((a, m) => a + (measures[m] ?? 0), 0) / MEASURE_IDS.length;
}

/**
 * The change in a council's mean over `over_years`, judged as the clock arrives at `arriving`:
 * the board now against the yearly frame `over_years` before (the May 2026 frame early on).
 */
export function momentumChange(model: BoardModel, state: BoardState, code: CouncilCode, arriving: number): number {
  const now = state.councils[code];
  if (!now) return 0;
  const then = frameAtYear(state, yearOfStep(model, arriving) - p(model, "over_years"))?.councils[code];
  return then ? councilMean(now.measures) - councilMean(then.measures) : 0;
}

/** The hysteresis: where a council goes from `current` given its change. Pure. */
export function nextMomentum(model: BoardModel, current: Momentum, change: number): Momentum {
  const rise = p(model, "rise_at");
  const slip = p(model, "slip_at");
  const band = p(model, "settle_band");
  if (change >= rise) return "rising";
  if (change <= slip) return "slipping";
  if (current === "rising") return change > band ? "rising" : "steady";
  if (current === "slipping") return change < -band ? "slipping" : "steady";
  return "steady";
}

/**
 * When `years` close (1 at a quarter year step), before moods: set each council's momentum, then
 * move Backing in councils on the rise or slipping, through the moods so it lasts (rule R2,
 * cause "momentum"). `ctx.step` is the step that ran; the clock arrives at `ctx.step + 1`.
 */
export function updateMomentum(ctx: StepCtx, years: number): void {
  const { model, state } = ctx;
  if (!momentumOn(model) || years <= 0) return;
  const arriving = ctx.step + 1;
  for (const code of model.game.councils) {
    const c = state.councils[code];
    if (!c) continue;
    c.momentum = nextMomentum(model, c.momentum, momentumChange(model, state, code, arriving));
  }
  const backing = p(model, "backing_per_year") * years;
  if (backing === 0) return;
  for (const code of model.game.councils) {
    const m = state.councils[code]?.momentum;
    if (m === "rising") shiftMoods(ctx, code, backing, undefined, R2, MOMENTUM);
    else if (m === "slipping") shiftMoods(ctx, code, -backing, undefined, R2, MOMENTUM);
  }
}

/** Councils on the rise now. */
export function risingCount(model: BoardModel, state: BoardState): number {
  return model.game.councils.filter((code) => state.councils[code]?.momentum === "rising").length;
}

/** Councils that must be rising at once for the region to turn (R2 `region_turn_councils`). */
export const regionTurnCouncils = (model: BoardModel): number => p(model, "region_turn_councils");

/**
 * The step the region first turned (the yearly frame where `region_turn_councils` were first
 * rising at once), or null. Read from the frames, so it needs no field of its own: momentum only
 * changes when a year closes, and that year's frame is written straight after. During the step
 * that turns it, before the frame is written, the live board counts, at the step being arrived
 * at (`state.step + 1`).
 */
export function regionTurnStep(model: BoardModel, state: BoardState): number | null {
  if (!momentumOn(model)) return null;
  const need = regionTurnCouncils(model);
  const count = (m: Record<string, { momentum?: Momentum }>) =>
    model.game.councils.filter((code) => m[code]?.momentum === "rising").length;
  for (const f of state.history) if (count(f.councils) >= need) return f.step;
  return risingCount(model, state) >= need ? state.step + 1 : null;
}

/** True once the region has turned (it stays turned). */
export const regionTurned = (model: BoardModel, state: BoardState): boolean => regionTurnStep(model, state) !== null;

/** Points of pull a council's momentum adds (rising) or takes (slipping) when young adults choose (S3). */
export function momentumPull(model: BoardModel, m: Momentum): number {
  if (!momentumOn(model) || m === "steady") return 0;
  return m === "rising" ? p(model, "pull_points") : -p(model, "pull_points");
}

/** Extra roots growth a year for a project in a council with this momentum (R1 with R2). */
export function momentumRootsBonus(model: BoardModel, m: Momentum): number {
  if (!momentumOn(model) || m === "steady") return 0;
  return m === "rising" ? p(model, "roots_bonus") : -p(model, "roots_bonus");
}

/** Coins a year from momentum: each rising council, and the region turn for good. */
export function momentumCoinsPerYear(model: BoardModel, state: BoardState): number {
  if (!momentumOn(model)) return 0;
  const turned = regionTurned(model, state) ? p(model, "region_turn_coins_per_year") : 0;
  return risingCount(model, state) * p(model, "coins_per_year") + turned;
}

/**
 * The step a council's current slip began (the first yearly frame of its current run of
 * slipping), or null when it is not slipping. Rule R3 reads it: the first project placed since.
 */
export function slipStartStep(state: BoardState, code: CouncilCode): number | null {
  if (state.councils[code]?.momentum !== "slipping") return null;
  let start = state.step;
  for (let i = state.history.length - 1; i >= 0; i--) {
    const f = state.history[i]!;
    if (f.councils[code]?.momentum !== "slipping") break;
    start = f.step;
  }
  return start;
}
