/**
 * The two scores (docs/design/v2-board.md section 8): Life in your years and Left for 2050, both
 * out of 100, built from council measures weighted by people, with a share (rule G1) from the
 * lowest councils alone so a Wales that leaves places behind cannot score as well. The result is
 * the lower of the two. Also the Fairness gap of section 4.1.
 */
import { param } from "./rules";
import { ruleParam } from "./rule-defaults";
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
 * The 2050 board carried forward `future_years`: projects still being built add their level 1
 * measure lifts where they stand, and each risk left at step 3 takes `risk_left_points` from the
 * measure it threatens.
 */
export function leftBoard(model: BoardModel, state: BoardState): MeasureBoard {
  const out: MeasureBoard = {};
  for (const code of model.game.councils) {
    const c = state.councils[code];
    if (c) out[code] = { measures: { ...c.measures } };
  }
  const years = param(model, RULE_IDS.score, "future_years");
  const lastTurn = model.game.turns + Math.floor(years / model.game.turn_years);
  for (const p of state.projects) {
    if (p.status !== "building" || p.readyTurn > lastTurn || p.site.council === undefined) continue;
    const def = model.projects.find((d) => d.id === p.project);
    const target = out[p.site.council];
    if (!def || !target) continue;
    const factor = def.level_factor[p.level - 1] ?? 1;
    for (const e of def.effects) {
      if (e.kind !== "measure" || (e.where && e.where !== "here")) continue;
      target.measures[e.measure] = clamp10(target.measures[e.measure] + e.points * factor);
    }
  }
  const riskPoints = ruleParam(model, RULE_IDS.score, "risk_left_points");
  for (const code of Object.keys(out)) {
    const risks = state.councils[code]!.risks;
    for (const r of Object.keys(RISK_MEASURE) as RiskKind[]) {
      if (risks[r] >= 3) out[code]!.measures[RISK_MEASURE[r]] = clamp10(out[code]!.measures[RISK_MEASURE[r]] - riskPoints);
    }
  }
  return out;
}

/** The five plain result bands, from the change in the result against the 2026 board. */
export function resultBand(model: BoardModel, change: number): ResultBand {
  const little = ruleParam(model, RULE_IDS.score, "band_little");
  const much = ruleParam(model, RULE_IDS.score, "band_much");
  if (change >= much) return "much_better";
  if (change >= little) return "little_better";
  if (change > -little) return "same";
  if (change > -much) return "little_worse";
  return "much_worse";
}

/**
 * Both scores for a state. Life in your years is the mean over the turns played (the boards at
 * the end of each turn, or the 2026 board before the first turn ends). Left for 2050 is the
 * board carried forward (`leftBoard`).
 */
export function scores(model: BoardModel, state: BoardState): Scores {
  const start = state.history[0] ? boardScore(model, state.history[0].councils) : boardScore(model, state.councils);
  const played = state.history.slice(1);
  const life = played.length > 0 ? mean(played.map((f) => boardScore(model, f.councils))) : start;
  const left = boardScore(model, leftBoard(model, state));
  const lower = life <= left ? "life" : "left";
  const result = Math.min(life, left);
  return { life, left, lower, result, start, band: resultBand(model, result - start) };
}
