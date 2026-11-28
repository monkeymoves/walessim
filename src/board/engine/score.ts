/**
 * The two scores (docs/design/v2-board.md section 8): Life in your years and Left for 2050, both
 * out of 100, built from council measures weighted by people, with a share (rule G1) from the
 * lowest councils alone so a Wales that leaves places behind cannot score as well. The result is
 * Left for 2050 alone (16.3.6): Life in your years is still worked out, picks the letter and
 * shapes the story, but is not the result. Also the Fairness gap of section 4.1.
 */
import { lastArrival, onTheWay, type OnTheWay } from "./on-the-way";
import { optParam, param } from "./rules";
import { ruleParam } from "./rule-defaults";
import { stepsOf, yearOfStep } from "./time";
import type {
  BoardModel, BoardState, CouncilCode, MeasureId, ResultBand, RiskKind, Scores,
} from "./types";
import { MEASURE_IDS, RULE_IDS } from "./types";

/** What any board looks like to the scores: measures per council. Frames and states both fit. */
export type MeasureBoard = Record<CouncilCode, { measures: Record<MeasureId, number> }>;

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp10 = (v: number): number => Math.max(0, Math.min(10, v));

/** A council's mean over the six measures, 0 to 10. */
export function councilMean(c: { measures: Record<MeasureId, number> }): number {
  return mean(MEASURE_IDS.map((m) => c.measures[m]));
}

/** Real 2026 population of each council in play (the weights, labelled real). */
export function popWeights(model: BoardModel): Record<CouncilCode, number> {
  const out: Record<CouncilCode, number> = {};
  for (const code of model.game.councils) out[code] = model.councils.find((c) => c.code === code)?.real.pop ?? 0;
  return out;
}

/** Councils in play, lowest mean first (ties by code, so it is stable). */
export function lowestCouncils(model: BoardModel, board: MeasureBoard, count: number): CouncilCode[] {
  return model.game.councils
    .filter((c) => board[c])
    .sort((a, b) => councilMean(board[a]!) - councilMean(board[b]!) || a.localeCompare(b))
    .slice(0, count);
}

/**
 * The board's level, 0 to 10: the people weighted mean of council means, with `fairness_share`
 * of it from the mean of the `lowest_count` lowest councils.
 */
export function boardLevel(model: BoardModel, board: MeasureBoard): number {
  const share = param(model, RULE_IDS.score, "fairness_share");
  const k = param(model, RULE_IDS.score, "lowest_count");
  const w = popWeights(model);
  let total = 0;
  let sum = 0;
  for (const code of model.game.councils) {
    const c = board[code];
    if (!c) continue;
    total += w[code] ?? 0;
    sum += (w[code] ?? 0) * councilMean(c);
  }
  const avg = total > 0 ? sum / total : 0;
  const low = mean(lowestCouncils(model, board, k).map((c) => councilMean(board[c]!)));
  return (1 - share) * avg + share * low;
}

/** The board's score out of 100 (the level times ten). */
export function boardScore(model: BoardModel, board: MeasureBoard): number {
  return boardLevel(model, board) * 10;
}

/**
 * Fairness (section 4.1): the middle council's mean less the mean of the three lowest councils,
 * across all six measures, in points out of 10. Smaller is fairer.
 */
export function fairnessGap(model: BoardModel, board: MeasureBoard): number {
  const k = param(model, RULE_IDS.score, "lowest_count");
  const means = model.game.councils.filter((c) => board[c]).map((c) => councilMean(board[c]!)).sort((a, b) => a - b);
  if (means.length === 0) return 0;
  const middle = means.length % 2 ? means[(means.length - 1) / 2]! : (means[means.length / 2 - 1]! + means[means.length / 2]!) / 2;
  return middle - mean(means.slice(0, k));
}

/** Which measure each risk threatens, for what a risk left at step 3 takes from Left for 2050. */
const RISK_MEASURE: Record<RiskKind, MeasureId> = { flood: "nature", tip: "nature", employer: "work" };

/**
 * The 2050 board carried forward `future_years`: what is on the way (on-the-way.ts: projects
 * still being built that open by then, and lifts still bedding in or ramping up, at their full
 * size) is added where it lands, and each risk left at step 3 takes `risk_left_points` from the
 * measure it threatens. So the headline moves when a choice is made, not years later.
 */
export function leftBoard(model: BoardModel, state: BoardState): MeasureBoard {
  return leftBoardWith(model, state, true);
}

/** The last step a build may open and still count for Left for 2050 (G1 `future_years` past the end). */
const countedTo = (model: BoardModel): number => model.game.steps + stepsOf(model, param(model, RULE_IDS.score, "future_years"));

function leftBoardWith(model: BoardModel, state: BoardState, withComing: boolean): MeasureBoard {
  const out: MeasureBoard = {};
  for (const code of model.game.councils) {
    const c = state.councils[code];
    if (c) out[code] = { measures: { ...c.measures } };
  }
  const coming = withComing ? onTheWay(model, state, countedTo(model)) : {};
  for (const [code, lifts] of Object.entries(coming)) {
    const target = out[code];
    if (!target) continue;
    for (const [m, v] of Object.entries(lifts) as [MeasureId, number][]) target.measures[m] = clamp10(target.measures[m] + v);
  }
  priceRisks(model, out, (code) => state.councils[code]?.risks);
  return out;
}

/** What is still on the way in Left for 2050, and when the last of it lands. */
export interface Headway {
  /** Points of Left for 2050 (out of 100) that are on the way: built or started, not yet on the board. */
  comingPoints: number;
  /** The year the last of it lands, or null when nothing is on the way. */
  comingBy: number | null;
  /** The same per council and measure (on-the-way.ts), for the dashed part of the bars. */
  byCouncil: OnTheWay;
}

/**
 * The headline's "on the way" (playtest 8, should-fix 1): how much of Left for 2050 is in motion
 * but not yet on the board, and the year it is all in. Roots (R1) are not counted ahead: they grow
 * only while a project keeps its company, so they are shown as they happen.
 */
export function headway(model: BoardModel, state: BoardState): Headway {
  const to = countedTo(model);
  const at = lastArrival(model, state, to);
  return {
    comingPoints: boardScore(model, leftBoardWith(model, state, true)) - boardScore(model, leftBoardWith(model, state, false)),
    comingBy: at === null ? null : yearOfStep(model, at),
    byCouncil: onTheWay(model, state, to),
  };
}

/** Each risk at step 3 takes `risk_left_points` from the measure it threatens, in place. */
function priceRisks(model: BoardModel, board: MeasureBoard, risksOf: (code: CouncilCode) => Record<RiskKind, number> | undefined): void {
  const riskPoints = ruleParam(model, RULE_IDS.score, "risk_left_points");
  for (const code of Object.keys(board)) {
    const risks = risksOf(code);
    if (!risks) continue;
    for (const r of Object.keys(RISK_MEASURE) as RiskKind[]) {
      if (risks[r] >= 3) board[code]!.measures[RISK_MEASURE[r]] = clamp10(board[code]!.measures[RISK_MEASURE[r]] - riskPoints);
    }
  }
}

/**
 * The 2026 board judged the way Left for 2050 is: the first frame (or the state before it), with
 * its own high risks priced in. So a game where nothing happens ends where it began, and the top
 * strip never shows Left for 2050 below its own start before anything has happened.
 */
export function startBoard(model: BoardModel, state: BoardState): MeasureBoard {
  const first = state.history[0]?.councils ?? state.councils;
  const out: MeasureBoard = {};
  for (const code of model.game.councils) {
    const c = first[code];
    if (c) out[code] = { measures: { ...c.measures } };
  }
  priceRisks(model, out, (code) => first[code]?.risks);
  return out;
}

/**
 * The plain result bands, from the change in the result against the 2026 board: about the same,
 * a little, plainly (G1 `band_some`, playtest 10 should-fix 7: +9.2 read "a little better" and
 * +10.0 "much better") and much better or worse. A model without `band_some` keeps five bands.
 */
export function resultBand(model: BoardModel, change: number): ResultBand {
  const little = ruleParam(model, RULE_IDS.score, "band_little");
  const much = ruleParam(model, RULE_IDS.score, "band_much");
  const some = optParam(model, RULE_IDS.score, "band_some") ?? much;
  if (change >= much) return "much_better";
  if (change >= some) return "better";
  if (change >= little) return "little_better";
  if (change > -little) return "same";
  if (change > -some) return "little_worse";
  if (change > -much) return "worse";
  return "much_worse";
}

/**
 * Both scores for a state. Life in your years is the mean over the years played (the yearly
 * frames, or the 2026 board before the first year closes). Left for 2050 is the board carried
 * forward (`leftBoard`), and it is the result (16.3.6). `start` is the 2026 board judged the same
 * way (`startBoard`). `lower` still says which was lower: it picks the letter.
 */
export function scores(model: BoardModel, state: BoardState): Scores {
  const start = boardScore(model, startBoard(model, state));
  const played = state.history.slice(1);
  const life = played.length > 0 ? mean(played.map((f) => boardScore(model, f.councils))) : boardScore(model, state.history[0]?.councils ?? state.councils);
  const left = boardScore(model, leftBoard(model, state));
  const lower = life <= left ? "life" : "left";
  const result = left;
  return { life, left, lower, result, start, band: resultBand(model, result - start) };
}
