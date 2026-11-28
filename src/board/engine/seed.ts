/**
 * The 2026 board from real figures (docs/design/v2-board.md section 4.1). Each indicator becomes a
 * 0 to 10 score on its reference band; a measure is the plain mean of its indicators' scores.
 * The data is never adjusted to make a nicer start.
 *
 * Risk steps are game estimates seeded from real figures and flags. The mapping is by thirds of
 * the 0 to 10 band score (lowest third is step 3), so no new number is invented:
 * - flood: the `flood_exposure` score.
 * - tip: 3 where the council has coal tips (the `coal_tips` feature), else 1.
 * - employer: the mean of the `jobs_density` and (when present) `enterprises_10k` scores.
 */
import { BoardModelError } from "./errors";
import { param } from "./rules";
import type { BoardBand, BoardModel, CouncilDef, CouncilState, MeasureId, RiskStep } from "./types";
import { MEASURE_IDS, RULE_IDS } from "./types";
import { round4 } from "./ctx";

/** score = 10 * (value - floor) / (goal - floor), clamped 0 to 10. Bands with goal below floor read lower as better. */
export function bandScore(band: BoardBand, value: number): number {
  const span = band.goal - band.floor;
  if (span === 0) return 5;
  return Math.min(10, Math.max(0, (10 * (value - band.floor)) / span));
}

/** The 0 to 10 score of one indicator for one council, or null if the council or band lacks it. */
export function indicatorScore(model: BoardModel, def: CouncilDef, indicator: string): number | null {
  const band = model.bands[indicator];
  const value = def.real[indicator];
  if (!band || value === undefined || !Number.isFinite(value)) return null;
  return bandScore(band, value);
}

/** The seeded 2026 score of one measure. Throws if a seeding indicator lacks a value or a band. */
export function seedMeasure(model: BoardModel, def: CouncilDef, measure: MeasureId): number {
  const m = model.measures.find((x) => x.id === measure);
  if (!m || m.indicators.length === 0) throw new BoardModelError(`No seeding indicators for measure ${measure}`);
  const scores = m.indicators.map((id) => {
    const s = indicatorScore(model, def, id);
    if (s === null) throw new BoardModelError(`${def.code} has no value or band for ${id} (seeds ${measure})`);
    return s;
  });
  return round4(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Thirds of a 0 to 10 score: the lowest third is step 3, the top third step 1. */
export function thirdsStep(score: number): RiskStep {
  if (score < 10 / 3) return 3;
  if (score < 20 / 3) return 2;
  return 1;
}

export function seedRisks(model: BoardModel, def: CouncilDef): CouncilState["risks"] {
  const flood = indicatorScore(model, def, "flood_exposure");
  const employerScores = ["jobs_density", "enterprises_10k"]
    .map((id) => indicatorScore(model, def, id))
    .filter((s): s is number => s !== null);
  const employer = employerScores.length ? employerScores.reduce((a, b) => a + b, 0) / employerScores.length : null;
  return {
    flood: flood === null ? 1 : thirdsStep(flood),
    tip: def.features.includes("coal_tips") ? 3 : 1,
    employer: employer === null ? 1 : thirdsStep(employer),
  };
}

/** One council in 2026. Backing starts at rule P2 `start`; moods are set by the people step. */
export function seedCouncil(model: BoardModel, def: CouncilDef): CouncilState {
  const measures = Object.fromEntries(MEASURE_IDS.map((m) => [m, seedMeasure(model, def, m)])) as Record<MeasureId, number>;
  const need = (id: string): number => {
    const v = def.real[id];
    if (v === undefined) throw new BoardModelError(`${def.code} has no value for ${id}`);
    return v;
  };
  return {
    code: def.code,
    measures,
    pop: need("pop"),
    young: round4(need("young_adults")),
    age65: round4(need("age65")),
    backing: param(model, RULE_IDS.backingStart, "start"),
    moods: {},
    risks: seedRisks(model, def),
    lastReachedStep: null,
    momentum: "steady",
  };
}

/** Every council in play, in `game.councils` order. */
export function seedCouncils(model: BoardModel): Record<string, CouncilState> {
  const out: Record<string, CouncilState> = {};
  for (const code of model.game.councils) {
    const def = model.councils.find((c) => c.code === code);
    if (!def) throw new BoardModelError(`Council ${code} is in play but not in the model`);
    out[code] = seedCouncil(model, def);
  }
  return out;
}
