/**
 * Rule params package 3 reads beyond the frozen `RULE_IDS` list, with their starting values.
 * The real values live in model/board/rules/people.yaml (rule-defaults.test.ts checks the two
 * agree). These defaults are used only when a model lacks the param, as the three council
 * fixture does, so the engine runs on it unchanged. Every value here is a game rule (tune).
 */
import { param } from "./rules";
import type { BoardModel, RuleId } from "./types";

/** Rule id to param name to starting value. */
export const RULE_DEFAULTS: Record<RuleId, Record<string, number>> = {
  /** Moods: what a kept or broken promise, a crisis handled or not, and services close by count for, in points. */
  P1: { promise_points: 1, crisis_points: 0.5, presence_points: 0.5 },
  /** Score: band edges (change from 2026 out of 100) and what a risk left at step 3 takes in 2050. */
  G1: { band_little: 2, band_much: 6, risk_left_points: 0.3 },
  /** Events: the first turn outside trouble can land, grown events a turn, preparation and room for rivers. */
  E1: { first_turn: 1, grown_per_turn: 1, prepared_cut: 0.5, storm_step: 0.5 },
  /** Place visits: how a grade scales the project it is about, the backing it moves there, and the weather track that makes a turn wet. */
  V1: {
    factor_poorly: 0.5, factor_adequately: 1, factor_well: 1.25, factor_very_well: 1.5,
    backing_poorly: -0.5, backing_adequately: 0, backing_well: 0.3, backing_very_well: 0.5, wet_track: 0.5,
  },
};

/** A param from the model if it has it, else the starting value above. Throws if neither has it. */
export function ruleParam(model: BoardModel, id: RuleId, name: string): number {
  const card = model.rules.find((r) => r.id === id);
  const p = card?.params[name];
  if (p) return p.default;
  const fallback = RULE_DEFAULTS[id]?.[name];
  if (fallback !== undefined) return fallback;
  return param(model, id, name);
}
