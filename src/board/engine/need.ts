/**
 * Need: rule R4 (docs/design/v2-board.md section 16.3.2). Owner: package 8.
 *
 * "A project does most where the real 2026 figure is worst." A project's lift to a measure in a
 * council is multiplied by `base - per_point * seed`, held between `min_factor` and `max_factor`,
 * where `seed` is that council's real 2026 score for that measure (seed.ts, from the published
 * indicators, unadjusted). The factor is fixed for the game. Losses land in full. Without the R4
 * card the factor is 1 everywhere.
 */
import { optParam } from "./rules";
import { seedMeasure } from "./seed";
import type { BoardModel, CouncilCode, MeasureId } from "./types";
import { MEASURE_IDS, RULE_IDS } from "./types";

const R4 = RULE_IDS.need;

/** True when the model carries the R4 card. */
export const needOn = (model: BoardModel): boolean => model.rules.some((r) => r.id === R4);

/** Real 2026 seeds by model, worked out once: council code to measure to score. */
const seeds = new WeakMap<BoardModel, Map<string, number | null>>();

/** A council's real 2026 score for a measure (0 to 10), or null when the model cannot seed it. */
export function seedScore(model: BoardModel, code: CouncilCode, measure: MeasureId): number | null {
  let cache = seeds.get(model);
  if (!cache) seeds.set(model, (cache = new Map()));
  const key = `${code}|${measure}`;
  if (cache.has(key)) return cache.get(key)!;
  const def = model.councils.find((c) => c.code === code);
  let score: number | null = null;
  try {
    score = def ? seedMeasure(model, def, measure) : null;
  } catch {
    score = null;
  }
  cache.set(key, score);
  return score;
}

/** The R4 factor on a lift to `measure` in `code`. 1 without the card or a seed. */
export function needFactor(model: BoardModel, code: CouncilCode, measure: string): number {
  if (!needOn(model) || !(MEASURE_IDS as readonly string[]).includes(measure)) return 1;
  const seed = seedScore(model, code, measure as MeasureId);
  if (seed === null) return 1;
  const raw = (optParam(model, R4, "base") ?? 1.3) - (optParam(model, R4, "per_point") ?? 0.08) * seed;
  const lo = optParam(model, R4, "min_factor") ?? 0.5;
  const hi = optParam(model, R4, "max_factor") ?? 1.1;
  return Math.round(Math.min(hi, Math.max(lo, raw)) * 1e4) / 1e4;
}
