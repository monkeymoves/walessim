/**
 * Place visits on the board (docs/design/v2-board.md section 9): a thin adapter to v1's pure
 * `gradeRhondda` for T1 places, and the grade of a T3 place's one hard choice. A grade scales
 * the project the place is about (`gradeFactor`) and moves Backing there (rule V1). Place counts
 * are never added into Wales figures (ADR 0004).
 */
import { gradeRhondda } from "../../engine/places";
import { allHold, trackValue } from "./conditions";
import type { StepCtx } from "./ctx";
import { applyOnce } from "./effects";
import { ruleParam } from "./rule-defaults";
import type { Action, BoardModel, BoardState, Grade, Pending, PlaceDef, PlaceOption } from "./types";

/** Rule id of the place visit card (grade factors and backing), in model/board/rules/people.yaml. */
export const VISIT_RULE = "V1";

type VisitAction = Extract<Action, { kind: "visit" }>;
type VisitPending = Extract<Pending, { kind: "visit" }>;

/** How much a grade scales the project the place is about (rule V1). */
export function gradeFactor(model: BoardModel, grade: Grade): number {
  return ruleParam(model, VISIT_RULE, `factor_${grade}`);
}

/** Backing points a grade moves in the visited council (rule V1). */
export function gradeBacking(model: BoardModel, grade: Grade): number {
  return ruleParam(model, VISIT_RULE, `backing_${grade}`);
}

/** Is this a wet time for the Rhondda's tips? The future's weather track now at or above V1 `wet_track`. */
export function wetNow(model: BoardModel, state: BoardState): boolean {
  return trackValue(model, state, "weather") >= ruleParam(model, VISIT_RULE, "wet_track");
}

/** The T3 option a visit picked, if any. */
export function pickedOption(place: PlaceDef, picks: string[]): PlaceOption | undefined {
  return place.options?.find((o) => o.id === picks[0]);
}

/**
 * The grade of a visit, without changing anything. T1 grades the picked tips with v1's
 * `gradeRhondda` (adequately while the board is not yet copied into the model). T3 takes the
 * first of the option's grades whose conditions hold for the visited council.
 */
export function visitGrade(model: BoardModel, state: BoardState, place: PlaceDef, picks: string[]): Grade {
  if (place.template === "T3") {
    const o = pickedOption(place, picks);
    if (!o) return "poorly";
    return o.grades.find((g) => allHold(model, state, place.council, g.when))?.grade ?? o.default_grade;
  }
  if (!place.board) return "adequately";
  return gradeRhondda(place.board, picks, wetNow(model, state)).grade;
}

/**
 * Hook for `act` on a visit: grade it, apply the T3 option's effects in the visited council, and
 * move Backing there by the grade. clock.ts sets the project's grade and removes the pending.
 */
export function gradeVisit(ctx: StepCtx, action: VisitAction, pending: VisitPending): Grade {
  const { model, state } = ctx;
  const place = model.places.find((p) => p.id === action.place);
  if (!place) return "poorly";
  const grade = visitGrade(model, state, place, action.picks);
  const cause = { kind: "visit", place: place.id, grade } as const;
  const option = place.template === "T3" ? pickedOption(place, action.picks) : undefined;
  if (option) applyOnce(ctx, option.effects, { councils: [pending.council] }, cause, { rule: VISIT_RULE });
  const points = gradeBacking(model, grade);
  if (points !== 0) ctx.change({ council: pending.council, quantity: "backing", delta: points, rule: VISIT_RULE, cause });
  return grade;
}
